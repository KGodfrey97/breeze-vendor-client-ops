// lib/verify-token.ts (server-side only)
import { CognitoJwtVerifier } from 'aws-jwt-verify';

const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!,
  tokenUse: 'access',
  clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
});

export async function verifyToken(token: string) {
  return verifier.verify(token); // throws if invalid
}