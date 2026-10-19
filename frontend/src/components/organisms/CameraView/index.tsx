'use client';

import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import {
  Camera, Loader2, CheckCircle2, AlertTriangle, Sun, Sparkles, Info,
} from 'lucide-react';
import type { CameraMode, LedMode } from '@/hooks/useCameraStream';
import type { ScanStatusType } from '@/components/molecules/ScanStatusBanner';

export default function CameraView({
  videoRef,
  imgRef,
  isReady,
  cameraError,
  cameraMode,
  ledMode,
  status,
  onLedToggle,
  onCapture,
  isCapturing,
  onRetry,
  reviewOverlay,
  guide,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  imgRef: RefObject<HTMLImageElement | null>;
  isReady: boolean;
  cameraError: string | null;
  cameraMode: CameraMode;
  ledMode: LedMode;
  status: ScanStatusType;
  onLedToggle: (mode: LedMode) => void;
  onCapture: () => void;
  isCapturing: boolean;
  onRetry: () => void;
  reviewOverlay?: ReactNode;
  guide?: { shot: string; label: string; tip: string; outline?: string };
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState({ w: 0, h: 0 });
  const [streamRatio, setStreamRatio] = useState(3 / 4);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => setStage({ w: el.clientWidth, h: el.clientHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    const img = imgRef.current;
    const fromVideo = () => {
      if (video && video.videoWidth) {
        setStreamRatio(video.videoHeight / video.videoWidth);
      }
    };
    const fromImg = () => {
      if (img && img.naturalWidth) {
        setStreamRatio(img.naturalHeight / img.naturalWidth);
      }
    };
    video?.addEventListener('loadedmetadata', fromVideo);
    img?.addEventListener('load', fromImg);
    fromVideo();
    fromImg();
    return () => {
      video?.removeEventListener('loadedmetadata', fromVideo);
      img?.removeEventListener('load', fromImg);
    };
  }, [videoRef, imgRef, cameraMode]);

  const streamVisible = isReady && !cameraError;
  const reviewing = Boolean(reviewOverlay);

  const streamH = Math.min(stage.w * streamRatio, stage.h);
  // 예시 사진 높이 4:3 상한
  const exampleH = Math.min(Math.max(0, stage.h - streamH), stage.w * 0.75);
  const showExample = streamVisible && Boolean(guide) && exampleH >= 56;
  const contentTop = Math.max(0, (stage.h - streamH - (showExample ? exampleH : 0)) / 2);

  return (
    <div className="relative w-full flex-1 min-h-0 flex flex-col bg-[#EAF1FA]">
      <div className="flex min-h-0 flex-1 flex-col" inert={reviewing} aria-hidden={reviewing || undefined}>
      <div ref={stageRef} className="relative w-full flex-1 min-h-0 overflow-hidden flex flex-col justify-center">
        {showExample && guide && <div className="relative w-full shrink-0 overflow-hidden" style={{ height: exampleH }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={guide.shot} alt={`${guide.label} 촬영 예시`} className="h-full w-full object-cover" />
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-[#3967A1]">촬영 예시</span>
        </div>}
        <div className="relative w-full flex-shrink-0" style={{ height: streamH || '100%' }}>
          {streamVisible && !reviewing && <span className="absolute left-3 top-3 z-10 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-[#3967A1]">실시간 영상</span>}
          <div className="absolute inset-0" data-stream-mirrored={cameraMode === 'device'} style={{ transform: cameraMode === 'device' ? 'scaleX(-1)' : undefined, transformOrigin: 'center' }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-300
              ${cameraMode === 'device' && streamVisible ? 'opacity-100' : 'opacity-0'}`}
          />
          <img
            ref={imgRef}
            alt=""
            className={`absolute inset-0 w-full h-full object-contain pointer-events-none ${cameraMode === 'esp32' && streamVisible ? 'opacity-100' : 'opacity-0'}`}
          />
          </div>

          {streamVisible && !reviewing && guide?.outline && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={guide.outline}
              alt=""
              aria-hidden
              className="absolute inset-0 w-full h-full object-contain opacity-60 pointer-events-none"
            />
          )}

          {streamVisible && !reviewing && !guide?.outline && (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
              <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1px] h-4 bg-[#4BC8A0]/70" />
              <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-[1px] bg-[#4BC8A0]/70" />
            </div>
          )}
        </div>

        {(!isReady || cameraError) && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2.5 bg-[#1A1A2E]">
            {cameraError ? (
              <>
                <Camera size={40} className="text-white/30" />
                <span className="text-white/50 text-[12px] text-center px-6 leading-relaxed whitespace-pre-line">
                  {cameraError}
                </span>
                <button
                  onClick={onRetry}
                  className="mt-6 px-6 py-3 bg-primary text-white text-[14px] font-bold rounded-[12px] shadow-lg"
                >
                  다시 시도하기
                </button>
              </>
            ) : (
              <>
                <Loader2 size={32} className="text-white/30 animate-spin" />
                <span className="text-white/40 text-[12px]">카메라 연결 중...</span>
              </>
            )}
          </div>
        )}

        {streamVisible && !reviewing && (
          <div className="absolute left-1/2 -translate-x-1/2 z-10 pointer-events-none" style={{ top: contentTop + (showExample ? exampleH : 0) + 10 }}>
            {status === 'good' && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success/60 backdrop-blur-md shadow-sm text-white text-[11px] font-semibold whitespace-nowrap">
                <CheckCircle2 size={12} strokeWidth={2.5} />
                <span>잘 찍히고 있어요</span>
              </div>
            )}
            {status === 'shaking' && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-danger/60 backdrop-blur-md shadow-sm text-white text-[11px] font-semibold whitespace-nowrap">
                <AlertTriangle size={12} strokeWidth={2.5} />
                <span>흔들림 감지됨</span>
              </div>
            )}
            {status === 'dark' && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-warning/60 backdrop-blur-md shadow-sm text-white text-[11px] font-semibold whitespace-nowrap">
                <Sun size={12} strokeWidth={2.5} />
                <span>조명이 부족해요</span>
              </div>
            )}
          </div>
        )}
      </div>

      {streamVisible && guide && (
        <div className="shrink-0 bg-[#F7FAFF] px-4 pt-3 pb-2">
          <div className="flex items-start gap-2.5 rounded-2xl rounded-tl-md border border-[#DFEBFC] bg-[#EAF3FF] px-3 py-2.5" role="note" aria-label="촬영 안내">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[#4D8CE3]"><Info size={15} aria-hidden /></span>
            <p className="m-0 pt-0.5 text-[12px] font-semibold leading-relaxed text-[#3967A1] break-keep">{guide.tip}</p>
          </div>
        </div>
      )}

        <div className="flex-shrink-0 grid grid-cols-[1fr_auto_1fr] items-center bg-white border-t border-hairline px-5 pt-3 pb-[calc(12px+env(safe-area-inset-bottom,0px))]">
          <div
            role="group"
            aria-label="조명"
            className="flex w-fit items-center rounded-full bg-hairline/60 p-1"
          >
            {([
              ['WHITE', '백색', Sun],
              ['UV', 'UV', Sparkles],
            ] as const).map(([mode, label, Icon]) => {
              const on = ledMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onLedToggle(mode)}
                  aria-pressed={on}
                  className={`flex h-9 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold transition-colors ${
                    on ? 'bg-white text-primary shadow-sm' : 'text-muted'
                  }`}
                >
                  <Icon size={14} strokeWidth={on ? 2.5 : 2} />
                  {label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onCapture}
            disabled={reviewing || isCapturing || !isReady || Boolean(cameraError)}
            className="w-16 h-16 rounded-full bg-white border-4 border-primary flex items-center justify-center shadow-button disabled:opacity-50"
            aria-label="촬영"
          >
            {isCapturing
              ? <Loader2 size={22} className="text-primary animate-spin" />
              : <Camera size={22} className="text-primary" />
            }
          </button>

          <div />
        </div>
      </div>
      {reviewOverlay}
    </div>
  );
}
