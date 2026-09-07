import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { CognitoJwtVerifier } from "aws-jwt-verify";

const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID!,
  tokenUse: "id",
  clientId: process.env.COGNITO_CLIENT_ID!,
});

export async function GET() {
  const cookieStore = await cookies();
  const idToken = cookieStore.get("idToken")?.value;

  if (!idToken) {
    return NextResponse.json({ user: null });
  }

  try {
    const payload = await verifier.verify(idToken);

    // 1. Try to find existing profile
    const profileResult = await query(
      `SELECT id, email, full_name, role, organization, is_active
       FROM profiles
       WHERE id = $1`,
      [payload.sub]
    );

    let profile = profileResult.rows[0];

    // 2. If not found, create it
    if (!profile) {
      const inserted = await query(
        `
        INSERT INTO profiles (
          id,
          email,
          full_name,
          role,
          organization,
          is_active
        )
        VALUES (
          $1, $2, $3, $4, $5, $6
        )
        RETURNING id, email, full_name, role, organization, is_active
        `,
        [
          payload.sub,
          payload.email,
          payload.name,
          "staff",   // matches your DB default intent
          null,
          true,
        ]
      );

      profile = inserted.rows[0];
      console.log("Created profile:", profile.id);
    }

    // 3. Always return user + profile
    return NextResponse.json({
      user: {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
      },
      profile,
    });

  } catch (error) {
    console.error("ME ROUTE ERROR:", error);
    return NextResponse.json({ user: null });
  }
}