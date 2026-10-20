
import { NextRequest, NextResponse } from "next/server"

import { query } from "@/lib/db"
import {
  requireAuthenticatedProfile,
  isUnauthorizedError,
} from "@/lib/auth-server"

export const runtime = "nodejs"

type Context = {
  params: Promise<{ id: string }>
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(
  request: NextRequest,
  context: Context
) {
  try {
    const { profile } = await requireAuthenticatedProfile()
    const { id } = await context.params

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: "Invalid report ID" },
        { status: 400 }
      )
    }

    const body = await request.json().catch(() => null)
    const name = body?.name

    if (
      typeof name !== "string" ||
      name.trim().length < 1 ||
      name.trim().length > 100
    ) {
      return NextResponse.json(
        { error: "Enter a template name (1–100 characters)." },
        { status: 400 }
      )
    }

    const result = await query(
      `
      SELECT public.save_vendor_report_template(
        $1::uuid,
        $2::uuid,
        $3::uuid,
        $4::text
      ) AS template_id
      `,
      [
        id,
        profile.organization_id,
        profile.id,
        name.trim(),
      ]
    )

    return NextResponse.json(
      {
        success: true,
        templateId: result.rows[0].template_id,
        name: name.trim(),
      },
      { status: 201 }
    )
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
        { error: dbError.message ?? "Cannot save template" },
        { status: 409 }
      )
    }

    console.error("Save vendor report template error:", error)

    return NextResponse.json(
      { error: "Failed to save report template" },
      { status: 500 }
    )
  }
}
