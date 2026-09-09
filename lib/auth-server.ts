import "server-only"

import { cookies } from "next/headers"
import { CognitoJwtVerifier } from "aws-jwt-verify"

import { query } from "@/lib/db"

type AuthenticatedUser = {
  id: string
  email?: string
  name?: string
}

type AuthenticatedProfile = {
  id: string
  cognito_sub: string
  email: string
  full_name: string | null
  role: string
  organization_id: string
  organization_name: string
  is_active: boolean
  created_at: string
  updated_at: string
}

const idVerifier = CognitoJwtVerifier.create({
  userPoolId:
    process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID ||
    process.env.COGNITO_USER_POOL_ID!,
  tokenUse: "id",
  clientId:
    process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ||
    process.env.COGNITO_CLIENT_ID!,
})

export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const cookieStore = await cookies()
  const idToken = cookieStore.get("idToken")?.value

  if (!idToken) return null

  try {
    const payload = await idVerifier.verify(idToken)

    return {
      id: payload.sub,
      email:
        typeof payload.email === "string"
          ? payload.email
          : undefined,
      name:
        typeof payload.name === "string"
          ? payload.name
          : undefined,
    }
  } catch {
    return null
  }
}

export async function requireAuthenticatedUser() {
  const user = await getAuthenticatedUser()

  if (!user) {
    const error = new Error("Authentication required")
    error.name = "UnauthorizedError"
    throw error
  }

  return user
}

export async function getAuthenticatedProfile(): Promise<{
  user: AuthenticatedUser
  profile: AuthenticatedProfile | null
}> {
  const user = await requireAuthenticatedUser()

  const { rows } = await query(
    `
    SELECT
      p.id,
      p.cognito_sub,
      p.email,
      p.full_name,
      p.role,
      p.organization_id,
      p.is_active,
      p.created_at,
      p.updated_at,
      o.name AS organization_name
    FROM profiles p
    JOIN organizations o
      ON o.id = p.organization_id
    WHERE p.cognito_sub = $1
      AND p.is_active = TRUE
    LIMIT 1
    `,
    [user.id]
  )

  return {
    user,
    profile: rows[0] ?? null,
  }
}

export async function requireAuthenticatedProfile() {
  const { user, profile } = await getAuthenticatedProfile()

  if (!profile) {
    const error = new Error("Authenticated profile required")
    error.name = "UnauthorizedError"
    throw error
  }

  return {
    user,
    profile,
  }
}

export function isUnauthorizedError(error: unknown) {
  return (
    error instanceof Error &&
    error.name === "UnauthorizedError"
  )
}