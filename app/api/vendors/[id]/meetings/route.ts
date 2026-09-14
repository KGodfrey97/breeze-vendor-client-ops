import { NextResponse } from "next/server"

import { query } from "@/lib/db"
import { requireAuthenticatedProfile } from "@/lib/auth-server"

type RouteContext = {
  params: Promise<{
    id: string
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

async function verifyVendor(
  vendorId: string,
  organizationId: string
) {
  const result = await query<{ id: string }>(
    `
    SELECT id

    FROM vendors

    WHERE id = $1
      AND organization_id = $2

    LIMIT 1
    `,
    [
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

    const { id: vendorId } =
      await context.params

    const vendorExists =
      await verifyVendor(
        vendorId,
        profile.organization_id
      )

    if (!vendorExists) {
      return NextResponse.json(
        {
          error: "Vendor not found",
        },
        {
          status: 404,
        }
      )
    }

    const result =
      await query<MeetingRow>(
        `
        SELECT
          vm.id,
          vm.organization_id,
          vm.vendor_id,
          vm.title,
          vm.meeting_type,
          vm.status,
          vm.scheduled_at,
          vm.duration_minutes,
          vm.location,
          vm.meeting_link,
          vm.summary,
          vm.internal_notes,
          vm.created_by,
          vm.updated_by,
          vm.created_at,
          vm.updated_at,

          (
            SELECT COUNT(*)::int

            FROM vendor_meeting_agenda_items vmai

            WHERE vmai.meeting_id = vm.id
              AND vmai.organization_id =
                vm.organization_id
          ) AS agenda_item_count,

          (
            SELECT COUNT(*)::int

            FROM vendor_meeting_action_items vmai

            WHERE vmai.meeting_id = vm.id
              AND vmai.organization_id =
                vm.organization_id
          ) AS action_item_count,

          (
            SELECT COUNT(*)::int

            FROM vendor_meeting_action_items vmai

            WHERE vmai.meeting_id = vm.id
              AND vmai.organization_id =
                vm.organization_id

              AND vmai.status IN (
                'open',
                'in_progress'
              )
          ) AS open_action_item_count

        FROM vendor_meetings vm

        WHERE vm.vendor_id = $1
          AND vm.organization_id = $2

        ORDER BY
          vm.scheduled_at DESC,
          vm.created_at DESC
        `,
        [
          vendorId,
          profile.organization_id,
        ]
      )

    return NextResponse.json({
      meetings: result.rows,
    })
  } catch (error) {
    console.error(
      "GET VENDOR MEETINGS ERROR:",
      error
    )

    return NextResponse.json(
      {
        error:
          "Failed to load vendor meetings",
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

    const { id: vendorId } =
      await context.params

    const vendorExists =
      await verifyVendor(
        vendorId,
        profile.organization_id
      )

    if (!vendorExists) {
      return NextResponse.json(
        {
          error: "Vendor not found",
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

    const meetingType =
      typeof body.meetingType ===
      "string"
        ? body.meetingType.trim()
        : ""

    const status =
      typeof body.status ===
      "string"
        ? body.status
        : "scheduled"

    const scheduledAt =
      typeof body.scheduledAt ===
      "string"
        ? body.scheduledAt
        : ""

    const durationMinutes =
      body.durationMinutes === null ||
      body.durationMinutes === "" ||
      body.durationMinutes === undefined
        ? null
        : Number(body.durationMinutes)

    const location =
      typeof body.location === "string"
        ? body.location.trim()
        : ""

    const meetingLink =
      typeof body.meetingLink ===
      "string"
        ? body.meetingLink.trim()
        : ""

    const summary =
      typeof body.summary === "string"
        ? body.summary.trim()
        : ""

    const internalNotes =
      typeof body.internalNotes ===
      "string"
        ? body.internalNotes.trim()
        : ""

    if (!title) {
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

    if (!scheduledAt) {
      return NextResponse.json(
        {
          error:
            "Meeting date and time are required",
        },
        {
          status: 400,
        }
      )
    }

    const scheduledDate =
      new Date(scheduledAt)

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

    if (!isValidStatus(status)) {
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

    const result =
      await query<MeetingRow>(
        `
        INSERT INTO vendor_meetings (
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
          $11,
          $12,
          $12
        )

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
        [
          profile.organization_id,
          vendorId,
          title,
          meetingType || null,
          status,
          scheduledAt,
          durationMinutes,
          location || null,
          meetingLink || null,
          summary || null,
          internalNotes || null,
          profile.id,
        ]
      )

    return NextResponse.json(
      {
        meeting:
          result.rows[0],
      },
      {
        status: 201,
      }
    )
  } catch (error) {
    console.error(
      "CREATE VENDOR MEETING ERROR:",
      error
    )

    return NextResponse.json(
      {
        error:
          "Failed to create vendor meeting",
      },
      {
        status: 500,
      }
    )
  }
}