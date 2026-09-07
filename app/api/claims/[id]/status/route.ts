import { type NextRequest, NextResponse } from "next/server"

import { handleApiError } from "@/lib/api-response"
import { requireAuthenticatedUser } from "@/lib/auth-server"
import { withTransaction } from "@/lib/db"

export const runtime = "nodejs"

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuthenticatedUser()
    const { id } = await context.params
    const { status, note, followUpDate } = await request.json()

    const validStatuses = ["processing", "under_review", "overturned", "denied"]
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 })
    }

    const result = await withTransaction(async (client) => {
      const claimResult = await client.query<{ id: string; status: string; follow_up_date: string | null }>(
        `SELECT id, status, follow_up_date
         FROM claims
         WHERE id = $1 AND user_id = $2
         FOR UPDATE`,
        [id, user.id],
      )
      const claim = claimResult.rows[0]

      if (!claim) {
        return null
      }

      const previousFollowUpDate = claim.follow_up_date || null
      const nextFollowUpDate = followUpDate || null
      const statusChanged = claim.status !== status
      const followUpChanged = previousFollowUpDate !== nextFollowUpDate

      if (!statusChanged && !followUpChanged) {
        return { noChanges: true, claim, previousFollowUpDate, nextFollowUpDate }
      }

      await client.query(
        `UPDATE claims
         SET status = $1, follow_up_date = $2, updated_by = $3
         WHERE id = $4 AND user_id = $3`,
        [status, nextFollowUpDate, user.id, id],
      )

      const statusLabels: Record<string, string> = {
        processing: "Processing",
        under_review: "Under Review",
        overturned: "Overturned",
        denied: "Denied",
      }
      const timelineParts: string[] = []

      if (statusChanged) {
        timelineParts.push(`Status changed from ${statusLabels[claim.status]} to ${statusLabels[status]}`)
      }
      if (followUpChanged) {
        timelineParts.push(nextFollowUpDate ? `Follow-up date set to ${nextFollowUpDate}` : "Follow-up date cleared")
      }

      await client.query(
        `INSERT INTO claim_timeline (claim_id, event_type, event_description, created_by)
         VALUES ($1, 'status_change', $2, $3)`,
        [id, timelineParts.join(". "), user.id],
      )

      if (note?.trim()) {
        await client.query(
          `INSERT INTO claim_notes (claim_id, note, created_by)
           VALUES ($1, $2, $3)`,
          [id, note.trim(), user.id],
        )
      }

      return { noChanges: false, claim, previousFollowUpDate, nextFollowUpDate }
    })

    if (!result) {
      return NextResponse.json({ error: "Claim not found or access denied" }, { status: 404 })
    }
    if (result.noChanges) {
      return NextResponse.json({ error: "No changes provided" }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: "Claim updated",
      data: {
        claimId: id,
        oldStatus: result.claim.status,
        newStatus: status,
        previousFollowUpDate: result.previousFollowUpDate,
        followUpDate: result.nextFollowUpDate,
      },
    })
  } catch (error) {
    return handleApiError(error, "Failed to update claim status")
  }
}
