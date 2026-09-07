import { NextRequest, NextResponse } from "next/server"

import { handleApiError } from "@/lib/api-response"
import { requireAuthenticatedUser } from "@/lib/auth-server"
import { query, withTransaction } from "@/lib/db"

export const runtime = "nodejs"

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuthenticatedUser()
    const { id } = await context.params
    const claim = await query(`SELECT id FROM claims WHERE id = $1 AND user_id = $2`, [id, user.id])

    if (!claim.rows[0]) {
      return NextResponse.json({ error: "Claim not found or access denied" }, { status: 404 })
    }

    const { rows } = await query(
      `SELECT n.*, p.full_name
       FROM claim_notes n
       LEFT JOIN profiles p ON p.id = n.created_by
       WHERE n.claim_id = $1
       ORDER BY n.created_at ASC`,
      [id],
    )

    return NextResponse.json({
      data: rows.map((row) => ({
        ...row,
        profiles: { full_name: row.full_name ?? null },
      })),
    })
  } catch (error) {
    return handleApiError(error, "Failed to fetch claim notes")
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuthenticatedUser()
    const { id } = await context.params
    const body = await request.json()
    const { note, followUpDate } = body

    if (!note?.trim() || note.length > 2000) {
      return NextResponse.json({ error: "Note must be 1-2000 characters" }, { status: 400 })
    }

    await withTransaction(async (client) => {
      const claim = await client.query(`SELECT id FROM claims WHERE id = $1 AND user_id = $2`, [id, user.id])
      if (!claim.rows[0]) throw new Error("Claim not found")

      await client.query(
        `INSERT INTO claim_notes (claim_id, note, created_by)
         VALUES ($1, $2, $3)`,
        [id, note.trim(), user.id],
      )

      if (Object.prototype.hasOwnProperty.call(body, "followUpDate")) {
        await client.query(
          `UPDATE claims SET follow_up_date = $1, updated_by = $2
           WHERE id = $3 AND user_id = $2`,
          [followUpDate || null, user.id, id],
        )
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, "Failed to add claim note")
  }
}
