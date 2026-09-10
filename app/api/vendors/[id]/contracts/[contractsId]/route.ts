import { NextResponse } from "next/server"

import { query } from "@/lib/db"
import { requireAuthenticatedProfile } from "@/lib/auth-server"

type RouteContext = {
  params: Promise<{
    id: string
    contractId: string
  }>
}

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    const { profile } = await requireAuthenticatedProfile()
    const { id: vendorId, contractId } = await context.params
    const body = await request.json()

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : undefined

    const contractType =
      typeof body.contractType === "string"
        ? body.contractType.trim()
        : body.contractType === null
        ? null
        : undefined

    const status =
      typeof body.status === "string"
        ? body.status
        : undefined

    const startDate =
      typeof body.startDate === "string"
        ? body.startDate || null
        : body.startDate === null
        ? null
        : undefined

    const endDate =
      typeof body.endDate === "string"
        ? body.endDate || null
        : body.endDate === null
        ? null
        : undefined

    const renewalDate =
      typeof body.renewalDate === "string"
        ? body.renewalDate || null
        : body.renewalDate === null
        ? null
        : undefined

    const autoRenews =
      typeof body.autoRenews === "boolean"
        ? body.autoRenews
        : undefined

    const noticePeriodDays =
      body.noticePeriodDays === null
        ? null
        : body.noticePeriodDays !== undefined
        ? Number(body.noticePeriodDays)
        : undefined

    const annualValue =
      body.annualValue === null
        ? null
        : body.annualValue !== undefined
        ? Number(body.annualValue)
        : undefined

    const totalContractValue =
      body.totalContractValue === null
        ? null
        : body.totalContractValue !== undefined
        ? Number(body.totalContractValue)
        : undefined

    const feeStructure =
      typeof body.feeStructure === "string"
        ? body.feeStructure.trim()
        : body.feeStructure === null
        ? null
        : undefined

    const documentKey =
      typeof body.documentKey === "string"
        ? body.documentKey.trim()
        : body.documentKey === null
        ? null
        : undefined

    const documentUrl =
      typeof body.documentUrl === "string"
        ? body.documentUrl.trim()
        : body.documentUrl === null
        ? null
        : undefined

    const notes =
      typeof body.notes === "string"
        ? body.notes.trim()
        : body.notes === null
        ? null
        : undefined

    const allowedStatuses = [
      "draft",
      "active",
      "expiring",
      "expired",
      "terminated",
    ]

    if (
      status !== undefined &&
      !allowedStatuses.includes(status)
    ) {
      return NextResponse.json(
        { error: "Invalid contract status" },
        { status: 400 }
      )
    }

    if (
      noticePeriodDays !== undefined &&
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
      annualValue !== undefined &&
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
      totalContractValue !== undefined &&
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

    const existingResult = await query(
      `
      SELECT
        id,
        start_date,
        end_date
      FROM contracts
      WHERE id = $1
        AND vendor_id = $2
        AND organization_id = $3
      LIMIT 1
      `,
      [
        contractId,
        vendorId,
        profile.organization_id,
      ]
    )

    const existing = existingResult.rows[0]

    if (!existing) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      )
    }

    const effectiveStartDate =
      startDate !== undefined
        ? startDate
        : existing.start_date

    const effectiveEndDate =
      endDate !== undefined
        ? endDate
        : existing.end_date

    if (
      effectiveStartDate &&
      effectiveEndDate &&
      String(effectiveEndDate).slice(0, 10) <
        String(effectiveStartDate).slice(0, 10)
    ) {
      return NextResponse.json(
        {
          error:
            "End date cannot be before start date",
        },
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
      updates.push(
        `${column} = $${values.length}`
      )
    }

    if (name !== undefined) {
      if (!name) {
        return NextResponse.json(
          {
            error: "Contract name is required",
          },
          { status: 400 }
        )
      }

      addUpdate("name", name)
    }

    if (contractType !== undefined) {
      addUpdate(
        "contract_type",
        contractType || null
      )
    }

    if (status !== undefined) {
      addUpdate("status", status)
    }

    if (startDate !== undefined) {
      addUpdate("start_date", startDate)
    }

    if (endDate !== undefined) {
      addUpdate("end_date", endDate)
    }

    if (renewalDate !== undefined) {
      addUpdate("renewal_date", renewalDate)
    }

    if (autoRenews !== undefined) {
      addUpdate("auto_renews", autoRenews)
    }

    if (noticePeriodDays !== undefined) {
      addUpdate(
        "notice_period_days",
        noticePeriodDays
      )
    }

    if (annualValue !== undefined) {
      addUpdate(
        "annual_value",
        annualValue
      )
    }

    if (totalContractValue !== undefined) {
      addUpdate(
        "total_contract_value",
        totalContractValue
      )
    }

    if (feeStructure !== undefined) {
      addUpdate(
        "fee_structure",
        feeStructure || null
      )
    }

    if (documentKey !== undefined) {
      addUpdate(
        "document_key",
        documentKey || null
      )
    }

    if (documentUrl !== undefined) {
      addUpdate(
        "document_url",
        documentUrl || null
      )
    }

    if (notes !== undefined) {
      addUpdate(
        "notes",
        notes || null
      )
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      )
    }

    addUpdate(
      "updated_by",
      profile.id
    )

    values.push(contractId)
    const contractIdParam =
      `$${values.length}`

    values.push(vendorId)
    const vendorIdParam =
      `$${values.length}`

    values.push(profile.organization_id)
    const organizationIdParam =
      `$${values.length}`

    const result = await query(
      `
      UPDATE contracts
      SET
        ${updates.join(", ")}
      WHERE id = ${contractIdParam}
        AND vendor_id = ${vendorIdParam}
        AND organization_id = ${organizationIdParam}
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
      values
    )

    return NextResponse.json({
      contract: result.rows[0],
    })
  } catch (error) {
    console.error(
      "UPDATE VENDOR CONTRACT ERROR:",
      error
    )

    return NextResponse.json(
      {
        error: "Failed to update vendor contract",
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
    const { id: vendorId, contractId } = await context.params

    const result = await query(
      `
      DELETE FROM contracts
      WHERE id = $1
        AND vendor_id = $2
        AND organization_id = $3
      RETURNING id
      `,
      [
        contractId,
        vendorId,
        profile.organization_id,
      ]
    )

    const deletedContract = result.rows[0]

    if (!deletedContract) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      deletedContractId:
        deletedContract.id,
    })
  } catch (error) {
    console.error(
      "DELETE VENDOR CONTRACT ERROR:",
      error
    )

    return NextResponse.json(
      {
        error: "Failed to delete vendor contract",
      },
      { status: 500 }
    )
  }
}