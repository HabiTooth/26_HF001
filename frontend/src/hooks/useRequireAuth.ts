'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { isTokenExpired } from '@/lib/tokenStorage';
import { deviceApi } from '@/lib/api/device';

export function useRequireAuth(): boolean {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const { token, clearAuth } = useAuthStore.getState();
    if (!token || isTokenExpired(token)) {
      clearAuth();
      router.replace('/login');
      return;
    }
    setAuthorized(true);

    // 저장된 기기 없으면 서버 등록 기기로 채움. 빼면 브라우저 바뀔 때마다 페어링 필요
    const { deviceId, setDevice } = useAuthStore.getState();
    if (deviceId === null) {
      deviceApi
        .getStatus()
        .then((res) => {
          const first = res.data.result?.[0];
          if (first) setDevice(first.deviceId, null);
        })
        .catch(() => {});
    }
  }, [router]);

  return authorized;
}
