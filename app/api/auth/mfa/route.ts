import { NextRequest, NextResponse } from 'next/server';
import { RespondToAuthChallengeCommand } from '@aws-sdk/client-cognito-identity-provider';
import { cognitoClient, getSecretHash, COGNITO_CLIENT_ID } from '@/lib/cognito';
import { setAuthCookies } from '../login/route';

export async function POST(req: NextRequest) {
  const { email, mfaCode, session, challengeName } = await req.json();

  const mfaResponseKey =
    challengeName === 'SOFTWARE_TOKEN_MFA'
      ? 'SOFTWARE_TOKEN_MFA_CODE'
      : 'SMS_MFA_CODE';

  try {
    const result = await cognitoClient.send(new RespondToAuthChallengeCommand({
      ClientId: COGNITO_CLIENT_ID,
      ChallengeName: challengeName,
      Session: session,
      ChallengeResponses: {
        USERNAME: email,
        [mfaResponseKey]: mfaCode,
        SECRET_HASH: getSecretHash(email),
      },
    }));

    const accessToken = result.AuthenticationResult?.AccessToken;
    const idToken = result.AuthenticationResult?.IdToken;

    if (accessToken && idToken) {
      const res = NextResponse.json({ isSignedIn: true });
      setAuthCookies(
        res,
        accessToken,
        idToken,
        result.AuthenticationResult.RefreshToken,
        email
      );
      return res;
    }

    return NextResponse.json({ error: 'MFA failed' }, { status: 401 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Invalid MFA code' },
      { status: 401 }
    );
  }
}
