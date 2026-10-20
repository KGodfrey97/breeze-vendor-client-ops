
import { NextRequest, NextResponse } from "next/server"

import { query } from "@/lib/db"
import {
  requireAuthenticatedProfile,
  isUnauthorizedError,
} from "@/lib/auth-server"
import {
  createVendorReportDownloadUrl,
} from "@/lib/s3"

export const runtime = "nodejs"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { profile } = await requireAuthenticatedProfile()
    const { id } = await context.params

    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

    if (!uuidPattern.test(id)) {
      return NextResponse.json(
        { error: "Invalid report ID" },
        { status: 400 }
      )
    }

    const result = await query(
      `
      SELECT
        r.s3_key,
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

    const report = result.rows[0]

    if (!report) {
      return NextResponse.json(
        { error: "Report not found" },
        { status: 404 }
      )
    }

    if (
      report.status === "pending_upload" ||
      report.status === "failed"
    ) {
      return NextResponse.json(
        { error: "Report is not available for download" },
        { status: 409 }
      )
    }

    const downloadUrl =
      await createVendorReportDownloadUrl(report.s3_key)

    return NextResponse.json({
      downloadUrl,
      expiresIn: 60,
    })
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    console.error("Report download URL error:", error)

    return NextResponse.json(
      { error: "Failed to prepare download" },
      { status: 500 }
    )
  }
}
