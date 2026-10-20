
import { NextRequest, NextResponse } from "next/server"
import { GetObjectCommand } from "@aws-sdk/client-s3"

import { query } from "@/lib/db"
import {
  requireAuthenticatedProfile,
  isUnauthorizedError,
} from "@/lib/auth-server"

import {
  s3,
  getVendorReportBucket,
} from "@/lib/s3"

import {
  parseDetailedVendorReport,
} from "@/lib/vendor-report-detail-parser"

import {
  calculateServicingFrequency,
  type MissingDatePolicy,
  type ServicingFrequencyConfig,
} from "@/lib/vendor-report-calculations"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type RouteContext = {
  params: Promise<{ id: string }>
}

const MAX_PROCESSING_SIZE = 2 * 1024 * 1024

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type PreviewRequest = {
  statusColumn?: unknown
  eligibleStatuses?: unknown
  lastTouchedColumn?: unknown
  intervalDays?: unknown
  missingDatePolicy?: unknown
}

function isMissingDatePolicy(
  value: unknown
): value is MissingDatePolicy {
  return (
    value === "needs_review" ||
    value === "noncompliant" ||
    value === "exclude"
  )
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    // 1. Authenticate the current organization.
    const { profile } = await requireAuthenticatedProfile()
    const organizationId = profile.organization_id

    const { id } = await context.params

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: "Invalid report ID" },
        { status: 400 }
      )
    }

    // 2. Load the report with tenant isolation.
    const reportResult = await query(
      `
      SELECT
        id,
        vendor_id,
        original_filename,
        s3_bucket,
        s3_key,
        file_size_bytes,
        period_start::text AS period_start,
        period_end::text AS period_end,
        status
      FROM vendor_reports
      WHERE id = $1
        AND organization_id = $2
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

    // Reports must already be uploaded successfully.
    // The preview does not modify report status.
    const allowedStatuses = [
      "uploaded",
      "ready",
      "needs_review",
      "imported",
    ]

    if (!allowedStatuses.includes(report.status)) {
      return NextResponse.json(
        {
          error:
            "Report is not available for calculation preview.",
        },
        { status: 409 }
      )
    }

    const extension = report.original_filename
      .toLowerCase()
      .match(/\.[^.]+$/)?.[0]

    if (![".csv", ".xlsx"].includes(extension ?? "")) {
      return NextResponse.json(
        {
          error:
            "Detailed calculations support CSV and XLSX files only.",
        },
        { status: 400 }
      )
    }

    if (
      !report.file_size_bytes ||
      Number(report.file_size_bytes) > MAX_PROCESSING_SIZE
    ) {
      return NextResponse.json(
        {
          error:
            "Detailed calculation preview currently supports files up to 2 MB.",
        },
        { status: 400 }
      )
    }

    // 3. Read and validate the requested calculation.
    const body: PreviewRequest =
      await request.json().catch(() => null)

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid calculation configuration." },
        { status: 400 }
      )
    }

    if (
      typeof body.statusColumn !== "string" ||
      typeof body.lastTouchedColumn !== "string" ||
      !body.statusColumn.trim() ||
      !body.lastTouchedColumn.trim()
    ) {
      return NextResponse.json(
        {
          error:
            "Status and last-touched columns are required.",
        },
        { status: 400 }
      )
    }

    if (
      body.statusColumn.length > 200 ||
      body.lastTouchedColumn.length > 200
    ) {
      return NextResponse.json(
        { error: "Column name is too long." },
        { status: 400 }
      )
    }

    if (
      !Array.isArray(body.eligibleStatuses) ||
      body.eligibleStatuses.length === 0 ||
      body.eligibleStatuses.length > 50 ||
      body.eligibleStatuses.some(
        (value) =>
          typeof value !== "string" ||
          !value.trim() ||
          value.length > 200
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Provide one or more valid eligible statuses.",
        },
        { status: 400 }
      )
    }

    if (
      typeof body.intervalDays !== "number" ||
      !Number.isSafeInteger(body.intervalDays) ||
      body.intervalDays < 1 ||
      body.intervalDays > 3650
    ) {
      return NextResponse.json(
        {
          error:
            "Servicing interval must be 1–3650 days.",
        },
        { status: 400 }
      )
    }

    if (!isMissingDatePolicy(body.missingDatePolicy)) {
      return NextResponse.json(
        {
          error: "Invalid missing-date handling policy.",
        },
        { status: 400 }
      )
    }

    if (!report.period_end) {
      return NextResponse.json(
        { error: "Report has no reporting cutoff date." },
        { status: 400 }
      )
    }

    const config: ServicingFrequencyConfig = {
      calculationType: "servicing_frequency",
      statusColumn: body.statusColumn.trim(),
      eligibleStatuses: body.eligibleStatuses.map(
        (value: string) => value.trim()
      ),
      lastTouchedColumn: body.lastTouchedColumn.trim(),
      intervalDays: body.intervalDays,
      referenceDate: report.period_end,
      missingDatePolicy: body.missingDatePolicy,
    }

    // 4. Download from the configured private S3 bucket.
    const bucket = getVendorReportBucket()

    if (report.s3_bucket !== bucket) {
      throw new Error("Unexpected vendor report bucket")
    }

    const object = await s3.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: report.s3_key,
      })
    )

    if (
      !object.Body ||
      !object.ContentLength ||
      object.ContentLength > MAX_PROCESSING_SIZE
    ) {
      return NextResponse.json(
        { error: "Invalid report file size." },
        { status: 400 }
      )
    }

    const bytes = await object.Body.transformToByteArray()

    if (bytes.length > MAX_PROCESSING_SIZE) {
      return NextResponse.json(
        { error: "Report exceeds processing limit." },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(bytes)

    // 5. Parse every row using the detail parser.
    const detailedReport = await parseDetailedVendorReport(
      buffer,
      report.original_filename
    )

    // 6. Run the calculation engine.
    let calculation

    try {
      calculation = calculateServicingFrequency(
        detailedReport,
        config
      )
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Invalid calculation configuration.",
        },
        { status: 400 }
      )
    }

    // 7. Return the preview without saving anything.
    // Do not return source account IDs or raw row data.
    return NextResponse.json(
      {
        success: true,
        report: {
          id: report.id,
          vendorId: report.vendor_id,
          filename: report.original_filename,
          periodStart: report.period_start,
          periodEnd: report.period_end,
        },
        source: {
          sheetName: detailedReport.sheetName,
          columns: detailedReport.columns,
          totalRows: detailedReport.totalRows,
        },
        calculation: {
          type: calculation.calculationType,
          status: calculation.status,
          actualValue: calculation.actualValue,
          eligibleCount: calculation.eligibleCount,
          compliantCount: calculation.compliantCount,
          noncompliantCount:
            calculation.noncompliantCount,
          excludedCount: calculation.excludedCount,
          missingDateCount:
            calculation.missingDateCount,
          errorCount: calculation.errorCount,
          intervalDays: calculation.intervalDays,
          referenceDate: calculation.referenceDate,
          warnings: calculation.warnings,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    )
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    console.error(
      "Vendor report calculation preview error:",
      error
    )

    return NextResponse.json(
      {
        error:
          "Unable to preview calculation. Check the report format and server logs.",
      },
      { status: 500 }
    )
  }
}
