import { NextResponse } from "next/server"

import { query } from "@/lib/db"
import { requireAuthenticatedProfile } from "@/lib/auth-server"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    const { profile } = await requireAuthenticatedProfile()
    const { id } = await context.params

    const result = await query(
      `
      SELECT
        v.id,
        v.name,
        v.vendor_code,
        v.grade,
        v.vendor_tier,
        v.status,
        v.color,
        v.description,
        v.notes,

        v.line_of_business_id,
        lob.name AS line_of_business,

        (
          SELECT MIN(
            COALESCE(c.renewal_date, c.end_date)
          )
          FROM contracts c
          WHERE c.vendor_id = v.id
            AND c.organization_id = v.organization_id
            AND c.status IN ('active', 'expiring')
            AND COALESCE(c.renewal_date, c.end_date) IS NOT NULL
            AND COALESCE(c.renewal_date, c.end_date) >= CURRENT_DATE
        ) AS renewal_date,

        v.created_at,
        v.updated_at

      FROM vendors v

      LEFT JOIN lines_of_business lob
        ON lob.id = v.line_of_business_id
        AND lob.organization_id = v.organization_id

      WHERE v.id = $1
        AND v.organization_id = $2

      LIMIT 1
      `,
      [
        id,
        profile.organization_id,
      ]
    )

    const vendor = result.rows[0]

    if (!vendor) {
      return NextResponse.json(
        { error: "Vendor not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      vendor,
    })
  } catch (error) {
    console.error("GET VENDOR ERROR:", error)

    return NextResponse.json(
      { error: "Failed to load vendor" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    const { profile } = await requireAuthenticatedProfile()
    const { id } = await context.params

    const body = await request.json()

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : undefined

    const vendorCode =
      typeof body.vendorCode === "string"
        ? body.vendorCode.trim()
        : body.vendorCode === null
        ? null
        : undefined

    const lineOfBusinessId =
      typeof body.lineOfBusinessId === "string"
        ? body.lineOfBusinessId
        : body.lineOfBusinessId === null
        ? null
        : undefined

    const vendorTier =
      typeof body.vendorTier === "string"
        ? body.vendorTier.trim()
        : body.vendorTier === null
        ? null
        : undefined

    const status =
      typeof body.status === "string"
        ? body.status
        : undefined

    const grade =
      typeof body.grade === "string"
        ? body.grade
        : body.grade === null
        ? null
        : undefined

    const color =
      typeof body.color === "string"
        ? body.color.trim()
        : body.color === null
        ? null
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

    // Validate status if provided
    const allowedStatuses = [
      "onboarding",
      "active",
      "under_review",
      "inactive",
    ]

    if (
      status !== undefined &&
      !allowedStatuses.includes(status)
    ) {
      return NextResponse.json(
        { error: "Invalid vendor status" },
        { status: 400 }
      )
    }

    // Validate grade if provided
    const allowedGrades = [
      "A",
      "B",
      "C",
      "D",
      "F",
    ]

    if (
      grade !== undefined &&
      grade !== null &&
      !allowedGrades.includes(grade)
    ) {
      return NextResponse.json(
        { error: "Invalid vendor grade" },
        { status: 400 }
      )
    }

    // Validate LOB belongs to same organization
    if (lineOfBusinessId) {
      const lobResult = await query(
        `
        SELECT id
        FROM lines_of_business
        WHERE id = $1
          AND organization_id = $2
          AND is_active = TRUE
        LIMIT 1
        `,
        [
          lineOfBusinessId,
          profile.organization_id,
        ]
      )

      if (!lobResult.rows[0]) {
        return NextResponse.json(
          { error: "Invalid line of business" },
          { status: 400 }
        )
      }
    }

    // Build dynamic update
    const updates: string[] = []
    const values: unknown[] = []

    const addUpdate = (
      column: string,
      value: unknown
    ) => {
      values.push(value)
      updates.push(
        `${column} = $${values.length}`
      )
    }

    if (name !== undefined) {
      if (!name) {
        return NextResponse.json(
          { error: "Vendor name is required" },
          { status: 400 }
        )
      }

      addUpdate("name", name)
    }

    if (vendorCode !== undefined) {
      addUpdate(
        "vendor_code",
        vendorCode || null
      )
    }

    if (lineOfBusinessId !== undefined) {
      addUpdate(
        "line_of_business_id",
        lineOfBusinessId
      )
    }

    if (vendorTier !== undefined) {
      addUpdate(
        "vendor_tier",
        vendorTier || null
      )
    }

    if (status !== undefined) {
      addUpdate("status", status)
    }

    if (grade !== undefined) {
      addUpdate("grade", grade)
    }

    if (color !== undefined) {
      addUpdate(
        "color",
        color || null
      )
    }

    if (description !== undefined) {
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

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      )
    }

    // Track who updated it
    addUpdate(
      "updated_by",
      profile.id
    )

    // Vendor id + org id go at the end
    values.push(id)
    const vendorIdParam =
      `$${values.length}`

    values.push(
      profile.organization_id
    )
    const organizationIdParam =
      `$${values.length}`

    const result = await query(
      `
      UPDATE vendors
      SET
        ${updates.join(", ")}
      WHERE id = ${vendorIdParam}
        AND organization_id = ${organizationIdParam}
      RETURNING
        id,
        organization_id,
        line_of_business_id,
        name,
        vendor_code,
        grade,
        vendor_tier,
        status,
        color,
        description,
        notes,
        created_by,
        updated_by,
        created_at,
        updated_at
      `,
      values
    )

    const vendor = result.rows[0]

    if (!vendor) {
      return NextResponse.json(
        { error: "Vendor not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      vendor,
    })
  } catch (error: any) {
    console.error(
      "UPDATE VENDOR ERROR:",
      error
    )

    if (error?.code === "23505") {
      return NextResponse.json(
        {
          error:
            "A vendor with this name already exists.",
        },
        { status: 409 }
      )
    }

    return NextResponse.json(
      {
        error: "Failed to update vendor",
      },
      { status: 500 }
    )
  }
}