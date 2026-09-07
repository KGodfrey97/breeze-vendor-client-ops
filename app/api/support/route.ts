import { NextResponse } from "next/server"

import { handleApiError } from "@/lib/api-response"
import { requireAuthenticatedUser } from "@/lib/auth-server"
import { query } from "@/lib/db"

export const runtime = "nodejs"

export async function GET() {
  try {
    const user = await requireAuthenticatedUser()

    const [faqResult, ticketResult] = await Promise.all([
      query(
        `
        SELECT *
        FROM faqs
        WHERE is_active = true
        ORDER BY category ASC, created_at ASC
        `
      ),

      query(
        `
        SELECT *
        FROM support_tickets
        WHERE profile_id = $1
        ORDER BY updated_at DESC
        `,
        [user.id]
      ),
    ])

    return NextResponse.json({
      faqs: faqResult.rows,
      tickets: ticketResult.rows,
      userId: user.id,
    })
  } catch (error) {
    return handleApiError(error, "Failed to load support data")
  }
}