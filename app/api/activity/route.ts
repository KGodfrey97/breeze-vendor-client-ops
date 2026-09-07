import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { requireAuthenticatedUser } from "@/lib/auth-server"

export async function GET(req: NextRequest) {
  const user = await requireAuthenticatedUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!user.id) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 })
  }

  const userId = user.id

  const [claims, letters, notes] = await Promise.all([
    query(
      `SELECT id, first_name, last_name, claim_id, status, priority, created_at, updated_at
       FROM claims_with_patients
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    ),

    query(
      `SELECT id, claim_id, generated_at, status
       FROM appeal_letters
       WHERE user_id = $1
       ORDER BY generated_at DESC
       LIMIT 20`,
      [userId]
    ),

    query(
      `SELECT id, note, created_at, claim_id
       FROM claim_notes
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    ),
  ])

  return NextResponse.json({
    claims: claims.rows,
    letters: letters.rows,
    notes: notes.rows,
  })
}