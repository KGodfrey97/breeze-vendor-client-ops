import { NextRequest, NextResponse } from "next/server"
import { requireAuthenticatedUser } from "@/lib/auth-server"
import { query } from "@/lib/db"

async function requireAdmin() {
  const user = await requireAuthenticatedUser()

  const { rows } = await query(
    "SELECT role FROM profiles WHERE id = $1",
    [user.id]
  )

  if (rows[0]?.role !== "admin") {
    throw new Error("Forbidden")
  }

  return user
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin()

    const {
      question,
      answer,
      category,
      tags,
      is_active,
    } = await req.json()

    const { rows } = await query(
      `
      INSERT INTO faqs (
        question,
        answer,
        category,
        tags,
        is_active
      )
      VALUES ($1,$2,$3,$4,$5)
      RETURNING *
      `,
      [
        question,
        answer,
        category,
        tags,
        is_active,
      ]
    )

    return NextResponse.json(rows[0])
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create FAQ" },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAdmin()

    const {
      id,
      question,
      answer,
      category,
      tags,
      is_active,
    } = await req.json()

    const { rows } = await query(
      `
      UPDATE faqs
      SET
        question = $1,
        answer = $2,
        category = $3,
        tags = $4,
        is_active = $5,
        updated_at = NOW()
      WHERE id = $6
      RETURNING *
      `,
      [
        question,
        answer,
        category,
        tags,
        is_active,
        id,
      ]
    )

    return NextResponse.json(rows[0])
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update FAQ" },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin()

    const { id } = await req.json()

    await query(
      `DELETE FROM faqs WHERE id = $1`,
      [id]
    )

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete FAQ" },
      { status: 500 }
    )
  }
}