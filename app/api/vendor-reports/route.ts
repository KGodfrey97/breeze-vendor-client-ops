
import { NextResponse } from "next/server"

import { query } from "@/lib/db"
import {
  requireAuthenticatedProfile,
  isUnauthorizedError,
} from "@/lib/auth-server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const { profile } = await requireAuthenticatedProfile()
    const organizationId = profile.organization_id

    const [reportsResult, vendorsResult, countsResult] =
      await Promise.all([
        query(
          `
          SELECT
            r.id,
            r.vendor_id,
            v.name AS vendor_name,
            r.original_filename,
            r.content_type,
            r.file_size_bytes,
            r.period_start::text AS period_start,
            r.period_end::text AS period_end,
            r.status,
            r.created_at,
            r.uploaded_at,
            r.error_message
          FROM vendor_reports r
          JOIN vendors v
            ON v.id = r.vendor_id
           AND v.organization_id = r.organization_id
          WHERE r.organization_id = $1
          ORDER BY r.created_at DESC
          LIMIT 100
          `,
          [organizationId]
        ),

        query(
          `
          SELECT id, name
          FROM vendors
          WHERE organization_id = $1
          ORDER BY name ASC
          `,
          [organizationId]
        ),

        query(
          `
          SELECT
            COUNT(*)::int AS total,
            COUNT(*) FILTER (
              WHERE status = 'imported'
            )::int AS imported,
            COUNT(*) FILTER (
              WHERE status IN (
                'uploaded',
                'processing',
                'needs_review',
                'ready'
              )
            )::int AS pending,
            COUNT(*) FILTER (
              WHERE status = 'failed'
            )::int AS failed
          FROM vendor_reports
          WHERE organization_id = $1
          `,
          [organizationId]
        ),
      ])
    
    
    const templatesResult = await query(
      `
      SELECT
        id,
        vendor_id,
        name,
        file_type,
        created_at
      FROM vendor_report_templates
      WHERE organization_id = $1
        AND is_active = TRUE
      ORDER BY name ASC, created_at DESC
      `,
      [organizationId]
    )

    return NextResponse.json({
      reports: reportsResult.rows,
      vendors: vendorsResult.rows,
      templates: templatesResult.rows,
      counts: countsResult.rows[0] ?? {
        total: 0,
        imported: 0,
        pending: 0,
        failed: 0,
      },
    })
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    console.error("Vendor reports GET error:", error)

    return NextResponse.json(
      { error: "Failed to load vendor reports" },
      { status: 500 }
    )
  }
}
