import { NextRequest, NextResponse } from 'next/server';
import { SignUpCommand, ConfirmSignUpCommand } from '@aws-sdk/client-cognito-identity-provider';
import { cognitoClient, getSecretHash, COGNITO_CLIENT_ID } from '@/lib/cognito';

export async function POST(req: NextRequest) {
  const { email, password, name, organization } = await req.json();

  try {
    await cognitoClient.send(new SignUpCommand({
      ClientId: COGNITO_CLIENT_ID,
      Username: email,
      Password: password,
      SecretHash: getSecretHash(email),
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'name', Value: name },
      ],
    }));

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Signup failed' },
      { status: 400 }
    );
  }
}