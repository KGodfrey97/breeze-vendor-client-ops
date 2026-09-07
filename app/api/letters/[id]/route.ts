import { NextRequest, NextResponse } from "next/server"

import { requireAuthenticatedUser } from "@/lib/auth-server"
import { handleApiError } from "@/lib/api-response"
import { query } from "@/lib/db"

export const runtime = "nodejs"

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser()
    const { id } = await context.params

    const body = await request.json()

    const allowedFields = [
      "status",
      "letter_content",
    ]

    const fields = allowedFields.filter((field) =>
      Object.prototype.hasOwnProperty.call(body, field)
    )

    if (fields.length === 0) {
      return NextResponse.json(
        { error: "No valid fields provided" },
        { status: 400 }
      )
    }

    const values = fields.map((field) => body[field])

    const setSql = fields
      .map((field, index) => `${field} = $${index + 1}`)
      .join(", ")

    const { rows } = await query(
      `
      UPDATE appeal_letters
      SET ${setSql}
      WHERE id = $${values.length + 1}
      AND user_id = $${values.length + 2}
      RETURNING *
      `,
      [...values, id, user.id]
    )

    if (!rows[0]) {
      return NextResponse.json(
        { error: "Letter not found" },
        { status: 404 }
      )
    }

    if (body.status) {
      let claimStatus = null

      if (body.status === "approved")
        claimStatus = "approved"

      if (body.status === "sent")
        claimStatus = "sent"

      if (claimStatus) {
        await query(
          `
          UPDATE claims
          SET letter_status = $1
          WHERE id = $2
          `,
          [claimStatus, rows[0].claim_id]
        )
      }
    }

    return NextResponse.json({
      success: true,
      letter: rows[0],
    })
  } catch (error) {
    return handleApiError(error, "Failed to update letter")
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser()
    const { id } = await context.params

    const result = await query(
      `
      DELETE FROM appeal_letters
      WHERE id = $1
      AND user_id = $2
      `,
      [id, user.id]
    )

    return NextResponse.json({
      success: result.rowCount > 0,
    })
  } catch (error) {
    return handleApiError(error, "Failed to delete letter")
  }
}