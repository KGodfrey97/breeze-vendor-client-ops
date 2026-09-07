import { NextRequest, NextResponse } from "next/server"

import { handleApiError } from "@/lib/api-response"
import { requireAuthenticatedUser } from "@/lib/auth-server"
import { query } from "@/lib/db"

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
      `SELECT * FROM claim_timeline
       WHERE claim_id = $1
       ORDER BY created_at ASC`,
      [id],
    )

    return NextResponse.json({ data: rows })
  } catch (error) {
    return handleApiError(error, "Failed to fetch claim timeline")
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser()
    const { id } = await context.params
    const body = await request.json()

    // Verify the claim belongs to the user
    const claim = await query(
      `SELECT id
       FROM claims
       WHERE id = $1
       AND user_id = $2`,
      [id, user.id],
    )

    if (!claim.rows[0]) {
      return NextResponse.json(
        { error: "Claim not found or access denied" },
        { status: 404 },
      )
    }

    const result = await query(
      `INSERT INTO claim_timeline (
          claim_id,
          event_type,
          event_description,
          created_by
       )
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        id,
        body.event_type,
        body.event_description,
        user.id,
      ],
    )

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    })
  } catch (error) {
    return handleApiError(error, "Failed to create timeline event")
  }
}