import { NextResponse } from "next/server"

import { query } from "@/lib/db"
import { requireAuthenticatedProfile } from "@/lib/auth-server"

type RouteContext = {
  params: Promise<{
    id: string
    meetingId: string
    actionItemId: string
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

async function getActionItem(
  actionItemId: string,
  meetingId: string,
  vendorId: string,
  organizationId: string
) {
  const result =
    await query<ActionItemRow>(
      `
      SELECT
        ai.id,
        ai.organization_id,
        ai.meeting_id,
        ai.agenda_item_id,
        ai.title,
        ai.description,
        ai.owner_name,
        ai.due_date,
        ai.status,
        ai.is_vendor_visible,
        ai.created_by,
        ai.updated_by,
        ai.created_at,
        ai.updated_at

      FROM vendor_meeting_action_items ai

      JOIN vendor_meetings vm
        ON vm.id = ai.meeting_id
        AND vm.organization_id =
          ai.organization_id

      WHERE ai.id = $1
        AND ai.meeting_id = $2
        AND vm.vendor_id = $3
        AND ai.organization_id = $4

      LIMIT 1
      `,
      [
        actionItemId,
        meetingId,
        vendorId,
        organizationId,
      ]
    )

  return result.rows[0] ?? null
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

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    const { profile } =
      await requireAuthenticatedProfile()

    const {
      id: vendorId,
      meetingId,
      actionItemId,
    } = await context.params

    const existing =
      await getActionItem(
        actionItemId,
        meetingId,
        vendorId,
        profile.organization_id
      )

    if (!existing) {
      return NextResponse.json(
        {
          error:
            "Action item not found",
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
        : undefined

    const description =
      typeof body.description === "string"
        ? body.description.trim()
        : body.description === null
        ? null
        : undefined

    const ownerName =
      typeof body.ownerName === "string"
        ? body.ownerName.trim()
        : body.ownerName === null
        ? null
        : undefined

    const dueDate =
      typeof body.dueDate === "string"
        ? body.dueDate
        : body.dueDate === null
        ? null
        : undefined

    const status =
      typeof body.status === "string"
        ? body.status
        : undefined

    const agendaItemId =
      typeof body.agendaItemId ===
      "string"
        ? body.agendaItemId
        : body.agendaItemId === null
        ? null
        : undefined

    const isVendorVisible =
      typeof body.isVendorVisible ===
      "boolean"
        ? body.isVendorVisible
        : undefined

    if (
      title !== undefined &&
      !title
    ) {
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

    if (
      status !== undefined &&
      !isValidStatus(status)
    ) {
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
      dueDate !== undefined &&
      dueDate !== null &&
      dueDate !== "" &&
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

    if (
      agendaItemId !== undefined &&
      agendaItemId !== null
    ) {
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

    const updates: string[] =
      []

    const values: unknown[] =
      []

    const addUpdate = (
      column: string,
      value: unknown
    ) => {
      values.push(value)

      updates.push(
        `${column} = $${values.length}`
      )
    }

    if (title !== undefined) {
      addUpdate(
        "title",
        title
      )
    }

    if (
      description !== undefined
    ) {
      addUpdate(
        "description",
        description || null
      )
    }

    if (
      ownerName !== undefined
    ) {
      addUpdate(
        "owner_name",
        ownerName || null
      )
    }

    if (
      dueDate !== undefined
    ) {
      addUpdate(
        "due_date",
        dueDate || null
      )
    }

    if (
      status !== undefined
    ) {
      addUpdate(
        "status",
        status
      )
    }

    if (
      agendaItemId !== undefined
    ) {
      addUpdate(
        "agenda_item_id",
        agendaItemId
      )
    }

    if (
      isVendorVisible !==
      undefined
    ) {
      addUpdate(
        "is_vendor_visible",
        isVendorVisible
      )
    }

    if (
      updates.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "No fields to update",
        },
        {
          status: 400,
        }
      )
    }

    addUpdate(
      "updated_by",
      profile.id
    )

    values.push(
      actionItemId
    )

    const actionItemIdParam =
      `$${values.length}`

    values.push(
      meetingId
    )

    const meetingIdParam =
      `$${values.length}`

    values.push(
      profile.organization_id
    )

    const organizationIdParam =
      `$${values.length}`

    const result =
      await query<ActionItemRow>(
        `
        UPDATE vendor_meeting_action_items

        SET
          ${updates.join(", ")}

        WHERE id =
          ${actionItemIdParam}

          AND meeting_id =
          ${meetingIdParam}

          AND organization_id =
          ${organizationIdParam}

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
        values
      )

    return NextResponse.json({
      actionItem:
        result.rows[0],
    })
  } catch (error) {
    console.error(
      "UPDATE MEETING ACTION ITEM ERROR:",
      error
    )

    return NextResponse.json(
      {
        error:
          "Failed to update action item",
      },
      {
        status: 500,
      }
    )
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext
) {
  try {
    const { profile } =
      await requireAuthenticatedProfile()

    const {
      id: vendorId,
      meetingId,
      actionItemId,
    } = await context.params

    const existing =
      await getActionItem(
        actionItemId,
        meetingId,
        vendorId,
        profile.organization_id
      )

    if (!existing) {
      return NextResponse.json(
        {
          error:
            "Action item not found",
        },
        {
          status: 404,
        }
      )
    }

    const result =
      await query<{ id: string }>(
        `
        DELETE FROM vendor_meeting_action_items

        WHERE id = $1
          AND meeting_id = $2
          AND organization_id = $3

        RETURNING id
        `,
        [
          actionItemId,
          meetingId,
          profile.organization_id,
        ]
      )

    return NextResponse.json({
      success:
        Boolean(result.rows[0]),
    })
  } catch (error) {
    console.error(
      "DELETE MEETING ACTION ITEM ERROR:",
      error
    )

    return NextResponse.json(
      {
        error:
          "Failed to delete action item",
      },
      {
        status: 500,
      }
    )
  }
}