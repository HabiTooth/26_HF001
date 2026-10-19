'use client';

import { useEffect, useRef } from 'react';
import { devicePend, devicePending } from '@/lib/deviceClient';

// 너무 잦으면 스트림 끊김
const POLL_MS = 3000;
// 촬영 직후는 응답 실패가 잦아 간격 확대
const MAX_POLL_MS = 9600;

interface Pending {
  seq: number;
}

export interface HardwareShot {
  white: Blob;
  uv: Blob | null;
}

// 기기 셔터 감시 기능. seq 증가 시 컷 수집. 안 가져가면 스트림 멈춤
export function useHardwareShutter({
  host,
  enabled,
  onCapture,
  onError,
}: {
  host: string | null;
  enabled: boolean;
  onCapture: (shot: HardwareShot) => void | Promise<void>;
  onError?: (message: string | null) => void;
}) {
  const lastSeq = useRef<number | null>(null);
  const lastHost = useRef<string | null>(null);
  const onCaptureRef = useRef(onCapture);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onCaptureRef.current = onCapture;
    onErrorRef.current = onError;
  });

  useEffect(() => {
    if (!host || !enabled) return;
    if (lastHost.current !== host) {
      lastHost.current = host;
      lastSeq.current = null;
    }

    let alive = true;
    let busy = false;
    let wait = POLL_MS;
    let transferring: { seq: number; white?: Blob; uv?: Blob } | null = null;
    let transferFailures = 0;
    let timer: ReturnType<typeof setTimeout>;

    const schedule = () => {
      if (!alive) return;
      timer = setTimeout(tick, wait);
    };

    const tick = async () => {
      if (busy) return;
      busy = true;
      try {
        const res = await devicePending(host);
        if (!res.ok) {
          throw new Error(`셔터 상태 수신 실패: ${res.status}`);
        }
        wait = POLL_MS;

        const { seq } = (await res.json()) as Pending;
        if (typeof seq !== 'number') return;

        // 첫 값은 기준점. 이전 컷 오인 방지
        if (lastSeq.current === null) {
          lastSeq.current = seq;
          onErrorRef.current?.(null);
          return;
        }
        if (seq < lastSeq.current) {
          lastSeq.current = seq;
          transferring = null;
          return;
        }
        if (seq === lastSeq.current) {
          onErrorRef.current?.(null);
          return;
        }
        if (transferring?.seq !== seq) {
          transferring = { seq };
          transferFailures = 0;
        }

        // 백색(0)·UV(1) 둘 다 가져가야 촬영 상태 해제
        const pick = async (i: 0 | 1) => {
          const res = await devicePend(host, i);
          if (!res.ok) throw new Error(`셔터 사진 수신 실패: ${res.status}`);
          const blob = await res.blob();
          if (!blob.size) throw new Error('빈 셔터 사진');
          return blob;
        };

        transferring.white ??= await pick(0);
        transferring.uv ??= await pick(1);
        if (!alive) return;
        await onCaptureRef.current({ white: transferring.white, uv: transferring.uv });
        lastSeq.current = seq;
        transferring = null;
        transferFailures = 0;
        onErrorRef.current?.(null);
      } catch {
        if (alive && transferring && ++transferFailures >= 2) {
          onErrorRef.current?.('촬영한 사진을 다시 받고 있어요. 잠시만 기다려 주세요.');
        }
        wait = Math.min(wait * 2, MAX_POLL_MS);
      } finally {
        busy = false;
        schedule();
      }
    };

    tick();

    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [host, enabled]);
}
