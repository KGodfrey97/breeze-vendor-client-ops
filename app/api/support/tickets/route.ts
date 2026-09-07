import { NextRequest, NextResponse } from "next/server"

import { handleApiError } from "@/lib/api-response"
import { requireAuthenticatedUser } from "@/lib/auth-server"
import { query } from "@/lib/db"

export const runtime = "nodejs"

function generateTicketNumber() {
  const timestamp = Date.now().toString().slice(-8)
  const random = Math.random().toString(36).slice(2, 8).toUpperCase()

  return `TICK-${timestamp}${random}`.slice(0, 20)
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()

    const body = await request.json()

    const {
      subject,
      category,
      priority,
      description,
    } = body

    if (!subject || !description) {
      return NextResponse.json(
        { error: "Subject and description are required." },
        { status: 400 },
      )
    }

    const ticketId = generateTicketNumber()

    const ticketResult = await query(
      `
      INSERT INTO support_tickets (
        ticket_id,
        profile_id,
        subject,
        category,
        priority,
        status
      )
      VALUES ($1,$2,$3,$4,$5,'open')
      RETURNING *
      `,
      [
        ticketId,
        user.id,
        subject.trim(),
        category,
        priority ?? "normal",
      ],
    )

    const ticket = ticketResult.rows[0]

    await query(
      `
      INSERT INTO ticket_messages (
        ticket_id,
        sender_type,
        message,
        attachments
      )
      VALUES ($1,'user',$2,NULL)
      `,
      [
        ticket.id,
        description.trim(),
      ],
    )

    return NextResponse.json({
      ticket,
    })
  } catch (error) {
    return handleApiError(error, "Failed to create support ticket")
  }
}