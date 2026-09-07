import { NextRequest, NextResponse } from "next/server"

import { requireAuthenticatedUser } from "@/lib/auth-server"
import { handleApiError } from "@/lib/api-response"
import { query } from "@/lib/db"

export const runtime = "nodejs"

export async function GET() {
  try {
    const user = await requireAuthenticatedUser()

    const { rows } = await query(
      `
      SELECT
        id,
        email,
        full_name,
        organization,
        role
      FROM profiles
      WHERE id = $1
      `,
      [user.id],
    )

    return NextResponse.json(rows[0] ?? null)
  } catch (error) {
    return handleApiError(error, "Failed to load profile")
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const body = await request.json()

    const { rows } = await query(
      `
      UPDATE profiles
      SET
        full_name=$1,
        organization=$2,
        role=$3,
        updated_at=NOW()
      WHERE id=$4
      RETURNING *
      `,
      [
        body.full_name,
        body.organization,
        body.role,
        user.id,
      ],
    )

    return NextResponse.json(rows[0])
  } catch (error) {
    return handleApiError(error, "Failed to update profile")
  }
}