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

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    const { profile } = await requireAuthenticatedProfile()
    const { id: vendorId, metricId } = await context.params
    const body = await request.json()

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : undefined

    const description =
      typeof body.description === "string"
        ? body.description.trim()
        : body.description === null
        ? null
        : undefined

    const metricType =
      typeof body.metricType === "string"
        ? body.metricType
        : undefined

    const unit =
      typeof body.unit === "string"
        ? body.unit.trim()
        : undefined

    const comparisonOperator =
      typeof body.comparisonOperator === "string"
        ? body.comparisonOperator
        : undefined

    const targetValue =
      body.targetValue === undefined
        ? undefined
        : body.targetValue === null ||
          body.targetValue === ""
        ? null
        : Number(body.targetValue)

    const weight =
      body.weight === undefined
        ? undefined
        : body.weight === null ||
          body.weight === ""
        ? null
        : Number(body.weight)

    const reportingFrequency =
      typeof body.reportingFrequency === "string"
        ? body.reportingFrequency
        : undefined

    const isActive =
      typeof body.isActive === "boolean"
        ? body.isActive
        : undefined

    const notes =
      typeof body.notes === "string"
        ? body.notes.trim()
        : body.notes === null
        ? null
        : undefined

    if (
      metricType !== undefined &&
      !["kpi", "sla"].includes(metricType)
    ) {
      return NextResponse.json(
        { error: "Invalid metric type" },
        { status: 400 }
      )
    }

    if (
      comparisonOperator !== undefined &&
      ![">=", "<=", ">", "<", "="].includes(
        comparisonOperator
      )
    ) {
      return NextResponse.json(
        { error: "Invalid comparison operator" },
        { status: 400 }
      )
    }

    if (
      targetValue !== undefined &&
      (
        targetValue === null ||
        !Number.isFinite(targetValue)
      )
    ) {
      return NextResponse.json(
        { error: "Valid target value is required" },
        { status: 400 }
      )
    }

    if (
      weight !== undefined &&
      (
        weight === null ||
        !Number.isFinite(weight) ||
        weight < 0
      )
    ) {
      return NextResponse.json(
        { error: "Weight must be 0 or greater" },
        { status: 400 }
      )
    }

    if (
      reportingFrequency !== undefined &&
      ![
        "weekly",
        "monthly",
        "quarterly",
        "annually",
      ].includes(reportingFrequency)
    ) {
      return NextResponse.json(
        { error: "Invalid reporting frequency" },
        { status: 400 }
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

    if (name !== undefined) {
      if (!name) {
        return NextResponse.json(
          { error: "Metric name is required" },
          { status: 400 }
        )
      }

      addUpdate("name", name)
    }

    if (description !== undefined) {
      addUpdate("description", description || null)
    }

    if (metricType !== undefined) {
      addUpdate("metric_type", metricType)
    }

    if (unit !== undefined) {
      if (!unit) {
        return NextResponse.json(
          { error: "Metric unit is required" },
          { status: 400 }
        )
      }

      addUpdate("unit", unit)
    }

    if (comparisonOperator !== undefined) {
      addUpdate(
        "comparison_operator",
        comparisonOperator
      )
    }

    if (targetValue !== undefined) {
      addUpdate("target_value", targetValue)
    }

    if (weight !== undefined) {
      addUpdate("weight", weight)
    }

    if (reportingFrequency !== undefined) {
      addUpdate(
        "reporting_frequency",
        reportingFrequency
      )
    }

    if (isActive !== undefined) {
      addUpdate("is_active", isActive)
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

    values.push(metricId)
    const metricIdParam = `$${values.length}`

    values.push(vendorId)
    const vendorIdParam = `$${values.length}`

    values.push(profile.organization_id)
    const organizationIdParam = `$${values.length}`

    const result = await query(
      `
      UPDATE vendor_metrics
      SET ${updates.join(", ")}
      WHERE id = ${metricIdParam}
        AND vendor_id = ${vendorIdParam}
        AND organization_id = ${organizationIdParam}
      RETURNING *
      `,
      values
    )

    if (!result.rows[0]) {
      return NextResponse.json(
        { error: "Metric not found" },
        { status: 404 }
      )
    }

    await recalculateVendorHealth(
      vendorId,
      profile.organization_id
    )

    return NextResponse.json({
      metric: result.rows[0],
    })
  } catch (error: any) {
    console.error("UPDATE VENDOR METRIC ERROR:", error)

    if (error?.code === "23505") {
      return NextResponse.json(
        {
          error:
            "A metric with this name already exists for this vendor.",
        },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: "Failed to update vendor metric" },
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
    const { id: vendorId, metricId } = await context.params

    const result = await query(
      `
      DELETE FROM vendor_metrics
      WHERE id = $1
        AND vendor_id = $2
        AND organization_id = $3
      RETURNING id
      `,
      [
        metricId,
        vendorId,
        profile.organization_id,
      ]
    )

    if (!result.rows[0]) {
      return NextResponse.json(
        { error: "Metric not found" },
        { status: 404 }
      )
    }

    await recalculateVendorHealth(
      vendorId,
      profile.organization_id
    )

    return NextResponse.json({
      success: true,
      deletedMetricId: result.rows[0].id,
    })
  } catch (error) {
    console.error("DELETE VENDOR METRIC ERROR:", error)

    return NextResponse.json(
      { error: "Failed to delete vendor metric" },
      { status: 500 }
    )
  }
}