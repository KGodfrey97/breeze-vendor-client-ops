import {
  NextRequest,
  NextResponse,
} from "next/server"

import { query } from "@/lib/db"
import {
  requireAuthenticatedProfile,
} from "@/lib/auth-server"

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type MetricStatus =
  | "met"
  | "missed"
  | "awaiting"

type MetricType =
  | "KPI"
  | "SLA"

type SummaryRow = {
  total_metrics: string
  measured_metrics: string
  met: string
  missed: string
  awaiting: string
}

type VendorFilterRow = {
  id: string
  name: string
}

type LineOfBusinessFilterRow = {
  id: string
  name: string
}

type TrendRow = {
  period: string
  met: string
  missed: string
}

type VendorPerformanceRow = {
  vendor_id: string
  vendor_name: string
  met: string
  missed: string
  awaiting: string
}

type MetricResultRow = {
  id: string

  vendor_id: string
  vendor_name: string

  line_of_business_id:
    | string
    | null

  line_of_business_name:
    | string
    | null

  metric_name: string

  metric_type:
    | "kpi"
    | "sla"

  unit: string

  comparison_operator: string

  target_value: string

  actual_value:
    | string
    | null

  status:
    | "met"
    | "missed"
    | "not_measured"
    | null

  period_start:
    | string
    | null

  period_end:
    | string
    | null
}

/* -------------------------------------------------------------------------- */
/* Parameter Helpers                                                          */
/* -------------------------------------------------------------------------- */

function parseMonths(
  value: string | null
) {
  const parsed =
    Number(value)

  if (
    parsed === 3 ||
    parsed === 6 ||
    parsed === 12
  ) {
    return parsed
  }

  return 6
}

function parseStatus(
  value: string | null
):
  | "met"
  | "missed"
  | "awaiting"
  | null {
  if (
    value === "met" ||
    value === "missed" ||
    value === "awaiting"
  ) {
    return value
  }

  return null
}

function parseMetricType(
  value: string | null
):
  | "kpi"
  | "sla"
  | null {
  if (value === "KPI") {
    return "kpi"
  }

  if (value === "SLA") {
    return "sla"
  }

  return null
}

/* -------------------------------------------------------------------------- */
/* Display Helpers                                                            */
/* -------------------------------------------------------------------------- */

function formatMetricValue(
  value: string | null,
  unit: string
) {
  if (
    value === null ||
    value === undefined
  ) {
    return null
  }

  const numericValue =
    Number(value)

  if (
    Number.isNaN(
      numericValue
    )
  ) {
    return value
  }

  const formatted =
    numericValue.toLocaleString(
      "en-US",
      {
        maximumFractionDigits: 4,
      }
    )

  const normalizedUnit =
    unit
      .trim()
      .toLowerCase()

  if (
    normalizedUnit === "%" ||
    normalizedUnit ===
      "percent" ||
    normalizedUnit ===
      "percentage"
  ) {
    return `${formatted}%`
  }

  if (
    normalizedUnit === "$" ||
    normalizedUnit ===
      "currency" ||
    normalizedUnit === "usd"
  ) {
    return `$${numericValue.toLocaleString(
      "en-US",
      {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }
    )}`
  }

  if (!unit.trim()) {
    return formatted
  }

  return `${formatted} ${unit}`
}

function formatTarget(
  operator: string,
  targetValue: string,
  unit: string
) {
  const value =
    formatMetricValue(
      targetValue,
      unit
    )

  if (!value) {
    return null
  }

  return `${operator} ${value}`
}

function formatPeriod(
  periodStart: string | null,
  periodEnd: string | null
) {
  if (!periodStart && !periodEnd) {
    return null
  }

  const formatDate = (
    value: string
  ) => {
    const [
      year,
      month,
      day,
    ] = value
      .split("-")
      .map(Number)

    if (
      !year ||
      !month ||
      !day
    ) {
      return value
    }

    const date =
      new Date(
        Date.UTC(
          year,
          month - 1,
          day
        )
      )

    return date.toLocaleDateString(
      "en-US",
      {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }
    )
  }

  /*
   * Both dates available:
   *
   * Jul 1, 2026 – Jul 31, 2026
   */
  if (
    periodStart &&
    periodEnd
  ) {
    return `${formatDate(
      periodStart
    )} – ${formatDate(
      periodEnd
    )}`
  }

  /*
   * Fallback if only one
   * date exists.
   */

  if (periodStart) {
    return formatDate(
      periodStart
    )
  }

  if (periodEnd) {
    return formatDate(
      periodEnd
    )
  }

  return null
}

/* -------------------------------------------------------------------------- */
/* GET                                                                        */
/* -------------------------------------------------------------------------- */

export async function GET(
  request: NextRequest
) {
  try {
    /* ---------------------------------------------------------------------- */
    /* Authentication                                                         */
    /* ---------------------------------------------------------------------- */

    const { profile } =
      await requireAuthenticatedProfile()

    const organizationId =
      profile.organization_id

    /* ---------------------------------------------------------------------- */
    /* Query Parameters                                                       */
    /* ---------------------------------------------------------------------- */

    const searchParams =
      request.nextUrl.searchParams

    const months =
      parseMonths(
        searchParams.get(
          "months"
        )
      )

    const status =
      parseStatus(
        searchParams.get(
          "status"
        )
      )

    const metricType =
      parseMetricType(
        searchParams.get(
          "type"
        )
      )

    const vendorId =
      searchParams.get(
        "vendorId"
      )

    const lineOfBusinessId =
      searchParams.get(
        "lineOfBusinessId"
      )

    /* ---------------------------------------------------------------------- */
    /* Dynamic Metric Filters                                                 */
    /* ---------------------------------------------------------------------- */

    /*
     * Shared parameter order:
     *
     * $1 = organizationId
     * $2 = months
     *
     * Additional parameters
     * begin at $3.
     */

    const filterValues:
      unknown[] = [
        organizationId,
        months,
      ]

    const metricConditions:
      string[] = [
        "vm.organization_id = $1",
        "vm.is_active = TRUE",
      ]

    /* Vendor */

    if (vendorId) {
      filterValues.push(
        vendorId
      )

      metricConditions.push(
        `vm.vendor_id = $${filterValues.length}`
      )
    }

    /* KPI / SLA */

    if (metricType) {
      filterValues.push(
        metricType
      )

      metricConditions.push(
        `vm.metric_type = $${filterValues.length}`
      )
    }

    /* Line of Business */

    if (lineOfBusinessId) {
      filterValues.push(
        lineOfBusinessId
      )

      metricConditions.push(`
        EXISTS (
          SELECT 1

          FROM vendors filter_vendor

          WHERE
            filter_vendor.id =
              vm.vendor_id

            AND
            filter_vendor.organization_id =
              vm.organization_id

            AND
            filter_vendor.line_of_business_id =
              $${filterValues.length}
        )
      `)
    }

    const metricWhere =
      metricConditions.join(
        "\nAND "
      )

    /* ---------------------------------------------------------------------- */
    /* Metric Results Status Filter                                           */
    /* ---------------------------------------------------------------------- */

    let statusCondition = ""

    if (status === "met") {
      statusCondition = `
        AND latest.status = 'met'
      `
    }

    if (status === "missed") {
      statusCondition = `
        AND latest.status = 'missed'
      `
    }

    if (
      status === "awaiting"
    ) {
      statusCondition = `
        AND (
          latest.id IS NULL
          OR
          latest.status =
            'not_measured'
        )
      `
    }

    /* ---------------------------------------------------------------------- */
    /* Vendor Dropdown Filters                                                */
    /* ---------------------------------------------------------------------- */

    /*
     * The vendor dropdown is
     * filtered by the selected
     * line of business.
     *
     * We intentionally don't apply
     * vendorId here so all vendors
     * within the selected LOB remain
     * available in the dropdown.
     */

    const vendorFilterValues:
      unknown[] = [
        organizationId,
      ]

    const vendorConditions:
      string[] = [
        "v.organization_id = $1",
      ]

    if (lineOfBusinessId) {
      vendorFilterValues.push(
        lineOfBusinessId
      )

      vendorConditions.push(
        `v.line_of_business_id = $${vendorFilterValues.length}`
      )
    }

    const vendorWhere =
      vendorConditions.join(
        "\nAND "
      )

    /* ---------------------------------------------------------------------- */
    /* Queries                                                                */
    /* ---------------------------------------------------------------------- */

    const [
      summaryResult,
      vendorsResult,
      linesOfBusinessResult,
      trendResult,
      vendorPerformanceResult,
      metricsResult,
    ] = await Promise.all([
      /* -------------------------------------------------------------------- */
      /* Summary                                                              */
      /* -------------------------------------------------------------------- */

      query<SummaryRow>(
        `
        WITH filtered_metrics AS (
          SELECT
            vm.id,
            vm.vendor_id

          FROM vendor_metrics vm

          WHERE
            ${metricWhere}
        ),

        latest_results AS (
          SELECT DISTINCT ON (
            vmr.metric_id
          )
            vmr.id,
            vmr.metric_id,
            vmr.vendor_id,
            vmr.status,
            vmr.period_start,
            vmr.period_end,
            vmr.actual_value

          FROM vendor_metric_results vmr

          JOIN filtered_metrics fm
            ON fm.id =
              vmr.metric_id

          WHERE
            vmr.organization_id =
              $1

            AND
            vmr.period_end >= (
              CURRENT_DATE -
              (
                $2::int *
                INTERVAL '1 month'
              )
            )

            AND
            vmr.period_end <=
              CURRENT_DATE

          ORDER BY
            vmr.metric_id,
            vmr.period_end DESC,
            vmr.created_at DESC
        )

        SELECT
          COUNT(
            DISTINCT fm.id
          )::text
            AS total_metrics,

          COUNT(
            DISTINCT fm.id
          ) FILTER (
            WHERE
              latest.status IN (
                'met',
                'missed'
              )
          )::text
            AS measured_metrics,

          COUNT(
            DISTINCT fm.id
          ) FILTER (
            WHERE
              latest.status =
                'met'
          )::text
            AS met,

          COUNT(
            DISTINCT fm.id
          ) FILTER (
            WHERE
              latest.status =
                'missed'
          )::text
            AS missed,

          COUNT(
            DISTINCT fm.id
          ) FILTER (
            WHERE
              latest.id IS NULL
              OR
              latest.status =
                'not_measured'
          )::text
            AS awaiting

        FROM filtered_metrics fm

        LEFT JOIN latest_results latest
          ON latest.metric_id =
            fm.id
        `,
        filterValues
      ),

      /* -------------------------------------------------------------------- */
      /* Vendor Filter Options                                                */
      /* -------------------------------------------------------------------- */

      query<VendorFilterRow>(
        `
        SELECT
          v.id,
          v.name

        FROM vendors v

        WHERE
          ${vendorWhere}

        ORDER BY
          v.name ASC
        `,
        vendorFilterValues
      ),

      /* -------------------------------------------------------------------- */
      /* Line of Business Filter Options                                      */
      /* -------------------------------------------------------------------- */

      query<LineOfBusinessFilterRow>(
        `
        SELECT
          lob.id,
          lob.name

        FROM lines_of_business lob

        WHERE
          lob.organization_id =
            $1

          AND
          lob.is_active = TRUE

        ORDER BY
          lob.name ASC
        `,
        [
          organizationId,
        ]
      ),

      /* -------------------------------------------------------------------- */
      /* Compliance Trend                                                     */
      /* -------------------------------------------------------------------- */

      query<TrendRow>(
        `
        SELECT
          TO_CHAR(
            DATE_TRUNC(
              'month',
              vmr.period_end
            ),
            'Mon YYYY'
          ) AS period,

          DATE_TRUNC(
            'month',
            vmr.period_end
          ) AS period_sort,

          COUNT(*) FILTER (
            WHERE
              vmr.status =
                'met'
          )::text
            AS met,

          COUNT(*) FILTER (
            WHERE
              vmr.status =
                'missed'
          )::text
            AS missed

        FROM vendor_metric_results vmr

        JOIN vendor_metrics vm
          ON vm.id =
            vmr.metric_id

          AND
          vm.vendor_id =
            vmr.vendor_id

          AND
          vm.organization_id =
            vmr.organization_id

        WHERE
          ${metricWhere}

          AND
          vmr.period_end >= (
            CURRENT_DATE -
            (
              $2::int *
              INTERVAL '1 month'
            )
          )

          AND
          vmr.period_end <=
            CURRENT_DATE

          AND
          vmr.status IN (
            'met',
            'missed'
          )

        GROUP BY
          DATE_TRUNC(
            'month',
            vmr.period_end
          )

        ORDER BY
          period_sort ASC
        `,
        filterValues
      ),

      /* -------------------------------------------------------------------- */
      /* Vendor Performance                                                   */
      /* -------------------------------------------------------------------- */

      query<VendorPerformanceRow>(
        `
        WITH filtered_metrics AS (
          SELECT
            vm.id,
            vm.vendor_id

          FROM vendor_metrics vm

          WHERE
            ${metricWhere}
        ),

        latest_results AS (
          SELECT DISTINCT ON (
            vmr.metric_id
          )
            vmr.id,
            vmr.metric_id,
            vmr.vendor_id,
            vmr.status,
            vmr.period_end

          FROM vendor_metric_results vmr

          JOIN filtered_metrics fm
            ON fm.id =
              vmr.metric_id

          WHERE
            vmr.organization_id =
              $1

            AND
            vmr.period_end >= (
              CURRENT_DATE -
              (
                $2::int *
                INTERVAL '1 month'
              )
            )

            AND
            vmr.period_end <=
              CURRENT_DATE

          ORDER BY
            vmr.metric_id,
            vmr.period_end DESC,
            vmr.created_at DESC
        )

        SELECT
          v.id AS vendor_id,

          v.name AS vendor_name,

          COUNT(
            DISTINCT fm.id
          ) FILTER (
            WHERE
              latest.status =
                'met'
          )::text
            AS met,

          COUNT(
            DISTINCT fm.id
          ) FILTER (
            WHERE
              latest.status =
                'missed'
          )::text
            AS missed,

          COUNT(
            DISTINCT fm.id
          ) FILTER (
            WHERE
              latest.id IS NULL
              OR
              latest.status =
                'not_measured'
          )::text
            AS awaiting

        FROM filtered_metrics fm

        JOIN vendors v
          ON v.id =
            fm.vendor_id

          AND
          v.organization_id =
            $1

        LEFT JOIN latest_results latest
          ON latest.metric_id =
            fm.id

        GROUP BY
          v.id,
          v.name

        ORDER BY
          v.name ASC
        `,
        filterValues
      ),

      /* -------------------------------------------------------------------- */
      /* Individual Metric Results                                            */
      /* -------------------------------------------------------------------- */

      query<MetricResultRow>(
        `
        WITH filtered_metrics AS (
          SELECT
            vm.id,
            vm.vendor_id,
            vm.name,
            vm.metric_type,
            vm.unit,
            vm.comparison_operator,
            vm.target_value

          FROM vendor_metrics vm

          WHERE
            ${metricWhere}
        ),

        latest_results AS (
          SELECT DISTINCT ON (
            vmr.metric_id
          )
            vmr.id,
            vmr.metric_id,
            vmr.vendor_id,
            vmr.actual_value,
            vmr.status,
            vmr.period_start,
            vmr.period_end

          FROM vendor_metric_results vmr

          JOIN filtered_metrics fm
            ON fm.id =
              vmr.metric_id

          WHERE
            vmr.organization_id =
              $1

            AND
            vmr.period_end >= (
              CURRENT_DATE -
              (
                $2::int *
                INTERVAL '1 month'
              )
            )

            AND
            vmr.period_end <=
              CURRENT_DATE

          ORDER BY
            vmr.metric_id,
            vmr.period_end DESC,
            vmr.created_at DESC
        )

        SELECT
          COALESCE(
            latest.id,
            fm.id
          ) AS id,

          fm.vendor_id,

          v.name
            AS vendor_name,

          v.line_of_business_id,

          lob.name
            AS line_of_business_name,

          fm.name
            AS metric_name,

          fm.metric_type,

          fm.unit,

          fm.comparison_operator,

          fm.target_value::text,

          latest.actual_value::text,

          latest.status,

          TO_CHAR(
            latest.period_start,
            'YYYY-MM-DD'
          ) AS period_start,

          TO_CHAR(
            latest.period_end,
            'YYYY-MM-DD'
          ) AS period_end

        FROM filtered_metrics fm

        JOIN vendors v
          ON v.id =
            fm.vendor_id

          AND
          v.organization_id =
            $1

        LEFT JOIN lines_of_business lob
          ON lob.id =
            v.line_of_business_id

          AND
          lob.organization_id =
            v.organization_id

        LEFT JOIN latest_results latest
          ON latest.metric_id =
            fm.id

        WHERE TRUE

        ${statusCondition}

        ORDER BY
          CASE
            WHEN
              latest.status =
                'missed'
            THEN 0

            WHEN
              latest.id IS NULL
              OR
              latest.status =
                'not_measured'
            THEN 1

            WHEN
              latest.status =
                'met'
            THEN 2

            ELSE 3
          END,

          v.name ASC,

          fm.name ASC
        `,
        filterValues
      ),
    ])

    /* ---------------------------------------------------------------------- */
    /* Summary                                                                */
    /* ---------------------------------------------------------------------- */

    const summaryRow =
      summaryResult.rows[0]

    const totalMetrics =
      Number(
        summaryRow
          ?.total_metrics ??
          0
      )

    const measuredMetrics =
      Number(
        summaryRow
          ?.measured_metrics ??
          0
      )

    const met =
      Number(
        summaryRow
          ?.met ??
          0
      )

    const missed =
      Number(
        summaryRow
          ?.missed ??
          0
      )

    const awaiting =
      Number(
        summaryRow
          ?.awaiting ??
          0
      )

    /*
     * Compliance is based only
     * on measured metrics:
     *
     * met / (met + missed)
     */

    const complianceRate =
      measuredMetrics > 0
        ? Math.round(
            (
              met /
              measuredMetrics
            ) *
              1000
          ) / 10
        : null

    /* ---------------------------------------------------------------------- */
    /* Filter Options                                                         */
    /* ---------------------------------------------------------------------- */

    const vendors =
      vendorsResult.rows.map(
        (row) => ({
          id: row.id,
          name: row.name,
        })
      )

    const linesOfBusiness =
      linesOfBusinessResult.rows.map(
        (row) => ({
          id: row.id,
          name: row.name,
        })
      )

    /* ---------------------------------------------------------------------- */
    /* Compliance Trend                                                       */
    /* ---------------------------------------------------------------------- */

    const trend =
      trendResult.rows.map(
        (row) => {
          const trendMet =
            Number(
              row.met ?? 0
            )

          const trendMissed =
            Number(
              row.missed ?? 0
            )

          const trendMeasured =
            trendMet +
            trendMissed

          const trendCompliance =
            trendMeasured > 0
              ? Math.round(
                  (
                    trendMet /
                    trendMeasured
                  ) *
                    1000
                ) / 10
              : null

          return {
            period:
              row.period,

            complianceRate:
              trendCompliance,
          }
        }
      )

    /* ---------------------------------------------------------------------- */
    /* Vendor Performance                                                     */
    /* ---------------------------------------------------------------------- */

    const vendorPerformance =
      vendorPerformanceResult.rows.map(
        (row) => {
          const vendorMet =
            Number(
              row.met ?? 0
            )

          const vendorMissed =
            Number(
              row.missed ?? 0
            )

          const vendorAwaiting =
            Number(
              row.awaiting ?? 0
            )

          const vendorMeasured =
            vendorMet +
            vendorMissed

          const vendorComplianceRate =
            vendorMeasured > 0
              ? Math.round(
                  (
                    vendorMet /
                    vendorMeasured
                  ) *
                    1000
                ) / 10
              : null

          return {
            vendorId:
              row.vendor_id,

            vendorName:
              row.vendor_name,

            complianceRate:
              vendorComplianceRate,

            met:
              vendorMet,

            missed:
              vendorMissed,

            awaiting:
              vendorAwaiting,
          }
        }
      )

    /* ---------------------------------------------------------------------- */
    /* Metric Results                                                         */
    /* ---------------------------------------------------------------------- */

    const metrics =
      metricsResult.rows.map(
        (row) => {
          let resultStatus:
            MetricStatus

          if (
            row.status ===
            "met"
          ) {
            resultStatus =
              "met"
          } else if (
            row.status ===
            "missed"
          ) {
            resultStatus =
              "missed"
          } else {
            /*
             * This includes:
             *
             * 1. Explicit
             *    not_measured
             *
             * 2. No result at all
             *    in the selected
             *    reporting window
             */

            resultStatus =
              "awaiting"
          }

          return {
            id:
              row.id,

            vendorId:
              row.vendor_id,

            vendorName:
              row.vendor_name,

            lineOfBusinessId:
              row.line_of_business_id,

            lineOfBusinessName:
              row.line_of_business_name,

            metricName:
              row.metric_name,

            metricType:
              row.metric_type
                .toUpperCase() as MetricType,

            target:
              formatTarget(
                row.comparison_operator,
                row.target_value,
                row.unit
              ),

            actual:
              formatMetricValue(
                row.actual_value,
                row.unit
              ),

            status:
              resultStatus,

            period:
              formatPeriod(
                row.period_start,
                row.period_end
              ),
          }
        }
      )

    /* ---------------------------------------------------------------------- */
    /* Response                                                               */
    /* ---------------------------------------------------------------------- */

    return NextResponse.json({
      summary: {
        complianceRate,

        met,

        missed,

        awaiting,

        measuredMetrics,

        totalMetrics,
      },

      filters: {
        vendors,

        linesOfBusiness,
      },

      trend,

      vendorPerformance,

      metrics,
    })
  } catch (error) {
    console.error(
      "GET ANALYTICS ERROR:",
      error
    )

    return NextResponse.json(
      {
        error:
          "Failed to load analytics",
      },
      {
        status: 500,
      }
    )
  }
}