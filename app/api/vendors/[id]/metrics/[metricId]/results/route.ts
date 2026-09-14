import { NextResponse } from "next/server"

import { query } from "@/lib/db"
import { requireAuthenticatedProfile } from "@/lib/auth-server"

import { recalculateVendorHealth } from "@/lib/vendor-health"

type RouteContext = {
  params: Promise<{
    id: string
    metricId: string
  }>
}

function determineStatus(
  actualValue: number,
  targetValue: number,
  operator: string
) {
  switch (operator) {
    case ">=":
      return actualValue >= targetValue ? "met" : "missed"
    case "<=":
      return actualValue <= targetValue ? "met" : "missed"
    case ">":
      return actualValue > targetValue ? "met" : "missed"
    case "<":
      return actualValue < targetValue ? "met" : "missed"
    case "=":
      return actualValue === targetValue ? "met" : "missed"
    default:
      return "not_measured"
  }
}

export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    const { profile } = await requireAuthenticatedProfile()
    const { id: vendorId, metricId } = await context.params

    const metricResult = await query(
      `
      SELECT id
      FROM vendor_metrics
      WHERE id = $1
        AND vendor_id = $2
        AND organization_id = $3
      LIMIT 1
      `,
      [
        metricId,
        vendorId,
        profile.organization_id,
      ]
    )

    if (!metricResult.rows[0]) {
      return NextResponse.json(
        { error: "Metric not found" },
        { status: 404 }
      )
    }

    const result = await query(
      `
      SELECT
        id,
        metric_id,
        vendor_id,
        period_start,
        period_end,
        actual_value,
        status,
        notes,
        created_at,
        updated_at
      FROM vendor_metric_results
      WHERE metric_id = $1
        AND vendor_id = $2
        AND organization_id = $3
      ORDER BY period_end DESC, created_at DESC
      `,
      [
        metricId,
        vendorId,
        profile.organization_id,
      ]
    )

    return NextResponse.json({
      results: result.rows,
    })
  } catch (error) {
    console.error("GET METRIC RESULTS ERROR:", error)

    return NextResponse.json(
      { error: "Failed to load metric results" },
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
    const { id: vendorId, metricId } = await context.params
    const body = await request.json()

    const periodStart =
      typeof body.periodStart === "string"
        ? body.periodStart
        : ""

    const periodEnd =
      typeof body.periodEnd === "string"
        ? body.periodEnd
        : ""

    const actualValue =
      body.actualValue !== undefined &&
      body.actualValue !== null &&
      body.actualValue !== ""
        ? Number(body.actualValue)
        : null

    const notes =
      typeof body.notes === "string"
        ? body.notes.trim()
        : ""

    if (!periodStart || !periodEnd) {
      return NextResponse.json(
        { error: "Reporting period is required" },
        { status: 400 }
      )
    }

    if (periodEnd < periodStart) {
      return NextResponse.json(
        {
          error:
            "Period end cannot be before period start",
        },
        { status: 400 }
      )
    }

    if (
      actualValue === null ||
      !Number.isFinite(actualValue)
    ) {
      return NextResponse.json(
        { error: "Valid actual value is required" },
        { status: 400 }
      )
    }

    const metricResult = await query<{
      target_value: string
      comparison_operator: string
    }>(
      `
      SELECT
        target_value,
        comparison_operator
      FROM vendor_metrics
      WHERE id = $1
        AND vendor_id = $2
        AND organization_id = $3
        AND is_active = TRUE
      LIMIT 1
      `,
      [
        metricId,
        vendorId,
        profile.organization_id,
      ]
    )

    const metric = metricResult.rows[0]

    if (!metric) {
      return NextResponse.json(
        { error: "Metric not found" },
        { status: 404 }
      )
    }

    const status = determineStatus(
      actualValue,
      Number(metric.target_value),
      metric.comparison_operator
    )

    const result = await query(
      `
      INSERT INTO vendor_metric_results (
        organization_id,
        vendor_id,
        metric_id,
        period_start,
        period_end,
        actual_value,
        status,
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
        $9
      )
      RETURNING *
      `,
      [
        profile.organization_id,
        vendorId,
        metricId,
        periodStart,
        periodEnd,
        actualValue,
        status,
        notes || null,
        profile.id,
      ]
    )

    await recalculateVendorHealth(
      vendorId,
      profile.organization_id
    )

    return NextResponse.json(
      {
        result: result.rows[0],
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error("CREATE METRIC RESULT ERROR:", error)

    if (error?.code === "23505") {
      return NextResponse.json(
        {
          error:
            "A result already exists for this metric and reporting period.",
        },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: "Failed to create metric result" },
      { status: 500 }
    )
  }
}