import { NextResponse } from "next/server"

import { query } from "@/lib/db"
import { requireAuthenticatedProfile } from "@/lib/auth-server"

type RouteContext = {
  params: Promise<{
    id: string
    budgetId: string
  }>
}

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    const { profile } = await requireAuthenticatedProfile()
    const { id: vendorId, budgetId } = await context.params
    const body = await request.json()

    const budgetYear =
      body.budgetYear === undefined
        ? undefined
        : body.budgetYear === null ||
          body.budgetYear === ""
        ? null
        : Number(body.budgetYear)

    const budgetAmount =
      body.budgetAmount === undefined
        ? undefined
        : body.budgetAmount === null ||
          body.budgetAmount === ""
        ? null
        : Number(body.budgetAmount)

    const forecastAmount =
      body.forecastAmount === undefined
        ? undefined
        : body.forecastAmount === null ||
          body.forecastAmount === ""
        ? null
        : Number(body.forecastAmount)

    const notes =
      typeof body.notes === "string"
        ? body.notes.trim()
        : body.notes === null
        ? null
        : undefined

    if (
      budgetYear !== undefined &&
      (
        budgetYear === null ||
        !Number.isInteger(budgetYear) ||
        budgetYear < 2000 ||
        budgetYear > 2200
      )
    ) {
      return NextResponse.json(
        {
          error: "Budget year must be between 2000 and 2200",
        },
        { status: 400 }
      )
    }

    if (
      budgetAmount !== undefined &&
      (
        budgetAmount === null ||
        !Number.isFinite(budgetAmount) ||
        budgetAmount < 0
      )
    ) {
      return NextResponse.json(
        {
          error: "Budget amount must be 0 or greater",
        },
        { status: 400 }
      )
    }

    if (
      forecastAmount !== undefined &&
      forecastAmount !== null &&
      (
        !Number.isFinite(forecastAmount) ||
        forecastAmount < 0
      )
    ) {
      return NextResponse.json(
        {
          error: "Forecast amount must be 0 or greater",
        },
        { status: 400 }
      )
    }

    const existingResult = await query(
      `
      SELECT id
      FROM vendor_budgets
      WHERE id = $1
        AND vendor_id = $2
        AND organization_id = $3
      LIMIT 1
      `,
      [
        budgetId,
        vendorId,
        profile.organization_id,
      ]
    )

    if (!existingResult.rows[0]) {
      return NextResponse.json(
        { error: "Budget not found" },
        { status: 404 }
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

    if (budgetYear !== undefined) {
      addUpdate("budget_year", budgetYear)
    }

    if (budgetAmount !== undefined) {
      addUpdate("budget_amount", budgetAmount)
    }

    if (forecastAmount !== undefined) {
      addUpdate("forecast_amount", forecastAmount)
    }

    if (notes !== undefined) {
      addUpdate("notes", notes || null)
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      )
    }

    addUpdate("updated_by", profile.id)

    values.push(budgetId)
    const budgetIdParam = `$${values.length}`

    values.push(vendorId)
    const vendorIdParam = `$${values.length}`

    values.push(profile.organization_id)
    const organizationIdParam = `$${values.length}`

    const result = await query(
      `
      UPDATE vendor_budgets
      SET
        ${updates.join(", ")}
      WHERE id = ${budgetIdParam}
        AND vendor_id = ${vendorIdParam}
        AND organization_id = ${organizationIdParam}
      RETURNING
        id,
        vendor_id,
        budget_year,
        budget_amount,
        forecast_amount,
        notes,
        created_by,
        updated_by,
        created_at,
        updated_at
      `,
      values
    )

    return NextResponse.json({
      budget: result.rows[0],
    })
  } catch (error: any) {
    console.error(
      "UPDATE VENDOR BUDGET ERROR:",
      error
    )

    if (error?.code === "23505") {
      return NextResponse.json(
        {
          error:
            "A budget already exists for this vendor and year.",
        },
        { status: 409 }
      )
    }

    return NextResponse.json(
      {
        error: "Failed to update vendor budget",
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
    const { id: vendorId, budgetId } = await context.params

    const result = await query(
      `
      DELETE FROM vendor_budgets
      WHERE id = $1
        AND vendor_id = $2
        AND organization_id = $3
      RETURNING id
      `,
      [
        budgetId,
        vendorId,
        profile.organization_id,
      ]
    )

    const deletedBudget = result.rows[0]

    if (!deletedBudget) {
      return NextResponse.json(
        { error: "Budget not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      deletedBudgetId: deletedBudget.id,
    })
  } catch (error) {
    console.error(
      "DELETE VENDOR BUDGET ERROR:",
      error
    )

    return NextResponse.json(
      {
        error: "Failed to delete vendor budget",
      },
      { status: 500 }
    )
  }
}