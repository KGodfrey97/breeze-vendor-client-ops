import { NextRequest, NextResponse } from "next/server"

import { handleApiError } from "@/lib/api-response"
import { requireAuthenticatedUser } from "@/lib/auth-server"
import { query } from "@/lib/db"
import { decryptSsn, encryptSsn } from "@/lib/kms"

export const runtime = "nodejs"

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuthenticatedUser()
    const { id } = await context.params
    const [patientResult, claimsResult] = await Promise.all([
      query(
        `SELECT id, user_id, patient_external_id, first_name, last_name, dob, ssn_ciphertext, is_active, created_by, updated_by, created_at, updated_at
         FROM patients
         WHERE id = $1 AND user_id = $2 AND is_active = true`,
        [id, user.id],
      ),
      query(
        `SELECT * FROM claims
         WHERE patient_id = $1 AND user_id = $2
         ORDER BY created_at DESC`,
        [id, user.id],
      ),
    ])

    const patientRow = patientResult.rows[0]

    if (!patientRow) {
      return NextResponse.json({ error: "Patient not found or access denied" }, { status: 404 })
    }

    const { ssn_ciphertext, ...patientFields } = patientRow
    const ssn = ssn_ciphertext ? await decryptSsn(ssn_ciphertext) : null

    return NextResponse.json({
      patient: { ...patientFields, ssn },
      claims: claimsResult.rows,
    })
  } catch (error) {
    return handleApiError(error, "Failed to fetch patient")
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuthenticatedUser()
    const { id } = await context.params
    const body = await request.json()

    const trimmedSsn = typeof body.ssn === "string" ? body.ssn.trim() : ""

    // Only re-encrypt and overwrite ssn_ciphertext if the caller sent a new SSN value.
    // Leaving it out (or blank) keeps whatever is already on file.
    if (trimmedSsn) {
      const ssnCiphertext = await encryptSsn(trimmedSsn)

      const { rows } = await query(
        `UPDATE patients
         SET first_name = $1, last_name = $2, patient_external_id = $3, dob = $4, ssn_ciphertext = $5, updated_by = $6
         WHERE id = $7 AND user_id = $6
         RETURNING id, user_id, patient_external_id, first_name, last_name, dob, is_active, created_at, updated_at`,
        [
          body.first_name,
          body.last_name,
          body.patient_external_id,
          body.dob || null,
          ssnCiphertext,
          user.id,
          id,
        ],
      )

      if (!rows[0]) {
        return NextResponse.json({ error: "Patient not found or access denied" }, { status: 404 })
      }

      return NextResponse.json({ patient: rows[0] })
    }

    const { rows } = await query(
      `UPDATE patients
       SET first_name = $1, last_name = $2, patient_external_id = $3, dob = $4, updated_by = $5
       WHERE id = $6 AND user_id = $5
       RETURNING id, user_id, patient_external_id, first_name, last_name, dob, is_active, created_at, updated_at`,
      [
        body.first_name,
        body.last_name,
        body.patient_external_id,
        body.dob || null,
        user.id,
        id,
      ],
    )

    if (!rows[0]) {
      return NextResponse.json({ error: "Patient not found or access denied" }, { status: 404 })
    }

    return NextResponse.json({ patient: rows[0] })
  } catch (error) {
    return handleApiError(error, "Failed to update patient")
  }
}