'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: ('ADMIN' | 'MANAGER' | 'USER')[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
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
    return null;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <main className="flex-1 flex items-center justify-center px-4">
        <p className="text-gray-600 bg-gray-50 border border-gray-200 rounded-md px-4 py-3">
          You don&apos;t have permission to view this page.
        </p>
      </main>
    );
  }

  return <>{children}</>;
}