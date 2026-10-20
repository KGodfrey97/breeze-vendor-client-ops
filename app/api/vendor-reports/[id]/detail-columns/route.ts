
import { NextResponse } from "next/server"
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

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type RouteContext = {
  params: Promise<{ id: string }>
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const MAX_FILE_SIZE = 2 * 1024 * 1024

export async function GET(
  _request: Request,
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
      SELECT
        r.id,
        r.vendor_id,
        v.name AS vendor_name,
        r.original_filename,
        r.s3_bucket,
        r.s3_key,
        r.file_size_bytes,
        r.period_start::text AS period_start,
        r.period_end::text AS period_end,
        r.status
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

    if (
      !["uploaded", "ready", "needs_review", "imported"]
        .includes(report.status)
    ) {
      return NextResponse.json(
        { error: "Report is not available for configuration." },
        { status: 409 }
      )
    }

    const extension = report.original_filename
      .toLowerCase()
      .match(/\.[^.]+$/)?.[0]

    if (extension !== ".csv" && extension !== ".xlsx") {
      return NextResponse.json(
        { error: "Only CSV and XLSX reports are supported." },
        { status: 400 }
      )
    }

    if (
      !report.file_size_bytes ||
      Number(report.file_size_bytes) > MAX_FILE_SIZE
    ) {
      return NextResponse.json(
        { error: "File must be 2 MB or smaller." },
        { status: 400 }
      )
    }

    const bucket = getVendorReportBucket()

    if (report.s3_bucket !== bucket) {
      throw new Error("Unexpected S3 bucket")
    }

    const [metricsResult, object] = await Promise.all([
      query(
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
      ),
      s3.send(
        new GetObjectCommand({
          Bucket: bucket,
          Key: report.s3_key,
        })
      ),
    ])

    if (
      !object.Body ||
      !object.ContentLength ||
      object.ContentLength > MAX_FILE_SIZE
    ) {
      return NextResponse.json(
        { error: "Invalid report file size." },
        { status: 400 }
      )
    }

    const bytes = await object.Body.transformToByteArray()

    if (bytes.length > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File exceeds processing limit." },
        { status: 400 }
      )
    }

    const parsed = await parseDetailedVendorReport(
      Buffer.from(bytes),
      report.original_filename
    )

    return NextResponse.json(
      {
        report: {
          id: report.id,
          vendorId: report.vendor_id,
          vendorName: report.vendor_name,
          filename: report.original_filename,
          periodStart: report.period_start,
          periodEnd: report.period_end,
          status: report.status,
        },
        source: {
          sheetName: parsed.sheetName,
          columns: parsed.columns,
          totalRows: parsed.totalRows,
        },
        metrics: metricsResult.rows,
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

    console.error("Detailed report columns error:", error)

    return NextResponse.json(
      { error: "Unable to read detailed report columns." },
      { status: 500 }
    )
  }
}
