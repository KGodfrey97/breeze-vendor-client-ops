// hooks/useAuth.ts
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type MFAState = {
  required: boolean;
  challengeName: string;
  session: string;
  email: string;
} | null;

export function useAuth() {
  const router = useRouter();
  const [mfaState, setMfaState] = useState<MFAState>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      if (data.nextStep === 'MFA_REQUIRED') {
        setMfaState({
          required: true,
          challengeName: data.challengeName,
          session: data.session,
          email: data.email ?? email,
        });
      }
      
      return data;

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const submitMFA = async (code: string) => {
    if (!mfaState) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: mfaState.email,
          mfaCode: code,
          session: mfaState.session,
          challengeName: mfaState.challengeName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.replace('/');
      router.refresh();
      return data;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/auth/login');
    router.refresh();
  };

  return { login, submitMFA, logout, mfaState, error, loading };
}
