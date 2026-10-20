
import { NextRequest, NextResponse } from "next/server"

import { query } from "@/lib/db"
import {
  requireAuthenticatedProfile,
  isUnauthorizedError,
} from "@/lib/auth-server"

import {
  calculateMetricStatus,
  type ComparisonOperator,
} from "@/lib/vendor-report-scoring"

export const runtime = "nodejs"

type RouteContext = {
  params: Promise<{ id: string }>
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { profile } = await requireAuthenticatedProfile()
    const { id } = await context.params

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: "Invalid report ID" },
        { status: 400 }
      )
    }

    const reportResult = await query(
      `
        SELECT id, original_filename, status
        FROM vendor_reports
        WHERE id = $1
          AND organization_id = $2
      `,
      [id, profile.organization_id]
    )

    const report = reportResult.rows[0]

    if (!report) {
      return NextResponse.json(
        { error: "Report not found" },
        { status: 404 }
      )
    }

    const result = await query(
      `
        SELECT
          e.id,
          e.source_label,
          e.source_location,
          e.raw_value,
          e.normalized_value,
          e.validation_status,
          e.validation_message,
          e.period_start::text AS period_start,
          e.period_end::text AS period_end,
          m.id AS metric_id,
          m.name AS metric_name,
          m.metric_type,
          m.unit,
          m.target_value,
          m.comparison_operator
        FROM vendor_report_extractions e
        LEFT JOIN vendor_metrics m
          ON m.id = e.metric_id
         AND m.vendor_id = e.vendor_id
         AND m.organization_id = e.organization_id
        WHERE e.report_id = $1
          AND e.organization_id = $2
        ORDER BY e.created_at ASC, e.id ASC
      `,
      [id, profile.organization_id]
    )

    const extractions = result.rows.map((row) => {
      let calculatedStatus: string | null = null

      if (
        row.validation_status === "matched" &&
        row.metric_id &&
        row.normalized_value !== null
      ) {
        calculatedStatus = calculateMetricStatus(
          Number(row.normalized_value),
          Number(row.target_value),
          row.comparison_operator as ComparisonOperator
        )
      }

      return {
        ...row,
        calculated_status: calculatedStatus,
      }
    })

    return NextResponse.json({
      report,
      extractions,
    })
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    console.error("Report extractions GET error:", error)

    return NextResponse.json(
      { error: "Failed to load extracted metrics" },
      { status: 500 }
    )
  }
}
