import { NextRequest, NextResponse } from 'next/server';
import {
  InitiateAuthCommand,
} from '@aws-sdk/client-cognito-identity-provider';

import {
  cognitoClient,
  COGNITO_CLIENT_ID,
  getSecretHash,
} from '@/lib/cognito';

export function setAuthCookies(
  res: NextResponse,
  accessToken: string,
  idToken: string,
  refreshToken: string | undefined,
  email: string
) {
  const secure = process.env.NODE_ENV === "production";

  res.cookies.set("accessToken", accessToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    maxAge: 3600,
    path: "/"
  });

  res.cookies.set("idToken", idToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    maxAge: 3600,
    path: "/"
  });

  res.cookies.set("cognitoUser", email, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60,
    path: "/"
  });

  if (refreshToken) {
    res.cookies.set("refreshToken", refreshToken, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/"
    });
  }
}

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  try {
    const command = new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: COGNITO_CLIENT_ID,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
        SECRET_HASH: getSecretHash(email),
      },
    });

    const response = await cognitoClient.send(command);

    // User exists but MFA or challenge required
    if (response.ChallengeName) {
      return NextResponse.json({
        nextStep:
          response.ChallengeName === 'SOFTWARE_TOKEN_MFA' || response.ChallengeName === 'SMS_MFA'
            ? 'MFA_REQUIRED'
            : response.ChallengeName,
        challengeName: response.ChallengeName,
        session: response.Session,
        email,
      });
    }

    const accessToken = response.AuthenticationResult?.AccessToken;
    const idToken = response.AuthenticationResult?.IdToken;
    const refreshToken = response.AuthenticationResult?.RefreshToken;

    if (!accessToken || !idToken) {
      throw new Error("Authentication tokens not returned by Cognito");
    }

    const res = NextResponse.json({
      isSignedIn: true
    });

    setAuthCookies(res, accessToken, idToken, refreshToken, email);

    return res;

  } catch (err: any) {
    console.error('Login error:', err);

    return NextResponse.json(
      { error: err?.message || 'Login failed' },
      { status: 401 }
    );
  }
}
