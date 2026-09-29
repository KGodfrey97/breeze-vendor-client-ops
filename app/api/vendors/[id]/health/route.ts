import { NextResponse } from "next/server"

import { query } from "@/lib/db"
import { requireAuthenticatedProfile } from "@/lib/auth-server"
import { VENDOR_PERFORMANCE_LOOKBACK_MONTHS } from "@/lib/vendor-performance"

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

type MetricHealthSummaryRow = {
  total_metrics: string
  measured_results: string
  met_weight: string | null
  total_measured_weight: string | null
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
      query<MetricHealthSummaryRow>(
        `
        SELECT
          COUNT(DISTINCT vm.id)::text
            AS total_metrics,

          COUNT(result.id) FILTER (
            WHERE result.status IN (
              'met',
              'missed'
            )
          )::text AS measured_results,

          SUM(
            CASE
              WHEN result.status = 'met'
              THEN vm.weight
              ELSE 0
            END
          )::text AS met_weight,

          SUM(
            CASE
              WHEN result.status IN (
                'met',
                'missed'
              )
              THEN vm.weight
              ELSE 0
            END
          )::text AS total_measured_weight

        FROM vendor_metrics vm

        LEFT JOIN vendor_metric_results result
          ON result.metric_id =
            vm.id

          AND result.vendor_id =
            vm.vendor_id

          AND result.organization_id =
            vm.organization_id

          AND result.period_end >= (
            CURRENT_DATE -
            ($3::int * INTERVAL '1 month')
          )

          AND result.period_end <=
            CURRENT_DATE

        WHERE vm.vendor_id = $1
          AND vm.organization_id = $2
          AND vm.is_active = TRUE
        `,
        [
          vendorId,
          profile.organization_id,
          VENDOR_PERFORMANCE_LOOKBACK_MONTHS,
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

    const metricSummary =
      metricsResult.rows[0]

    let performanceScore:
      | number
      | null = null

    const measuredResults =
      Number(
        metricSummary
          ?.measured_results ?? 0
      )

    const totalMetricWeight =
      Number(
        metricSummary
          ?.total_measured_weight ?? 0
      )

    if (totalMetricWeight > 0) {
      performanceScore =
        (Number(
          metricSummary
            ?.met_weight ?? 0
        ) /
          totalMetricWeight) *
        100
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
              measuredResults,

            totalMetrics:
              Number(
                metricSummary
                  ?.total_metrics ?? 0
              ),

            lookbackMonths:
              VENDOR_PERFORMANCE_LOOKBACK_MONTHS,
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
