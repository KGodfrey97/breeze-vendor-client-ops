import { NextRequest, NextResponse } from "next/server"

import { handleApiError } from "@/lib/api-response"
import { requireAuthenticatedUser } from "@/lib/auth-server"
import { query } from "@/lib/db"

export const runtime = "nodejs"

async function ensurePatient(userId: string, patientId: string) {
  const patient = await query(`SELECT id FROM patients WHERE id = $1 AND user_id = $2`, [patientId, userId])
  return Boolean(patient.rows[0])
}

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  
  try {
    const user = await requireAuthenticatedUser()
    const { id } = await context.params

    if (!(await ensurePatient(user.id, id))) {
      return NextResponse.json({ error: "Patient not found or access denied" }, { status: 404 })
    }
    const { rows } = await query(`SELECT * FROM patient_insurance WHERE patient_id = $1 ORDER BY priority ASC`, [id])
    return NextResponse.json({ data: rows })
  } catch (error) {
    return handleApiError(error, "Failed to fetch patient insurance")
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuthenticatedUser()
    const { id } = await context.params
    const body = await request.json()
    if (!(await ensurePatient(user.id, id))) {
      return NextResponse.json({ error: "Patient not found or access denied" }, { status: 404 })
    }
    const { rows } = await query(
      `INSERT INTO patient_insurance (
         patient_id, insurance_provider, payer_id, policy_number, group_number, plan_type,
         member_name, member_dob, claim_address, payer_phone_number, priority,
         effective_date, termination_date, created_by, updated_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $14)
       RETURNING *`,
      [
        id,
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
      ],
    )
    return NextResponse.json({ data: rows[0] }, { status: 201 })
  } catch (error) {
    return handleApiError(error, "Failed to save patient insurance")
  }
}
