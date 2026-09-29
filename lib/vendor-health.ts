import "server-only"

import { query } from "@/lib/db"
import { VENDOR_PERFORMANCE_LOOKBACK_MONTHS } from "@/lib/vendor-performance"

type RelationshipRatingRow = {
  responsiveness: number | null
  adaptability: number | null
  compliance: number | null
  relationship: number | null
}

type VendorHealthInputRow = {
  performance_score: string | null
}

type RecalculateVendorHealthResult = {
  score: number | null
  grade:
    | "A"
    | "B"
    | "C"
    | "D"
    | "F"
    | null
}

type HealthComponent = {
  score: number | null
  weight: number
}

const HEALTH_WEIGHTS = {
  performance: 72,
  responsiveness: 7,
  adaptability: 7,
  compliance: 7,
  relationship: 7,
} as const

function getHealthGrade(
  score: number | null
): RecalculateVendorHealthResult["grade"] {
  if (score === null) {
    return null
  }

  if (score >= 90) {
    return "A"
  }

  if (score >= 80) {
    return "B"
  }

  if (score >= 70) {
    return "C"
  }

  if (score >= 60) {
    return "D"
  }

  return "F"
}

function starRatingToScore(
  rating: number | null
) {
  if (
    rating === null ||
    rating === undefined
  ) {
    return null
  }

  return (
    rating / 5
  ) * 100
}

export async function recalculateVendorHealth(
  vendorId: string,
  organizationId: string
): Promise<RecalculateVendorHealthResult> {
  // --------------------------------------------------
  // KPI / SLA performance
  // --------------------------------------------------

  const performanceResult =
    await query<VendorHealthInputRow>(
      `
      WITH metric_score AS (
        SELECT
          CASE
            WHEN SUM(
              CASE
                WHEN result.status IN (
                  'met',
                  'missed'
                )
                THEN vm.weight
                ELSE 0
              END
            ) > 0

            THEN (
              SUM(
                CASE
                  WHEN result.status = 'met'
                  THEN vm.weight
                  ELSE 0
                END
              )
              /
              SUM(
                CASE
                  WHEN result.status IN (
                    'met',
                    'missed'
                  )
                  THEN vm.weight
                  ELSE 0
                END
              )
            ) * 100

            ELSE NULL
          END AS performance_score

        FROM vendor_metrics vm

        LEFT JOIN vendor_metric_results result
          ON result.metric_id = vm.id
          AND result.vendor_id = vm.vendor_id
          AND result.organization_id = vm.organization_id
          AND result.period_end >= (
            CURRENT_DATE -
            ($3::int * INTERVAL '1 month')
          )
          AND result.period_end <= CURRENT_DATE

        WHERE vm.vendor_id = $1
          AND vm.organization_id = $2
          AND vm.is_active = TRUE
      )

      SELECT
        performance_score::text

      FROM metric_score
      `,
      [
        vendorId,
        organizationId,
        VENDOR_PERFORMANCE_LOOKBACK_MONTHS,
      ]
    )

  // --------------------------------------------------
  // Relationship ratings
  // --------------------------------------------------

  const ratingsResult =
    await query<RelationshipRatingRow>(
      `
      SELECT
        responsiveness,
        adaptability,
        compliance,
        relationship

      FROM vendor_relationship_ratings

      WHERE organization_id = $1
        AND vendor_id = $2

      LIMIT 1
      `,
      [
        organizationId,
        vendorId,
      ]
    )

  // --------------------------------------------------
  // Convert data to component scores
  // --------------------------------------------------

  const performanceRow =
    performanceResult.rows[0]

  const performanceScore =
    performanceRow
      ?.performance_score !== null &&
    performanceRow
      ?.performance_score !== undefined
      ? Number(
          performanceRow.performance_score
        )
      : null

  const ratings =
    ratingsResult.rows[0]

  const responsivenessScore =
    starRatingToScore(
      ratings?.responsiveness ??
        null
    )

  const adaptabilityScore =
    starRatingToScore(
      ratings?.adaptability ??
        null
    )

  const complianceScore =
    starRatingToScore(
      ratings?.compliance ??
        null
    )

  const relationshipScore =
    starRatingToScore(
      ratings?.relationship ??
        null
    )

  // --------------------------------------------------
  // Available health components
  // --------------------------------------------------

  const components: HealthComponent[] = [
    {
      score:
        performanceScore,

      weight:
        HEALTH_WEIGHTS.performance,
    },

    {
      score:
        responsivenessScore,

      weight:
        HEALTH_WEIGHTS.responsiveness,
    },

    {
      score:
        adaptabilityScore,

      weight:
        HEALTH_WEIGHTS.adaptability,
    },

    {
      score:
        complianceScore,

      weight:
        HEALTH_WEIGHTS.compliance,
    },

    {
      score:
        relationshipScore,

      weight:
        HEALTH_WEIGHTS.relationship,
    },
  ]

  const availableComponents =
    components.filter(
      (
        component
      ): component is {
        score: number
        weight: number
      } =>
        component.score !== null
    )

  // --------------------------------------------------
  // No available health data
  // --------------------------------------------------

  if (
    availableComponents.length === 0
  ) {
    await query(
      `
      UPDATE vendors

      SET
        health_score = NULL,
        health_grade = NULL,
        health_calculated_at = NOW()

      WHERE id = $1
        AND organization_id = $2
      `,
      [
        vendorId,
        organizationId,
      ]
    )

    return {
      score: null,
      grade: null,
    }
  }

  // --------------------------------------------------
  // Normalize based on available components
  // --------------------------------------------------

  const availableWeight =
    availableComponents.reduce(
      (
        total,
        component
      ) =>
        total +
        component.weight,
      0
    )


  const weightedScore =
    availableComponents.reduce(
      (
        total,
        component
      ) =>
        total +
        component.score *
          component.weight,
      0
    )

  const healthScore =
    Math.round(
      (
        weightedScore /
        availableWeight
      ) *
        100
    ) / 100

  const healthGrade =
    getHealthGrade(
      healthScore
    )

  // --------------------------------------------------
  // Cache health on vendor
  // --------------------------------------------------

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
    score:
      healthScore,

    grade:
      healthGrade,
  }
}
