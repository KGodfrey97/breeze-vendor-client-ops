import { NextRequest, NextResponse } from "next/server"

import { query } from "@/lib/db"
import { requireAuthenticatedProfile } from "@/lib/auth-server"

type MeetingStatus = "scheduled" | "completed" | "cancelled"

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

type CountRow = { count: string }

type SummaryRow = {
  total: string
  upcoming: string
  today: string
  this_week: string
  next_7_days: string
  completed: string
  cancelled: string
  open_actions: string
  agenda_items: string
  vendors: string
}

const ALLOWED_STATUSES = ["scheduled", "completed", "cancelled"] as const
const ALLOWED_DATES = [
  "upcoming", "past", "today", "next_7_days", "next_30_days",
] as const

function positiveInteger(value: string | null, fallback: number): number {
  if (value === null) return fallback
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed >= 1 ? parsed : fallback
}

export async function GET(request: NextRequest) {
  try {
    const { profile } = await requireAuthenticatedProfile()
    const params = request.nextUrl.searchParams

    const status = params.get("status")
    const vendorId = params.get("vendorId")
    const search = params.get("search")?.trim()
    const date = params.get("date")
    const meetingType = params.get("meetingType")?.trim()

    const page = positiveInteger(params.get("page"), 1)
    const pageSize = Math.min(positiveInteger(params.get("pageSize"), 25), 100)
    const offset = (page - 1) * pageSize

    if (!Number.isSafeInteger(offset)) {
      return NextResponse.json({ error: "Page number is too large" }, { status: 400 })
    }

    if (
      status && status !== "all" &&
      !ALLOWED_STATUSES.includes(status as MeetingStatus)
    ) {
      return NextResponse.json({ error: "Invalid meeting status" }, { status: 400 })
    }

    if (
      date && date !== "all" &&
      !ALLOWED_DATES.includes(date as (typeof ALLOWED_DATES)[number])
    ) {
      return NextResponse.json({ error: "Invalid meeting date filter" }, { status: 400 })
    }

    // Summary scope: organization + vendor + meeting type + search.
    // Status and date intentionally do not affect summary cards.
    const sharedFilters: string[] = ["vm.organization_id = $1"]
    const sharedValues: unknown[] = [profile.organization_id]

    const addSharedFilter = (column: string, value: unknown) => {
      sharedValues.push(value)
      sharedFilters.push(`${column} = $${sharedValues.length}`)
    }

    if (vendorId && vendorId !== "all") {
      addSharedFilter("vm.vendor_id", vendorId)
    }

    if (meetingType && meetingType !== "all") {
      sharedValues.push(meetingType)
      sharedFilters.push(`vm.meeting_type ILIKE $${sharedValues.length}`)
    }

    if (search) {
      sharedValues.push(`%${search}%`)
      const placeholder = `$${sharedValues.length}`
      sharedFilters.push(`(
        vm.title ILIKE ${placeholder}
        OR vm.meeting_type ILIKE ${placeholder}
        OR vm.location ILIKE ${placeholder}
        OR v.name ILIKE ${placeholder}
      )`)
    }

    const summaryWhere = sharedFilters.join(" AND ")
    const filters = [...sharedFilters]
    const values = [...sharedValues]

    if (status && status !== "all") {
      values.push(status)
      filters.push(`vm.status = $${values.length}`)
    }

    switch (date) {
      case "upcoming":
        filters.push("vm.status = 'scheduled' AND vm.scheduled_at >= NOW()")
        break
      case "past":
        filters.push("(vm.status != 'scheduled' OR vm.scheduled_at < NOW())")
        break
      case "today":
        filters.push("vm.scheduled_at::date = CURRENT_DATE")
        break
      case "next_7_days":
        filters.push("vm.status = 'scheduled' AND vm.scheduled_at >= NOW() AND vm.scheduled_at < NOW() + INTERVAL '7 days'")
        break
      case "next_30_days":
        filters.push("vm.status = 'scheduled' AND vm.scheduled_at >= NOW() AND vm.scheduled_at < NOW() + INTERVAL '30 days'")
        break
    }

    const where = filters.join(" AND ")
    const fromClause = `
      FROM vendor_meetings vm
      JOIN vendors v
        ON v.id = vm.vendor_id
       AND v.organization_id = vm.organization_id
    `

    const [meetingsResult, countResult, summaryResult] = await Promise.all([
      query<MeetingRow>(
        `SELECT
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
              AND agenda.organization_id = vm.organization_id
          )::text AS agenda_item_count,
          (
            SELECT COUNT(*)
            FROM vendor_meeting_action_items action
            WHERE action.meeting_id = vm.id
              AND action.organization_id = vm.organization_id
          )::text AS action_item_count,
          (
            SELECT COUNT(*)
            FROM vendor_meeting_action_items action
            WHERE action.meeting_id = vm.id
              AND action.organization_id = vm.organization_id
              AND action.status IN ('open', 'in_progress')
          )::text AS open_action_item_count,
          vm.created_at,
          vm.updated_at
        ${fromClause}
        WHERE ${where}
        ORDER BY
          CASE
            WHEN vm.status = 'scheduled' AND vm.scheduled_at >= NOW() THEN 0
            WHEN vm.status = 'completed' THEN 1
            WHEN vm.status = 'cancelled' THEN 2
            ELSE 3
          END,
          CASE
            WHEN vm.status = 'scheduled' AND vm.scheduled_at >= NOW()
            THEN vm.scheduled_at
          END ASC,
          CASE
            WHEN NOT (vm.status = 'scheduled' AND vm.scheduled_at >= NOW())
            THEN vm.scheduled_at
          END DESC,
          vm.created_at DESC,
          vm.id ASC
        LIMIT $${values.length + 1}
        OFFSET $${values.length + 2}`,
        [...values, pageSize, offset]
      ),
      query<CountRow>(
        `SELECT COUNT(*)::text AS count ${fromClause} WHERE ${where}`,
        values
      ),
      query<SummaryRow>(
        `SELECT
          COUNT(*)::text AS total,
          COUNT(*) FILTER (
            WHERE vm.status = 'scheduled' AND vm.scheduled_at >= NOW()
          )::text AS upcoming,
          COUNT(*) FILTER (
            WHERE vm.scheduled_at::date = CURRENT_DATE
          )::text AS today,
          COUNT(*) FILTER (
            WHERE vm.scheduled_at::date >= DATE_TRUNC('week', CURRENT_DATE)::date
              AND vm.scheduled_at::date < (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '7 days')::date
          )::text AS this_week,
          COUNT(*) FILTER (
            WHERE vm.status = 'scheduled'
              AND vm.scheduled_at >= NOW()
              AND vm.scheduled_at < NOW() + INTERVAL '7 days'
          )::text AS next_7_days,
          COUNT(*) FILTER (WHERE vm.status = 'completed')::text AS completed,
          COUNT(*) FILTER (WHERE vm.status = 'cancelled')::text AS cancelled,
          COUNT(DISTINCT vm.vendor_id)::text AS vendors,
          COALESCE(SUM(agenda_counts.item_count), 0)::text AS agenda_items,
          COALESCE(SUM(action_counts.open_count), 0)::text AS open_actions
        ${fromClause}
        LEFT JOIN LATERAL (
          SELECT COUNT(*) AS item_count
          FROM vendor_meeting_agenda_items agenda
          WHERE agenda.meeting_id = vm.id
            AND agenda.organization_id = vm.organization_id
        ) agenda_counts ON TRUE
        LEFT JOIN LATERAL (
          SELECT COUNT(*) AS open_count
          FROM vendor_meeting_action_items action
          WHERE action.meeting_id = vm.id
            AND action.organization_id = vm.organization_id
            AND action.status IN ('open', 'in_progress')
        ) action_counts ON TRUE
        WHERE ${summaryWhere}`,
        sharedValues
      ),
    ])

    const meetings = meetingsResult.rows.map((row) => ({
      id: row.id,
      vendorId: row.vendor_id,
      vendorName: row.vendor_name,
      vendorColor: row.vendor_color,
      title: row.title,
      meetingType: row.meeting_type,
      status: row.status,
      scheduledAt: row.scheduled_at,
      durationMinutes: row.duration_minutes,
      location: row.location,
      meetingLink: row.meeting_link,
      summary: row.summary,
      internalNotes: row.internal_notes,
      agendaItemCount: Number(row.agenda_item_count),
      actionItemCount: Number(row.action_item_count),
      openActionItemCount: Number(row.open_action_item_count),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))

    const row = summaryResult.rows[0]
    const summary = {
      total: Number(row?.total ?? 0),
      upcoming: Number(row?.upcoming ?? 0),
      today: Number(row?.today ?? 0),
      thisWeek: Number(row?.this_week ?? 0),
      next7Days: Number(row?.next_7_days ?? 0),
      completed: Number(row?.completed ?? 0),
      cancelled: Number(row?.cancelled ?? 0),
      openActions: Number(row?.open_actions ?? 0),
      agendaItems: Number(row?.agenda_items ?? 0),
      vendors: Number(row?.vendors ?? 0),
    }

    const count = Number(countResult.rows[0]?.count ?? 0)

    return NextResponse.json({
      meetings,
      count,
      summary,
      pagination: {
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(count / pageSize)),
      },
    })
  } catch (error) {
    console.error("GET MEETINGS ERROR:", error)
    return NextResponse.json(
      { error: "Failed to load meetings" },
      { status: 500 }
    )
  }
}
