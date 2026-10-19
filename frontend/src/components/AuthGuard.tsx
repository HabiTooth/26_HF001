'use client';

import type { ReactNode } from 'react';
import { useRequireAuth } from '@/hooks/useRequireAuth';

// 만료 세션 내용 노출 방지
export default function AuthGuard({ children }: { children: ReactNode }) {
  const authorized = useRequireAuth();
  if (!authorized) return <div className="min-h-svh bg-background" />;
  return <>{children}</>;
}
