import { NextRequest, NextResponse } from "next/server"

import {
  CLAIM_DOCUMENT_MAX_SIZE_BYTES,
  deleteClaimDocumentFromS3,
  isAllowedDocument,
  uploadClaimDocumentToS3,
} from "@/lib/aws-s3"
import { handleApiError } from "@/lib/api-response"
import { requireAuthenticatedUser } from "@/lib/auth-server"
import { query, withTransaction } from "@/lib/db"

export const runtime = "nodejs"

async function ensureClaim(userId: string, claimId: string) {
  const claim = await query(`SELECT id FROM claims WHERE id = $1 AND user_id = $2`, [claimId, userId])
  return Boolean(claim.rows[0])
}

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuthenticatedUser()
    const { id } = await context.params
    if (!(await ensureClaim(user.id, id))) {
      return NextResponse.json({ error: "Claim not found or access denied" }, { status: 404 })
    }

    const { rows } = await query(
      `SELECT * FROM claim_documents WHERE claim_id = $1 ORDER BY uploaded_at DESC`,
      [id],
    )
    return NextResponse.json({ success: true, data: rows })
  } catch (error) {
    return handleApiError(error, "Failed to fetch claim documents")
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const uploadedS3Keys: string[] = []

  try {
    const user = await requireAuthenticatedUser()
    const { id } = await context.params
    if (!(await ensureClaim(user.id, id))) {
      return NextResponse.json({ error: "Claim not found or access denied" }, { status: 404 })
    }

    const formData = await request.formData()
    const files = formData
      .getAll("files")
      .filter((value): value is File => value instanceof File && value.size > 0)

    const maybeSingleFile = formData.get("file")
    if (files.length === 0 && maybeSingleFile instanceof File && maybeSingleFile.size > 0) {
      files.push(maybeSingleFile)
    }

    if (files.length === 0) {
      return NextResponse.json({ error: "At least one file is required" }, { status: 400 })
    }

    for (const file of files) {
      if (!isAllowedDocument(file)) {
        return NextResponse.json({ error: `Unsupported file type for ${file.name}` }, { status: 400 })
      }
      if (file.size > CLAIM_DOCUMENT_MAX_SIZE_BYTES) {
        return NextResponse.json({ error: `${file.name} exceeds the 25 MB size limit` }, { status: 400 })
      }
    }

    const uploadedDocuments = []
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer())
      const { s3Key } = await uploadClaimDocumentToS3({
        claimId: id,
        fileName: file.name,
        body: buffer,
        contentType: file.type || null,
      })
      uploadedS3Keys.push(s3Key)
      uploadedDocuments.push({
        fileName: file.name,
        s3Key,
        contentType: file.type || null,
        size: file.size,
      })
    }

    const createdDocuments = await withTransaction(async (client) => {
      const documents = []
      for (const document of uploadedDocuments) {
        const { rows } = await client.query(
          `INSERT INTO claim_documents (claim_id, file_name, content_type, size, s3_key, uploaded_by)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [id, document.fileName, document.contentType, document.size, document.s3Key, user.id],
        )
        documents.push(rows[0])
      }

      const timelineDescription =
        documents.length === 1
          ? `Uploaded document "${documents[0].file_name}"`
          : `Uploaded ${documents.length} documents`

      await client.query(
        `INSERT INTO claim_timeline (claim_id, event_type, event_description, created_by)
         VALUES ($1, 'documents_uploaded', $2, $3)`,
        [id, timelineDescription, user.id],
      )

      return documents
    })

    return NextResponse.json({
      success: true,
      data: createdDocuments,
      message:
        createdDocuments.length === 1
          ? "Document uploaded successfully"
          : `${createdDocuments.length} documents uploaded successfully`,
    })
  } catch (error) {
    await Promise.all(uploadedS3Keys.map((key) => deleteClaimDocumentFromS3(key).catch(() => undefined)))
    return handleApiError(error, "Failed to upload claim documents")
  }
}
