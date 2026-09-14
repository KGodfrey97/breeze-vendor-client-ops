import { NextResponse } from "next/server"

import { query } from "@/lib/db"
import { requireAuthenticatedProfile } from "@/lib/auth-server"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

type VendorHealthRow = {
  id: string
  health_score: string | null
  health_grade: string | null
  health_calculated_at: string | null
}

type MetricHealthRow = {
  id: string
  name: string
  weight: string
  latest_status:
    | "met"
    | "missed"
    | "not_measured"
    | null
}

type BudgetHealthRow = {
  budget_amount: string
  forecast_amount: string | null
}

function calculateBudgetScore(
  budgetAmount: number,
  forecastAmount: number
) {
  if (budgetAmount <= 0) {
    return forecastAmount <= 0
      ? 100
      : 0
  }

  const variancePercent =
    ((forecastAmount -
      budgetAmount) /
      budgetAmount) *
    100

  if (variancePercent <= 0) {
    return 100
  }

  if (variancePercent <= 5) {
    return 80
  }

  if (variancePercent <= 10) {
    return 60
  }

  if (variancePercent <= 20) {
    return 30
  }

  return 0
}

export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    const { profile } =
      await requireAuthenticatedProfile()

    const { id: vendorId } =
      await context.params

    // ---------------------------------------------
    // Vendor
    // ---------------------------------------------

    const vendorResult =
      await query<VendorHealthRow>(
        `
        SELECT
          id,
          health_score,
          health_grade,
          health_calculated_at

        FROM vendors

        WHERE id = $1
          AND organization_id = $2

        LIMIT 1
        `,
        [
          vendorId,
          profile.organization_id,
        ]
      )

    const vendor =
      vendorResult.rows[0]

    if (!vendor) {
      return NextResponse.json(
        {
          error:
            "Vendor not found",
        },
        {
          status: 404,
        }
      )
    }

    // ---------------------------------------------
    // Health component inputs
    // ---------------------------------------------

    const [
      metricsResult,
      budgetResult,
    ] = await Promise.all([
      query<MetricHealthRow>(
        `
        SELECT
          vm.id,
          vm.name,
          vm.weight,

          latest.status
            AS latest_status

        FROM vendor_metrics vm

        LEFT JOIN LATERAL (
          SELECT
            vmr.status

          FROM vendor_metric_results vmr

          WHERE vmr.metric_id =
              vm.id

            AND vmr.vendor_id =
              vm.vendor_id

            AND vmr.organization_id =
              vm.organization_id

          ORDER BY
            vmr.period_end DESC,
            vmr.created_at DESC

          LIMIT 1
        ) latest ON TRUE

        WHERE vm.vendor_id = $1
          AND vm.organization_id = $2
          AND vm.is_active = TRUE
        `,
        [
          vendorId,
          profile.organization_id,
        ]
      ),

      query<BudgetHealthRow>(
        `
        SELECT
          budget_amount,
          forecast_amount

        FROM vendor_budgets

        WHERE vendor_id = $1
          AND organization_id = $2

          AND budget_year =
            EXTRACT(
              YEAR
              FROM CURRENT_DATE
            )::int

        LIMIT 1
        `,
        [
          vendorId,
          profile.organization_id,
        ]
      ),
    ])

    // ---------------------------------------------
    // Performance Score
    // ---------------------------------------------

    const measuredMetrics =
      metricsResult.rows.filter(
        (metric) =>
          metric.latest_status ===
            "met" ||
          metric.latest_status ===
            "missed"
      )

    let performanceScore:
      | number
      | null = null

    if (
      measuredMetrics.length > 0
    ) {
      const totalWeight =
        measuredMetrics.reduce(
          (
            total,
            metric
          ) =>
            total +
            Number(
              metric.weight
            ),
          0
        )

      const metWeight =
        measuredMetrics
          .filter(
            (metric) =>
              metric.latest_status ===
              "met"
          )
          .reduce(
            (
              total,
              metric
            ) =>
              total +
              Number(
                metric.weight
              ),
            0
          )

      performanceScore =
        totalWeight > 0
          ? (metWeight /
              totalWeight) *
            100
          : null
    }

    const roundedPerformanceScore =
      performanceScore !== null
        ? Math.round(
            performanceScore *
              10
          ) / 10
        : null

    // ---------------------------------------------
    // Budget Score
    // ---------------------------------------------

    const budget =
      budgetResult.rows[0]

    let budgetScore:
      | number
      | null = null

    if (
      budget &&
      budget.forecast_amount !==
        null
    ) {
      budgetScore =
        calculateBudgetScore(
          Number(
            budget.budget_amount
          ),
          Number(
            budget.forecast_amount
          )
        )
    }

    // ---------------------------------------------
    // Stored Overall Health
    // ---------------------------------------------

    const healthScore =
      vendor.health_score !== null
        ? Number(
            vendor.health_score
          )
        : null

    // ---------------------------------------------
    // Response
    // ---------------------------------------------

    return NextResponse.json({
      health: {
        score: healthScore,

        calculatedGrade:
          vendor.health_grade,

        calculatedAt:
          vendor.health_calculated_at,

        components: {
          performance: {
            score:
              roundedPerformanceScore,

            weight: 70,

            measuredMetrics:
              measuredMetrics.length,

            totalMetrics:
              metricsResult.rows
                .length,
          },

          budget: {
            score:
              budgetScore,

            weight: 30,

            budgetAmount:
              budget
                ? Number(
                    budget.budget_amount
                  )
                : null,

            forecastAmount:
              budget
                ?.forecast_amount !==
                null &&
              budget
                ?.forecast_amount !==
                undefined
                ? Number(
                    budget
                      .forecast_amount
                  )
                : null,
          },
        },
      },
    })
  } catch (error) {
    console.error(
      "GET VENDOR HEALTH ERROR:",
      error
    )

    return NextResponse.json(
      {
        error:
          "Failed to load vendor health",
      },
      {
        status: 500,
      }
    )
  }
}