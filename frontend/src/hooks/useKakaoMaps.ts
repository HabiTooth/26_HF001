'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const SDK_ID = 'kakao-maps-sdk';
const LOAD_TIMEOUT_MS = 10_000;

export type MapsStatus = 'loading' | 'ready' | 'no-key' | 'failed' | 'timeout';

export function useKakaoMaps(): MapsStatus {
  const [status, setStatus] = useState<MapsStatus>('loading');

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
    if (!key) {
      setStatus('no-key');
      return;
    }

    if (window.kakao?.maps?.services) {
      setStatus('ready');
      return;
    }

    const src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${key}&libraries=services&autoload=false`;

    // 도메인 미등록 시 401. script error로 종료
    const fail = () => {
      console.error(
        `[카카오맵] SDK를 못 불러왔어요.\n` +
          `현재 주소: ${window.location.origin}\n` +
          `카카오 개발자센터 > 내 애플리케이션 > 플랫폼 > Web 에 이 주소가 등록돼 있는지 확인해 주세요.`,
      );
      setStatus('failed');
    };

    const finish = () => {
      if (!window.kakao) {
        fail();
        return;
      }
      window.kakao.maps.load(() => setStatus('ready'));
    };

    const timer = setTimeout(
      () => setStatus((s) => (s === 'loading' ? 'timeout' : s)),
      LOAD_TIMEOUT_MS,
    );

    const existing = document.getElementById(SDK_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', finish);
      existing.addEventListener('error', fail);
      return () => {
        clearTimeout(timer);
        existing.removeEventListener('load', finish);
        existing.removeEventListener('error', fail);
      };
    }

    const script = document.createElement('script');
    script.id = SDK_ID;
    script.async = true;
    script.src = src;
    script.addEventListener('load', finish);
    script.addEventListener('error', fail);
    document.head.appendChild(script);

    return () => clearTimeout(timer);
  }, []);

  return status;
}

export interface Coords {
  lat: number;
  lng: number;
}

export const FALLBACK_COORDS: Coords = { lat: 37.5666, lng: 126.9784 };

export interface Position {
  coords: Coords;
  exact: boolean;
  pending: boolean;
  refresh: () => Promise<Coords>;
}

export function useCurrentPosition(): Position {
  const [coords, setCoords] = useState<Coords>(FALLBACK_COORDS);
  const [exact, setExact] = useState(false);
  const [pending, setPending] = useState(true);
  const latest = useRef(FALLBACK_COORDS);

  const locate = useCallback(
    () =>
      new Promise<Coords>((resolve) => {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
          setPending(false);
          resolve(latest.current);
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            latest.current = next;
            setCoords(next);
            setExact(true);
            setPending(false);
            resolve(next);
          },
          () => {
            setPending(false);
            resolve(latest.current);
          },
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 300_000 },
        );
      }),
    [],
  );

  useEffect(() => {
    locate();
  }, [locate]);

  return { coords, exact, pending, refresh: locate };
}
