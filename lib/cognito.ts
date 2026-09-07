import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
  SignUpCommand,
  ConfirmSignUpCommand,
  GlobalSignOutCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { createHmac } from 'crypto';

export const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION!,
});

// Every Cognito call needs this when a client secret exists
export function getSecretHash(username: string): string {
  return createHmac('sha256', process.env.COGNITO_CLIENT_SECRET!)
    .update(username + process.env.COGNITO_CLIENT_ID!)
    .digest('base64');
}

export const COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID!;