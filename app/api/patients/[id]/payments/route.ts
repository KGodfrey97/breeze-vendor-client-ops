import { NextResponse } from "next/server"

import { handleApiError } from "@/lib/api-response"
import { requireAuthenticatedUser } from "@/lib/auth-server"
import { query } from "@/lib/db"

export const runtime = "nodejs"

async function ensurePatient(userId: string, patientId: string) {
  const patient = await query(`SELECT id FROM patients WHERE id = $1 AND user_id = $2`, [patientId, userId])
  return Boolean(patient.rows[0])
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser()
    const { id } = await context.params

    if (!(await ensurePatient(user.id, id))) {
      return NextResponse.json({ error: "Patient not found or access denied" }, { status: 404 })
    }

    const { rows } = await query(
      `
      SELECT
        p.*
      FROM payments p
      INNER JOIN claims c
          ON p.claim_id = c.id
      WHERE c.patient_id = $1
      ORDER BY p.payment_date DESC;
      `,
      [id]
    )


    const totalAmount = rows.reduce(
      (sum, payment) => (payment.payment_status === "paid" ? sum + Number(payment.amount) : sum),
      0,
    )

    return NextResponse.json({
      success: true,
      data: {
        payments: rows,
        totalAmount,
        paymentCount: rows.length,
      },
    })
  } catch (error) {
    return handleApiError(error, "Failed to fetch payments")
  }
}