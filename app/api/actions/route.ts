import {
  NextRequest,
  NextResponse,
} from "next/server"

import { query } from "@/lib/db"
import { requireAuthenticatedProfile } from "@/lib/auth-server"

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type ActionStatus =
  | "open"
  | "in_progress"
  | "completed"
  | "cancelled"

type ActionStatusFilter =
  | ActionStatus
  | "active"

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

type SummaryRow = {
  active: string
  open: string
  in_progress: string
  completed: string
  cancelled: string
  overdue: string
  due_today: string
  no_due_date: string
}

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const ALLOWED_STATUSES = [
  "open",
  "in_progress",
  "completed",
  "cancelled",
] as const

const ALLOWED_STATUS_FILTERS = [
  ...ALLOWED_STATUSES,
  "active",
] as const

const ALLOWED_DUE_FILTERS = [
  "overdue",
  "today",
  "upcoming",
  "no_due_date",
] as const

/* -------------------------------------------------------------------------- */
/* GET                                                                        */
/* -------------------------------------------------------------------------- */

export async function GET(
  request: NextRequest
) {
  try {
    const { profile } =
      await requireAuthenticatedProfile()

    const params =
      request.nextUrl.searchParams

    /* ---------------------------------------------------------------------- */
    /* Query Parameters                                                       */
    /* ---------------------------------------------------------------------- */

    const status =
      params.get(
        "status"
      )

    const vendorId =
      params.get(
        "vendorId"
      )

    const search =
      params
        .get("search")
        ?.trim()

    const due =
      params.get(
        "due"
      )

    const parsedPage =
      Number(
        params.get(
          "page"
        ) ?? 1
      )

    const parsedPageSize =
      Number(
        params.get(
          "pageSize"
        ) ?? 25
      )

    const page =
      Number.isFinite(
        parsedPage
      )
        ? Math.max(
            Math.floor(
              parsedPage
            ),
            1
          )
        : 1

    const pageSize =
      Number.isFinite(
        parsedPageSize
      )
        ? Math.min(
            Math.max(
              Math.floor(
                parsedPageSize
              ),
              1
            ),
            100
          )
        : 25

    const offset =
      (page - 1) *
      pageSize

    /* ---------------------------------------------------------------------- */
    /* Validate Status                                                        */
    /* ---------------------------------------------------------------------- */

    if (
      status &&
      status !== "all" &&
      !ALLOWED_STATUS_FILTERS.includes(
        status as ActionStatusFilter
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

    /* ---------------------------------------------------------------------- */
    /* Validate Due Filter                                                    */
    /* ---------------------------------------------------------------------- */

    if (
      due &&
      due !== "all" &&
      !ALLOWED_DUE_FILTERS.includes(
        due as (
          typeof ALLOWED_DUE_FILTERS
        )[number]
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid due-date filter",
        },
        {
          status: 400,
        }
      )
    }

    /* ---------------------------------------------------------------------- */
    /* Main Action Filters                                                    */
    /* ---------------------------------------------------------------------- */

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
      values.push(
        value
      )

      filters.push(
        sql.replace(
          "?",
          `$${values.length}`
        )
      )
    }

    /* ---------------------------------------------------------------------- */
    /* Status                                                                 */
    /* ---------------------------------------------------------------------- */

    if (
      status === "active"
    ) {
      filters.push(
        `
        ai.status IN (
          'open',
          'in_progress'
        )
        `
      )
    } else if (
      status &&
      status !== "all"
    ) {
      addFilter(
        "ai.status = ?",
        status
      )
    }

    /* ---------------------------------------------------------------------- */
    /* Vendor                                                                 */
    /* ---------------------------------------------------------------------- */

    if (
      vendorId &&
      vendorId !== "all"
    ) {
      addFilter(
        "ai_meeting.vendor_id = ?",
        vendorId
      )
    }

    /* ---------------------------------------------------------------------- */
    /* Due Date                                                               */
    /* ---------------------------------------------------------------------- */

    if (
      due === "overdue"
    ) {
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

    if (
      due === "today"
    ) {
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

    if (
      due === "upcoming"
    ) {
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

    if (
      due ===
      "no_due_date"
    ) {
      filters.push(
        `
        ai.due_date IS NULL
        AND ai.status IN (
          'open',
          'in_progress'
        )
        `
      )
    }

    /* ---------------------------------------------------------------------- */
    /* Search                                                                 */
    /* ---------------------------------------------------------------------- */

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

    /* ---------------------------------------------------------------------- */
    /* Summary Filters                                                        */
    /* ---------------------------------------------------------------------- */

    /*
     * Summary cards intentionally ignore:
     *
     * - status
     * - due
     *
     * But they DO respect:
     *
     * - organization
     * - vendor
     * - search
     *
     * This keeps Overdue / Due Today / etc.
     * stable when the user clicks one of those
     * summary cards, while still making the
     * summary relevant to vendor/search context.
     */

    const summaryFilters: string[] = [
      "ai.organization_id = $1",
    ]

    const summaryValues: unknown[] = [
      profile.organization_id,
    ]

    const addSummaryFilter = (
      sql: string,
      value: unknown
    ) => {
      summaryValues.push(
        value
      )

      summaryFilters.push(
        sql.replace(
          "?",
          `$${summaryValues.length}`
        )
      )
    }

    if (
      vendorId &&
      vendorId !== "all"
    ) {
      addSummaryFilter(
        "ai_meeting.vendor_id = ?",
        vendorId
      )
    }

    if (search) {
      summaryValues.push(
        `%${search}%`
      )

      const searchParam =
        `$${summaryValues.length}`

      summaryFilters.push(
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

    const summaryWhere =
      summaryFilters.join(
        " AND "
      )

    /* ---------------------------------------------------------------------- */
    /* Queries                                                                */
    /* ---------------------------------------------------------------------- */

    const [
      actionsResult,
      countResult,
      summaryResult,
    ] = await Promise.all([
      /* -------------------------------------------------------------------- */
      /* Actions                                                              */
      /* -------------------------------------------------------------------- */

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

      /* -------------------------------------------------------------------- */
      /* Filtered Result Count                                                */
      /* -------------------------------------------------------------------- */

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

      /* -------------------------------------------------------------------- */
      /* Summary                                                              */
      /* -------------------------------------------------------------------- */

      query<SummaryRow>(
        `
        SELECT
          COUNT(*) FILTER (
            WHERE ai.status IN (
              'open',
              'in_progress'
            )
          )::text
            AS active,

          COUNT(*) FILTER (
            WHERE ai.status =
              'open'
          )::text
            AS open,

          COUNT(*) FILTER (
            WHERE ai.status =
              'in_progress'
          )::text
            AS in_progress,

          COUNT(*) FILTER (
            WHERE ai.status =
              'completed'
          )::text
            AS completed,

          COUNT(*) FILTER (
            WHERE ai.status =
              'cancelled'
          )::text
            AS cancelled,

          COUNT(*) FILTER (
            WHERE
              ai.status IN (
                'open',
                'in_progress'
              )
              AND ai.due_date IS NOT NULL
              AND ai.due_date <
                CURRENT_DATE
          )::text
            AS overdue,

          COUNT(*) FILTER (
            WHERE
              ai.status IN (
                'open',
                'in_progress'
              )
              AND ai.due_date =
                CURRENT_DATE
          )::text
            AS due_today,

          COUNT(*) FILTER (
            WHERE
              ai.status IN (
                'open',
                'in_progress'
              )
              AND ai.due_date IS NULL
          )::text
            AS no_due_date

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

        WHERE ${summaryWhere}
        `,
        summaryValues
      ),
    ])

    /* ---------------------------------------------------------------------- */
    /* Map Actions                                                            */
    /* ---------------------------------------------------------------------- */

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

    /* ---------------------------------------------------------------------- */
    /* Map Summary                                                            */
    /* ---------------------------------------------------------------------- */

    const summaryRow =
      summaryResult.rows[0]

    const summary = {
      active:
        Number(
          summaryRow?.active ??
            0
        ),

      open:
        Number(
          summaryRow?.open ??
            0
        ),

      inProgress:
        Number(
          summaryRow?.in_progress ??
            0
        ),

      completed:
        Number(
          summaryRow?.completed ??
            0
        ),

      cancelled:
        Number(
          summaryRow?.cancelled ??
            0
        ),

      overdue:
        Number(
          summaryRow?.overdue ??
            0
        ),

      dueToday:
        Number(
          summaryRow?.due_today ??
            0
        ),

      noDueDate:
        Number(
          summaryRow?.no_due_date ??
            0
        ),
    }

    /* ---------------------------------------------------------------------- */
    /* Response                                                               */
    /* ---------------------------------------------------------------------- */

    return NextResponse.json({
      actions,

      count:
        Number(
          countResult.rows[0]
            ?.count ?? 0
        ),

      summary,

      pagination: {
        page,
        pageSize,

        totalPages:
          Math.max(
            1,
            Math.ceil(
              Number(
                countResult
                  .rows[0]
                  ?.count ??
                  0
              ) /
                pageSize
            )
          ),
      },
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