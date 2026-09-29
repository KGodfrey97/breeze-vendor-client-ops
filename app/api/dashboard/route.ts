import { NextResponse } from "next/server"

import { query } from "@/lib/db"
import { requireAuthenticatedProfile } from "@/lib/auth-server"
import { VENDOR_PERFORMANCE_LOOKBACK_MONTHS } from "@/lib/vendor-performance"

type TotalsRow = {
  vendors: string
  active_vendors: string
}

type BudgetTotalsRow = {
  current_year_budget: string | null
  forecast_spend: string | null
}

type BudgetStatusRow = {
  within_budget: string
  over_budget: string
  no_data: string
}

type BudgetByVendorRow = {
  vendor_id: string
  vendor_name: string
  budget_amount: string
}

type MetricSummaryRow = {
  total_metrics: string
  measured_metrics: string
  met: string
  missed: string
}

type RenewalRow = {
  vendor_id: string
  vendor_name: string
  contract_id: string
  contract_name: string
  renewal_date: string
}

type UpcomingMeetingRow = {
  meeting_id: string
  vendor_id: string
  vendor_name: string
  title: string
  meeting_type: string | null
  scheduled_at: string
  duration_minutes: number | null
  location: string | null
  meeting_link: string | null
}

type DashboardActionRow = {
  id: string
  vendor_id: string
  vendor_name: string
  meeting_id: string
  title: string
  owner_name: string | null
  due_date: string | null
  status:
    | "open"
    | "in_progress"
  meeting_title: string
}

type RenewalCountRow = {
  count: string
}

type HealthSummaryRow = {
  average_score: string | null
  grade_a: string
  grade_b: string
  grade_c: string
  grade_d: string
  grade_f: string
  no_data: string
}

export async function GET() {
  try {
    const { profile } =
      await requireAuthenticatedProfile()

    const organizationId =
      profile.organization_id

    const currentYear =
      new Date().getFullYear()

    const [
      totalsResult,
      budgetTotalsResult,
      budgetStatusResult,
      budgetByVendorResult,
      metricSummaryResult,
      renewalsResult,
      renewalCountResult,
      healthResult,
      upcomingMeetingsResult,
      upcomingActionsResult,
    ] = await Promise.all([
      // ------------------------------------------------
      // Vendor counts
      // ------------------------------------------------

      query<TotalsRow>(
        `
        SELECT
          COUNT(*)::text AS vendors,

          COUNT(*) FILTER (
            WHERE status = 'active'
          )::text AS active_vendors

        FROM vendors

        WHERE organization_id = $1
        `,
        [organizationId]
      ),

      // ------------------------------------------------
      // Current-year budget totals
      // ------------------------------------------------

      query<BudgetTotalsRow>(
        `
        SELECT
          COALESCE(
            SUM(budget_amount),
            0
          )::text AS current_year_budget,

          COALESCE(
            SUM(forecast_amount),
            0
          )::text AS forecast_spend

        FROM vendor_budgets

        WHERE organization_id = $1
          AND budget_year = $2
        `,
        [
          organizationId,
          currentYear,
        ]
      ),

      // ------------------------------------------------
      // Budget status counts
      // ------------------------------------------------

      query<BudgetStatusRow>(
        `
        SELECT
          COUNT(*) FILTER (
            WHERE
              vb.id IS NOT NULL
              AND vb.forecast_amount IS NOT NULL
              AND vb.forecast_amount <= vb.budget_amount
          )::text AS within_budget,

          COUNT(*) FILTER (
            WHERE
              vb.id IS NOT NULL
              AND vb.forecast_amount IS NOT NULL
              AND vb.forecast_amount > vb.budget_amount
          )::text AS over_budget,

          COUNT(*) FILTER (
            WHERE
              vb.id IS NULL
              OR vb.forecast_amount IS NULL
          )::text AS no_data

        FROM vendors v

        LEFT JOIN vendor_budgets vb
          ON vb.vendor_id = v.id
          AND vb.organization_id = v.organization_id
          AND vb.budget_year = $2

        WHERE v.organization_id = $1
        `,
        [
          organizationId,
          currentYear,
        ]
      ),

      // ------------------------------------------------
      // Current-year budget split by vendor
      // ------------------------------------------------

      query<BudgetByVendorRow>(
        `
        SELECT
          v.id AS vendor_id,
          v.name AS vendor_name,
          SUM(vb.budget_amount)::text
            AS budget_amount

        FROM vendor_budgets vb

        JOIN vendors v
          ON v.id = vb.vendor_id
          AND v.organization_id =
            vb.organization_id

        WHERE vb.organization_id = $1
          AND vb.budget_year = $2
          AND vb.budget_amount > 0

        GROUP BY
          v.id,
          v.name

        ORDER BY
          SUM(vb.budget_amount) DESC,
          v.name ASC
        `,
        [
          organizationId,
          currentYear,
        ]
      ),

      // ------------------------------------------------
      // KPI / SLA performance
      // ------------------------------------------------

      query<MetricSummaryRow>(
        `
        SELECT
          COUNT(DISTINCT vm.id)::text AS total_metrics,

          COUNT(result.id) FILTER (
            WHERE result.status IN (
              'met',
              'missed'
            )
          )::text AS measured_metrics,

          COUNT(result.id) FILTER (
            WHERE result.status = 'met'
          )::text AS met,

          COUNT(result.id) FILTER (
            WHERE result.status = 'missed'
          )::text AS missed

        FROM vendor_metrics vm

        LEFT JOIN vendor_metric_results result
          ON result.metric_id = vm.id
          AND result.vendor_id = vm.vendor_id
          AND result.organization_id = vm.organization_id
          AND result.period_end >= (
            CURRENT_DATE -
            ($2::int * INTERVAL '1 month')
          )
          AND result.period_end <= CURRENT_DATE

        WHERE vm.organization_id = $1
          AND vm.is_active = TRUE
        `,
        [
          organizationId,
          VENDOR_PERFORMANCE_LOOKBACK_MONTHS,
        ]
      ),

      // ------------------------------------------------
      // Upcoming renewals
      // Next 90 days, limited to 10 rows for display
      // ------------------------------------------------

      query<RenewalRow>(
        `
        SELECT
          v.id AS vendor_id,
          v.name AS vendor_name,

          c.id AS contract_id,
          c.name AS contract_name,

          COALESCE(
            c.renewal_date,
            c.end_date
          ) AS renewal_date

        FROM contracts c

        JOIN vendors v
          ON v.id = c.vendor_id
          AND v.organization_id = c.organization_id

        WHERE c.organization_id = $1

          AND c.status IN (
            'active',
            'expiring'
          )

          AND COALESCE(
            c.renewal_date,
            c.end_date
          ) IS NOT NULL

          AND COALESCE(
            c.renewal_date,
            c.end_date
          ) >= CURRENT_DATE

          AND COALESCE(
            c.renewal_date,
            c.end_date
          ) <=
            CURRENT_DATE +
            INTERVAL '90 days'

        ORDER BY
          COALESCE(
            c.renewal_date,
            c.end_date
          ) ASC

        LIMIT 10
        `,
        [organizationId]
      ),

      // ------------------------------------------------
      // True count of vendors with upcoming renewals
      // ------------------------------------------------

      query<RenewalCountRow>(
        `
        SELECT
          COUNT(
            DISTINCT c.vendor_id
          )::text AS count

        FROM contracts c

        WHERE c.organization_id = $1

          AND c.status IN (
            'active',
            'expiring'
          )

          AND COALESCE(
            c.renewal_date,
            c.end_date
          ) IS NOT NULL

          AND COALESCE(
            c.renewal_date,
            c.end_date
          ) >= CURRENT_DATE

          AND COALESCE(
            c.renewal_date,
            c.end_date
          ) <=
            CURRENT_DATE +
            INTERVAL '90 days'
        `,
        [organizationId]
      ),

      // ------------------------------------------------
      // Stored vendor health summary
      // ------------------------------------------------

      query<HealthSummaryRow>(
        `
        SELECT
          AVG(health_score)::text
            AS average_score,

          COUNT(*) FILTER (
            WHERE health_grade = 'A'
          )::text AS grade_a,

          COUNT(*) FILTER (
            WHERE health_grade = 'B'
          )::text AS grade_b,

          COUNT(*) FILTER (
            WHERE health_grade = 'C'
          )::text AS grade_c,

          COUNT(*) FILTER (
            WHERE health_grade = 'D'
          )::text AS grade_d,

          COUNT(*) FILTER (
            WHERE health_grade = 'F'
          )::text AS grade_f,

          COUNT(*) FILTER (
            WHERE health_grade IS NULL
          )::text AS no_data

        FROM vendors

        WHERE organization_id = $1
        `,
        [organizationId]
      ),

      // ------------------------------------------------
      // Upcoming meetings
      // ------------------------------------------------
      query<UpcomingMeetingRow>(
        `
        SELECT
          vm.id AS meeting_id,
          vm.vendor_id,
          v.name AS vendor_name,
          vm.title,
          vm.meeting_type,
          vm.scheduled_at,
          vm.duration_minutes,
          vm.location,
          vm.meeting_link

        FROM vendor_meetings vm

        JOIN vendors v
          ON v.id = vm.vendor_id
          AND v.organization_id =
            vm.organization_id

        WHERE vm.organization_id = $1
          AND vm.status = 'scheduled'
          AND vm.scheduled_at >= NOW()

        ORDER BY
          vm.scheduled_at ASC

        LIMIT 6
        `,
        [organizationId]
      ),

      // ------------------------------------------------
      // Actions
      // ------------------------------------------------
      query<DashboardActionRow>(
        `
        SELECT
          ai.id,
          vm.vendor_id,
          v.name AS vendor_name,
          ai.meeting_id,
          ai.title,
          ai.owner_name,
          ai.due_date,
          ai.status,
          vm.title AS meeting_title

        FROM vendor_meeting_action_items ai

        JOIN vendor_meetings vm
          ON vm.id = ai.meeting_id
          AND vm.organization_id =
            ai.organization_id

        JOIN vendors v
          ON v.id = vm.vendor_id
          AND v.organization_id =
            ai.organization_id

        WHERE ai.organization_id = $1
          AND ai.status IN (
            'open',
            'in_progress'
          )

        ORDER BY
          CASE
            WHEN ai.due_date IS NOT NULL
              AND ai.due_date < CURRENT_DATE
            THEN 0

            WHEN ai.due_date = CURRENT_DATE
            THEN 1

            WHEN ai.status = 'in_progress'
            THEN 2

            ELSE 3
          END,

          ai.due_date ASC NULLS LAST,
          ai.created_at ASC

        LIMIT 5
        `,
        [organizationId]
      ),
    ])

    // --------------------------------------------------
    // Totals
    // --------------------------------------------------

    const totalsRow =
      totalsResult.rows[0]

    const budgetRow =
      budgetTotalsResult.rows[0]

    const vendors =
      Number(
        totalsRow?.vendors ?? 0
      )

    const activeVendors =
      Number(
        totalsRow?.active_vendors ??
          0
      )

    const currentYearBudget =
      Number(
        budgetRow
          ?.current_year_budget ??
          0
      )

    const forecastSpend =
      Number(
        budgetRow
          ?.forecast_spend ??
          0
      )

    const budgetVariance =
      currentYearBudget -
      forecastSpend

    const expiringVendors =
      Number(
        renewalCountResult.rows[0]
          ?.count ?? 0
      )

    // --------------------------------------------------
    // Budget status
    // --------------------------------------------------

    const budgetStatusRow =
      budgetStatusResult.rows[0]

    const budgetStatus = {
      withinBudget: Number(
        budgetStatusRow
          ?.within_budget ?? 0
      ),

      overBudget: Number(
        budgetStatusRow
          ?.over_budget ?? 0
      ),

      noData: Number(
        budgetStatusRow
          ?.no_data ?? 0
      ),
    }

    const budgetByVendor =
      budgetByVendorResult.rows.map(
        (row) => ({
          vendorId:
            row.vendor_id,

          vendorName:
            row.vendor_name,

          budgetAmount:
            Number(
              row.budget_amount
            ),
        })
      )

    // --------------------------------------------------
    // Performance
    // --------------------------------------------------

    const metricRow =
      metricSummaryResult.rows[0]

    const totalMetrics =
      Number(
        metricRow
          ?.total_metrics ?? 0
      )

    const measuredMetrics =
      Number(
        metricRow
          ?.measured_metrics ?? 0
      )

    const met =
      Number(
        metricRow?.met ?? 0
      )

    const missed =
      Number(
        metricRow?.missed ?? 0
      )

    const complianceRate =
      measuredMetrics > 0
        ? Math.round(
            (met /
              measuredMetrics) *
              1000
          ) / 10
        : null

    // --------------------------------------------------
    // Health
    // --------------------------------------------------

    const healthRow =
      healthResult.rows[0]

    const averageScore =
      healthRow
        ?.average_score !== null &&
      healthRow
        ?.average_score !== undefined
        ? Math.round(
            Number(
              healthRow.average_score
            ) * 10
          ) / 10
        : null

    const gradeDistribution = {
      A: Number(
        healthRow?.grade_a ?? 0
      ),

      B: Number(
        healthRow?.grade_b ?? 0
      ),

      C: Number(
        healthRow?.grade_c ?? 0
      ),

      D: Number(
        healthRow?.grade_d ?? 0
      ),

      F: Number(
        healthRow?.grade_f ?? 0
      ),

      noData: Number(
        healthRow?.no_data ?? 0
      ),
    }

    // --------------------------------------------------
    // Renewals
    // --------------------------------------------------

    const renewals =
      renewalsResult.rows.map(
        (row) => ({
          vendorId:
            row.vendor_id,

          vendorName:
            row.vendor_name,

          contractId:
            row.contract_id,

          contractName:
            row.contract_name,

          renewalDate:
            row.renewal_date,
        })
      )

    // --------------------------------------------------
    // Meetings
    // --------------------------------------------------
    const upcomingMeetings =
      upcomingMeetingsResult.rows.map(
        (row) => ({
          meetingId:
            row.meeting_id,

          vendorId:
            row.vendor_id,

          vendorName:
            row.vendor_name,

          title:
            row.title,

          meetingType:
            row.meeting_type,

          scheduledAt:
            row.scheduled_at,

          durationMinutes:
            row.duration_minutes,

          location:
            row.location,

          meetingLink:
            row.meeting_link,
        })
      )
    
    // --------------------------------------------------
    // Actions
    // --------------------------------------------------
    const upcomingActions =
      upcomingActionsResult.rows.map(
        (row) => ({
          id: row.id,

          vendorId:
            row.vendor_id,

          vendorName:
            row.vendor_name,

          meetingId:
            row.meeting_id,

          title:
            row.title,

          ownerName:
            row.owner_name,

          dueDate:
            row.due_date,

          status:
            row.status,

          meetingTitle:
            row.meeting_title,
        })
      )
    // --------------------------------------------------
    // Final response
    // --------------------------------------------------

    return NextResponse.json({
      totals: {
        vendors,
        activeVendors,
        currentYearBudget,
        forecastSpend,
        budgetVariance,
        expiringVendors,
      },

      budgetStatus,

      budgetByVendor,

      health: {
        averageScore,
        gradeDistribution,
      },

      performance: {
        totalMetrics,
        measuredMetrics,
        met,
        missed,
        complianceRate,
        lookbackMonths:
          VENDOR_PERFORMANCE_LOOKBACK_MONTHS,
      },

      renewals,

      upcomingMeetings,

      upcomingActions,
    })
  } catch (error) {
    console.error(
      "GET DASHBOARD ERROR:",
      error
    )

    return NextResponse.json(
      {
        error:
          "Failed to load dashboard",
      },
      {
        status: 500,
      }
    )
  }
}
