import { NextResponse } from "next/server"

import { handleApiError } from "@/lib/api-response"
import { requireAuthenticatedUser } from "@/lib/auth-server"
import { query } from "@/lib/db"

export const runtime = "nodejs"

export async function GET() {
  try {
    const user = await requireAuthenticatedUser()

    const { rows } = await query(
        `
        SELECT
            c.*,
            p.first_name,
            p.last_name
        FROM claims c
        LEFT JOIN patients p
            ON p.id = c.patient_id
        WHERE c.user_id = $1
        ORDER BY c.created_at DESC
        `,
        [user.id]
    )

    return NextResponse.json({
      claims: rows,
    })
  } catch (error) {
    return handleApiError(error, "Failed to load support data")
  }
}