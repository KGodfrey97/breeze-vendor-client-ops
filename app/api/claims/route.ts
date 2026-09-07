import { NextRequest, NextResponse } from "next/server"

import { handleApiError } from "@/lib/api-response"
import { requireAuthenticatedUser } from "@/lib/auth-server"
import { query, withTransaction } from "@/lib/db"
import { encryptSsn } from "@/lib/kms"

export const runtime = "nodejs"

const sortableColumns: Record<string, string> = {
  created_at: "c.created_at",
  claim_id: "c.claim_id",
  patient_name: "patient_name",
  insurance_provider: "c.insurance_provider",
  original_claim_amount: "c.original_claim_amount",
  status: "c.status",
  priority: "c.priority",
  follow_up_date: "c.follow_up_date",
}

function getClaimSelect() {
  return `
    SELECT c.*,
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
  `
}

function mapClaim(row: any) {
  return {
    ...row,
    profiles: row.profile_full_name
      ? { full_name: row.profile_full_name, organization: row.profile_organization }
      : null,
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const params = request.nextUrl.searchParams
    const page = Math.max(Number(params.get("page") ?? 1), 1)
    const pageSize = Math.min(Math.max(Number(params.get("pageSize") ?? 20), 1), 100)
    const offset = (page - 1) * pageSize
    const filters: string[] = ["c.user_id = $1"]
    const values: unknown[] = [user.id]

    const addFilter = (sql: string, value: unknown) => {
      values.push(value)
      filters.push(sql.replace("?", `$${values.length}`))
    }

    const status = params.get("status")
    const claimStatus = params.get("claimStatus")
    const effectiveStatus = claimStatus && claimStatus !== "all" ? claimStatus : status
    if (effectiveStatus && effectiveStatus !== "all") addFilter("c.status = ?", effectiveStatus)

    const priority = params.get("priority")
    if (priority && priority !== "all") addFilter("c.priority = ?", priority)

    const letterStatus = params.get("letterStatus")
    if (letterStatus && letterStatus !== "all") addFilter("c.letter_status = ?", letterStatus)

    const appealtype = params.get("appealtype")
    if (appealtype && appealtype !== "all") addFilter("c.appeal_type = ?", appealtype)

    const dateFrom = params.get("dateFrom")
    if (dateFrom) addFilter("c.created_at >= ?", dateFrom)

    const dateTo = params.get("dateTo")
    if (dateTo) addFilter("c.created_at <= ?", dateTo)

    const search = params.get("search")?.trim()
    if (search) {
      values.push(`%${search}%`)
      filters.push(`(c.claim_id ILIKE $${values.length} OR CONCAT_WS(' ', p.first_name, p.last_name) ILIKE $${values.length} OR p.patient_external_id ILIKE $${values.length})`)
    }

    const sortBy = params.get("sortBy") || "created_at"
    const sortColumn = sortableColumns[sortBy] ?? "c.created_at"
    const sortOrder = params.get("sortOrder") === "asc" ? "ASC" : "DESC"
    const where = filters.join(" AND ")

    const [claimsResult, countResult, typesResult] = await Promise.all([
      query(
        `${getClaimSelect()}
         WHERE ${where}
         ORDER BY ${sortColumn} ${sortOrder} NULLS LAST
         LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
        [...values, pageSize, offset],
      ),
      query<{ count: string }>(
        `SELECT COUNT(*)::text AS count
         FROM claims c
         LEFT JOIN patients p ON p.id = c.patient_id AND p.user_id = c.user_id
         WHERE ${where}`,
        values,
      ),
      query<{ appeal_type: string }>(
        `SELECT DISTINCT appeal_type
         FROM claims
         WHERE user_id = $1 AND appeal_type <> ''
         ORDER BY appeal_type ASC`,
        [user.id],
      ),
    ])

    return NextResponse.json({
      claims: claimsResult.rows.map(mapClaim),
      count: Number(countResult.rows[0]?.count ?? 0),
      types: typesResult.rows.map((row) => row.appeal_type),
    })
  } catch (error) {
    return handleApiError(error, "Failed to fetch claims")
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const body = await request.json()
    const ssnCiphertext = await encryptSsn(body.socialSecurityNumber)

    const createdClaim = await withTransaction(async (client) => {
      let patientId = body.patient_id || body.selectedExistingPatient || null

      if (patientId) {
        const patientCheck = await client.query(
          `SELECT id FROM patients WHERE id = $1 AND user_id = $2`,
          [patientId, user.id],
        )
        if (patientCheck.rowCount === 0) throw new Error("Patient not found")
      } else {
        const existingPatient = await client.query<{ id: string }>(
          `SELECT id FROM patients WHERE user_id = $1 AND patient_external_id = $2`,
          [user.id, body.patient_external_id],
        )

        if (existingPatient.rows[0]?.id) {
          patientId = existingPatient.rows[0].id
        } else {
          const patientInsert = await client.query<{ id: string }>(
            `INSERT INTO patients (
               user_id, patient_external_id, first_name, last_name, dob, ssn_ciphertext, created_by, updated_by
             )
             VALUES ($1, $2, $3, $4, $5, $6, $1, $1)
             RETURNING id`,
            [
              user.id,
              body.patient_external_id,
              body.patient_first_name,
              body.patient_last_name,
              body.patient_dob || null,
              ssnCiphertext,
            ],
          )
          patientId = patientInsert.rows[0].id
        }
      }

      const claimInsert = await client.query<{ id: string }>(
        `INSERT INTO claims (
           user_id, patient_id, insurance_provider, insurance_plan, policy_number, group_number,
           claim_id, original_claim_amount, service_date, denial_date, denial_reason, procedure_code,
           diagnosis_code, provider_name, provider_id, facility_name, appeal_type, appeal_reason,
           appeal_description, priority, status, follow_up_date, created_by, updated_by
         )
         VALUES (
           $1, $2, $3, $4, $5, $6,
           $7, $8, $9, $10, $11, $12,
           $13, $14, $15, $16, $17, $18,
           $19, $20, 'under_review', $21, $1, $1
         )
         RETURNING id`,
        [
          user.id,
          patientId,
          body.insurance_provider,
          body.insurance_plan,
          body.policy_number,
          body.group_number || null,
          body.claim_id,
          body.original_claim_amount,
          body.service_date,
          body.denial_date,
          body.denial_reason,
          body.procedure_code,
          body.diagnosis_code,
          body.provider_name,
          body.provider_id,
          body.facility_name || null,
          body.appeal_type,
          body.appeal_reason,
          body.appeal_description,
          body.priority,
          body.follow_up_date || null,
        ],
      )

      const claimId = claimInsert.rows[0].id

      if (Array.isArray(body.insurances) && body.insurances.length > 0) {
        for (const insurance of body.insurances) {
          await client.query(
            `INSERT INTO claim_insurance (
               claim_id, insurance_provider, payer_id, policy_number, group_number, plan_type,
               member_name, member_dob, claim_address, payer_phone_number, priority,
               effective_date, termination_date, created_by, updated_by
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $14)`,
            [
              claimId,
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
        }
      }

      await client.query(
        `INSERT INTO claim_timeline (claim_id, event_type, event_description, created_by)
         VALUES ($1, 'claim_created', 'Claim created', $2)`,
        [claimId, user.id],
      )
      
      return { id: claimId }
    })
    
    return NextResponse.json({ success: true, data: createdClaim }, { status: 201 })
  } catch (error) {
    return handleApiError(error, "Failed to create claim")
  }
}
