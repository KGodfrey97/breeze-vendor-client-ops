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

    const contractsResult = await query(
      `
      SELECT
        id,
        vendor_id,
        name,
        contract_type,
        status,
        start_date,
        end_date,
        renewal_date,
        auto_renews,
        notice_period_days,
        annual_value,
        total_contract_value,
        fee_structure,
        document_key,
        document_url,
        notes,
        created_by,
        updated_by,
        created_at,
        updated_at
      FROM contracts
      WHERE vendor_id = $1
        AND organization_id = $2
      ORDER BY
        CASE
          WHEN status = 'active' THEN 1
          WHEN status = 'expiring' THEN 2
          WHEN status = 'draft' THEN 3
          WHEN status = 'expired' THEN 4
          WHEN status = 'terminated' THEN 5
          ELSE 6
        END,
        COALESCE(renewal_date, end_date) ASC NULLS LAST,
        created_at DESC
      `,
      [
        vendorId,
        profile.organization_id,
      ]
    )

    return NextResponse.json({
      contracts: contractsResult.rows,
    })
  } catch (error) {
    console.error(
      "GET VENDOR CONTRACTS ERROR:",
      error
    )

    return NextResponse.json(
      {
        error: "Failed to load vendor contracts",
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

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : ""

    const contractType =
      typeof body.contractType === "string"
        ? body.contractType.trim()
        : ""

    const status =
      typeof body.status === "string"
        ? body.status
        : "draft"

    const startDate =
      typeof body.startDate === "string" && body.startDate
        ? body.startDate
        : null

    const endDate =
      typeof body.endDate === "string" && body.endDate
        ? body.endDate
        : null

    const renewalDate =
      typeof body.renewalDate === "string" && body.renewalDate
        ? body.renewalDate
        : null

    const autoRenews =
      body.autoRenews === true

    const noticePeriodDays =
      body.noticePeriodDays === "" ||
      body.noticePeriodDays === null ||
      body.noticePeriodDays === undefined
        ? null
        : Number(body.noticePeriodDays)

    const annualValue =
      body.annualValue === "" ||
      body.annualValue === null ||
      body.annualValue === undefined
        ? null
        : Number(body.annualValue)

    const totalContractValue =
      body.totalContractValue === "" ||
      body.totalContractValue === null ||
      body.totalContractValue === undefined
        ? null
        : Number(body.totalContractValue)

    const feeStructure =
      typeof body.feeStructure === "string"
        ? body.feeStructure.trim()
        : ""

    const documentKey =
      typeof body.documentKey === "string"
        ? body.documentKey.trim()
        : ""

    const documentUrl =
      typeof body.documentUrl === "string"
        ? body.documentUrl.trim()
        : ""

    const notes =
      typeof body.notes === "string"
        ? body.notes.trim()
        : ""

    if (!name) {
      return NextResponse.json(
        { error: "Contract name is required" },
        { status: 400 }
      )
    }

    const allowedStatuses = [
      "draft",
      "active",
      "expiring",
      "expired",
      "terminated",
    ]

    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid contract status" },
        { status: 400 }
      )
    }

    if (
      noticePeriodDays !== null &&
      (
        !Number.isInteger(noticePeriodDays) ||
        noticePeriodDays < 0
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Notice period must be a whole number greater than or equal to 0",
        },
        { status: 400 }
      )
    }

    if (
      annualValue !== null &&
      (
        !Number.isFinite(annualValue) ||
        annualValue < 0
      )
    ) {
      return NextResponse.json(
        {
          error: "Annual value must be 0 or greater",
        },
        { status: 400 }
      )
    }

    if (
      totalContractValue !== null &&
      (
        !Number.isFinite(totalContractValue) ||
        totalContractValue < 0
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Total contract value must be 0 or greater",
        },
        { status: 400 }
      )
    }

    if (
      startDate &&
      endDate &&
      endDate < startDate
    ) {
      return NextResponse.json(
        {
          error:
            "End date cannot be before start date",
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
      INSERT INTO contracts (
        organization_id,
        vendor_id,
        name,
        contract_type,
        status,
        start_date,
        end_date,
        renewal_date,
        auto_renews,
        notice_period_days,
        annual_value,
        total_contract_value,
        fee_structure,
        document_key,
        document_url,
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
        $11,
        $12,
        $13,
        $14,
        $15,
        $16,
        $17,
        $17
      )
      RETURNING
        id,
        vendor_id,
        name,
        contract_type,
        status,
        start_date,
        end_date,
        renewal_date,
        auto_renews,
        notice_period_days,
        annual_value,
        total_contract_value,
        fee_structure,
        document_key,
        document_url,
        notes,
        created_by,
        updated_by,
        created_at,
        updated_at
      `,
      [
        profile.organization_id,
        vendorId,
        name,
        contractType || null,
        status,
        startDate,
        endDate,
        renewalDate,
        autoRenews,
        noticePeriodDays,
        annualValue,
        totalContractValue,
        feeStructure || null,
        documentKey || null,
        documentUrl || null,
        notes || null,
        profile.id,
      ]
    )

    return NextResponse.json(
      {
        contract: result.rows[0],
      },
      { status: 201 }
    )
  } catch (error) {
    console.error(
      "CREATE VENDOR CONTRACT ERROR:",
      error
    )

    return NextResponse.json(
      {
        error: "Failed to create vendor contract",
      },
      { status: 500 }
    )
  }
}