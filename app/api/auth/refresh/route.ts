import { NextRequest, NextResponse } from 'next/server';
import { InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';
import { cognitoClient, getSecretHash, COGNITO_CLIENT_ID } from '@/lib/cognito';

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get('refreshToken')?.value ?? req.cookies.get('refresh_token')?.value;
  const email = req.cookies.get('cognitoUser')?.value ?? req.cookies.get('cognito_user')?.value;

  if (!refreshToken || !email) {
    return NextResponse.json({ error: 'No session' }, { status: 401 });
  }

  try {
    const result = await cognitoClient.send(new InitiateAuthCommand({
      AuthFlow: 'REFRESH_TOKEN_AUTH',
      ClientId: COGNITO_CLIENT_ID,
      AuthParameters: {
        REFRESH_TOKEN: refreshToken,
        SECRET_HASH: getSecretHash(email),
      },
    }));

    if (result.AuthenticationResult?.AccessToken) {
      const res = NextResponse.json({ success: true });
      const secure = process.env.NODE_ENV === 'production';

      res.cookies.set('accessToken', result.AuthenticationResult.AccessToken, {
        httpOnly: true,
        secure,
        sameSite: 'strict',
        maxAge: 3600,
        path: '/',
      });

      if (result.AuthenticationResult.IdToken) {
        res.cookies.set('idToken', result.AuthenticationResult.IdToken, {
          httpOnly: true,
          secure,
          sameSite: 'strict',
          maxAge: 3600,
          path: '/',
        });
      }

      return res;
    }

    return NextResponse.json({ error: 'Refresh failed' }, { status: 401 });
  } catch {
    return NextResponse.json({ error: 'Session expired' }, { status: 401 });
  }
}
