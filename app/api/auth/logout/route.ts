import { NextRequest, NextResponse } from 'next/server';
import { GlobalSignOutCommand } from '@aws-sdk/client-cognito-identity-provider';
import { cognitoClient } from '@/lib/cognito';

export async function POST(req: NextRequest) {
  const accessToken = req.cookies.get('accessToken')?.value ?? req.cookies.get('access_token')?.value;

  // Invalidate all sessions in Cognito (important for healthcare)
  if (accessToken) {
    try {
      await cognitoClient.send(new GlobalSignOutCommand({ AccessToken: accessToken }));
    } catch {
      // Token may already be expired — still clear cookies
    }
  }

  const res = NextResponse.json({ success: true });
  res.cookies.delete('accessToken');
  res.cookies.delete('idToken');
  res.cookies.delete('refreshToken');
  res.cookies.delete('cognitoUser');
  res.cookies.delete('access_token');
  res.cookies.delete('id_token');
  res.cookies.delete('refresh_token');
  res.cookies.delete('cognito_user');
  return res;
}
