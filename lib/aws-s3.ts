import { randomUUID } from "node:crypto"

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3"

function getAwsConfig() {
  const region = process.env.AWS_REGION
  const bucket = process.env.AWS_S3_BUCKET

  if (!region) {
    throw new Error("AWS_REGION is not configured")
  }

  if (!bucket) {
    throw new Error("AWS_S3_BUCKET is not configured")
  }

  return { region, bucket }
}

function getS3Client() {
  const { region } = getAwsConfig()
  return new S3Client({ region })
}

export const CLAIM_DOCUMENT_ALLOWED_CONTENT_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
  "image/jpeg",
  "image/png",
  "image/tiff",
])

export const CLAIM_DOCUMENT_ALLOWED_EXTENSIONS = new Set([
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "txt",
  "csv",
  "jpg",
  "jpeg",
  "png",
  "tif",
  "tiff",
])

export const CLAIM_DOCUMENT_MAX_SIZE_BYTES = 25 * 1024 * 1024

export function getClaimDocumentsPrefix(claimId: string) {
  return `claims/${claimId}/`
}

export function sanitizeFileName(fileName: string) {
  return fileName
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "")
}

export function isAllowedDocument(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? ""
  return (
    CLAIM_DOCUMENT_ALLOWED_CONTENT_TYPES.has(file.type) ||
    CLAIM_DOCUMENT_ALLOWED_EXTENSIONS.has(extension)
  )
}

export async function ensureClaimDocumentFolder(claimId: string) {
  const { bucket } = getAwsConfig()

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: getClaimDocumentsPrefix(claimId),
      Body: "",
      ContentType: "application/x-directory",
    }),
  )
}

export function buildClaimDocumentKey(claimId: string, fileName: string) {
  const safeName = sanitizeFileName(fileName) || `document-${randomUUID()}`
  return `${getClaimDocumentsPrefix(claimId)}${Date.now()}-${randomUUID()}-${safeName}`
}

export async function uploadClaimDocumentToS3(params: {
  claimId: string
  fileName: string
  body: Buffer
  contentType?: string | null
}) {
  const { bucket } = getAwsConfig()
  const s3Key = buildClaimDocumentKey(params.claimId, params.fileName)

  await ensureClaimDocumentFolder(params.claimId)
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: s3Key,
      Body: params.body,
      ContentType: params.contentType || undefined,
    }),
  )

  return { s3Key }
}

export async function getClaimDocumentObject(s3Key: string) {
  const { bucket } = getAwsConfig()

  return getS3Client().send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: s3Key,
    }),
  )
}

export async function deleteClaimDocumentFromS3(s3Key: string) {
  const { bucket } = getAwsConfig()

  await getS3Client().send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: s3Key,
    }),
  )
}
