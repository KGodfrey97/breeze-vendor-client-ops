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

    const budgetsResult = await query(
      `
      SELECT
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
      FROM vendor_budgets
      WHERE vendor_id = $1
        AND organization_id = $2
      ORDER BY budget_year DESC
      `,
      [
        vendorId,
        profile.organization_id,
      ]
    )

    return NextResponse.json({
      budgets: budgetsResult.rows,
    })
  } catch (error) {
    console.error(
      "GET VENDOR BUDGETS ERROR:",
      error
    )

    return NextResponse.json(
      {
        error: "Failed to load vendor budgets",
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

    const budgetYear =
      body.budgetYear !== undefined &&
      body.budgetYear !== null &&
      body.budgetYear !== ""
        ? Number(body.budgetYear)
        : null

    const budgetAmount =
      body.budgetAmount !== undefined &&
      body.budgetAmount !== null &&
      body.budgetAmount !== ""
        ? Number(body.budgetAmount)
        : null

    const forecastAmount =
      body.forecastAmount === undefined ||
      body.forecastAmount === null ||
      body.forecastAmount === ""
        ? null
        : Number(body.forecastAmount)

    const notes =
      typeof body.notes === "string"
        ? body.notes.trim()
        : ""

    if (
      budgetYear === null ||
      !Number.isInteger(budgetYear) ||
      budgetYear < 2000 ||
      budgetYear > 2200
    ) {
      return NextResponse.json(
        {
          error: "Budget year must be between 2000 and 2200",
        },
        { status: 400 }
      )
    }

    if (
      budgetAmount === null ||
      !Number.isFinite(budgetAmount) ||
      budgetAmount < 0
    ) {
      return NextResponse.json(
        {
          error: "Budget amount must be 0 or greater",
        },
        { status: 400 }
      )
    }

    if (
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

    const result = await query(
      `
      INSERT INTO vendor_budgets (
        organization_id,
        vendor_id,
        budget_year,
        budget_amount,
        forecast_amount,
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
        $7
      )
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
      [
        profile.organization_id,
        vendorId,
        budgetYear,
        budgetAmount,
        forecastAmount,
        notes || null,
        profile.id,
      ]
    )

    return NextResponse.json(
      {
        budget: result.rows[0],
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error(
      "CREATE VENDOR BUDGET ERROR:",
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
        error: "Failed to create vendor budget",
      },
      { status: 500 }
    )
  }
}