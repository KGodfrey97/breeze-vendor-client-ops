import { NextRequest, NextResponse } from "next/server"

import { handleApiError } from "@/lib/api-response"
import { requireAuthenticatedUser } from "@/lib/auth-server"
import { query } from "@/lib/db"

export const runtime = "nodejs"

function mapClaim(row: any) {
  return {
    ...row,
    profiles: row.profile_full_name
      ? { full_name: row.profile_full_name, organization: row.profile_organization }
      : null,
  }
}

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuthenticatedUser()
    const { id } = await context.params
    const { rows } = await query(
      `SELECT c.*,
        p.first_name,
        p.last_name,
        p.dob,
        p.patient_external_id,
        CONCAT_WS(' ', p.first_name, p.last_name) AS patient_name,
        pr.full_name AS profile_full_name,
        pr.organization AS profile_organization
       FROM claims c
       LEFT JOIN patients p ON p.id = c.patient_id AND p.user_id = c.user_id
       LEFT JOIN profiles pr ON pr.id = c.created_by
       WHERE c.id = $1 AND c.user_id = $2`,
      [id, user.id],
    )

    if (!rows[0]) {
      return NextResponse.json({ error: "Claim not found or access denied" }, { status: 404 })
    }

    return NextResponse.json({ claim: mapClaim(rows[0]) })
  } catch (error) {
    return handleApiError(error, "Failed to fetch claim")
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuthenticatedUser()
    const { id } = await context.params
    const body = await request.json()

    const allowedFields = [
      "insurance_provider",
      "insurance_plan",
      "policy_number",
      "group_number",
      "claim_id",
      "original_claim_amount",
      "service_date",
      "denial_date",
      "denial_reason",
      "procedure_code",
      "diagnosis_code",
      "provider_name",
      "provider_id",
      "facility_name",
      "appeal_type",
      "appeal_reason",
      "appeal_description",
      "priority",
      "status",
      "letter_status",
      "follow_up_date",
    ]

    const entries = allowedFields.filter((field) => Object.prototype.hasOwnProperty.call(body, field))
    if (entries.length === 0) {
      return NextResponse.json({ error: "No supported fields provided" }, { status: 400 })
    }

    const values = entries.map((field) => body[field] ?? null)
    const setSql = entries.map((field, index) => `${field} = $${index + 1}`).join(", ")
    const result = await query(
      `UPDATE claims
       SET ${setSql}, updated_by = $${values.length + 1}
       WHERE id = $${values.length + 2} AND user_id = $${values.length + 3}
       RETURNING *`,
      [...values, user.id, id, user.id],
    )

    if (!result.rows[0]) {
      return NextResponse.json({ error: "Claim not found or access denied" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: result.rows[0] })
  } catch (error) {
    return handleApiError(error, "Failed to update claim")
  }
}
