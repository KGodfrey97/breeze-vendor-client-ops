import "server-only"

import { KMSClient, EncryptCommand, DecryptCommand } from "@aws-sdk/client-kms"

const kmsClient = new KMSClient({
  region: process.env.AWS_REGION || process.env.NEXT_PUBLIC_AWS_REGION,
})

export async function encryptSsn(ssn: string | null | undefined) {
  const normalized = ssn?.trim()
  if (!normalized) return null

  const keyId = process.env.AWS_KMS_KEY_ID || process.env.KMS_KEY_ID
  if (!keyId) {
    throw new Error("KMS key ID is not configured")
  }

  const result = await kmsClient.send(
    new EncryptCommand({
      KeyId: keyId,
      Plaintext: Buffer.from(normalized, "utf8"),
    }),
  )

  if (!result.CiphertextBlob) {
    throw new Error("KMS did not return ciphertext")
  }

  return Buffer.from(result.CiphertextBlob).toString("base64")
}

export async function decryptSsn(ciphertext: string | null | undefined) {
  if (!ciphertext) return null

  const result = await kmsClient.send(
    new DecryptCommand({
      CiphertextBlob: Buffer.from(ciphertext, "base64"),
    }),
  )

  if (!result.Plaintext) {
    throw new Error("KMS did not return plaintext")
  }

  return Buffer.from(result.Plaintext).toString("utf8")
}