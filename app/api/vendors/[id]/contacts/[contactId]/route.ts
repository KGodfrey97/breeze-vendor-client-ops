import { NextResponse } from "next/server"

import { query } from "@/lib/db"
import { requireAuthenticatedProfile } from "@/lib/auth-server"

type RouteContext = {
  params: Promise<{
    id: string
    contactId: string
  }>
}

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    const { profile } = await requireAuthenticatedProfile()
    const { id: vendorId, contactId } = await context.params
    const body = await request.json()

    const firstName =
      typeof body.firstName === "string"
        ? body.firstName.trim()
        : body.firstName === null
        ? null
        : undefined

    const lastName =
      typeof body.lastName === "string"
        ? body.lastName.trim()
        : body.lastName === null
        ? null
        : undefined

    const title =
      typeof body.title === "string"
        ? body.title.trim()
        : body.title === null
        ? null
        : undefined

    const email =
      typeof body.email === "string"
        ? body.email.trim()
        : body.email === null
        ? null
        : undefined

    const phone =
      typeof body.phone === "string"
        ? body.phone.trim()
        : body.phone === null
        ? null
        : undefined

    const notes =
      typeof body.notes === "string"
        ? body.notes.trim()
        : body.notes === null
        ? null
        : undefined

    const isPrimary =
      typeof body.isPrimary === "boolean"
        ? body.isPrimary
        : undefined

    // Make sure this contact belongs to this vendor
    // and this vendor belongs to the logged-in organization.
    const contactCheck = await query(
      `
      SELECT vc.id
      FROM vendor_contacts vc
      JOIN vendors v
        ON v.id = vc.vendor_id
      WHERE vc.id = $1
        AND vc.vendor_id = $2
        AND vc.organization_id = $3
        AND v.organization_id = $3
      LIMIT 1
      `,
      [
        contactId,
        vendorId,
        profile.organization_id,
      ]
    )

    if (!contactCheck.rows[0]) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      )
    }

    // If this contact is being made primary,
    // clear the existing primary contact first.
    if (isPrimary === true) {
      await query(
        `
        UPDATE vendor_contacts
        SET is_primary = FALSE
        WHERE vendor_id = $1
          AND organization_id = $2
          AND id <> $3
        `,
        [
          vendorId,
          profile.organization_id,
          contactId,
        ]
      )
    }

    const updates: string[] = []
    const values: unknown[] = []

    const addUpdate = (
      column: string,
      value: unknown
    ) => {
      values.push(value)
      updates.push(`${column} = $${values.length}`)
    }

    if (firstName !== undefined) {
      addUpdate(
        "first_name",
        firstName || null
      )
    }

    if (lastName !== undefined) {
      addUpdate(
        "last_name",
        lastName || null
      )
    }

    if (title !== undefined) {
      addUpdate(
        "title",
        title || null
      )
    }

    if (email !== undefined) {
      addUpdate(
        "email",
        email || null
      )
    }

    if (phone !== undefined) {
      addUpdate(
        "phone",
        phone || null
      )
    }

    if (notes !== undefined) {
      addUpdate(
        "notes",
        notes || null
      )
    }

    if (isPrimary !== undefined) {
      addUpdate(
        "is_primary",
        isPrimary
      )
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      )
    }

    values.push(contactId)
    const contactIdParam = `$${values.length}`

    values.push(vendorId)
    const vendorIdParam = `$${values.length}`

    values.push(profile.organization_id)
    const organizationIdParam = `$${values.length}`

    const result = await query(
      `
      UPDATE vendor_contacts
      SET
        ${updates.join(", ")}
      WHERE id = ${contactIdParam}
        AND vendor_id = ${vendorIdParam}
        AND organization_id = ${organizationIdParam}
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
      values
    )

    const contact = result.rows[0]

    if (!contact) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      contact,
    })
  } catch (error) {
    console.error(
      "UPDATE VENDOR CONTACT ERROR:",
      error
    )

    return NextResponse.json(
      {
        error:
          "Failed to update vendor contact",
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext
) {
  try {
    const { profile } = await requireAuthenticatedProfile()
    const { id: vendorId, contactId } = await context.params

    const result = await query(
      `
      DELETE FROM vendor_contacts
      WHERE id = $1
        AND vendor_id = $2
        AND organization_id = $3
      RETURNING
        id,
        is_primary
      `,
      [
        contactId,
        vendorId,
        profile.organization_id,
      ]
    )

    const deletedContact = result.rows[0]

    if (!deletedContact) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      deletedContactId: deletedContact.id,
    })
  } catch (error) {
    console.error(
      "DELETE VENDOR CONTACT ERROR:",
      error
    )

    return NextResponse.json(
      {
        error:
          "Failed to delete vendor contact",
      },
      { status: 500 }
    )
  }
}