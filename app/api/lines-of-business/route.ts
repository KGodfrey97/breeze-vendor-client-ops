import { NextResponse } from "next/server"

import { query } from "@/lib/db"
import { requireAuthenticatedProfile } from "@/lib/auth-server"

export async function GET() {
  try {
    const { profile } = await requireAuthenticatedProfile()

    if (!profile) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const result = await query(
      `
      SELECT
        id,
        name,
        description
      FROM lines_of_business
      WHERE organization_id = $1
        AND is_active = TRUE
      ORDER BY name ASC
      `,
      [profile.organization_id]
    )

    return NextResponse.json({
      linesOfBusiness: result.rows,
    })
  } catch (error) {
    console.error(
      "GET LINES OF BUSINESS ERROR:",
      error
    )

    return NextResponse.json(
      {
        error:
          "Failed to load lines of business",
      },
      { status: 500 }
    )
  }
}