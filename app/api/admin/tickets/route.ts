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

export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin()

    const {
      ticketId,
      status,
      priority,
    } = await req.json()

    const { rows } = await query(
      `
      UPDATE support_tickets
      SET
        status = COALESCE($1, status),
        priority = COALESCE($2, priority),
        updated_at = NOW()
      WHERE id = $3
      RETURNING *
      `,
      [
        status,
        priority,
        ticketId,
      ]
    )

    return NextResponse.json(rows[0])
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update ticket" },
      { status: 500 }
    )
  }
}