'use client';

import { useEffect, useState } from 'react';

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadUser() {
      try {
        const res = await fetch('/api/auth/me');

        if (!res.ok) {
          throw new Error(`HTTP error ${res.status}`);
        }

        const data = await res.json();

        if (!isMounted) return;

        setUser(data.user ?? null);
      } catch (err) {
        if (!isMounted) return;

        setError('Failed to load user');
        setUser(null);
      } finally {
        if (!isMounted) return;

        setLoading(false);
        setInitialized(true);
      }
    }

    loadUser();

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    user,
    loading,
    initialized,
    error,
  };
}