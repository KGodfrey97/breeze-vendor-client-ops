import {
  NextRequest,
  NextResponse,
} from "next/server"

import { query } from "@/lib/db"
import { requireAuthenticatedProfile } from "@/lib/auth-server"
import { recalculateVendorHealth } from "@/lib/vendor-health"

type RatingRow = {
  responsiveness: number | null
  adaptability: number | null
  compliance: number | null
  relationship: number | null
  updated_at: string
}

function isValidRating(
  value: unknown
) {
  return (
    value === null ||
    (
      Number.isInteger(
        value
      ) &&
      Number(value) >= 1 &&
      Number(value) <= 5
    )
  )
}

export async function GET(
  _request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string
    }>
  }
) {
  try {
    const { profile } =
      await requireAuthenticatedProfile()

    const {
      id: vendorId,
    } = await params

    const vendorResult =
      await query(
        `
        SELECT id

        FROM vendors

        WHERE id = $1
          AND organization_id = $2

        LIMIT 1
        `,
        [
          vendorId,
          profile.organization_id,
        ]
      )

    if (
      vendorResult.rowCount === 0
    ) {
      return NextResponse.json(
        {
          error:
            "Vendor not found",
        },
        {
          status: 404,
        }
      )
    }

    const result =
      await query<RatingRow>(
        `
        SELECT
          responsiveness,
          adaptability,
          compliance,
          relationship,
          updated_at

        FROM vendor_relationship_ratings

        WHERE organization_id = $1
          AND vendor_id = $2

        LIMIT 1
        `,
        [
          profile.organization_id,
          vendorId,
        ]
      )

    const ratings =
      result.rows[0]

    return NextResponse.json({
      ratings: {
        responsiveness:
          ratings?.responsiveness ??
          null,

        adaptability:
          ratings?.adaptability ??
          null,

        compliance:
          ratings?.compliance ??
          null,

        relationship:
          ratings?.relationship ??
          null,

        updatedAt:
          ratings?.updated_at ??
          null,
      },
    })
  } catch (error) {
    console.error(
      "GET VENDOR RATINGS ERROR:",
      error
    )

    return NextResponse.json(
      {
        error:
          "Failed to load vendor ratings",
      },
      {
        status: 500,
      }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string
    }>
  }
) {
  try {
    const { profile } =
      await requireAuthenticatedProfile()

    const {
      id: vendorId,
    } = await params

    const body =
      await request.json()

    const {
      responsiveness = null,
      adaptability = null,
      compliance = null,
      relationship = null,
    } = body

    const ratings = [
      responsiveness,
      adaptability,
      compliance,
      relationship,
    ]

    if (
      !ratings.every(
        isValidRating
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Ratings must be whole numbers between 1 and 5, or null.",
        },
        {
          status: 400,
        }
      )
    }

    const vendorResult =
      await query(
        `
        SELECT id

        FROM vendors

        WHERE id = $1
          AND organization_id = $2

        LIMIT 1
        `,
        [
          vendorId,
          profile.organization_id,
        ]
      )

    if (
      vendorResult.rowCount === 0
    ) {
      return NextResponse.json(
        {
          error:
            "Vendor not found",
        },
        {
          status: 404,
        }
      )
    }

    const result =
      await query<RatingRow>(
        `
        INSERT INTO vendor_relationship_ratings (
          organization_id,
          vendor_id,

          responsiveness,
          adaptability,
          compliance,
          relationship,

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
          $7
        )

        ON CONFLICT (
          organization_id,
          vendor_id
        )

        DO UPDATE SET
          responsiveness =
            EXCLUDED.responsiveness,

          adaptability =
            EXCLUDED.adaptability,

          compliance =
            EXCLUDED.compliance,

          relationship =
            EXCLUDED.relationship,

          updated_by =
            EXCLUDED.updated_by

        RETURNING
          responsiveness,
          adaptability,
          compliance,
          relationship,
          updated_at
        `,
        [
          profile.organization_id,
          vendorId,

          responsiveness,
          adaptability,
          compliance,
          relationship,

          profile.id,
        ]
      )

    await recalculateVendorHealth(
      vendorId,
      profile.organization_id
    )

    const row =
      result.rows[0]

    return NextResponse.json({
      ratings: {
        responsiveness:
          row.responsiveness,

        adaptability:
          row.adaptability,

        compliance:
          row.compliance,

        relationship:
          row.relationship,

        updatedAt:
          row.updated_at,
      },
    })
  } catch (error) {
    console.error(
      "PATCH VENDOR RATINGS ERROR:",
      error
    )

    return NextResponse.json(
      {
        error:
          "Failed to update vendor ratings",
      },
      {
        status: 500,
      }
    )
  }
}