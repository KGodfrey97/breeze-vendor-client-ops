import { NextRequest, NextResponse } from "next/server"

import { handleApiError } from "@/lib/api-response"
import { requireAuthenticatedUser } from "@/lib/auth-server"
import { query } from "@/lib/db"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const timeRange = request.nextUrl.searchParams.get("timeRange") || "all"
    const days = timeRange === "all" ? null : Number(timeRange)
    const startDate = days && Number.isFinite(days) ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : null

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const followUpEnd = new Date(today)
    followUpEnd.setDate(followUpEnd.getDate() + 7)

    const [claimsResult, followUpResult] = await Promise.all([
      query<{ status: string | null; original_claim_amount: string | number | null; created_at: string | null }>(
        `SELECT status, original_claim_amount, created_at
         FROM claims
         WHERE user_id = $1
           AND ($2::timestamptz IS NULL OR created_at >= $2)`,
        [user.id, startDate?.toISOString() ?? null],
      ),
      query(
        `SELECT c.*, p.first_name, p.last_name, pr.full_name, pr.organization
         FROM claims c
         LEFT JOIN patients p ON p.id = c.patient_id AND p.user_id = c.user_id
         LEFT JOIN profiles pr ON pr.id = c.created_by
         WHERE c.user_id = $1
           AND c.follow_up_date IS NOT NULL
           AND c.follow_up_date <= $2::date
           AND c.status = ANY($3::text[])
         ORDER BY c.follow_up_date ASC`,
        [user.id, followUpEnd.toISOString().slice(0, 10), ["processing", "under_review"]],
      ),
    ])

    const allClaims = claimsResult.rows
    const totalClaims = allClaims.length
    const overturnedCount = allClaims.filter((claim) => claim.status === "overturned").length
    const deniedCount = allClaims.filter((claim) => claim.status === "denied").length
    const processingClaims = allClaims.filter((claim) => claim.status === "processing").length
    const completedCount = overturnedCount + deniedCount
    const successRate = completedCount > 0 ? Number(((overturnedCount / completedCount) * 100).toFixed(1)) : 0
    const recoveredRevenue = allClaims
      .filter((claim) => claim.status === "overturned")
      .reduce((sum, claim) => sum + Number(claim.original_claim_amount ?? 0), 0)

    const monthlyMap = new Map<string, { name: string; submitted: number; overturned: number; denied: number }>()
    for (const claim of allClaims) {
      if (!claim.created_at) continue
      const month = new Date(claim.created_at).toLocaleString("default", { month: "short", year: "2-digit" })
      const row = monthlyMap.get(month) ?? { name: month, submitted: 0, overturned: 0, denied: 0 }
      row.submitted += 1
      if (claim.status === "overturned") row.overturned += 1
      if (claim.status === "denied") row.denied += 1
      monthlyMap.set(month, row)
    }

    return NextResponse.json({
      stats: {
        totalClaims,
        successRate,
        processingClaims,
        recoveredRevenue,
        statusCounts: [
          { status: "processing", count: processingClaims },
          { status: "overturned", count: overturnedCount },
          { status: "denied", count: deniedCount },
        ].filter((item) => item.count > 0),
      },
      chartData: Array.from(monthlyMap.values()),
      followUpClaims: followUpResult.rows.map((claim) => ({
        ...claim,
        patients: claim.first_name
          ? { first_name: claim.first_name, last_name: claim.last_name }
          : null,
        profiles: claim.full_name
          ? { full_name: claim.full_name, organization: claim.organization }
          : null,
      })),
    })
  } catch (error) {
    return handleApiError(error, "Failed to load dashboard data")
  }
}
