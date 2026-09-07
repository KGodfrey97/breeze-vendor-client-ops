import { NextRequest, NextResponse } from "next/server"
import {
  CognitoIdentityProviderClient,
  ConfirmForgotPasswordCommand,
} from "@aws-sdk/client-cognito-identity-provider"

import { getSecretHash } from "@/lib/cognito"

const client = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION!,
})

export async function POST(req: NextRequest) {
  try {
    const {
      email,
      code,
      newPassword,
    } = await req.json()

    if (!email || !code || !newPassword) {
      return NextResponse.json(
        {
          error: "Email, verification code, and password are required.",
        },
        { status: 400 }
      )
    }

    await client.send(
      new ConfirmForgotPasswordCommand({
        ClientId: process.env.COGNITO_CLIENT_ID!,
        Username: email,
        ConfirmationCode: code,
        Password: newPassword,
        SecretHash: getSecretHash(email),
      })
    )

    return NextResponse.json({
      success: true,
      message: "Password updated successfully.",
    })
  } catch (error) {
    console.error("Reset password error:", error)

    return NextResponse.json(
      {
        error: "Invalid verification code or password.",
      },
      { status: 400 }
    )
  }
}