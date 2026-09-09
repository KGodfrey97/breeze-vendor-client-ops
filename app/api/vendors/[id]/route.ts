import { NextResponse } from "next/server"

import { query } from "@/lib/db"
import { requireAuthenticatedProfile } from "@/lib/auth-server"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    const { profile } = await requireAuthenticatedProfile()
    const { id } = await context.params

    const result = await query(
      `
      SELECT
        v.id,
        v.name,
        v.vendor_code,
        v.grade,
        v.vendor_tier,
        v.status,
        v.color,
        v.description,
        v.notes,

        v.line_of_business_id,
        lob.name AS line_of_business,

        (
          SELECT MIN(
            COALESCE(c.renewal_date, c.end_date)
          )
          FROM contracts c
          WHERE c.vendor_id = v.id
            AND c.organization_id = v.organization_id
            AND c.status IN ('active', 'expiring')
            AND COALESCE(c.renewal_date, c.end_date) IS NOT NULL
            AND COALESCE(c.renewal_date, c.end_date) >= CURRENT_DATE
        ) AS renewal_date,

        v.created_at,
        v.updated_at

      FROM vendors v

      LEFT JOIN lines_of_business lob
        ON lob.id = v.line_of_business_id
        AND lob.organization_id = v.organization_id

      WHERE v.id = $1
        AND v.organization_id = $2

      LIMIT 1
      `,
      [
        id,
        profile.organization_id,
      ]
    )

    const vendor = result.rows[0]

    if (!vendor) {
      return NextResponse.json(
        { error: "Vendor not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      vendor,
    })
  } catch (error) {
    console.error("GET VENDOR ERROR:", error)

    return NextResponse.json(
      { error: "Failed to load vendor" },
      { status: 500 }
    )
  }
}