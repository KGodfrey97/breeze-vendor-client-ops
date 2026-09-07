import { Readable } from "node:stream"

import { NextRequest, NextResponse } from "next/server"

import { deleteClaimDocumentFromS3, getClaimDocumentObject } from "@/lib/aws-s3"
import { handleApiError } from "@/lib/api-response"
import { requireAuthenticatedUser } from "@/lib/auth-server"
import { query, withTransaction } from "@/lib/db"

export const runtime = "nodejs"

function toWebStream(body: unknown) {
  if (body instanceof Readable) {
    return Readable.toWeb(body) as ReadableStream
  }

  if (
    typeof body === "object" &&
    body !== null &&
    "transformToWebStream" in body &&
    typeof body.transformToWebStream === "function"
  ) {
    return body.transformToWebStream() as ReadableStream
  }

  throw new Error("Unsupported S3 response body type")
}

async function getAuthorizedDocument(userId: string, claimId: string, documentId: string) {
  const { rows } = await query(
    `SELECT d.*
     FROM claim_documents d
     INNER JOIN claims c ON c.id = d.claim_id
     WHERE c.id = $1 AND c.user_id = $2 AND d.id = $3`,
    [claimId, userId, documentId],
  )
  return rows[0] ?? null
}

export async function GET(request: NextRequest, context: { params: { id: string; documentId: string } }) {
  try {
    const user = await requireAuthenticatedUser()
    const { id, documentId } = context.params
    const document = await getAuthorizedDocument(user.id, id, documentId)

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    const s3Object = await getClaimDocumentObject(document.s3_key)
    if (!s3Object.Body) {
      return NextResponse.json({ error: "Document file not found" }, { status: 404 })
    }

    const disposition = request.nextUrl.searchParams.get("download") === "true" ? "attachment" : "inline"

    return new NextResponse(toWebStream(s3Object.Body), {
      headers: {
        "Content-Type": document.content_type || "application/octet-stream",
        ...(document.size ? { "Content-Length": String(document.size) } : {}),
        "Content-Disposition": `${disposition}; filename="${encodeURIComponent(document.file_name)}"`,
        "Cache-Control": "private, no-store",
      },
    })
  } catch (error) {
    return handleApiError(error, "Failed to fetch claim document")
  }
}

export async function DELETE(_request: NextRequest, context: { params: { id: string; documentId: string } }) {
  try {
    const user = await requireAuthenticatedUser()
    const { id, documentId } = context.params
    const document = await getAuthorizedDocument(user.id, id, documentId)

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    await deleteClaimDocumentFromS3(document.s3_key)

    await withTransaction(async (client) => {
      await client.query(`DELETE FROM claim_documents WHERE id = $1 AND claim_id = $2`, [documentId, id])
      await client.query(
        `INSERT INTO claim_timeline (claim_id, event_type, event_description, created_by)
         VALUES ($1, 'document_deleted', $2, $3)`,
        [id, `Deleted document "${document.file_name}"`, user.id],
      )
    })

    return NextResponse.json({ success: true, message: "Document deleted successfully" })
  } catch (error) {
    return handleApiError(error, "Failed to delete claim document")
  }
}
