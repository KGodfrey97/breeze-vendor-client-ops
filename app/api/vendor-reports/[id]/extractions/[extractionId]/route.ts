
import { NextRequest, NextResponse } from "next/server"

import { query } from "@/lib/db"

import {
  requireAuthenticatedProfile,
  isUnauthorizedError,
} from "@/lib/auth-server"

export const runtime = "nodejs"

type Context = {
  params: Promise<{
    id: string
    extractionId: string
  }>
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function PATCH(
  request: NextRequest,
  context: Context
) {
  try {
    const { profile } = await requireAuthenticatedProfile()
    const { id, extractionId } = await context.params

    if (
      !UUID_REGEX.test(id) ||
      !UUID_REGEX.test(extractionId)
    ) {
      return NextResponse.json(
        { error: "Invalid report or extraction ID" },
        { status: 400 }
      )
    }

    const body = await request.json().catch(() => null)
    const action = body?.action
    const metricId = body?.metricId ?? null

    if (
      !["map", "ignore", "restore"].includes(action)
    ) {
      return NextResponse.json(
        { error: "Invalid mapping action" },
        { status: 400 }
      )
    }

    if (
      action === "map" &&
      (
        typeof metricId !== "string" ||
        !UUID_REGEX.test(metricId)
      )
    ) {
      return NextResponse.json(
        { error: "Valid metric ID required" },
        { status: 400 }
      )
    }

    const result = await query(
      `
      SELECT public.update_vendor_report_extraction(
        $1::uuid,
        $2::uuid,
        $3::uuid,
        $4::text,
        $5::uuid
      ) AS report_status
      `,
      [
        id,
        profile.organization_id,
        extractionId,
        action,
        action === "map" ? metricId : null,
      ]
    )

    return NextResponse.json({
      success: true,
      reportStatus: result.rows[0]?.report_status,
    })
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const dbError = error as {
      code?: string
      message?: string
    }

    if (dbError.code === "P0001") {
      return NextResponse.json(
        {
          error: dbError.message ?? "Mapping update rejected",
        },
        { status: 409 }
      )
    }

    console.error("Report mapping update error:", error)

    return NextResponse.json(
      { error: "Failed to update metric mapping" },
      { status: 500 }
    )
  }
}
