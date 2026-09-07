import { NextResponse } from "next/server"

import { ensureClaimDocumentFolder, getClaimDocumentsPrefix } from "@/lib/aws-s3"
import { handleApiError } from "@/lib/api-response"
import { requireAuthenticatedUser } from "@/lib/auth-server"
import { query } from "@/lib/db"

export const runtime = "nodejs"

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuthenticatedUser()
    const { id } = await context.params
    const claim = await query(`SELECT id FROM claims WHERE id = $1 AND user_id = $2`, [id, user.id])

    if (!claim.rows[0]) {
      return NextResponse.json({ error: "Claim not found or access denied" }, { status: 404 })
    }

    await ensureClaimDocumentFolder(id)

    return NextResponse.json({
      success: true,
      data: {
        claimId: id,
        prefix: getClaimDocumentsPrefix(id),
      },
      message: "Claim document folder initialized successfully",
    })
  } catch (error) {
    return handleApiError(error, "Failed to initialize claim document folder")
  }
}
