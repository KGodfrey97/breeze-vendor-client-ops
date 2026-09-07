import "server-only"

import { cookies } from "next/headers"
import { CognitoJwtVerifier } from "aws-jwt-verify"

import { query } from "@/lib/db"

type AuthenticatedUser = {
  id: string
  email?: string
  name?: string
}

const idVerifier = CognitoJwtVerifier.create({
  userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || process.env.COGNITO_USER_POOL_ID!,
  tokenUse: "id",
  clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || process.env.COGNITO_CLIENT_ID!,
})

export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const cookieStore = await cookies()
  const idToken = cookieStore.get("idToken")?.value

  if (!idToken) return null

  try {
    const payload = await idVerifier.verify(idToken)

    return {
      id: payload.sub,
      email: typeof payload.email === "string" ? payload.email : undefined,
      name: typeof payload.name === "string" ? payload.name : undefined,
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

export async function getAuthenticatedProfile() {
  const user = await requireAuthenticatedUser()
  const { rows } = await query(
    `SELECT id, email, full_name, role, organization, is_active, created_at, updated_at
     FROM profiles
     WHERE id = $1 AND is_active = true`,
    [user.id],
  )

  return {
    user,
    profile: rows[0] ?? null,
  }
}

export function isUnauthorizedError(error: unknown) {
  return error instanceof Error && error.name === "UnauthorizedError"
}
