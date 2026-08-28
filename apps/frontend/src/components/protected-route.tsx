'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">Loading…</p>
      </main>
    );
  }

  if (!user) {
    return null; // brief flash before the redirect effect fires
  }

  return <>{children}</>;
}