import { NextResponse } from "next/server"

import { query } from "@/lib/db"
import { requireAuthenticatedProfile } from "@/lib/auth-server"

import { recalculateVendorHealth } from "@/lib/vendor-health"

type RouteContext = {
  params: Promise<{
    id: string
    metricId: string
    resultId: string
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

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    const { profile } = await requireAuthenticatedProfile()

    const {
      id: vendorId,
      metricId,
      resultId,
    } = await context.params

    const body = await request.json()

    const existingResult = await query<{
      period_start: string
      period_end: string
      actual_value: string
    }>(
      `
      SELECT
        period_start,
        period_end,
        actual_value
      FROM vendor_metric_results
      WHERE id = $1
        AND metric_id = $2
        AND vendor_id = $3
        AND organization_id = $4
      LIMIT 1
      `,
      [
        resultId,
        metricId,
        vendorId,
        profile.organization_id,
      ]
    )

    const existing = existingResult.rows[0]

    if (!existing) {
      return NextResponse.json(
        { error: "Metric result not found" },
        { status: 404 }
      )
    }

    const periodStart =
      body.periodStart !== undefined
        ? body.periodStart
        : existing.period_start

    const periodEnd =
      body.periodEnd !== undefined
        ? body.periodEnd
        : existing.period_end

    const actualValue =
      body.actualValue !== undefined
        ? Number(body.actualValue)
        : Number(existing.actual_value)

    const notes =
      typeof body.notes === "string"
        ? body.notes.trim()
        : body.notes === null
        ? null
        : undefined

    if (!periodStart || !periodEnd) {
      return NextResponse.json(
        { error: "Reporting period is required" },
        { status: 400 }
      )
    }

    if (
      String(periodEnd).slice(0, 10) <
      String(periodStart).slice(0, 10)
    ) {
      return NextResponse.json(
        {
          error:
            "Period end cannot be before period start",
        },
        { status: 400 }
      )
    }

    if (!Number.isFinite(actualValue)) {
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

    const updates = [
      "period_start = $1",
      "period_end = $2",
      "actual_value = $3",
      "status = $4",
      "updated_by = $5",
    ]

    const values: unknown[] = [
      periodStart,
      periodEnd,
      actualValue,
      status,
      profile.id,
    ]

    if (notes !== undefined) {
      values.push(notes || null)
      updates.push(
        `notes = $${values.length}`
      )
    }

    values.push(resultId)
    const resultIdParam = `$${values.length}`

    values.push(metricId)
    const metricIdParam = `$${values.length}`

    values.push(vendorId)
    const vendorIdParam = `$${values.length}`

    values.push(profile.organization_id)
    const organizationIdParam = `$${values.length}`

    const result = await query(
      `
      UPDATE vendor_metric_results
      SET ${updates.join(", ")}
      WHERE id = ${resultIdParam}
        AND metric_id = ${metricIdParam}
        AND vendor_id = ${vendorIdParam}
        AND organization_id = ${organizationIdParam}
      RETURNING *
      `,
      values
    )

    await recalculateVendorHealth(
      vendorId,
      profile.organization_id
    )

    return NextResponse.json({
      result: result.rows[0],
    })
  } catch (error: any) {
    console.error("UPDATE METRIC RESULT ERROR:", error)

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
      { error: "Failed to update metric result" },
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

    const {
      id: vendorId,
      metricId,
      resultId,
    } = await context.params

    const result = await query(
      `
      DELETE FROM vendor_metric_results
      WHERE id = $1
        AND metric_id = $2
        AND vendor_id = $3
        AND organization_id = $4
      RETURNING id
      `,
      [
        resultId,
        metricId,
        vendorId,
        profile.organization_id,
      ]
    )

    if (!result.rows[0]) {
      return NextResponse.json(
        { error: "Metric result not found" },
        { status: 404 }
      )
    }

    await recalculateVendorHealth(
      vendorId,
      profile.organization_id
    )

    return NextResponse.json({
      success: true,
      deletedResultId: result.rows[0].id,
    })
  } catch (error) {
    console.error("DELETE METRIC RESULT ERROR:", error)

    return NextResponse.json(
      { error: "Failed to delete metric result" },
      { status: 500 }
    )
  }
}