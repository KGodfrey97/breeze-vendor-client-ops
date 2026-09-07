import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { createHmac } from 'crypto';

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.NEXT_PUBLIC_AWS_REGION!,
});

// Every call needs this hash when a client secret exists
function getSecretHash(username: string): string {
  const clientId = process.env.COGNITO_CLIENT_ID!;
  const clientSecret = process.env.COGNITO_CLIENT_SECRET!;

  return createHmac('sha256', clientSecret)
    .update(username + clientId)
    .digest('base64');
}

export async function serverSignIn(email: string, password: string) {
  const command = new InitiateAuthCommand({
    AuthFlow: 'USER_SRP_AUTH',
    ClientId: process.env.COGNITO_CLIENT_ID!,
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password,
      SECRET_HASH: getSecretHash(email), // <-- required with client secret
    },
  });

  return cognitoClient.send(command);
}