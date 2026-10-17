
import "server-only"

import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3"

import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

export const VENDOR_REPORT_MAX_FILE_SIZE =
  20 * 1024 * 1024 // 20 MB

export const VENDOR_REPORT_ALLOWED_TYPES = {
  ".xlsx":
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".csv": "text/csv",
  ".pdf": "application/pdf",
} as const

function getBucket(): string {
  const bucket = process.env.AWS_S3_VENDOR_REPORTS_BUCKET

  if (!bucket) {
    throw new Error(
      "AWS_S3_VENDOR_REPORTS_BUCKET is not configured"
    )
  }

  return bucket
}

function getRegion(): string {
  const region = process.env.AWS_REGION

  if (!region) {
    throw new Error("AWS_REGION is not configured")
  }

  return region
}

// Uses the AWS SDK default credential provider chain.
// Locally: AWS environment variables or AWS profile.
// On Vercel: we'll configure temporary OIDC credentials.
export const s3 = new S3Client({
  region: getRegion(),
})

export function getVendorReportBucket() {
  return getBucket()
}

export function getVendorReportFileType(
  filename: string
): string | null {
  const extension = filename
    .toLowerCase()
    .match(/\.[^.]+$/)?.[0]

  if (!extension) return null

  return (
    VENDOR_REPORT_ALLOWED_TYPES[
      extension as keyof typeof VENDOR_REPORT_ALLOWED_TYPES
    ] ?? null
  )
}

export function generateVendorReportKey(params: {
  organizationId: string
  vendorId: string
  reportId: string
  filename: string
}): string {
  const { organizationId, vendorId, reportId, filename } =
    params

  const extension =
    filename.toLowerCase().match(/\.[^.]+$/)?.[0] ?? ""

  return [
    "organizations",
    organizationId,
    "vendors",
    vendorId,
    "reports",
    reportId,
    `original${extension}`,
  ].join("/")
}

export async function createVendorReportUploadUrl(
  key: string,
  contentType: string
) {
  const command = new PutObjectCommand({
    Bucket: getBucket(),
    Key: key,
    ContentType: contentType,
  })

  return getSignedUrl(s3, command, {
    expiresIn: 300,
    signableHeaders: new Set(["content-type"]),
  })
}

export async function getVendorReportMetadata(key: string) {
  return s3.send(
    new HeadObjectCommand({
      Bucket: getBucket(),
      Key: key,
    })
  )
}

export async function createVendorReportDownloadUrl(
  key: string
) {
  const command = new GetObjectCommand({
    Bucket: getBucket(),
    Key: key,
  })

  return getSignedUrl(s3, command, {
    expiresIn: 60,
  })
}
