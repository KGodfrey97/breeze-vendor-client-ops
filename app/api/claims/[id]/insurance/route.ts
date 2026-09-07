import { NextRequest, NextResponse } from "next/server"

import { handleApiError } from "@/lib/api-response"
import { requireAuthenticatedUser } from "@/lib/auth-server"
import { query } from "@/lib/db"

export const runtime = "nodejs"

async function ensureClaim(userId: string, claimId: string) {
  const claim = await query(`SELECT id FROM claims WHERE id = $1 AND user_id = $2`, [claimId, userId])
  return Boolean(claim.rows[0])
}

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuthenticatedUser()
    const { id } = await context.params
    if (!(await ensureClaim(user.id, id))) {
      return NextResponse.json({ error: "Claim not found or access denied" }, { status: 404 })
    }

    const { rows } = await query(
      `SELECT * FROM claim_insurance WHERE claim_id = $1 ORDER BY priority ASC`,
      [id],
    )
    return NextResponse.json({ data: rows })
  } catch (error) {
    return handleApiError(error, "Failed to fetch claim insurance")
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuthenticatedUser()
    const { id } = await context.params
    const body = await request.json()
    if (!(await ensureClaim(user.id, id))) {
      return NextResponse.json({ error: "Claim not found or access denied" }, { status: 404 })
    }

    // Accept either a single insurance object or { insurance: [...] } from the frontend
    const insuranceList = Array.isArray(body.insurance)
      ? body.insurance
      : Array.isArray(body)
        ? body
        : [body]

    if (insuranceList.length === 0) {
      return NextResponse.json({ error: "No insurance records provided" }, { status: 400 })
    }

    const insertedRows = []

    for (const insurance of insuranceList) {
      const { rows } = await query(
        `INSERT INTO claim_insurance (
           claim_id, insurance_provider, payer_id, policy_number, group_number, plan_type,
           member_name, member_dob, claim_address, payer_phone_number, priority,
           effective_date, termination_date, created_by, updated_by
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $14)
         RETURNING *`,
        [
          id,
          insurance.insurance_provider,
          insurance.payer_id || null,
          insurance.policy_number,
          insurance.group_number || null,
          insurance.plan_type || null,
          insurance.member_name || null,
          insurance.member_dob || null,
          insurance.claim_address || null,
          insurance.payer_phone_number || null,
          insurance.priority,
          insurance.effective_date || null,
          insurance.termination_date || null,
          user.id,
        ],
      )
      insertedRows.push(rows[0])
    }

    return NextResponse.json({ data: insertedRows }, { status: 201 })
  } catch (error) {
    return handleApiError(error, "Failed to save claim insurance")
  }
}