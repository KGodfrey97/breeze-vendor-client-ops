import { type NextRequest, NextResponse } from "next/server"

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
      `SELECT *
       FROM payments
       WHERE claim_id = $1 AND user_id = $2
       ORDER BY created_at DESC`,
      [id, user.id],
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

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuthenticatedUser()
    const { id } = await context.params
    const { amount, payment_method, reference_number, check_number, payment_date, notes } = await request.json()

    if (!amount || Number(amount) <= 0) {
      return NextResponse.json({ error: "Valid amount is required" }, { status: 400 })
    }
    if (!(await ensureClaim(user.id, id))) {
      return NextResponse.json({ error: "Claim not found or access denied" }, { status: 404 })
    }

    const { rows } = await query(
      `INSERT INTO payments (
         claim_id, user_id, amount, payment_method, payment_status, reference_number,
         check_number, payment_date, notes, created_by, updated_by
       )
       VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, $8, $2, $2)
       RETURNING *`,
      [
        id,
        user.id,
        Number(amount),
        payment_method || "check",
        reference_number || null,
        check_number || null,
        payment_date || new Date().toISOString().split("T")[0],
        notes || null,
      ],
    )

    return NextResponse.json({
      success: true,
      message: "Payment added successfully",
      data: rows[0],
    })
  } catch (error) {
    return handleApiError(error, "Failed to create payment")
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuthenticatedUser()
    const { id } = await context.params
    const { payment_id, payment_status } = await request.json()
    const validStatuses = ["pending", "paid", "partial", "denied", "void"]

    if (!payment_id || !validStatuses.includes(payment_status)) {
      return NextResponse.json({ error: "Invalid payment status" }, { status: 400 })
    }
    if (!(await ensureClaim(user.id, id))) {
      return NextResponse.json({ error: "Claim not found or access denied" }, { status: 404 })
    }

    const { rows } = await query(
      `UPDATE payments
       SET payment_status = $1, updated_by = $2
       WHERE id = $3 AND claim_id = $4 AND user_id = $2
       RETURNING *`,
      [payment_status, user.id, payment_id, id],
    )

    if (!rows[0]) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: "Payment status updated successfully",
      data: rows[0],
    })
  } catch (error) {
    return handleApiError(error, "Failed to update payment")
  }
}
