import { NextRequest, NextResponse } from "next/server"

import { query } from "@/lib/db"
import { requireAuthenticatedProfile } from "@/lib/auth-server"

type MeetingStatus =
  | "scheduled"
  | "completed"
  | "cancelled"

type MeetingRow = {
  id: string
  vendor_id: string
  vendor_name: string
  vendor_color: string | null

  title: string
  meeting_type: string | null
  status: MeetingStatus
  scheduled_at: string
  duration_minutes: number | null
  location: string | null
  meeting_link: string | null
  summary: string | null
  internal_notes: string | null

  agenda_item_count: string
  action_item_count: string
  open_action_item_count: string

  created_at: string
  updated_at: string
}

type CountRow = {
  count: string
}

const ALLOWED_STATUSES = [
  "scheduled",
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

    const date =
      params.get("date")

    const meetingType =
      params
        .get("meetingType")
        ?.trim()

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
      "vm.organization_id = $1",
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
          status as MeetingStatus
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid meeting status",
          },
          {
            status: 400,
          }
        )
      }

      addFilter(
        "vm.status = ?",
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
        "vm.vendor_id = ?",
        vendorId
      )
    }

    // --------------------------------------------------
    // Meeting type
    // --------------------------------------------------

    if (meetingType) {
      addFilter(
        "vm.meeting_type ILIKE ?",
        meetingType
      )
    }

    // --------------------------------------------------
    // Date filter
    // --------------------------------------------------

    if (
      date === "upcoming"
    ) {
      filters.push(
        `
        vm.status = 'scheduled'
        AND vm.scheduled_at >= NOW()
        `
      )
    }

    if (
      date === "past"
    ) {
      filters.push(
        `
        (
          vm.status != 'scheduled'
          OR vm.scheduled_at < NOW()
        )
        `
      )
    }

    if (
      date === "today"
    ) {
      filters.push(
        `
        vm.scheduled_at::date =
          CURRENT_DATE
        `
      )
    }

    if (
      date === "next_7_days"
    ) {
      filters.push(
        `
        vm.status = 'scheduled'
        AND vm.scheduled_at >= NOW()
        AND vm.scheduled_at <
          NOW() + INTERVAL '7 days'
        `
      )
    }

    if (
      date === "next_30_days"
    ) {
      filters.push(
        `
        vm.status = 'scheduled'
        AND vm.scheduled_at >= NOW()
        AND vm.scheduled_at <
          NOW() + INTERVAL '30 days'
        `
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
          vm.title ILIKE ${searchParam}
          OR vm.meeting_type ILIKE ${searchParam}
          OR vm.location ILIKE ${searchParam}
          OR v.name ILIKE ${searchParam}
        )
        `
      )
    }

    const where =
      filters.join(
        " AND "
      )

    // --------------------------------------------------
    // Fetch meetings
    // --------------------------------------------------

    const [
      meetingsResult,
      countResult,
    ] = await Promise.all([
      query<MeetingRow>(
        `
        SELECT
          vm.id,

          vm.vendor_id,
          v.name AS vendor_name,
          v.color AS vendor_color,

          vm.title,
          vm.meeting_type,
          vm.status,
          vm.scheduled_at,
          vm.duration_minutes,
          vm.location,
          vm.meeting_link,
          vm.summary,
          vm.internal_notes,

          (
            SELECT COUNT(*)
            FROM vendor_meeting_agenda_items agenda
            WHERE agenda.meeting_id = vm.id
              AND agenda.organization_id =
                vm.organization_id
          )::text AS agenda_item_count,

          (
            SELECT COUNT(*)
            FROM vendor_meeting_action_items action
            WHERE action.meeting_id = vm.id
              AND action.organization_id =
                vm.organization_id
          )::text AS action_item_count,

          (
            SELECT COUNT(*)
            FROM vendor_meeting_action_items action
            WHERE action.meeting_id = vm.id
              AND action.organization_id =
                vm.organization_id
              AND action.status IN (
                'open',
                'in_progress'
              )
          )::text AS open_action_item_count,

          vm.created_at,
          vm.updated_at

        FROM vendor_meetings vm

        JOIN vendors v
          ON v.id = vm.vendor_id
          AND v.organization_id =
            vm.organization_id

        WHERE ${where}

        ORDER BY

          CASE
            WHEN vm.status = 'scheduled'
              AND vm.scheduled_at >= NOW()
            THEN 0

            WHEN vm.status = 'completed'
            THEN 1

            WHEN vm.status = 'cancelled'
            THEN 2

            ELSE 3
          END,

          CASE
            WHEN vm.status = 'scheduled'
              AND vm.scheduled_at >= NOW()
            THEN vm.scheduled_at
          END ASC,

          CASE
            WHEN NOT (
              vm.status = 'scheduled'
              AND vm.scheduled_at >= NOW()
            )
            THEN vm.scheduled_at
          END DESC,

          vm.created_at DESC

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
          COUNT(*)::text AS count

        FROM vendor_meetings vm

        JOIN vendors v
          ON v.id = vm.vendor_id
          AND v.organization_id =
            vm.organization_id

        WHERE ${where}
        `,
        values
      ),
    ])

    const meetings =
      meetingsResult.rows.map(
        (row) => ({
          id:
            row.id,

          vendorId:
            row.vendor_id,

          vendorName:
            row.vendor_name,

          vendorColor:
            row.vendor_color,

          title:
            row.title,

          meetingType:
            row.meeting_type,

          status:
            row.status,

          scheduledAt:
            row.scheduled_at,

          durationMinutes:
            row.duration_minutes,

          location:
            row.location,

          meetingLink:
            row.meeting_link,

          summary:
            row.summary,

          internalNotes:
            row.internal_notes,

          agendaItemCount:
            Number(
              row.agenda_item_count
            ),

          actionItemCount:
            Number(
              row.action_item_count
            ),

          openActionItemCount:
            Number(
              row.open_action_item_count
            ),

          createdAt:
            row.created_at,

          updatedAt:
            row.updated_at,
        })
      )

    return NextResponse.json({
      meetings,

      count: Number(
        countResult.rows[0]
          ?.count ?? 0
      ),
    })
  } catch (error) {
    console.error(
      "GET MEETINGS ERROR:",
      error
    )

    return NextResponse.json(
      {
        error:
          "Failed to load meetings",
      },
      {
        status: 500,
      }
    )
  }
}