import crypto from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

import { query } from "@/lib/db"
import { requireAuthenticatedProfile } from "@/lib/auth-server"

import { encryptMicrosoftToken } from "@/lib/microsoft"

const MICROSOFT_TOKEN_URL =
  "https://login.microsoftonline.com/organizations/oauth2/v2.0/token"

const MICROSOFT_GRAPH_ME_URL =
  "https://graph.microsoft.com/v1.0/me"

const MICROSOFT_SCOPES = [
  "openid",
  "profile",
  "email",
  "offline_access",
  "User.Read",
  "Calendars.ReadWrite",
]

type MicrosoftTokenResponse = {
  token_type: string
  scope: string
  expires_in: number
  access_token: string
  refresh_token?: string
  id_token?: string
}

type MicrosoftUser = {
  id: string
  displayName?: string | null
  mail?: string | null
  userPrincipalName?: string | null
}

function encryptToken(value: string) {
  const encryptionKeyBase64 =
    process.env.MICROSOFT_TOKEN_ENCRYPTION_KEY

  if (!encryptionKeyBase64) {
    throw new Error(
      "MICROSOFT_TOKEN_ENCRYPTION_KEY is not configured"
    )
  }

  const key = Buffer.from(encryptionKeyBase64, "base64")

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

  /*
   * Store:
   *
   * iv.authTag.encryptedData
   *
   * Each component is base64 encoded.
   */
  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(".")
}

function safeStateCompare(
  expectedState: string,
  returnedState: string
) {
  const expected = Buffer.from(expectedState)
  const returned = Buffer.from(returnedState)

  if (expected.length !== returned.length) {
    return false
  }

  return crypto.timingSafeEqual(expected, returned)
}

export async function GET(request: NextRequest) {
  const cookieStore = await cookies()

  try {
    /*
     * -----------------------------------------------------
     * 1. Make sure the Breeze user is still authenticated
     * -----------------------------------------------------
     */

    const { profile } = await requireAuthenticatedProfile()

    /*
     * -----------------------------------------------------
     * 2. Read Microsoft's callback parameters
     * -----------------------------------------------------
     */

    const searchParams = request.nextUrl.searchParams

    const code = searchParams.get("code")
    const returnedState = searchParams.get("state")

    const microsoftError = searchParams.get("error")
    const microsoftErrorDescription =
      searchParams.get("error_description")

    /*
     * Microsoft can redirect here with an error if the
     * user cancels consent or Microsoft rejects the request.
     */
    if (microsoftError) {
      console.error("Microsoft OAuth error:", {
        error: microsoftError,
        description: microsoftErrorDescription,
      })

      return NextResponse.redirect(
        new URL(
          `/settings?microsoft=error&reason=${encodeURIComponent(
            microsoftError
          )}`,
          request.url
        )
      )
    }

    if (!code || !returnedState) {
      console.error(
        "Microsoft callback missing code or state"
      )

      return NextResponse.redirect(
        new URL(
          "/settings?microsoft=error&reason=missing_callback_data",
          request.url
        )
      )
    }

    /*
     * -----------------------------------------------------
     * 3. Validate our OAuth state
     * -----------------------------------------------------
     */

    const storedState = cookieStore.get(
      "microsoft_oauth_state"
    )?.value

    const codeVerifier = cookieStore.get(
      "microsoft_oauth_code_verifier"
    )?.value

    if (!storedState || !codeVerifier) {
      console.error(
        "Microsoft OAuth cookies are missing or expired"
      )

      return NextResponse.redirect(
        new URL(
          "/settings?microsoft=error&reason=oauth_session_expired",
          request.url
        )
      )
    }

    if (!safeStateCompare(storedState, returnedState)) {
      console.error("Microsoft OAuth state mismatch")

      return NextResponse.redirect(
        new URL(
          "/settings?microsoft=error&reason=invalid_state",
          request.url
        )
      )
    }

    /*
     * These cookies are one-time-use.
     */
    cookieStore.delete("microsoft_oauth_state")
    cookieStore.delete(
      "microsoft_oauth_code_verifier"
    )

    /*
     * -----------------------------------------------------
     * 4. Validate environment variables
     * -----------------------------------------------------
     */

    const clientId =
      process.env.MICROSOFT_CLIENT_ID

    const clientSecret =
      process.env.MICROSOFT_CLIENT_SECRET

    const redirectUri =
      process.env.MICROSOFT_REDIRECT_URI

    if (
      !clientId ||
      !clientSecret ||
      !redirectUri
    ) {
      throw new Error(
        "Microsoft OAuth environment variables are not configured"
      )
    }

    /*
     * -----------------------------------------------------
     * 5. Exchange authorization code for tokens
     * -----------------------------------------------------
     */

    const tokenBody = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
      scope: MICROSOFT_SCOPES.join(" "),
    })

    const tokenResponse = await fetch(
      MICROSOFT_TOKEN_URL,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },
        body: tokenBody.toString(),
        cache: "no-store",
      }
    )

    if (!tokenResponse.ok) {
      const errorText =
        await tokenResponse.text()

      console.error(
        "Microsoft token exchange failed:",
        tokenResponse.status,
        errorText
      )

      throw new Error(
        "Microsoft token exchange failed"
      )
    }

    const tokens =
      (await tokenResponse.json()) as MicrosoftTokenResponse

    if (!tokens.access_token) {
      throw new Error(
        "Microsoft did not return an access token"
      )
    }

    /*
     * -----------------------------------------------------
     * 6. Retrieve the Microsoft user's identity
     * -----------------------------------------------------
     */

    const meResponse = await fetch(
      MICROSOFT_GRAPH_ME_URL,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
        cache: "no-store",
      }
    )

    if (!meResponse.ok) {
      const errorText = await meResponse.text()

      console.error(
        "Microsoft Graph /me request failed:",
        meResponse.status,
        errorText
      )

      throw new Error(
        "Unable to retrieve Microsoft user"
      )
    }

    const microsoftUser =
      (await meResponse.json()) as MicrosoftUser

    if (!microsoftUser.id) {
      throw new Error(
        "Microsoft user response did not include an ID"
      )
    }

    /*
     * mail can sometimes be null for Microsoft users,
     * so fall back to userPrincipalName.
     */
    const microsoftEmail =
      microsoftUser.mail ??
      microsoftUser.userPrincipalName ??
      null

    /*
     * -----------------------------------------------------
     * 7. Encrypt Microsoft tokens
     * -----------------------------------------------------
     */

    const encryptedAccessToken =
      encryptMicrosoftToken(tokens.access_token)

    const encryptedRefreshToken =
      tokens.refresh_token
        ? encryptMicrosoftToken(tokens.refresh_token)
        : null

    /*
     * Microsoft tells us how many seconds the access
     * token remains valid.
     */
    const tokenExpiresAt = new Date(
      Date.now() + tokens.expires_in * 1000
    )

    /*
     * -----------------------------------------------------
     * 8. Save / update the Microsoft integration
     * -----------------------------------------------------
     */

    await query(
      `
        INSERT INTO microsoft_integrations (
          organization_id,
          profile_id,
          microsoft_user_id,
          microsoft_email,
          access_token_encrypted,
          refresh_token_encrypted,
          token_expires_at,
          created_at,
          updated_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          NOW(),
          NOW()
        )

        ON CONFLICT (profile_id)

        DO UPDATE SET
          organization_id = EXCLUDED.organization_id,
          microsoft_user_id = EXCLUDED.microsoft_user_id,
          microsoft_email = EXCLUDED.microsoft_email,
          access_token_encrypted =
            EXCLUDED.access_token_encrypted,

          /*
           * Microsoft might not return a new refresh token
           * in every situation. If it doesn't, keep the
           * existing one.
           */
          refresh_token_encrypted = COALESCE(
            EXCLUDED.refresh_token_encrypted,
            microsoft_integrations.refresh_token_encrypted
          ),

          token_expires_at =
            EXCLUDED.token_expires_at,

          updated_at = NOW()
      `,
      [
        profile.organization_id,
        profile.id,
        microsoftUser.id,
        microsoftEmail,
        encryptedAccessToken,
        encryptedRefreshToken,
        tokenExpiresAt,
      ]
    )

    /*
     * -----------------------------------------------------
     * 9. Success
     * -----------------------------------------------------
     */

    console.log(
      `Microsoft account connected for profile ${profile.id}`
    )

    return NextResponse.redirect(
      new URL(
        "/settings?microsoft=connected",
        request.url
      )
    )
  } catch (error) {
    console.error(
      "Microsoft OAuth callback failed:",
      error
    )

    /*
     * Clean these up if something went wrong as well.
     */
    cookieStore.delete("microsoft_oauth_state")
    cookieStore.delete(
      "microsoft_oauth_code_verifier"
    )

    return NextResponse.redirect(
      new URL(
        "/settings?microsoft=error",
        request.url
      )
    )
  }
}