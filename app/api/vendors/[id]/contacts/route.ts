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
    const { id: vendorId } = await context.params

    // Make sure the vendor belongs to this organization
    const vendorResult = await query(
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

    if (!vendorResult.rows[0]) {
      return NextResponse.json(
        { error: "Vendor not found" },
        { status: 404 }
      )
    }

    const contactsResult = await query(
      `
      SELECT
        id,
        vendor_id,
        first_name,
        last_name,
        title,
        email,
        phone,
        is_primary,
        notes,
        created_at,
        updated_at
      FROM vendor_contacts
      WHERE vendor_id = $1
        AND organization_id = $2
      ORDER BY
        is_primary DESC,
        last_name ASC NULLS LAST,
        first_name ASC NULLS LAST
      `,
      [
        vendorId,
        profile.organization_id,
      ]
    )

    return NextResponse.json({
      contacts: contactsResult.rows,
    })
  } catch (error) {
    console.error(
      "GET VENDOR CONTACTS ERROR:",
      error
    )

    return NextResponse.json(
      {
        error:
          "Failed to load vendor contacts",
      },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  context: RouteContext
) {
  try {
    const { profile } = await requireAuthenticatedProfile()
    const { id: vendorId } = await context.params
    const body = await request.json()

    const firstName =
      typeof body.firstName === "string"
        ? body.firstName.trim()
        : ""

    const lastName =
      typeof body.lastName === "string"
        ? body.lastName.trim()
        : ""

    const title =
      typeof body.title === "string"
        ? body.title.trim()
        : ""

    const email =
      typeof body.email === "string"
        ? body.email.trim()
        : ""

    const phone =
      typeof body.phone === "string"
        ? body.phone.trim()
        : ""

    const notes =
      typeof body.notes === "string"
        ? body.notes.trim()
        : ""

    const isPrimary =
      body.isPrimary === true

    if (!firstName && !lastName) {
      return NextResponse.json(
        {
          error:
            "Contact first name or last name is required",
        },
        { status: 400 }
      )
    }

    const vendorResult = await query(
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

    if (!vendorResult.rows[0]) {
      return NextResponse.json(
        { error: "Vendor not found" },
        { status: 404 }
      )
    }

    // If this contact is marked primary,
    // clear the primary flag from the others first.
    if (isPrimary) {
      await query(
        `
        UPDATE vendor_contacts
        SET is_primary = FALSE
        WHERE vendor_id = $1
          AND organization_id = $2
        `,
        [
          vendorId,
          profile.organization_id,
        ]
      )
    }

    const result = await query(
      `
      INSERT INTO vendor_contacts (
        organization_id,
        vendor_id,
        first_name,
        last_name,
        title,
        email,
        phone,
        is_primary,
        notes
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
        $9
      )
      RETURNING
        id,
        vendor_id,
        first_name,
        last_name,
        title,
        email,
        phone,
        is_primary,
        notes,
        created_at,
        updated_at
      `,
      [
        profile.organization_id,
        vendorId,
        firstName || null,
        lastName || null,
        title || null,
        email || null,
        phone || null,
        isPrimary,
        notes || null,
      ]
    )

    return NextResponse.json(
      {
        contact: result.rows[0],
      },
      { status: 201 }
    )
  } catch (error) {
    console.error(
      "CREATE VENDOR CONTACT ERROR:",
      error
    )

    return NextResponse.json(
      {
        error:
          "Failed to create vendor contact",
      },
      { status: 500 }
    )
  }
}