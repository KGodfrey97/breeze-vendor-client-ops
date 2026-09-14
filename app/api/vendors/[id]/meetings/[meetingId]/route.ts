import { NextResponse } from "next/server"

import { query } from "@/lib/db"
import { requireAuthenticatedProfile } from "@/lib/auth-server"

type RouteContext = {
  params: Promise<{
    id: string
    meetingId: string
  }>
}

type MeetingRow = {
  id: string
  organization_id: string
  vendor_id: string
  title: string
  meeting_type: string | null
  status: "scheduled" | "completed" | "cancelled"
  scheduled_at: string
  duration_minutes: number | null
  location: string | null
  meeting_link: string | null
  summary: string | null
  internal_notes: string | null
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

const ALLOWED_STATUSES = [
  "scheduled",
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

async function getMeeting(
  meetingId: string,
  vendorId: string,
  organizationId: string
) {
  const result =
    await query<MeetingRow>(
      `
      SELECT
        id,
        organization_id,
        vendor_id,
        title,
        meeting_type,
        status,
        scheduled_at,
        duration_minutes,
        location,
        meeting_link,
        summary,
        internal_notes,
        created_by,
        updated_by,
        created_at,
        updated_at

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

  return result.rows[0] ?? null
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

    const meeting =
      await getMeeting(
        meetingId,
        vendorId,
        profile.organization_id
      )

    if (!meeting) {
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

    const [
      agendaResult,
      actionsResult,
    ] = await Promise.all([
      query(
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
      ),

      query(
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
      ),
    ])

    return NextResponse.json({
      meeting: {
        ...meeting,

        agendaItems:
          agendaResult.rows,

        actionItems:
          actionsResult.rows,
      },
    })
  } catch (error) {
    console.error(
      "GET VENDOR MEETING ERROR:",
      error
    )

    return NextResponse.json(
      {
        error:
          "Failed to load vendor meeting",
      },
      {
        status: 500,
      }
    )
  }
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
    } = await context.params

    const existingMeeting =
      await getMeeting(
        meetingId,
        vendorId,
        profile.organization_id
      )

    if (!existingMeeting) {
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
      typeof body.title ===
      "string"
        ? body.title.trim()
        : undefined

    const meetingType =
      typeof body.meetingType ===
      "string"
        ? body.meetingType.trim()
        : body.meetingType === null
        ? null
        : undefined

    const status =
      typeof body.status ===
      "string"
        ? body.status
        : undefined

    const scheduledAt =
      typeof body.scheduledAt ===
      "string"
        ? body.scheduledAt
        : undefined

    const durationMinutes =
      body.durationMinutes === null
        ? null
        : body.durationMinutes !==
          undefined
        ? Number(
            body.durationMinutes
          )
        : undefined

    const location =
      typeof body.location ===
      "string"
        ? body.location.trim()
        : body.location === null
        ? null
        : undefined

    const meetingLink =
      typeof body.meetingLink ===
      "string"
        ? body.meetingLink.trim()
        : body.meetingLink === null
        ? null
        : undefined

    const summary =
      typeof body.summary ===
      "string"
        ? body.summary.trim()
        : body.summary === null
        ? null
        : undefined

    const internalNotes =
      typeof body.internalNotes ===
      "string"
        ? body.internalNotes.trim()
        : body.internalNotes === null
        ? null
        : undefined

    if (
      title !== undefined &&
      !title
    ) {
      return NextResponse.json(
        {
          error:
            "Meeting title is required",
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
            "Invalid meeting status",
        },
        {
          status: 400,
        }
      )
    }

    if (
      scheduledAt !== undefined
    ) {
      const scheduledDate =
        new Date(
          scheduledAt
        )

      if (
        Number.isNaN(
          scheduledDate.getTime()
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid meeting date and time",
          },
          {
            status: 400,
          }
        )
      }
    }

    if (
      durationMinutes !==
        undefined &&
      durationMinutes !== null &&
      (
        !Number.isInteger(
          durationMinutes
        ) ||
        durationMinutes <= 0
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Duration must be a positive whole number",
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

    if (
      title !== undefined
    ) {
      addUpdate(
        "title",
        title
      )
    }

    if (
      meetingType !==
      undefined
    ) {
      addUpdate(
        "meeting_type",
        meetingType || null
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
      scheduledAt !==
      undefined
    ) {
      addUpdate(
        "scheduled_at",
        scheduledAt
      )
    }

    if (
      durationMinutes !==
      undefined
    ) {
      addUpdate(
        "duration_minutes",
        durationMinutes
      )
    }

    if (
      location !== undefined
    ) {
      addUpdate(
        "location",
        location || null
      )
    }

    if (
      meetingLink !==
      undefined
    ) {
      addUpdate(
        "meeting_link",
        meetingLink || null
      )
    }

    if (
      summary !== undefined
    ) {
      addUpdate(
        "summary",
        summary || null
      )
    }

    if (
      internalNotes !==
      undefined
    ) {
      addUpdate(
        "internal_notes",
        internalNotes || null
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
      meetingId
    )

    const meetingIdParam =
      `$${values.length}`

    values.push(
      vendorId
    )

    const vendorIdParam =
      `$${values.length}`

    values.push(
      profile.organization_id
    )

    const organizationIdParam =
      `$${values.length}`

    const result =
      await query<MeetingRow>(
        `
        UPDATE vendor_meetings

        SET
          ${updates.join(", ")}

        WHERE id =
          ${meetingIdParam}

          AND vendor_id =
          ${vendorIdParam}

          AND organization_id =
          ${organizationIdParam}

        RETURNING
          id,
          organization_id,
          vendor_id,
          title,
          meeting_type,
          status,
          scheduled_at,
          duration_minutes,
          location,
          meeting_link,
          summary,
          internal_notes,
          created_by,
          updated_by,
          created_at,
          updated_at
        `,
        values
      )

    const meeting =
      result.rows[0]

    if (!meeting) {
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

    return NextResponse.json({
      meeting,
    })
  } catch (error) {
    console.error(
      "UPDATE VENDOR MEETING ERROR:",
      error
    )

    return NextResponse.json(
      {
        error:
          "Failed to update vendor meeting",
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
    } = await context.params

    const result =
      await query<{ id: string }>(
        `
        DELETE FROM vendor_meetings

        WHERE id = $1
          AND vendor_id = $2
          AND organization_id = $3

        RETURNING id
        `,
        [
          meetingId,
          vendorId,
          profile.organization_id,
        ]
      )

    if (!result.rows[0]) {
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

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error(
      "DELETE VENDOR MEETING ERROR:",
      error
    )

    return NextResponse.json(
      {
        error:
          "Failed to delete vendor meeting",
      },
      {
        status: 500,
      }
    )
  }
}