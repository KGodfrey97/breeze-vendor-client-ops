
import { NextRequest, NextResponse } from "next/server"

import { query } from "@/lib/db"
import { requireAuthenticatedProfile, isUnauthorizedError } from "@/lib/auth-server"

import {
  getVendorReportMetadata,
  VENDOR_REPORT_MAX_FILE_SIZE,
} from "@/lib/s3"

export const runtime = "nodejs"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function POST(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const auth = await requireAuthenticatedProfile()

    const { id } = await context.params

    const result = await query(
      `
        SELECT
          id,
          s3_key,
          content_type,
          file_size_bytes,
          status
        FROM vendor_reports
        WHERE id = $1
          AND organization_id = $2
          AND uploaded_by = $3
        LIMIT 1
      `,
      [
        id,
        auth.profile.organization_id,
        auth.profile.id,
      ]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Report not found" },
        { status: 404 }
      )
    }

    const report = result.rows[0]

    if (report.status === "uploaded") {
      return NextResponse.json({
        success: true,
        reportId: id,
        status: "uploaded",
      })
    }

    if (report.status !== "pending_upload") {
      return NextResponse.json(
        { error: "Invalid report status" },
        { status: 409 }
      )
    }

    // Verify file actually exists in S3
    let metadata

    try {
      metadata = await getVendorReportMetadata(
        report.s3_key
      )
    } catch (error) {
      console.error("S3 verification error:", error)

      return NextResponse.json(
        { error: "Uploaded file not found in S3" },
        { status: 400 }
      )
    }

    const actualSize = metadata.ContentLength ?? 0

    if (
      actualSize <= 0 ||
      actualSize > VENDOR_REPORT_MAX_FILE_SIZE ||
      actualSize !== Number(report.file_size_bytes)
    ) {
      return NextResponse.json(
        { error: "Uploaded file size is invalid" },
        { status: 400 }
      )
    }

    if (metadata.ContentType !== report.content_type) {
      return NextResponse.json(
        { error: "Uploaded file type does not match" },
        { status: 400 }
      )
    }

    // Mark the report as uploaded
    const updated = await query(
      `
        UPDATE vendor_reports
        SET
          status = 'uploaded',
          uploaded_at = now(),
          updated_at = now()
        WHERE id = $1
          AND organization_id = $2
          AND status = 'pending_upload'
        RETURNING id
      `,
      [id, auth.profile.organization_id]
    )

    if (updated.rows.length === 0) {
      return NextResponse.json(
        { error: "Report status changed during upload" },
        { status: 409 }
      )
    }

    return NextResponse.json({
      success: true,
      reportId: id,
      status: "uploaded",
    })
  } catch (error) {
    if (isUnauthorizedError(error)) {
        return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
        )
    }

    console.error(
        "Vendor report confirmation error:",
        error
    )

    return NextResponse.json(
        { error: "Failed to confirm report upload" },
        { status: 500 }
    )
    }
}
