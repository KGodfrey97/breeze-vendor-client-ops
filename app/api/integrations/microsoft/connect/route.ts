import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import crypto from "crypto"

import { requireAuthenticatedProfile } from "@/lib/auth-server"

const MICROSOFT_AUTHORIZE_URL =
  "https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize"

const MICROSOFT_SCOPES = [
  "openid",
  "profile",
  "email",
  "offline_access",
  "User.Read",
  "Calendars.ReadWrite",
]

function base64UrlEncode(buffer: Buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

function createCodeVerifier() {
  return base64UrlEncode(crypto.randomBytes(32))
}

function createCodeChallenge(codeVerifier: string) {
  return base64UrlEncode(
    crypto.createHash("sha256").update(codeVerifier).digest()
  )
}

export async function GET() {
  try {
    // Make sure the user is authenticated in Breeze first.
    //
    // If your helper has a slightly different function signature,
    // only this line should need to change.
    await requireAuthenticatedProfile()

    const clientId = process.env.MICROSOFT_CLIENT_ID
    const redirectUri = process.env.MICROSOFT_REDIRECT_URI

    if (!clientId) {
      console.error("MICROSOFT_CLIENT_ID is not configured")

      return NextResponse.json(
        { error: "Microsoft integration is not configured" },
        { status: 500 }
      )
    }

    if (!redirectUri) {
      console.error("MICROSOFT_REDIRECT_URI is not configured")

      return NextResponse.json(
        { error: "Microsoft redirect URI is not configured" },
        { status: 500 }
      )
    }

    /*
     * STATE
     *
     * Microsoft sends this value back to our callback.
     * We'll compare it against the cookie before accepting the response.
     */
    const state = base64UrlEncode(crypto.randomBytes(32))

    /*
     * PKCE
     *
     * codeVerifier stays on our server via an httpOnly cookie.
     * codeChallenge is sent to Microsoft.
     */
    const codeVerifier = createCodeVerifier()
    const codeChallenge = createCodeChallenge(codeVerifier)

    const cookieStore = await cookies()

    /*
     * These are temporary cookies used only during the OAuth handshake.
     * The callback route will delete them after validation.
     */
    cookieStore.set("microsoft_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 10 * 60, // 10 minutes
    })

    cookieStore.set("microsoft_oauth_code_verifier", codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 10 * 60, // 10 minutes
    })

    /*
     * Build Microsoft authorization URL.
     */
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      redirect_uri: redirectUri,
      response_mode: "query",

      scope: MICROSOFT_SCOPES.join(" "),

      state,

      code_challenge: codeChallenge,
      code_challenge_method: "S256",

      /*
       * Makes Microsoft show the account picker.
       *
       * This is useful because a user may already be signed into a
       * personal Microsoft account in their browser but want to connect
       * their work Microsoft 365 account to Breeze.
       */
      prompt: "select_account",
    })

    const authorizationUrl =
      `${MICROSOFT_AUTHORIZE_URL}?${params.toString()}`

    return NextResponse.redirect(authorizationUrl)
  } catch (error) {
    console.error("Failed to start Microsoft OAuth flow:", error)

    /*
     * If requireAuthenticatedProfile throws for unauthenticated users,
     * you may prefer redirecting them to /login instead.
     */
    return NextResponse.json(
      { error: "Unable to connect Microsoft account" },
      { status: 401 }
    )
  }
}