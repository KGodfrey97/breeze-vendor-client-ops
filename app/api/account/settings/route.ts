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
      SELECT *
      FROM user_settings
      WHERE user_id=$1
      `,
      [user.id],
    )

    return NextResponse.json(rows)
  } catch (error) {
    return handleApiError(error, "Failed to load settings")
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()

    const body = await request.json()

    const { rows } = await query(
      `
      INSERT INTO user_settings
        (user_id, setting_key, setting_value)
      VALUES
        ($1,$2,$3)
      ON CONFLICT (user_id,setting_key)
      DO UPDATE SET
        setting_value=EXCLUDED.setting_value,
        updated_at=NOW()
      RETURNING *
      `,
      [
        user.id,
        body.setting_key,
        JSON.stringify(body.setting_value),
      ],
    )

    return NextResponse.json(rows[0])
  } catch (error) {
    return handleApiError(error, "Failed to save settings")
  }
}