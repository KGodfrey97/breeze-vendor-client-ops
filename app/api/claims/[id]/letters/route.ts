import { NextRequest, NextResponse } from "next/server"

import { requireAuthenticatedUser } from "@/lib/auth-server"
import { handleApiError } from "@/lib/api-response"
import { query } from "@/lib/db"

export const runtime = "nodejs"

async function ensureClaim(userId: string, claimId: string) {
  const claim = await query(`SELECT id FROM claims WHERE id = $1 AND user_id = $2`, [claimId, userId])
  return Boolean(claim.rows[0])
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser()
    const { id: claimId } = await context.params

    if (!(await ensureClaim(user.id, claimId))) {
      return NextResponse.json({ error: "Claim not found or access denied" }, { status: 404 })
    }

    const { rows } = await query(
      `
      SELECT *
      FROM appeal_letters
      WHERE claim_id = $1
      ORDER BY created_at DESC
      `,
      [claimId]
    )

    return NextResponse.json({
      letters: rows,
    })
  } catch (error) {
    return handleApiError(error, "Failed to fetch letters")
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser()
    const { id: claimId } = await context.params

    if (!(await ensureClaim(user.id, claimId))) {
      return NextResponse.json({ error: "Claim not found or access denied" }, { status: 404 })
    }

    const body = await request.json()

    const {
      letter_content,
      status = "draft",
      letter_type = "appeal_letter",
    } = body

    if (!letter_content) {
      return NextResponse.json(
        { error: "Letter content is required" },
        { status: 400 }
      )
    }

    const { rows } = await query(
      `
      INSERT INTO appeal_letters (
        claim_id,
        created_by,
        letter_content,
        status,
        letter_type
      )
      VALUES ($1,$2,$3,$4,$5)
      RETURNING *
      `,
      [
        claimId,
        user.id,
        letter_content,
        status,
        letter_type,
      ]
    )

    await query(
      `
      UPDATE claims
      SET letter_status = $1
      WHERE id = $2
      AND user_id = $3
      `,
      [
        status === "approved"
          ? "approved"
          : "generated",
        claimId,
        user.id,
      ]
    )

    return NextResponse.json({
      success: true,
      letter: rows[0],
    })
  } catch (error) {
    return handleApiError(error, "Failed to save letter")
  }
}