'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { authApi } from '@/lib/api/auth';
import { useAuthStore } from '@/stores/authStore';
import { destinationAfterLogin } from '@/lib/authRouting';

function Pending() {
  return (
    <div className="min-h-svh flex flex-col items-center justify-center gap-3">
      <Loader2 size={32} className="text-primary animate-spin" />
      <p className="text-[14px] text-muted">Google 로그인 중...</p>
    </div>
  );
}

function GoogleCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setToken = useAuthStore((s) => s.setToken);

  useEffect(() => {
    const code = searchParams.get('code');
    if (!code) { router.replace('/login'); return; }

    const redirectUri = `${window.location.origin}/oauth/google`;

    authApi
      .socialLogin({ provider: 'google', authCode: code, redirectUri })
      .then(async (res) => {
        setToken(res.data.result.accessToken);
        router.replace(await destinationAfterLogin());
      })
      .catch(() => router.replace('/login'));
  }, [searchParams, router, setToken]);

  return <Pending />;
}

// 빼면 프로덕션 프리렌더 오류
export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={<Pending />}>
      <GoogleCallback />
    </Suspense>
  );
}
