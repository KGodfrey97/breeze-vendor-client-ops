'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function ConfirmPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const email = searchParams.get('email') ?? '';

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          code,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      router.push(
        '/auth/login?message=Account verified successfully'
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Verification failed'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleConfirm}>
      <h1>Verify Account</h1>

      <p>{email}</p>

      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Verification Code"
      />

      {error && <p>{error}</p>}

      <button disabled={loading}>
        {loading ? 'Verifying...' : 'Verify'}
      </button>
    </form>
  );
}