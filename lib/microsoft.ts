import "server-only"

import crypto from "crypto"

import { query } from "@/lib/db"

const MICROSOFT_TOKEN_URL =
  "https://login.microsoftonline.com/organizations/oauth2/v2.0/token"

const MICROSOFT_SCOPES = [
  "openid",
  "profile",
  "email",
  "offline_access",
  "User.Read",
  "Calendars.ReadWrite",
]

type MicrosoftIntegrationRow = {
  id: string
  profile_id: string
  access_token_encrypted: string | null
  refresh_token_encrypted: string | null
  token_expires_at: string | Date | null
}

type MicrosoftRefreshResponse = {
  token_type: string
  scope?: string
  expires_in: number
  access_token: string
  refresh_token?: string
  id_token?: string
}

/**
 * Encrypt a Microsoft token using AES-256-GCM.
 *
 * Stored format:
 * iv.authTag.encryptedData
 *
 * Each portion is base64 encoded.
 */
export function encryptMicrosoftToken(value: string) {
  const encryptionKeyBase64 =
    process.env.MICROSOFT_TOKEN_ENCRYPTION_KEY

  if (!encryptionKeyBase64) {
    throw new Error(
      "MICROSOFT_TOKEN_ENCRYPTION_KEY is not configured"
    )
  }

  const key = Buffer.from(
    encryptionKeyBase64,
    "base64"
  )

  if (key.length !== 32) {
    throw new Error(
      "MICROSOFT_TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes"
    )
  }

  const iv = crypto.randomBytes(12)

  const cipher = crypto.createCipheriv(
    "aes-256-gcm",
    key,
    iv
  )

  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ])

  const authTag = cipher.getAuthTag()

  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(".")
}

/**
 * Decrypt a Microsoft access or refresh token.
 */
export function decryptMicrosoftToken(
  encryptedValue: string
) {
  const encryptionKeyBase64 =
    process.env.MICROSOFT_TOKEN_ENCRYPTION_KEY

  if (!encryptionKeyBase64) {
    throw new Error(
      "MICROSOFT_TOKEN_ENCRYPTION_KEY is not configured"
    )
  }

  const key = Buffer.from(
    encryptionKeyBase64,
    "base64"
  )

  if (key.length !== 32) {
    throw new Error(
      "MICROSOFT_TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes"
    )
  }

  const parts = encryptedValue.split(".")

  if (parts.length !== 3) {
    throw new Error(
      "Invalid encrypted Microsoft token format"
    )
  }

  const [
    ivBase64,
    authTagBase64,
    encryptedBase64,
  ] = parts

  const iv = Buffer.from(ivBase64, "base64")
  const authTag = Buffer.from(
    authTagBase64,
    "base64"
  )
  const encrypted = Buffer.from(
    encryptedBase64,
    "base64"
  )

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    iv
  )

  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ])

  return decrypted.toString("utf8")
}

/**
 * Refresh an expired Microsoft access token.
 */
async function refreshMicrosoftAccessToken(
  integration: MicrosoftIntegrationRow
) {
  const clientId =
    process.env.MICROSOFT_CLIENT_ID

  const clientSecret =
    process.env.MICROSOFT_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error(
      "Microsoft OAuth environment variables are not configured"
    )
  }

  if (!integration.refresh_token_encrypted) {
    throw new Error(
      "Microsoft refresh token is unavailable. The account must be reconnected."
    )
  }

  const refreshToken =
    decryptMicrosoftToken(
      integration.refresh_token_encrypted
    )

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    scope: MICROSOFT_SCOPES.join(" "),
  })

  const response = await fetch(
    MICROSOFT_TOKEN_URL,
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
      body: body.toString(),
      cache: "no-store",
    }
  )

  if (!response.ok) {
    const errorText =
      await response.text()

    console.error(
      "Microsoft token refresh failed:",
      response.status,
      errorText
    )

    throw new Error(
      "Unable to refresh Microsoft access token"
    )
  }

  const tokens =
    (await response.json()) as MicrosoftRefreshResponse

  if (!tokens.access_token) {
    throw new Error(
      "Microsoft did not return a new access token"
    )
  }

  const encryptedAccessToken =
    encryptMicrosoftToken(
      tokens.access_token
    )

  /*
   * Microsoft can rotate refresh tokens.
   *
   * If a new one is returned, always store it.
   * Otherwise keep the existing refresh token.
   */
  const encryptedRefreshToken =
    tokens.refresh_token
      ? encryptMicrosoftToken(
          tokens.refresh_token
        )
      : integration.refresh_token_encrypted

  const tokenExpiresAt = new Date(
    Date.now() + tokens.expires_in * 1000
  )

  await query(
    `
      UPDATE microsoft_integrations
      SET
        access_token_encrypted = $1,
        refresh_token_encrypted = $2,
        token_expires_at = $3,
        updated_at = NOW()
      WHERE id = $4
    `,
    [
      encryptedAccessToken,
      encryptedRefreshToken,
      tokenExpiresAt,
      integration.id,
    ]
  )

  return tokens.access_token
}

/**
 * Get a valid Microsoft access token for a Breeze profile.
 *
 * If the stored token is still valid, it is returned.
 * If it is about to expire, it is refreshed automatically.
 */
export async function getMicrosoftAccessToken(
  profileId: string
) {
  const { rows } = await query(
    `
      SELECT
        id,
        profile_id,
        access_token_encrypted,
        refresh_token_encrypted,
        token_expires_at
      FROM microsoft_integrations
      WHERE profile_id = $1
      LIMIT 1
    `,
    [profileId]
  )

  const integration =
    rows[0] as MicrosoftIntegrationRow | undefined

  if (!integration) {
    throw new Error(
      "Microsoft account is not connected"
    )
  }

  if (!integration.access_token_encrypted) {
    throw new Error(
      "Microsoft access token is unavailable"
    )
  }

  /*
   * Refresh a little before actual expiration.
   *
   * This avoids a token expiring between retrieving it
   * and making the Microsoft Graph request.
   */
  const REFRESH_BUFFER_MS =
    5 * 60 * 1000

  const expiresAt =
    integration.token_expires_at
      ? new Date(
          integration.token_expires_at
        ).getTime()
      : 0

  const tokenIsStillValid =
    expiresAt >
    Date.now() + REFRESH_BUFFER_MS

  if (tokenIsStillValid) {
    return decryptMicrosoftToken(
      integration.access_token_encrypted
    )
  }

  return refreshMicrosoftAccessToken(
    integration
  )
}