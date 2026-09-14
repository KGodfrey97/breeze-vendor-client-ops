import { NextResponse } from "next/server"

import { query } from "@/lib/db"
import { requireAuthenticatedProfile } from "@/lib/auth-server"

import { recalculateVendorHealth } from "@/lib/vendor-health"

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
      [vendorId, profile.organization_id]
    )

    if (!vendorResult.rows[0]) {
      return NextResponse.json(
        { error: "Vendor not found" },
        { status: 404 }
      )
    }

    const result = await query(
      `
      SELECT
        vm.id,
        vm.vendor_id,
        vm.name,
        vm.description,
        vm.metric_type,
        vm.unit,
        vm.comparison_operator,
        vm.target_value,
        vm.weight,
        vm.reporting_frequency,
        vm.is_active,
        vm.notes,
        vm.created_at,
        vm.updated_at,

        latest.actual_value AS latest_actual_value,
        latest.status AS latest_status,
        latest.period_start AS latest_period_start,
        latest.period_end AS latest_period_end

      FROM vendor_metrics vm

      LEFT JOIN LATERAL (
        SELECT
          r.actual_value,
          r.status,
          r.period_start,
          r.period_end
        FROM vendor_metric_results r
        WHERE r.metric_id = vm.id
          AND r.vendor_id = vm.vendor_id
          AND r.organization_id = vm.organization_id
        ORDER BY r.period_end DESC, r.created_at DESC
        LIMIT 1
      ) latest ON TRUE

      WHERE vm.vendor_id = $1
        AND vm.organization_id = $2

      ORDER BY
        vm.is_active DESC,
        vm.metric_type ASC,
        vm.name ASC
      `,
      [vendorId, profile.organization_id]
    )

    return NextResponse.json({
      metrics: result.rows,
    })
  } catch (error) {
    console.error("GET VENDOR METRICS ERROR:", error)

    return NextResponse.json(
      { error: "Failed to load vendor metrics" },
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

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : ""

    const description =
      typeof body.description === "string"
        ? body.description.trim()
        : ""

    const metricType =
      typeof body.metricType === "string"
        ? body.metricType
        : ""

    const unit =
      typeof body.unit === "string"
        ? body.unit.trim()
        : ""

    const comparisonOperator =
      typeof body.comparisonOperator === "string"
        ? body.comparisonOperator
        : ""

    const targetValue =
      body.targetValue !== undefined &&
      body.targetValue !== null &&
      body.targetValue !== ""
        ? Number(body.targetValue)
        : null

    const weight =
      body.weight !== undefined &&
      body.weight !== null &&
      body.weight !== ""
        ? Number(body.weight)
        : 1

    const reportingFrequency =
      typeof body.reportingFrequency === "string"
        ? body.reportingFrequency
        : "monthly"

    const notes =
      typeof body.notes === "string"
        ? body.notes.trim()
        : ""

    if (!name) {
      return NextResponse.json(
        { error: "Metric name is required" },
        { status: 400 }
      )
    }

    if (!["kpi", "sla"].includes(metricType)) {
      return NextResponse.json(
        { error: "Invalid metric type" },
        { status: 400 }
      )
    }

    if (!unit) {
      return NextResponse.json(
        { error: "Metric unit is required" },
        { status: 400 }
      )
    }

    if (
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
      targetValue === null ||
      !Number.isFinite(targetValue)
    ) {
      return NextResponse.json(
        { error: "Valid target value is required" },
        { status: 400 }
      )
    }

    if (
      !Number.isFinite(weight) ||
      weight < 0
    ) {
      return NextResponse.json(
        { error: "Weight must be 0 or greater" },
        { status: 400 }
      )
    }

    if (
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

    const vendorResult = await query(
      `
      SELECT id
      FROM vendors
      WHERE id = $1
        AND organization_id = $2
      LIMIT 1
      `,
      [vendorId, profile.organization_id]
    )

    if (!vendorResult.rows[0]) {
      return NextResponse.json(
        { error: "Vendor not found" },
        { status: 404 }
      )
    }

    const result = await query(
      `
      INSERT INTO vendor_metrics (
        organization_id,
        vendor_id,
        name,
        description,
        metric_type,
        unit,
        comparison_operator,
        target_value,
        weight,
        reporting_frequency,
        is_active,
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
        TRUE,
        $11,
        $12,
        $12
      )
      RETURNING *
      `,
      [
        profile.organization_id,
        vendorId,
        name,
        description || null,
        metricType,
        unit,
        comparisonOperator,
        targetValue,
        weight,
        reportingFrequency,
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
        metric: result.rows[0],
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error("CREATE VENDOR METRIC ERROR:", error)

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
      { error: "Failed to create vendor metric" },
      { status: 500 }
    )
  }
}