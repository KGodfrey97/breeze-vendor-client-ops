import { NextResponse } from "next/server"

import { query } from "@/lib/db"
import { requireAuthenticatedProfile } from "@/lib/auth-server"

type RouteContext = {
  params: Promise<{
    id: string
    meetingId: string
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
          error: "Meeting not found",
        },
        {
          status: 404,
        }
      )
    }

    const result =
      await query<AgendaItemRow>(
        `
        SELECT
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

        FROM vendor_meeting_agenda_items

        WHERE meeting_id = $1
          AND organization_id = $2

        ORDER BY
          sort_order ASC,
          created_at ASC
        `,
        [
          meetingId,
          profile.organization_id,
        ]
      )

    return NextResponse.json({
      agendaItems: result.rows,
    })
  } catch (error) {
    console.error(
      "GET MEETING AGENDA ERROR:",
      error
    )

    return NextResponse.json(
      {
        error:
          "Failed to load meeting agenda",
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
          error: "Meeting not found",
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

    const notes =
      typeof body.notes === "string"
        ? body.notes.trim()
        : ""

    const isVendorVisible =
      typeof body.isVendorVisible ===
      "boolean"
        ? body.isVendorVisible
        : false

    if (!title) {
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

    const sortResult =
      await query<{
        next_sort_order: number
      }>(
        `
        SELECT
          COALESCE(
            MAX(sort_order),
            -1
          ) + 1
            AS next_sort_order

        FROM vendor_meeting_agenda_items

        WHERE meeting_id = $1
          AND organization_id = $2
        `,
        [
          meetingId,
          profile.organization_id,
        ]
      )

    const nextSortOrder =
      Number(
        sortResult.rows[0]
          ?.next_sort_order ?? 0
      )

    const result =
      await query<AgendaItemRow>(
        `
        INSERT INTO vendor_meeting_agenda_items (
          organization_id,
          meeting_id,
          title,
          description,
          notes,
          is_vendor_visible,
          sort_order,
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
          $8
        )

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
        [
          profile.organization_id,
          meetingId,
          title,
          description || null,
          notes || null,
          isVendorVisible,
          nextSortOrder,
          profile.id,
        ]
      )

    return NextResponse.json(
      {
        agendaItem:
          result.rows[0],
      },
      {
        status: 201,
      }
    )
  } catch (error) {
    console.error(
      "CREATE MEETING AGENDA ITEM ERROR:",
      error
    )

    return NextResponse.json(
      {
        error:
          "Failed to create agenda item",
      },
      {
        status: 500,
      }
    )
  }
}