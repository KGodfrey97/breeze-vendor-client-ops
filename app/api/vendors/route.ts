import { NextRequest, NextResponse } from "next/server"

import { handleApiError } from "@/lib/api-response"
import { requireAuthenticatedProfile } from "@/lib/auth-server"
import { query } from "@/lib/db"

export const runtime = "nodejs"

const sortableColumns: Record<string, string> = {
  created_at: "created_at",
  name: "name",
  vendor_code: "vendor_code",
  line_of_business: "line_of_business",
  vendor_tier: "vendor_tier",
  grade: "grade",
  status: "status",
  renewal_date: "renewal_date",
}

function getVendorSelect() {
  return `
    SELECT *
    FROM (
      SELECT
        v.id,
        v.organization_id,
        v.line_of_business_id,
        v.name,
        v.vendor_code,
        v.grade,
        v.vendor_tier,
        v.status,
        v.color,
        v.description,
        v.notes,
        v.created_by,
        v.updated_by,
        v.created_at,
        v.updated_at,

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
        ) AS renewal_date

      FROM vendors v

      LEFT JOIN lines_of_business lob
        ON lob.id = v.line_of_business_id
        AND lob.organization_id = v.organization_id
    ) vendor_list
  `
}

export async function GET(request: NextRequest) {
  try {
    const { profile } = await requireAuthenticatedProfile()

    const params = request.nextUrl.searchParams

    const page = Math.max(
      Number(params.get("page") ?? 1),
      1
    )

    const pageSize = Math.min(
      Math.max(
        Number(
          params.get("pageSize") ?? 20
        ),
        1
      ),
      100
    )

    const offset = (page - 1) * pageSize

    const filters: string[] = [
        "organization_id = $1",
    ]

    const values: unknown[] = [
      profile.organization_id,
    ]

    const addFilter = (
      sql: string,
      value: unknown
    ) => {
      values.push(value)

      filters.push(
        sql.replace(
          "?",
          `$${values.length}`
        )
      )
    }

    // --------------------------------------------------
    // Status
    // --------------------------------------------------

    const status = params.get("status")

    if (
      status &&
      status !== "all"
    ) {
      addFilter(
        "status = ?",
        status
      )
    }

    // --------------------------------------------------
    // Line of Business
    // --------------------------------------------------

    const lob = params.get("lob")

    if (
      lob &&
      lob !== "all"
    ) {
      addFilter(
        "line_of_business_id = ?",
        lob
      )
    }

    // --------------------------------------------------
    // Vendor Tier
    // --------------------------------------------------

    const tier = params.get("tier")

    if (
      tier &&
      tier !== "all"
    ) {
      addFilter(
        "vendor_tier = ?",
        tier
      )
    }

    // --------------------------------------------------
    // Grade
    // --------------------------------------------------

    const grade = params.get("grade")

    if (
      grade &&
      grade !== "all"
    ) {
      addFilter(
        "grade = ?",
        grade
      )
    }

    // --------------------------------------------------
    // Search
    //
    // Searches:
    // Vendor name
    // Vendor code
    // Line of business
    // --------------------------------------------------

    const search = params.get("search")?.trim()

    if (search) {
      values.push(
        `%${search}%`
      )

      const searchPlaceholder = `$${values.length}`

      filters.push(
        `(
            name ILIKE ${searchPlaceholder}
            OR vendor_code ILIKE ${searchPlaceholder}
            OR line_of_business ILIKE ${searchPlaceholder}
        )`
        )
    }

    // --------------------------------------------------
    // Sorting
    // --------------------------------------------------

    const sortBy = params.get("sortBy") || "created_at"
    const sortColumn = sortableColumns[sortBy] ?? "created_at"
    const sortOrder =
    params.get("sortOrder") === "asc"
        ? "ASC"
        : "DESC"

    const where = filters.join(" AND ")

    // --------------------------------------------------
    // Fetch vendors + total count
    // --------------------------------------------------

    const [
      vendorsResult,
      countResult,
    ] = await Promise.all([
      query(
        `
        ${getVendorSelect()}

        WHERE ${where}

        ORDER BY
          ${sortColumn}
          ${sortOrder}
          NULLS LAST

        LIMIT $${values.length + 1}
        OFFSET $${values.length + 2}
        `,
        [
          ...values,
          pageSize,
          offset,
        ]
      ),

      query<{ count: string }>(
        `
        SELECT COUNT(*)::text AS count
        FROM (
            ${getVendorSelect()}
            WHERE ${where}
        ) filtered_vendors
        `,
        values
        ),
    ])

    return NextResponse.json({
      vendors:
        vendorsResult.rows,

      count: Number(
        countResult.rows[0]
          ?.count ?? 0
      ),
    })
  } catch (error) {
    return handleApiError(
      error,
      "Failed to fetch vendors"
    )
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    const { profile } = await requireAuthenticatedProfile()

    const body = await request.json()

    // --------------------------------------------------
    // Normalize input
    // --------------------------------------------------

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : ""

    const vendorCode =
      typeof body.vendorCode === "string"
        ? body.vendorCode.trim()
        : ""

    const lineOfBusinessId =
      typeof body.lineOfBusinessId ===
      "string"
        ? body.lineOfBusinessId
        : null

    const vendorTier =
      typeof body.vendorTier === "string"
        ? body.vendorTier.trim()
        : ""

    const grade =
      typeof body.grade === "string"
        ? body.grade
        : null

    const status =
      typeof body.status === "string"
        ? body.status
        : "onboarding"

    const color =
      typeof body.color === "string"
        ? body.color.trim()
        : ""

    const description =
      typeof body.description === "string"
        ? body.description.trim()
        : ""

    const notes =
      typeof body.notes === "string"
        ? body.notes.trim()
        : ""

    // --------------------------------------------------
    // Required fields
    // --------------------------------------------------

    if (!name) {
      return NextResponse.json(
        {
          error:
            "Vendor name is required",
        },
        {
          status: 400,
        }
      )
    }

    if (!lineOfBusinessId) {
      return NextResponse.json(
        {
          error:
            "Line of business is required",
        },
        {
          status: 400,
        }
      )
    }

    // --------------------------------------------------
    // Validate status
    // --------------------------------------------------

    const allowedStatuses = [
      "onboarding",
      "active",
      "under_review",
      "inactive",
    ]

    if (
      !allowedStatuses.includes(
        status
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid vendor status",
        },
        {
          status: 400,
        }
      )
    }

    // --------------------------------------------------
    // Validate grade
    // --------------------------------------------------

    const allowedGrades = [
      "A",
      "B",
      "C",
      "D",
      "F",
    ]

    if (
      grade &&
      !allowedGrades.includes(
        grade
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid vendor grade",
        },
        {
          status: 400,
        }
      )
    }

    // --------------------------------------------------
    // Verify LOB belongs to same organization
    // --------------------------------------------------

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

    if (
      lobResult.rowCount === 0
    ) {
      return NextResponse.json(
        {
          error: "Line of business not found",
        },
        {
          status: 400,
        }
      )
    }

    // --------------------------------------------------
    // Create vendor
    // --------------------------------------------------

    const result = await query(
      `
      INSERT INTO vendors (
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
        $11
      )

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
      [
        profile.organization_id,
        lineOfBusinessId,
        name,
        vendorCode || null,
        grade || null,
        vendorTier || null,
        status,
        color || null,
        description || null,
        notes || null,
        profile.id,
      ]
    )

    const vendor = result.rows[0]

    return NextResponse.json(
      {
        vendor,
      },
      {
        status: 201,
      }
    )
  } catch (error: any) {
    // Unique vendor name constraint
    if (
      error?.code === "23505"
    ) {
      return NextResponse.json(
        {
          error: "A vendor with this name already exists.",
        },
        {
          status: 409,
        }
      )
    }

    return handleApiError(
      error,
      "Failed to create vendor"
    )
  }
}