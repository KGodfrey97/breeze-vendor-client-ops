import { NextRequest, NextResponse } from "next/server"
import { GetObjectCommand } from "@aws-sdk/client-s3"

import { query } from "@/lib/db"
import {
  requireAuthenticatedProfile,
  isUnauthorizedError,
} from "@/lib/auth-server"
import { s3, getVendorReportBucket } from "@/lib/s3"
import {
  extractCsvMetrics,
  extractExcelMetrics,
  type ExtractedMetricRow,
} from "@/lib/vendor-report-extraction"
import {
  calculateMetricStatus,
  type ComparisonOperator,
} from "@/lib/vendor-report-scoring"

export const runtime = "nodejs"

const MAX_PROCESSING_SIZE = 2 * 1024 * 1024
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type RouteContext = {
  params: Promise<{ id: string }>
}

type MetricDefinition = {
  id: string
  name: string
  unit: string
  comparison_operator: ComparisonOperator
  target_value: string | number
}

type TemplateMapping = {
  source_column: string
  metric_id: string
}

type ProcessedRow = ExtractedMetricRow & {
  metricId: string | null
  validationStatus: "matched" | "needs_review" | "ignored"
  validationMessage: string | null
}

function normalizeMetricName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ")
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  let claimedReportId: string | null = null
  let organizationId: string | null = null

  try {
    const { profile } = await requireAuthenticatedProfile()
    organizationId = profile.organization_id

    const { id } = await context.params
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: "Invalid report ID" },
        { status: 400 }
      )
    }

    const reportResult = await query(
      `
        SELECT id, vendor_id, s3_bucket, s3_key,
               original_filename, file_size_bytes,
               period_start::text AS period_start,
               period_end::text AS period_end, status
        FROM vendor_reports
        WHERE id = $1 AND organization_id = $2
        LIMIT 1
      `,
      [id, organizationId]
    )

    const report = reportResult.rows[0]
    if (!report) {
      return NextResponse.json(
        { error: "Report not found" },
        { status: 404 }
      )
    }
    if (report.status !== "uploaded") {
      return NextResponse.json(
        { error: "Only uploaded reports can be processed." },
        { status: 409 }
      )
    }

    const declaredSize = Number(report.file_size_bytes)
    if (
      !Number.isSafeInteger(declaredSize) ||
      declaredSize <= 0 ||
      declaredSize > MAX_PROCESSING_SIZE
    ) {
      return NextResponse.json(
        { error: "Processing currently supports files up to 2 MB." },
        { status: 400 }
      )
    }

    const extension = report.original_filename
      .toLowerCase()
      .match(/\.[^.]+$/)?.[0]

    if (extension !== ".csv" && extension !== ".xlsx") {
      return NextResponse.json(
        { error: "Automatic extraction currently supports CSV and XLSX only." },
        { status: 400 }
      )
    }

    const body: unknown = await request.json().catch(() => null)
    const templateId =
      body && typeof body === "object" && "templateId" in body
        ? (body as { templateId?: unknown }).templateId ?? null
        : null

    if (
      templateId !== null &&
      (typeof templateId !== "string" || !UUID_REGEX.test(templateId))
    ) {
      return NextResponse.json(
        { error: "Invalid report template ID" },
        { status: 400 }
      )
    }

    let templateMappings: TemplateMapping[] = []
    let ignoredTemplateLabels: string[] = []

    if (templateId) {
      const templateResult = await query(
        `
          SELECT file_type, extraction_config
          FROM vendor_report_templates
          WHERE id = $1
            AND organization_id = $2
            AND vendor_id = $3
            AND is_active = TRUE
          LIMIT 1
        `,
        [templateId, organizationId, report.vendor_id]
      )

      const template = templateResult.rows[0]
      if (!template) {
        return NextResponse.json(
          { error: "Template not found for this vendor" },
          { status: 404 }
        )
      }
      if (template.file_type !== extension) {
        return NextResponse.json(
          { error: "Template file type does not match the report" },
          { status: 400 }
        )
      }

      const mappingsResult = await query(
        `
          SELECT tm.source_column, tm.metric_id
          FROM vendor_report_template_mappings tm
          JOIN vendor_metrics m
            ON m.id = tm.metric_id
           AND m.organization_id = $2
           AND m.vendor_id = $3
           AND m.is_active = TRUE
          WHERE tm.template_id = $1
        `,
        [templateId, organizationId, report.vendor_id]
      )
      templateMappings = mappingsResult.rows as TemplateMapping[]

      const config = template.extraction_config as {
        ignoredLabels?: unknown
      } | null

      ignoredTemplateLabels = Array.isArray(config?.ignoredLabels)
        ? config.ignoredLabels.filter(
            (value): value is string => typeof value === "string"
          )
        : []
    }

    // Claim the report before downloading and parsing it.
    const claim = await query(
      `
        UPDATE vendor_reports
        SET status = 'processing', updated_at = now(), error_message = NULL
        WHERE id = $1 AND organization_id = $2 AND status = 'uploaded'
        RETURNING id
      `,
      [id, organizationId]
    )
    if (claim.rows.length === 0) {
      return NextResponse.json(
        { error: "Report is already being processed." },
        { status: 409 }
      )
    }
    claimedReportId = id

    if (report.s3_bucket !== getVendorReportBucket()) {
      throw new Error("Unexpected S3 bucket")
    }

    const object = await s3.send(
      new GetObjectCommand({
        Bucket: getVendorReportBucket(),
        Key: report.s3_key,
      })
    )
    if (
      !object.Body ||
      object.ContentLength == null ||
      object.ContentLength <= 0 ||
      object.ContentLength > MAX_PROCESSING_SIZE ||
      object.ContentLength !== declaredSize
    ) {
      throw new Error("Invalid report file size")
    }

    const bytes = await object.Body.transformToByteArray()
    if (bytes.length !== declaredSize || bytes.length > MAX_PROCESSING_SIZE) {
      throw new Error("Downloaded file size did not match uploaded file")
    }
    const buffer = Buffer.from(bytes)

    if (
      extension === ".xlsx" &&
      !(buffer[0] === 0x50 && buffer[1] === 0x4b)
    ) {
      throw new Error("Invalid XLSX file")
    }

    const extracted: ExtractedMetricRow[] =
      extension === ".csv"
        ? extractCsvMetrics(buffer)
        : await extractExcelMetrics(buffer)

    if (extracted.length === 0) {
      throw new Error("No metrics found in report")
    }

    const metricsResult = await query(
      `
        SELECT id, name, unit, comparison_operator, target_value
        FROM vendor_metrics
        WHERE organization_id = $1
          AND vendor_id = $2
          AND is_active = TRUE
      `,
      [organizationId, report.vendor_id]
    )
    const definitions = metricsResult.rows as MetricDefinition[]
    const metricByName = new Map(
      definitions.map((metric) => [normalizeMetricName(metric.name), metric])
    )
    const metricById = new Map(
      definitions.map((metric) => [metric.id, metric])
    )

    const templateMetricIds = new Map<string, string>()
    for (const mapping of templateMappings) {
      const label = normalizeMetricName(mapping.source_column)
      if (templateMetricIds.has(label)) {
        throw new Error(`Duplicate source label in template: ${label}`)
      }
      templateMetricIds.set(label, mapping.metric_id)
    }

    const ignoredLabels = new Set(
      ignoredTemplateLabels.map(normalizeMetricName)
    )
    for (const label of ignoredLabels) {
      if (templateMetricIds.has(label)) {
        throw new Error(`Template contains conflicting rules for ${label}`)
      }
    }

    const occurrences = new Map<string, number>()
    const results: ProcessedRow[] = extracted.map((row): ProcessedRow => {
      const label = normalizeMetricName(row.sourceLabel)
      const seen = occurrences.get(label) ?? 0
      occurrences.set(label, seen + 1)

      const ignored = templateId !== null && ignoredLabels.has(label)
      const mappedId = templateId
        ? templateMetricIds.get(label)
        : undefined
      const metric = templateId
        ? mappedId ? metricById.get(mappedId) : undefined
        : metricByName.get(label)

      if (seen > 0) {
        return {
          ...row,
          metricId: null,
          validationStatus: "needs_review",
          validationMessage: "Duplicate report label requires review.",
        }
      }
      if (ignored) {
        return {
          ...row,
          metricId: null,
          validationStatus: "ignored",
          validationMessage: "Ignored using saved vendor report template.",
        }
      }
      if (!metric) {
        return {
          ...row,
          metricId: null,
          validationStatus: "needs_review",
          validationMessage: templateId
            ? "No active mapping for this label in the selected template."
            : "No matching active vendor metric found.",
        }
      }
      if (row.normalizedValue === null) {
        return {
          ...row,
          metricId: metric.id,
          validationStatus: "needs_review",
          validationMessage: "Could not convert reported value to a number.",
        }
      }

      const calculatedStatus = calculateMetricStatus(
        row.normalizedValue,
        Number(metric.target_value),
        metric.comparison_operator
      )
      return {
        ...row,
        metricId: metric.id,
        validationStatus: "matched",
        validationMessage:
          `Calculated status: ${calculatedStatus}. ` +
          `Target ${metric.comparison_operator} ${metric.target_value} ${metric.unit}.`,
      }
    })

    // A template must not silently omit an expected metric.
    if (templateId) {
      const presentLabels = new Set(
        extracted.map((row) => normalizeMetricName(row.sourceLabel))
      )
      for (const [label] of templateMetricIds) {
        if (presentLabels.has(label)) continue
        results.push({
          sourceLabel: label,
          rawValue: "",
          normalizedValue: null,
          sourceLocation: "Missing from uploaded report",
          metricId: null,
          validationStatus: "needs_review",
          validationMessage: "Expected metric is missing from this report.",
        })
      }
    }

    // IMPORTANT: validate duplicate mappings BEFORE writing any rows.
    const usedMetricIds = new Set<string>()
    for (const row of results) {
      if (row.validationStatus !== "matched" || !row.metricId) continue
      if (usedMetricIds.has(row.metricId)) {
        row.validationStatus = "needs_review"
        row.validationMessage = "Multiple report rows map to the same KPI/SLA."
        row.metricId = null
      } else {
        usedMetricIds.add(row.metricId)
      }
    }

    const matchedCount = results.filter(
      (row) => row.validationStatus === "matched"
    ).length
    const needsReviewCount = results.filter(
      (row) => row.validationStatus === "needs_review"
    ).length
    const ignoredCount = results.filter(
      (row) => row.validationStatus === "ignored"
    ).length
    const status =
      needsReviewCount === 0 && matchedCount > 0 ? "ready" : "needs_review"

    const payload = results.map((row) => ({
      metric_id: row.metricId,
      source_label: row.sourceLabel,
      source_location: row.sourceLocation,
      raw_value: row.rawValue,
      normalized_value: row.normalizedValue,
      validation_status: row.validationStatus,
      validation_message: row.validationMessage,
    }))

    // The insertion and final report status update are one SQL statement.
    // If either fails, PostgreSQL rolls the statement back.
    const saved = await query(
      `
        WITH inserted AS (
          INSERT INTO vendor_report_extractions (
            organization_id, vendor_id, report_id, metric_id,
            source_label, source_location, raw_value, normalized_value,
            period_start, period_end, extraction_method,
            validation_status, validation_message
          )
          SELECT
            $1::uuid, $2::uuid, $3::uuid, x.metric_id,
            x.source_label, x.source_location, x.raw_value,
            x.normalized_value, $4::date, $5::date,
            'structured_file', x.validation_status, x.validation_message
          FROM jsonb_to_recordset($6::jsonb) AS x(
            metric_id uuid,
            source_label text,
            source_location text,
            raw_value text,
            normalized_value numeric,
            validation_status text,
            validation_message text
          )
          RETURNING id
        ), finalized AS (
          UPDATE vendor_reports
          SET status = $7, processed_at = now(), updated_at = now()
          WHERE id = $3::uuid
            AND organization_id = $1::uuid
            AND status = 'processing'
            AND (SELECT count(*) FROM inserted) = $8::int
          RETURNING id
        )
        SELECT
          (SELECT count(*)::int FROM inserted) AS inserted_count,
          (SELECT count(*)::int FROM finalized) AS updated_count
      `,
      [
        organizationId,
        report.vendor_id,
        id,
        report.period_start,
        report.period_end,
        JSON.stringify(payload),
        status,
        results.length,
      ]
    )

    if (
      Number(saved.rows[0]?.inserted_count) !== results.length ||
      Number(saved.rows[0]?.updated_count) !== 1
    ) {
      throw new Error("Could not finalize report extraction")
    }

    return NextResponse.json({
      success: true,
      reportId: id,
      status,
      templateApplied: templateId !== null,
      extractedCount: results.length,
      matchedCount,
      needsReviewCount,
      ignoredCount,
    })
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.error("Report processing error:", error)
    if (claimedReportId && organizationId) {
      try {
        await query(
          `
            UPDATE vendor_reports
            SET status = 'failed',
                error_message = $3,
                updated_at = now()
            WHERE id = $1 AND organization_id = $2 AND status = 'processing'
          `,
          [claimedReportId, organizationId,
            "Report extraction failed. Check the file format or server logs."]
        )
      } catch (dbError) {
        console.error("Unable to mark processing failure:", dbError)
      }
    }
    return NextResponse.json(
      { error: "Failed to extract report. Check the file format and server logs." },
      { status: 500 }
    )
  }
}
