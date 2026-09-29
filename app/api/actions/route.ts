import { NextRequest, NextResponse } from "next/server"

import { query } from "@/lib/db"
import { requireAuthenticatedProfile } from "@/lib/auth-server"

type ActionStatus =
  | "open"
  | "in_progress"
  | "completed"
  | "cancelled"

type ActionRow = {
  id: string
  meeting_id: string
  agenda_item_id: string | null

  title: string
  description: string | null
  owner_name: string | null
  due_date: string | null
  status: ActionStatus
  is_vendor_visible: boolean

  vendor_id: string
  vendor_name: string
  vendor_color: string | null

  meeting_title: string
  meeting_scheduled_at: string

  agenda_item_title: string | null

  created_at: string
  updated_at: string
}

type CountRow = {
  count: string
}

const ALLOWED_STATUSES = [
  "open",
  "in_progress",
  "completed",
  "cancelled",
] as const

export async function GET(
  request: NextRequest
) {
  try {
    const { profile } =
      await requireAuthenticatedProfile()

    const params =
      request.nextUrl.searchParams

    const status =
      params.get("status")

    const vendorId =
      params.get("vendorId")

    const search =
      params
        .get("search")
        ?.trim()

    const due =
      params.get("due")

    const page = Math.max(
      Number(
        params.get("page") ?? 1
      ),
      1
    )

    const pageSize = Math.min(
      Math.max(
        Number(
          params.get("pageSize") ?? 25
        ),
        1
      ),
      100
    )

    const offset =
      (page - 1) *
      pageSize

    const filters: string[] = [
      "ai.organization_id = $1",
    ]

    const values: unknown[] = [
      profile.organization_id,
    ]

    const addFilter = (
      sql: string,
      value: unknown
    ) => {
      values.push(value)

      filters.push(
        sql.replace(
          "?",
          `$${values.length}`
        )
      )
    }

    // --------------------------------------------------
    // Status
    // --------------------------------------------------

    if (
      status &&
      status !== "all"
    ) {
      if (
        !ALLOWED_STATUSES.includes(
          status as ActionStatus
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid action status",
          },
          {
            status: 400,
          }
        )
      }

      addFilter(
        "ai.status = ?",
        status
      )
    }

    // --------------------------------------------------
    // Vendor
    // --------------------------------------------------

    if (
      vendorId &&
      vendorId !== "all"
    ) {
      addFilter(
        "ai_meeting.vendor_id = ?",
        vendorId
      )
    }

    // --------------------------------------------------
    // Due-date filter
    // --------------------------------------------------

    if (due === "overdue") {
      filters.push(
        `
        ai.due_date IS NOT NULL
        AND ai.due_date < CURRENT_DATE
        AND ai.status IN (
          'open',
          'in_progress'
        )
        `
      )
    }

    if (due === "today") {
      filters.push(
        `
        ai.due_date = CURRENT_DATE
        AND ai.status IN (
          'open',
          'in_progress'
        )
        `
      )
    }

    if (due === "upcoming") {
      filters.push(
        `
        ai.due_date > CURRENT_DATE
        AND ai.status IN (
          'open',
          'in_progress'
        )
        `
      )
    }

    if (due === "no_due_date") {
      filters.push(
        "ai.due_date IS NULL"
      )
    }

    // --------------------------------------------------
    // Search
    // --------------------------------------------------

    if (search) {
      values.push(
        `%${search}%`
      )

      const searchParam =
        `$${values.length}`

      filters.push(
        `
        (
          ai.title ILIKE ${searchParam}
          OR ai.description ILIKE ${searchParam}
          OR ai.owner_name ILIKE ${searchParam}
          OR v.name ILIKE ${searchParam}
          OR ai_meeting.title ILIKE ${searchParam}
        )
        `
      )
    }

    const where =
      filters.join(
        " AND "
      )

    // --------------------------------------------------
    // Fetch actions
    // --------------------------------------------------

    const [
      actionsResult,
      countResult,
    ] = await Promise.all([
      query<ActionRow>(
        `
        SELECT
          ai.id,
          ai.meeting_id,
          ai.agenda_item_id,

          ai.title,
          ai.description,
          ai.owner_name,
          ai.due_date,
          ai.status,
          ai.is_vendor_visible,

          v.id AS vendor_id,
          v.name AS vendor_name,
          v.color AS vendor_color,

          ai_meeting.title
            AS meeting_title,

          ai_meeting.scheduled_at
            AS meeting_scheduled_at,

          agenda.title
            AS agenda_item_title,

          ai.created_at,
          ai.updated_at

        FROM vendor_meeting_action_items ai

        JOIN vendor_meetings ai_meeting
          ON ai_meeting.id =
            ai.meeting_id
          AND ai_meeting.organization_id =
            ai.organization_id

        JOIN vendors v
          ON v.id =
            ai_meeting.vendor_id
          AND v.organization_id =
            ai.organization_id

        LEFT JOIN vendor_meeting_agenda_items agenda
          ON agenda.id =
            ai.agenda_item_id
          AND agenda.organization_id =
            ai.organization_id

        WHERE ${where}

        ORDER BY

          CASE
            WHEN ai.status IN (
              'open',
              'in_progress'
            )
            AND ai.due_date <
              CURRENT_DATE
            THEN 0

            WHEN ai.status =
              'in_progress'
            THEN 1

            WHEN ai.status =
              'open'
            THEN 2

            WHEN ai.status =
              'completed'
            THEN 3

            ELSE 4
          END,

          ai.due_date ASC
            NULLS LAST,

          ai.created_at DESC

        LIMIT $${values.length + 1}
        OFFSET $${values.length + 2}
        `,
        [
          ...values,
          pageSize,
          offset,
        ]
      ),

      query<CountRow>(
        `
        SELECT
          COUNT(*)::text
            AS count

        FROM vendor_meeting_action_items ai

        JOIN vendor_meetings ai_meeting
          ON ai_meeting.id =
            ai.meeting_id
          AND ai_meeting.organization_id =
            ai.organization_id

        JOIN vendors v
          ON v.id =
            ai_meeting.vendor_id
          AND v.organization_id =
            ai.organization_id

        LEFT JOIN vendor_meeting_agenda_items agenda
          ON agenda.id =
            ai.agenda_item_id
          AND agenda.organization_id =
            ai.organization_id

        WHERE ${where}
        `,
        values
      ),
    ])

    const actions =
      actionsResult.rows.map(
        (row) => ({
          id:
            row.id,

          meetingId:
            row.meeting_id,

          agendaItemId:
            row.agenda_item_id,

          title:
            row.title,

          description:
            row.description,

          ownerName:
            row.owner_name,

          dueDate:
            row.due_date,

          status:
            row.status,

          isVendorVisible:
            row.is_vendor_visible,

          vendorId:
            row.vendor_id,

          vendorName:
            row.vendor_name,

          vendorColor:
            row.vendor_color,

          meetingTitle:
            row.meeting_title,

          meetingScheduledAt:
            row.meeting_scheduled_at,

          agendaItemTitle:
            row.agenda_item_title,

          createdAt:
            row.created_at,

          updatedAt:
            row.updated_at,
        })
      )

    return NextResponse.json({
      actions,

      count: Number(
        countResult.rows[0]
          ?.count ?? 0
      ),
    })
  } catch (error) {
    console.error(
      "GET ACTIONS ERROR:",
      error
    )

    return NextResponse.json(
      {
        error:
          "Failed to load action items",
      },
      {
        status: 500,
      }
    )
  }
}