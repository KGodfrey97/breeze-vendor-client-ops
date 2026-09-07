import type { ResourcesConfig } from 'aws-amplify';

const amplifyConfig: ResourcesConfig = {
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!,
      userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
      loginWith: {
        email: true,
      },
      mfa: {
        status: 'on',          // REQUIRED for healthcare — no optional
        totpEnabled: true,
        //smsEnabled: true,
      },
      passwordFormat: {
        minLength: 12,
        requireLowercase: true,
        requireUppercase: true,
        requireNumbers: true,
        requireSpecialCharacters: true,
      },
      userAttributes: {
        email: { required: true },
        name: { required: true },
      },
    },
  },
};

export default amplifyConfig;