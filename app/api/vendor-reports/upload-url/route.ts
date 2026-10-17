
import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "node:crypto"

import { query } from "@/lib/db"
import { requireAuthenticatedProfile, isUnauthorizedError } from "@/lib/auth-server"

import {
  createVendorReportUploadUrl,
  generateVendorReportKey,
  getVendorReportBucket,
  getVendorReportFileType,
  VENDOR_REPORT_MAX_FILE_SIZE,
} from "@/lib/s3"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const auth = await requireAuthenticatedProfile()

    const organizationId = auth.profile.organization_id
    const userId = auth.profile.id

    if (!auth.profile.is_active) {
      return NextResponse.json(
        { error: "Account is inactive" },
        { status: 403 }
      )
    }

    // 2. Validate request body
    const body = await request.json().catch(() => null)

    const {
      vendorId,
      filename,
      fileSize,
      periodStart,
      periodEnd,
    } = body ?? {}

    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

    if (
      typeof vendorId !== "string" ||
      !uuidPattern.test(vendorId) ||
      typeof filename !== "string" ||
      !filename.trim() ||
      filename.length > 255 ||
      !Number.isSafeInteger(fileSize) ||
      fileSize <= 0 ||
      fileSize > VENDOR_REPORT_MAX_FILE_SIZE
    ) {
      return NextResponse.json(
        { error: "Invalid file or vendor information" },
        { status: 400 }
      )
    }

    const contentType = getVendorReportFileType(filename)

    if (!contentType) {
      return NextResponse.json(
        { error: "Only XLSX, CSV and PDF files are supported" },
        { status: 400 }
      )
    }

    // 3. Validate reporting period
    const validDate = (value: unknown) =>
      typeof value === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      !Number.isNaN(Date.parse(value)) &&
      new Date(value).toISOString().slice(0, 10) === value

    if (
      !validDate(periodStart) ||
      !validDate(periodEnd) ||
      periodEnd < periodStart
    ) {
      return NextResponse.json(
        { error: "Invalid reporting period" },
        { status: 400 }
      )
    }

    // 4. Verify vendor belongs to this organization
    const vendorResult = await query(
      `
        SELECT id
        FROM vendors
        WHERE id = $1
          AND organization_id = $2
        LIMIT 1
      `,
      [vendorId, organizationId]
    )

    if (vendorResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Vendor not found" },
        { status: 404 }
      )
    }

    // 5. Generate server-controlled S3 path
    const reportId = randomUUID()

    const s3Key = generateVendorReportKey({
      organizationId,
      vendorId,
      reportId,
      filename,
    })

    // 6. Create pending database record
    await query(
      `
        INSERT INTO vendor_reports (
          id,
          organization_id,
          vendor_id,
          original_filename,
          s3_bucket,
          s3_key,
          content_type,
          file_size_bytes,
          period_start,
          period_end,
          status,
          uploaded_by
        )
        VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10,
          'pending_upload', $11
        )
      `,
      [
        reportId,
        organizationId,
        vendorId,
        filename,
        getVendorReportBucket(),
        s3Key,
        contentType,
        fileSize,
        periodStart,
        periodEnd,
        userId,
      ]
    )

    // 7. Generate signed upload URL
    const uploadUrl = await createVendorReportUploadUrl(
      s3Key,
      contentType
    )

    return NextResponse.json({
      reportId,
      uploadUrl,
      contentType,
      expiresIn: 300,
    })
  } catch (error) {
    if (isUnauthorizedError(error)) {
        return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
        )
    }

    console.error("Vendor report upload URL error:", error)

    return NextResponse.json(
        { error: "Failed to prepare report upload" },
        { status: 500 }
    )
    }
}
