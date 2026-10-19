'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

export type LedMode = 'OFF' | 'WHITE' | 'UV';

export type CameraMode = 'device' | 'esp32';

const STREAM_TIMEOUT = 8000;

export interface UseCameraStreamReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  imgRef: React.RefObject<HTMLImageElement | null>;
  isReady: boolean;
  error: string | null;
  ledMode: LedMode;
  cameraMode: CameraMode;
  startCamera: (mode?: CameraMode, esp32Url?: string) => Promise<void>;
  stopCamera: () => void;
  setLed: (mode: LedMode) => Promise<void>;
  captureFrame: () => string | null;
}

export function useCameraStream(): UseCameraStreamReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // 스트림 81, 제어 80 포트
  const controlHostRef = useRef<string | null>(null);
  const streamWatchdog = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ledMode, setLedMode] = useState<LedMode>('OFF');
  const facingMode = 'environment';
  const [cameraMode, setCameraMode] = useState<CameraMode>('device');

  const stopCamera = useCallback(() => {
    if (streamWatchdog.current) clearTimeout(streamWatchdog.current);
    streamWatchdog.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    if (imgRef.current) imgRef.current.src = '';
    setIsReady(false);
    setLedMode('OFF');
  }, []);

  const startCamera = useCallback(
    async (mode: CameraMode = 'device', esp32Url?: string) => {
      try {
        stopCamera();

        if (mode === 'esp32' && esp32Url) {
          setCameraMode('esp32');
          controlHostRef.current = esp32Url
            .replace(/^https?:\/\//, '')
            .split('/')[0]
            .split(':')[0];
          // 포트 닫힘 시 onerror 없이 멈춤. 직접 끊음
          streamWatchdog.current = setTimeout(() => {
            setError(
              `스캐너 미리보기에 연결하지 못했어요.\n${esp32Url}\n기기 전원과 WiFi 연결을 확인해 주세요.`,
            );
          }, STREAM_TIMEOUT);

          // img 마운트 후 src 설정용
          requestAnimationFrame(() => {
            const img = imgRef.current;
            if (!img) return;
            img.onload = () => {
              if (streamWatchdog.current) clearTimeout(streamWatchdog.current);
              setIsReady(true);
              setError(null);
            };
            img.onerror = () => {
              if (streamWatchdog.current) clearTimeout(streamWatchdog.current);
              setError(`스캐너 카메라 연결 실패\n${esp32Url}`);
            };
            img.src = esp32Url;
          });
        } else {
          setCameraMode('device');
          // getUserMedia는 HTTPS·localhost 전용
          // 폰에서 http://192.168.x.x 로 붙으면 mediaDevices 자체가 없어 권한 창도 안 뜬다.
          if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
            setError(
              '휴대폰에서는 HTTPS로 접속해야 카메라를 쓸 수 있어요.\nnpm run dev:https 로 실행한 뒤 https:// 주소로 접속해 주세요.',
            );
            return;
          }
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: facingMode },
              width: { ideal: 1280 },
              height: { ideal: 960 },
              aspectRatio: { ideal: 4 / 3 },
            },
            audio: false,
          });
          streamRef.current = stream;
          const video = videoRef.current;
          if (video) {
            video.srcObject = stream;
            video.onloadedmetadata = () => {
              video.play().catch(() => {});
              setIsReady(true);
            };
          }
          setError(null);
        }
      } catch (e) {
        const name = e instanceof DOMException ? e.name : '';
        if (name === 'NotAllowedError') {
          setError('카메라 접근이 거부됐어요.\n브라우저 설정에서 카메라 권한을 허용해 주세요.');
        } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
          setError('쓸 수 있는 카메라를 찾지 못했어요.');
        } else if (name === 'NotReadableError') {
          setError('카메라를 다른 앱이 쓰고 있어요.\n해당 앱을 끄고 다시 시도해 주세요.');
        } else {
          setError('카메라를 열지 못했어요.\n다시 시도해 주세요.');
        }
      }
    },
    [facingMode, stopCamera],
  );

  const setLed = useCallback(
    async (mode: LedMode) => {
      if (cameraMode === 'esp32') {
        const host = controlHostRef.current;
        if (!host) return;
        try {
          // 펌웨어 응답값 그대로 사용
          const res = await fetch(`http://${host}/led?mode=${mode.toLowerCase()}`);
          const applied = (await res.text()).trim().toUpperCase();
          setLedMode(applied === 'UV' || applied === 'WHITE' ? applied : 'OFF');
        } catch {
          // 조명 실패해도 촬영 계속
        }
        return;
      }
      const track = streamRef.current?.getVideoTracks()[0];
      if (!track) return;
      try {
        await track.applyConstraints({
          advanced: [{ torch: mode !== 'OFF' } as MediaTrackConstraintSet],
        });
        setLedMode(mode);
      } catch {
        // 토치 미지원
      }
    },
    [cameraMode],
  );

  const captureFrame = useCallback((): string | null => {
    if (cameraMode === 'esp32') {
      const img = imgRef.current;
      if (!img || !isReady) return null;
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || 640;
      canvas.height = img.naturalHeight || 480;
      try {
        canvas.getContext('2d')?.drawImage(img, 0, 0);
        return canvas.toDataURL('image/jpeg', 0.85);
      } catch {
        return null;
      }
    }
    const video = videoRef.current;
    if (!video || !isReady || video.readyState < 2) return null;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.85);
  }, [isReady, cameraMode]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  return {
    videoRef,
    imgRef,
    isReady,
    error,
    ledMode,
    cameraMode,
    startCamera,
    stopCamera,
    setLed,
    captureFrame,
  };
}
