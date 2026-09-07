import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { query } from "@/lib/db"
import { CognitoJwtVerifier } from "aws-jwt-verify"

const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID!,
  tokenUse: "id",
  clientId: process.env.COGNITO_CLIENT_ID!,
})

export async function GET() {
  const cookieStore = await cookies()
  const idToken = cookieStore.get("idToken")?.value

  if (!idToken) {
    return NextResponse.json({ user: null })
  }

  try {
    const payload = await verifier.verify(idToken)

    const cognitoSub = payload.sub
    const email =
      typeof payload.email === "string"
        ? payload.email
        : null

    const fullName =
      typeof payload.name === "string"
        ? payload.name
        : email

    if (!email) {
      console.error("Cognito token does not contain an email")
      return NextResponse.json(
        { user: null },
        { status: 401 }
      )
    }

    // -----------------------------------------------------
    // 1. Find profile using Cognito sub
    // -----------------------------------------------------

    const profileResult = await query(
      `
      SELECT
        p.id,
        p.cognito_sub,
        p.email,
        p.full_name,
        p.role,
        p.organization_id,
        p.is_active,
        o.name AS organization_name
      FROM profiles p
      JOIN organizations o
        ON o.id = p.organization_id
      WHERE p.cognito_sub = $1
      LIMIT 1
      `,
      [cognitoSub]
    )

    let profile = profileResult.rows[0]

    // -----------------------------------------------------
    // 2. Create profile if one does not exist
    // -----------------------------------------------------

    if (!profile) {
      const organizationId =
        process.env.DEFAULT_ORGANIZATION_ID

      if (!organizationId) {
        console.error(
          "DEFAULT_ORGANIZATION_ID is not configured"
        )

        return NextResponse.json(
          {
            user: null,
            error:
              "Organization configuration is missing",
          },
          { status: 500 }
        )
      }

      const inserted = await query(
        `
        INSERT INTO profiles (
          organization_id,
          cognito_sub,
          email,
          full_name,
          role,
          is_active
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6
        )
        RETURNING
          id,
          cognito_sub,
          email,
          full_name,
          role,
          organization_id,
          is_active
        `,
        [
          organizationId,
          cognitoSub,
          email,
          fullName,
          "admin",
          true,
        ]
      )

      profile = inserted.rows[0]

      // Add organization name to the newly created profile
      const organizationResult = await query(
        `
        SELECT name
        FROM organizations
        WHERE id = $1
        `,
        [profile.organization_id]
      )

      profile.organization_name =
        organizationResult.rows[0]?.name ?? null

      console.log(
        "Created profile:",
        profile.id
      )
    }

    // -----------------------------------------------------
    // 3. Reject disabled users
    // -----------------------------------------------------

    if (!profile.is_active) {
      return NextResponse.json(
        {
          user: null,
          error: "User account is inactive",
        },
        { status: 403 }
      )
    }

    // -----------------------------------------------------
    // 4. Return authenticated user
    // -----------------------------------------------------

    return NextResponse.json({
      user: {
        id: cognitoSub,
        profileId: profile.id,
        email,
        name: fullName,
        organizationId: profile.organization_id,
        organizationName:
          profile.organization_name,
        role: profile.role,
      },
      profile,
    })
  } catch (error) {
    console.error("ME ROUTE ERROR:", error)

    return NextResponse.json(
      { user: null },
      { status: 401 }
    )
  }
}