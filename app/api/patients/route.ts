import { NextRequest, NextResponse } from "next/server"

import { handleApiError } from "@/lib/api-response"
import { requireAuthenticatedUser } from "@/lib/auth-server"
import { query } from "@/lib/db"
import { encryptSsn } from "@/lib/kms"
import { debug } from "console"

export const runtime = "nodejs"

export async function GET(_request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const { rows } = await query(
      `SELECT p.id, p.patient_external_id, p.first_name, p.last_name, p.dob,
         COUNT(c.id)::int AS total_claims,
         COUNT(c.id) FILTER (WHERE c.status IN ('processing', 'under_review'))::int AS active_claims,
         COALESCE(SUM(c.original_claim_amount) FILTER (WHERE c.status = 'overturned'), 0)::numeric AS total_recovered,
         MAX(c.created_at) AS last_claim_date,
         COUNT(c.id) FILTER (WHERE c.status = 'overturned')::int AS overturned_claims,
         COUNT(c.id) FILTER (WHERE c.status IN ('overturned', 'denied'))::int AS completed_claims
       FROM patients p
       LEFT JOIN claims c ON c.patient_id = p.id AND c.user_id = p.user_id
       WHERE p.user_id = $1 AND p.is_active = true
       GROUP BY p.id
       ORDER BY MAX(c.created_at) DESC NULLS LAST, p.created_at DESC`,
      [user.id],
    )

    return NextResponse.json({
      patients: rows.map((row) => ({
        ...row,
        success_rate:
          Number(row.completed_claims) > 0
            ? (Number(row.overturned_claims) / Number(row.completed_claims)) * 100
            : 0,
      })),
    })
  } catch (error) {
    return handleApiError(error, "Failed to fetch patients")
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const body = await request.json()
    const ssnCiphertext = await encryptSsn(body.ssn)
    // Check if patient already exists for this user
    console.log(body)
    const existing = await query(
      `SELECT id
       FROM patients
       WHERE user_id = $1
       AND patient_external_id = $2
       LIMIT 1`,
      [user.id, body.patient_external_id],
    )

    if (existing.rows.length > 0) {
      return NextResponse.json({
        patient: existing.rows[0],
      })
    }

    const result = await query(
      `INSERT INTO patients (
          user_id,
          first_name,
          last_name,
          patient_external_id,
          dob,
          ssn_ciphertext,
          created_by
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id`,
      [
        user.id,
        body.first_name,
        body.last_name,
        body.patient_external_id,
        body.dob,
        ssnCiphertext,
        user.id
      ],
    )

    return NextResponse.json({
      patient: result.rows[0],
    })
  } catch (error) {
    return handleApiError(error, "Failed to create patient")
  }
}