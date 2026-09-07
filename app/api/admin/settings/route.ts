import { NextRequest, NextResponse } from "next/server"
import { requireAuthenticatedUser } from "@/lib/auth-server"
import { query } from "@/lib/db"

async function requireAdmin() {
  const user = await requireAuthenticatedUser()

  const { rows } = await query(
    "SELECT role FROM profiles WHERE id = $1",
    [user.id]
  )

  if (rows[0]?.role !== "admin") {
    throw new Error("Forbidden")
  }

  return user
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireAdmin()

    const {
      settingKey,
      settingValue,
    } = await req.json()

    const { rows } = await query(
      `
      INSERT INTO user_settings (
        user_id,
        setting_key,
        setting_value
      )
      VALUES ($1,$2,$3)
      ON CONFLICT (user_id, setting_key)
      DO UPDATE SET
        setting_value = EXCLUDED.setting_value,
        updated_at = NOW()
      RETURNING *
      `,
      [
        user.id,
        settingKey,
        JSON.stringify(settingValue),
      ]
    )

    return NextResponse.json(rows[0])
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    )
  }
}