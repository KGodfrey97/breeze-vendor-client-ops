import { NextRequest, NextResponse } from "next/server"
import { requireAuthenticatedUser } from "@/lib/auth-server"
import { query } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAuthenticatedUser()

    // IMPORTANT: enforce admin on server
    const { rows } = await query(
      `SELECT role FROM profiles WHERE id = $1`,
      [admin.id]
    )

    if (rows[0]?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { userId, role } = await req.json()

    await query(
      `UPDATE profiles SET role = $1 WHERE id = $2`,
      [role, userId]
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to update role" },
      { status: 500 }
    )
  }
}