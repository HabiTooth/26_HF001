'use client';

import { useRef, useEffect, useState } from 'react';
import type { ScanStatusType } from '@/components/molecules/ScanStatusBanner';
import { DARK_THRESHOLD, meanLuma } from '@/lib/imageQuality';

interface Options {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  imgRef?: React.RefObject<HTMLImageElement | null>;
  enabled: boolean;
}

const SHAKE_THRESHOLD = 18; // m/s²
const SHAKE_COOLDOWN_MS = 1200;

const SAMPLE_MS = 250;
const DARK_EXIT_MARGIN = 10;

export function useScanDetection({ videoRef, imgRef, enabled }: Options) {
  const [detectedStatus, setDetectedStatus] = useState<ScanStatusType>('good');
  const isShakingRef = useRef(false);
  const isDarkRef = useRef(false);
  const shakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) {
      isShakingRef.current = false;
      isDarkRef.current = false;
      setDetectedStatus('good');
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    const onMotion = (e: DeviceMotionEvent) => {
      const g = e.accelerationIncludingGravity;
      if (!g) return;
      const mag = Math.sqrt((g.x ?? 0) ** 2 + (g.y ?? 0) ** 2 + (g.z ?? 0) ** 2);
      if (mag <= SHAKE_THRESHOLD) return;

      isShakingRef.current = true;
      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
      shakeTimerRef.current = setTimeout(() => {
        isShakingRef.current = false;
      }, SHAKE_COOLDOWN_MS);
    };

    window.addEventListener('devicemotion', onMotion, true);
    return () => {
      window.removeEventListener('devicemotion', onMotion, true);
      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 24;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // 타 오리진 스트림. 캔버스 오염 시 재시도 중단
    let pixelsReadable = true;

    const sampleBrightness = (): number | null => {
      const video = videoRef.current;
      const img = imgRef?.current;

      let source: CanvasImageSource | null = null;
      if (video && video.readyState >= 2 && !video.paused) source = video;
      else if (img?.complete && img.naturalWidth > 0) source = img;
      if (!source) return null;

      try {
        ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
        return meanLuma(ctx.getImageData(0, 0, canvas.width, canvas.height).data);
      } catch {
        pixelsReadable = false;
        return null;
      }
    };

    const timer = setInterval(() => {
      if (pixelsReadable) {
        const brightness = sampleBrightness();
        if (brightness !== null) {
          isDarkRef.current = isDarkRef.current
            ? brightness < DARK_THRESHOLD + DARK_EXIT_MARGIN
            : brightness < DARK_THRESHOLD;
        }
      }
      setDetectedStatus(isShakingRef.current ? 'shaking' : isDarkRef.current ? 'dark' : 'good');
    }, SAMPLE_MS);

    return () => clearInterval(timer);
  }, [enabled, videoRef, imgRef]);

  return { detectedStatus };
}
