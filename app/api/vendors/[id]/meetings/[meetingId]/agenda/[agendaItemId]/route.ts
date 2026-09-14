import { NextResponse } from "next/server"

import { query } from "@/lib/db"
import { requireAuthenticatedProfile } from "@/lib/auth-server"

type RouteContext = {
  params: Promise<{
    id: string
    meetingId: string
    agendaItemId: string
  }>
}

type AgendaItemRow = {
  id: string
  organization_id: string
  meeting_id: string
  title: string
  description: string | null
  notes: string | null
  is_vendor_visible: boolean
  sort_order: number
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

async function getAgendaItem(
  agendaItemId: string,
  meetingId: string,
  vendorId: string,
  organizationId: string
) {
  const result =
    await query<AgendaItemRow>(
      `
      SELECT
        ai.id,
        ai.organization_id,
        ai.meeting_id,
        ai.title,
        ai.description,
        ai.notes,
        ai.is_vendor_visible,
        ai.sort_order,
        ai.created_by,
        ai.updated_by,
        ai.created_at,
        ai.updated_at

      FROM vendor_meeting_agenda_items ai

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
        agendaItemId,
        meetingId,
        vendorId,
        organizationId,
      ]
    )

  return result.rows[0] ?? null
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
      agendaItemId,
    } = await context.params

    const existing =
      await getAgendaItem(
        agendaItemId,
        meetingId,
        vendorId,
        profile.organization_id
      )

    if (!existing) {
      return NextResponse.json(
        {
          error:
            "Agenda item not found",
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

    const notes =
      typeof body.notes === "string"
        ? body.notes.trim()
        : body.notes === null
        ? null
        : undefined

    const isVendorVisible =
      typeof body.isVendorVisible ===
      "boolean"
        ? body.isVendorVisible
        : undefined

    const sortOrder =
      body.sortOrder !== undefined
        ? Number(body.sortOrder)
        : undefined

    if (
      title !== undefined &&
      !title
    ) {
      return NextResponse.json(
        {
          error:
            "Agenda item title is required",
        },
        {
          status: 400,
        }
      )
    }

    if (
      sortOrder !== undefined &&
      (
        !Number.isInteger(sortOrder) ||
        sortOrder < 0
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Sort order must be zero or greater",
        },
        {
          status: 400,
        }
      )
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

    if (notes !== undefined) {
      addUpdate(
        "notes",
        notes || null
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
      sortOrder !== undefined
    ) {
      addUpdate(
        "sort_order",
        sortOrder
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
      agendaItemId
    )

    const agendaItemIdParam =
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
      await query<AgendaItemRow>(
        `
        UPDATE vendor_meeting_agenda_items

        SET
          ${updates.join(", ")}

        WHERE id =
          ${agendaItemIdParam}

          AND meeting_id =
          ${meetingIdParam}

          AND organization_id =
          ${organizationIdParam}

        RETURNING
          id,
          organization_id,
          meeting_id,
          title,
          description,
          notes,
          is_vendor_visible,
          sort_order,
          created_by,
          updated_by,
          created_at,
          updated_at
        `,
        values
      )

    return NextResponse.json({
      agendaItem:
        result.rows[0],
    })
  } catch (error) {
    console.error(
      "UPDATE MEETING AGENDA ITEM ERROR:",
      error
    )

    return NextResponse.json(
      {
        error:
          "Failed to update agenda item",
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
      agendaItemId,
    } = await context.params

    const existing =
      await getAgendaItem(
        agendaItemId,
        meetingId,
        vendorId,
        profile.organization_id
      )

    if (!existing) {
      return NextResponse.json(
        {
          error:
            "Agenda item not found",
        },
        {
          status: 404,
        }
      )
    }

    const result =
      await query<{ id: string }>(
        `
        DELETE FROM vendor_meeting_agenda_items

        WHERE id = $1
          AND meeting_id = $2
          AND organization_id = $3

        RETURNING id
        `,
        [
          agendaItemId,
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
      "DELETE MEETING AGENDA ITEM ERROR:",
      error
    )

    return NextResponse.json(
      {
        error:
          "Failed to delete agenda item",
      },
      {
        status: 500,
      }
    )
  }
}