
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
export const dynamic = "force-dynamic"

type Context = {
  params: Promise<{ id: string }>
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(
  _request: NextRequest,
  context: Context
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
      SELECT
        r.id,
        r.vendor_id,
        v.name AS vendor_name,
        r.original_filename,
        r.status,
        r.period_start::text AS period_start,
        r.period_end::text AS period_end,
        r.uploaded_at
      FROM vendor_reports r
      JOIN vendors v
        ON v.id = r.vendor_id
       AND v.organization_id = r.organization_id
      WHERE r.id = $1
        AND r.organization_id = $2
      LIMIT 1
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


    const availableMetricsResult = await query(
    `
    SELECT
        id,
        name,
        metric_type,
        unit,
        comparison_operator,
        target_value
    FROM vendor_metrics
    WHERE organization_id = $1
        AND vendor_id = $2
        AND is_active = TRUE
    ORDER BY metric_type, name
    `,
    [profile.organization_id, report.vendor_id]
    )

    const availableMetrics = availableMetricsResult.rows


    const extractionResult = await query(
      `
      SELECT
        e.id,
        e.metric_id,
        e.source_label,
        e.source_location,
        e.raw_value,
        e.normalized_value,
        e.validation_status,
        e.validation_message,
        e.period_start::text AS period_start,
        e.period_end::text AS period_end,

        m.name AS metric_name,
        m.metric_type,
        m.unit,
        m.target_value,
        m.comparison_operator,
        m.is_active AS metric_is_active,

        mr.id AS existing_result_id,
        mr.actual_value AS existing_actual_value,
        mr.status AS existing_status,

        CASE
        WHEN EXISTS (
            SELECT 1
            FROM vendor_report_import_results ir
            JOIN vendor_report_imports i
            ON i.id = ir.import_id
            WHERE ir.metric_result_id = mr.id
            AND ir.extraction_id = e.id
            AND i.report_id = e.report_id
            AND i.organization_id = e.organization_id
            AND i.status = 'completed'
        )
        THEN TRUE
        ELSE FALSE
        END AS imported_from_this_report

      FROM vendor_report_extractions e

      LEFT JOIN vendor_metrics m
        ON m.id = e.metric_id
       AND m.organization_id = e.organization_id
       AND m.vendor_id = e.vendor_id

      LEFT JOIN vendor_metric_results mr
        ON mr.metric_id = e.metric_id
       AND mr.period_start = e.period_start
       AND mr.period_end = e.period_end

      WHERE e.report_id = $1
        AND e.organization_id = $2

      ORDER BY e.created_at ASC, e.id ASC
      `,
      [id, profile.organization_id]
    )

    const extractions = extractionResult.rows.map((row) => {
      let calculatedStatus: "met" | "missed" | null = null

      if (
        ["matched", "approved"].includes(
            row.validation_status
        ) &&
        row.metric_id &&
        row.normalized_value !== null &&
        row.target_value !== null &&
        row.comparison_operator
    ) {
        calculatedStatus = calculateMetricStatus(
          Number(row.normalized_value),
          Number(row.target_value),
          row.comparison_operator as ComparisonOperator
        ) as "met" | "missed"
      }

      return {
        ...row,
        calculated_status: calculatedStatus,
      }
    })

    
    const matched = extractions.filter(
    (row) =>
        ["matched", "approved"].includes(
        row.validation_status
        ) &&
        row.metric_id &&
        row.metric_is_active &&
        row.normalized_value !== null
    )

    const ignored = extractions.filter(
    (row) => row.validation_status === "ignored"
    )

    const needsReview = extractions.filter(
    (row) =>
        !["matched", "approved", "ignored"].includes(
        row.validation_status
        )
    )

    const met = matched.filter(
    (row) => row.calculated_status === "met"
    ).length

    const missed = matched.filter(
    (row) => row.calculated_status === "missed"
    ).length

    const conflicts = matched.filter(
    (row) =>
        row.existing_result_id &&
        !row.imported_from_this_report
    ).length

    const duplicateMetricIds = new Set<string>()
    const encounteredMetricIds = new Set<string>()

    for (const row of matched) {
    const metricId = String(row.metric_id)

    if (encounteredMetricIds.has(metricId)) {
        duplicateMetricIds.add(metricId)
    }

    encounteredMetricIds.add(metricId)
    }

    const hasInvalidPeriods = matched.some(
    (row) =>
        row.period_start !== report.period_start ||
        row.period_end !== report.period_end
    )

    const canImport =
    report.status === "ready" &&
    extractions.length > 0 &&
    matched.length > 0 &&
    matched.length + ignored.length ===
        extractions.length &&
    needsReview.length === 0 &&
    conflicts === 0 &&
    duplicateMetricIds.size === 0 &&
    !hasInvalidPeriods

    return NextResponse.json({
    report,
    extractions,
    availableMetrics,
    summary: {
        total: extractions.length,
        matched: matched.length,
        ignored: ignored.length,
        met,
        missed,
        conflicts,
        needsReview: needsReview.length,
        duplicateMappings: duplicateMetricIds.size,
        canImport,
    },
    })

  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    console.error("Report import review error:", error)

    return NextResponse.json(
      { error: "Failed to load report review" },
      { status: 500 }
    )
  }
}

export async function POST(
  _request: NextRequest,
  context: Context
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

    // The database function performs the actual
    // validation and atomic import.
    const result = await query(
      `
      SELECT public.import_vendor_report(
        $1::uuid,
        $2::uuid,
        $3::uuid
      ) AS imported_count
      `,
      [id, profile.organization_id, profile.id]
    )

    return NextResponse.json({
      success: true,
      reportId: id,
      status: "imported",
      importedCount:
        Number(result.rows[0]?.imported_count ?? 0),
    })
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const dbError = error as {
      code?: string
      message?: string
    }

    // Validation failures and unique conflicts
    // should not be presented as server crashes.
    if (
      dbError.code === "P0001" ||
      dbError.code === "23505" ||
      dbError.code === "23503" ||
      dbError.code === "23514"
    ) {
      return NextResponse.json(
        {
          error:
            dbError.code === "P0001"
              ? dbError.message ?? "Import validation failed"
              : "Import conflicts with existing database records.",
        },
        { status: 409 }
      )
    }

    console.error("Vendor report import error:", error)

    return NextResponse.json(
      { error: "Failed to import KPI/SLA results" },
      { status: 500 }
    )
  }
}
