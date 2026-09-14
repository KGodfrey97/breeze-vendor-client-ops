import "server-only"

import { query } from "@/lib/db"

type VendorHealthInputRow = {
  performance_score: string | null
  budget_score: string | null
}

type RecalculateVendorHealthResult = {
  score: number | null
  grade: "A" | "B" | "C" | "D" | "F" | null
}

function getHealthGrade(
  score: number | null
): RecalculateVendorHealthResult["grade"] {
  if (score === null) return null

  if (score >= 90) return "A"
  if (score >= 80) return "B"
  if (score >= 70) return "C"
  if (score >= 60) return "D"

  return "F"
}

export async function recalculateVendorHealth(
  vendorId: string,
  organizationId: string
): Promise<RecalculateVendorHealthResult> {
  const currentYear =
    new Date().getFullYear()

  const result =
    await query<VendorHealthInputRow>(
      `
      WITH metric_score AS (
        SELECT
          CASE
            WHEN SUM(
              CASE
                WHEN latest.status IN ('met', 'missed')
                THEN vm.weight
                ELSE 0
              END
            ) > 0

            THEN (
              SUM(
                CASE
                  WHEN latest.status = 'met'
                  THEN vm.weight
                  ELSE 0
                END
              )
              /
              SUM(
                CASE
                  WHEN latest.status IN ('met', 'missed')
                  THEN vm.weight
                  ELSE 0
                END
              )
            ) * 100

            ELSE NULL
          END AS performance_score

        FROM vendor_metrics vm

        LEFT JOIN LATERAL (
          SELECT
            r.status

          FROM vendor_metric_results r

          WHERE r.metric_id = vm.id
            AND r.vendor_id = vm.vendor_id
            AND r.organization_id = vm.organization_id

          ORDER BY
            r.period_end DESC,
            r.created_at DESC

          LIMIT 1
        ) latest ON TRUE

        WHERE vm.vendor_id = $1
          AND vm.organization_id = $2
          AND vm.is_active = TRUE
      ),

      budget_score AS (
        SELECT
          CASE
            WHEN vb.forecast_amount IS NULL
              THEN NULL

            WHEN vb.budget_amount <= 0
              AND vb.forecast_amount <= 0
              THEN 100

            WHEN vb.budget_amount <= 0
              THEN 0

            WHEN vb.forecast_amount <= vb.budget_amount
              THEN 100

            WHEN (
              (
                vb.forecast_amount -
                vb.budget_amount
              ) / vb.budget_amount
            ) * 100 <= 5
              THEN 80

            WHEN (
              (
                vb.forecast_amount -
                vb.budget_amount
              ) / vb.budget_amount
            ) * 100 <= 10
              THEN 60

            WHEN (
              (
                vb.forecast_amount -
                vb.budget_amount
              ) / vb.budget_amount
            ) * 100 <= 20
              THEN 30

            ELSE 0
          END AS budget_score

        FROM vendor_budgets vb

        WHERE vb.vendor_id = $1
          AND vb.organization_id = $2
          AND vb.budget_year = $3

        LIMIT 1
      )

      SELECT
        ms.performance_score::text,
        bs.budget_score::text

      FROM metric_score ms

      LEFT JOIN budget_score bs
        ON TRUE
      `,
      [
        vendorId,
        organizationId,
        currentYear,
      ]
    )

  const row =
    result.rows[0]

  const performanceScore =
    row?.performance_score !== null &&
    row?.performance_score !== undefined
      ? Number(
          row.performance_score
        )
      : null

  const budgetScore =
    row?.budget_score !== null &&
    row?.budget_score !== undefined
      ? Number(
          row.budget_score
        )
      : null

  const components = [
    {
      score: performanceScore,
      weight: 70,
    },
    {
      score: budgetScore,
      weight: 30,
    },
  ].filter(
    (
      component
    ): component is {
      score: number
      weight: number
    } =>
      component.score !== null
  )

  let healthScore: number | null =
    null

  if (
    components.length > 0
  ) {
    const availableWeight =
      components.reduce(
        (
          total,
          component
        ) =>
          total +
          component.weight,
        0
      )

    const weightedTotal =
      components.reduce(
        (
          total,
          component
        ) =>
          total +
          component.score *
            component.weight,
        0
      )

    healthScore =
      Math.round(
        (
          weightedTotal /
          availableWeight
        ) *
          100
      ) / 100
  }

  const healthGrade =
    getHealthGrade(
      healthScore
    )

  await query(
    `
    UPDATE vendors

    SET
      health_score = $1,
      health_grade = $2,
      health_calculated_at = NOW()

    WHERE id = $3
      AND organization_id = $4
    `,
    [
      healthScore,
      healthGrade,
      vendorId,
      organizationId,
    ]
  )

  return {
    score: healthScore,
    grade: healthGrade,
  }
}