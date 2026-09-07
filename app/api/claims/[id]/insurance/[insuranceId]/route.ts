import { NextRequest, NextResponse } from "next/server"

import { handleApiError } from "@/lib/api-response"
import { requireAuthenticatedUser } from "@/lib/auth-server"
import { query } from "@/lib/db"

export const runtime = "nodejs"

async function ensureClaim(userId: string, claimId: string) {
  const claim = await query(`SELECT id FROM claims WHERE id = $1 AND user_id = $2`, [claimId, userId])
  return Boolean(claim.rows[0])
}

export async function PATCH(request: NextRequest, context: { params: { id: string; insuranceId: string } }) {
  try {
    const user = await requireAuthenticatedUser()
    const { id, insuranceId } = context.params
    const body = await request.json()
    if (!(await ensureClaim(user.id, id))) {
      return NextResponse.json({ error: "Claim not found or access denied" }, { status: 404 })
    }

    const { rows } = await query(
      `UPDATE claim_insurance
       SET insurance_provider = $1, payer_id = $2, policy_number = $3, group_number = $4,
           plan_type = $5, member_name = $6, member_dob = $7, claim_address = $8,
           payer_phone_number = $9, priority = $10, effective_date = $11,
           termination_date = $12, updated_by = $13
       WHERE id = $14 AND claim_id = $15
       RETURNING *`,
      [
        body.insurance_provider,
        body.payer_id || null,
        body.policy_number,
        body.group_number || null,
        body.plan_type || null,
        body.member_name || null,
        body.member_dob || null,
        body.claim_address || null,
        body.payer_phone_number || null,
        body.priority,
        body.effective_date || null,
        body.termination_date || null,
        user.id,
        insuranceId,
        id,
      ],
    )
    return NextResponse.json({ data: rows[0] })
  } catch (error) {
    return handleApiError(error, "Failed to update claim insurance")
  }
}

export async function DELETE(_request: NextRequest, context: { params: { id: string; insuranceId: string } }) {
  try {
    const user = await requireAuthenticatedUser()
    const { id, insuranceId } = context.params
    if (!(await ensureClaim(user.id, id))) {
      return NextResponse.json({ error: "Claim not found or access denied" }, { status: 404 })
    }

    await query(`DELETE FROM claim_insurance WHERE id = $1 AND claim_id = $2`, [insuranceId, id])
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, "Failed to delete claim insurance")
  }
}
