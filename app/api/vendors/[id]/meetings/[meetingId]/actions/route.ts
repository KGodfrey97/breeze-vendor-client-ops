import { NextResponse } from "next/server"

import { query } from "@/lib/db"
import { requireAuthenticatedProfile } from "@/lib/auth-server"

type RouteContext = {
  params: Promise<{
    id: string
    meetingId: string
  }>
}

type ActionItemRow = {
  id: string
  organization_id: string
  meeting_id: string
  agenda_item_id: string | null
  title: string
  description: string | null
  owner_name: string | null
  due_date: string | null
  status:
    | "open"
    | "in_progress"
    | "completed"
    | "cancelled"
  is_vendor_visible: boolean
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

const ALLOWED_STATUSES = [
  "open",
  "in_progress",
  "completed",
  "cancelled",
] as const

function isValidStatus(
  value: string
): value is (typeof ALLOWED_STATUSES)[number] {
  return ALLOWED_STATUSES.includes(
    value as (typeof ALLOWED_STATUSES)[number]
  )
}

async function verifyMeeting(
  vendorId: string,
  meetingId: string,
  organizationId: string
) {
  const result = await query<{ id: string }>(
    `
    SELECT id

    FROM vendor_meetings

    WHERE id = $1
      AND vendor_id = $2
      AND organization_id = $3

    LIMIT 1
    `,
    [
      meetingId,
      vendorId,
      organizationId,
    ]
  )

  return Boolean(result.rows[0])
}

async function verifyAgendaItem(
  agendaItemId: string,
  meetingId: string,
  organizationId: string
) {
  const result = await query<{ id: string }>(
    `
    SELECT id

    FROM vendor_meeting_agenda_items

    WHERE id = $1
      AND meeting_id = $2
      AND organization_id = $3

    LIMIT 1
    `,
    [
      agendaItemId,
      meetingId,
      organizationId,
    ]
  )

  return Boolean(result.rows[0])
}

export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    const { profile } =
      await requireAuthenticatedProfile()

    const {
      id: vendorId,
      meetingId,
    } = await context.params

    const meetingExists =
      await verifyMeeting(
        vendorId,
        meetingId,
        profile.organization_id
      )

    if (!meetingExists) {
      return NextResponse.json(
        {
          error:
            "Meeting not found",
        },
        {
          status: 404,
        }
      )
    }

    const result =
      await query<ActionItemRow>(
        `
        SELECT
          id,
          organization_id,
          meeting_id,
          agenda_item_id,
          title,
          description,
          owner_name,
          due_date,
          status,
          is_vendor_visible,
          created_by,
          updated_by,
          created_at,
          updated_at

        FROM vendor_meeting_action_items

        WHERE meeting_id = $1
          AND organization_id = $2

        ORDER BY
          CASE
            WHEN status = 'open'
              THEN 1
            WHEN status = 'in_progress'
              THEN 2
            WHEN status = 'completed'
              THEN 3
            ELSE 4
          END,

          due_date ASC NULLS LAST,
          created_at ASC
        `,
        [
          meetingId,
          profile.organization_id,
        ]
      )

    return NextResponse.json({
      actionItems: result.rows,
    })
  } catch (error) {
    console.error(
      "GET MEETING ACTION ITEMS ERROR:",
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

export async function POST(
  request: Request,
  context: RouteContext
) {
  try {
    const { profile } =
      await requireAuthenticatedProfile()

    const {
      id: vendorId,
      meetingId,
    } = await context.params

    const meetingExists =
      await verifyMeeting(
        vendorId,
        meetingId,
        profile.organization_id
      )

    if (!meetingExists) {
      return NextResponse.json(
        {
          error:
            "Meeting not found",
        },
        {
          status: 404,
        }
      )
    }

    const body =
      await request.json()

    const title =
      typeof body.title === "string"
        ? body.title.trim()
        : ""

    const description =
      typeof body.description === "string"
        ? body.description.trim()
        : ""

    const ownerName =
      typeof body.ownerName === "string"
        ? body.ownerName.trim()
        : ""

    const dueDate =
      typeof body.dueDate === "string"
        ? body.dueDate
        : ""

    const status =
      typeof body.status === "string"
        ? body.status
        : "open"

    const agendaItemId =
      typeof body.agendaItemId ===
      "string"
        ? body.agendaItemId
        : null

    const isVendorVisible =
      typeof body.isVendorVisible ===
      "boolean"
        ? body.isVendorVisible
        : false

    if (!title) {
      return NextResponse.json(
        {
          error:
            "Action item title is required",
        },
        {
          status: 400,
        }
      )
    }

    if (!isValidStatus(status)) {
      return NextResponse.json(
        {
          error:
            "Invalid action item status",
        },
        {
          status: 400,
        }
      )
    }

    if (
      dueDate &&
      Number.isNaN(
        new Date(
          `${dueDate}T00:00:00`
        ).getTime()
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid due date",
        },
        {
          status: 400,
        }
      )
    }

    if (agendaItemId) {
      const agendaExists =
        await verifyAgendaItem(
          agendaItemId,
          meetingId,
          profile.organization_id
        )

      if (!agendaExists) {
        return NextResponse.json(
          {
            error:
              "Agenda item not found",
          },
          {
            status: 400,
          }
        )
      }
    }

    const result =
      await query<ActionItemRow>(
        `
        INSERT INTO vendor_meeting_action_items (
          organization_id,
          meeting_id,
          agenda_item_id,
          title,
          description,
          owner_name,
          due_date,
          status,
          is_vendor_visible,
          created_by,
          updated_by
        )

        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $10
        )

        RETURNING
          id,
          organization_id,
          meeting_id,
          agenda_item_id,
          title,
          description,
          owner_name,
          due_date,
          status,
          is_vendor_visible,
          created_by,
          updated_by,
          created_at,
          updated_at
        `,
        [
          profile.organization_id,
          meetingId,
          agendaItemId,
          title,
          description || null,
          ownerName || null,
          dueDate || null,
          status,
          isVendorVisible,
          profile.id,
        ]
      )

    return NextResponse.json(
      {
        actionItem:
          result.rows[0],
      },
      {
        status: 201,
      }
    )
  } catch (error) {
    console.error(
      "CREATE MEETING ACTION ITEM ERROR:",
      error
    )

    return NextResponse.json(
      {
        error:
          "Failed to create action item",
      },
      {
        status: 500,
      }
    )
  }
}