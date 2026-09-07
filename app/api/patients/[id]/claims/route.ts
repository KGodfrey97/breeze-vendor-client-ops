import { NextRequest, NextResponse } from "next/server"

import { handleApiError } from "@/lib/api-response"
import { requireAuthenticatedUser } from "@/lib/auth-server"
import { query } from "@/lib/db"

export const runtime = "nodejs"

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuthenticatedUser()
    const { id } = await context.params

    // Verify the patient belongs to this user
    const patientResult = await query(
      `
      SELECT id
      FROM patients
      WHERE id = $1
        AND user_id = $2
        AND is_active = true
      `,
      [id, user.id],
    )

    if (!patientResult.rows[0]) {
      return NextResponse.json(
        { error: "Patient not found or access denied" },
        { status: 404 },
      )
    }

    const { rows } = await query(
      `
      SELECT *
      FROM claims
      WHERE patient_id = $1
        AND user_id = $2
      ORDER BY created_at DESC
      `,
      [id, user.id],
    )

    return NextResponse.json({
      claims: rows,
    })
  } catch (error) {
    return handleApiError(error, "Failed to fetch patient claims")
  }
}