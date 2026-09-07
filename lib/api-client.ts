// lib/api-client.ts
import { fetchAuthSession } from 'aws-amplify/auth';

export async function authenticatedFetch(url: string, options: RequestInit = {}) {
  const session = await fetchAuthSession();
  const token = session.tokens?.accessToken?.toString();

  if (!token) throw new Error('Not authenticated');

  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
}