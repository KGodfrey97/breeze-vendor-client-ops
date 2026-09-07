import { NextRequest, NextResponse } from 'next/server';
import { ConfirmSignUpCommand } from '@aws-sdk/client-cognito-identity-provider';
import { cognitoClient, getSecretHash, COGNITO_CLIENT_ID } from '@/lib/cognito';

export async function POST(req: NextRequest) {
  const { email, code } = await req.json();

  try {
    await cognitoClient.send(new ConfirmSignUpCommand({
      ClientId: COGNITO_CLIENT_ID,
      Username: email,
      ConfirmationCode: code,
      SecretHash: getSecretHash(email),
    }));

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Confirmation failed' },
      { status: 400 }
    );
  }
}