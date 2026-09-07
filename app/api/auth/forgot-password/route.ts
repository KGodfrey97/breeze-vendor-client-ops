import { NextRequest, NextResponse } from "next/server"
import {
  CognitoIdentityProviderClient,
  ForgotPasswordCommand,
} from "@aws-sdk/client-cognito-identity-provider"

import { getSecretHash } from "@/lib/cognito"

const client = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION!,
})

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      )
    }

    await client.send(
      new ForgotPasswordCommand({
        ClientId: process.env.COGNITO_CLIENT_ID!,
        Username: email,
        SecretHash: getSecretHash(email),
      })
    )

    // Don't reveal whether the email exists
    return NextResponse.json({
      success: true,
      message: "If an account exists, a verification code has been sent.",
    })
  } catch (error) {
    console.error("Forgot password error:", error)

    return NextResponse.json(
      {
        error: "Unable to process password reset request.",
      },
      { status: 400 }
    )
  }
}