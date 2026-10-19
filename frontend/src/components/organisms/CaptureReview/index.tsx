'use client';

import { useEffect, useId, useRef } from 'react';
import { RotateCcw, ArrowRight, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { CAPTURE_ISSUE_TEXT, type CaptureQuality } from '@/lib/imageQuality';

export default function CaptureReview({
  previewUrl,
  quality,
  zoneLabel,
  isUploading,
  uploadError,
  confirmLabel,
  onRetake,
  onConfirm,
  mirrored = false,
}: {
  previewUrl: string;
  quality: CaptureQuality;
  zoneLabel: string;
  isUploading: boolean;
  uploadError: string | null;
  confirmLabel: string;
  onRetake: () => void;
  onConfirm: () => void;
  mirrored?: boolean;
}) {
  const problem = quality.issues[0];
  const checking = quality.checking === true;
  const unverified = quality.verified === false;
  const dialogRef = useRef<HTMLElement>(null);
  const titleId = useId();

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  return (
    <div className="absolute inset-0 z-30 flex items-end bg-[#10243D]/40 p-3 pb-[max(12px,env(safe-area-inset-bottom))]">
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative flex max-h-full w-full flex-col overflow-y-auto overscroll-contain rounded-[24px] bg-white shadow-[0_12px_40px_rgba(16,36,61,0.2)] outline-none"
        onKeyDown={(event) => {
          if (event.key !== 'Tab') return;
          const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
          if (!buttons.length) {
            event.preventDefault();
            return;
          }
          const first = buttons[0];
          const last = buttons[buttons.length - 1];
          if (event.shiftKey && (document.activeElement === first || document.activeElement === event.currentTarget)) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === event.currentTarget)) {
            event.preventDefault();
            first.focus();
          }
        }}
      >
      <h2 id={titleId} className="sr-only">촬영 사진 확인</h2>
      <div className="relative mx-3 mt-3 shrink-0 overflow-hidden rounded-[16px] bg-[#EDF3FA]">
        <img
          src={previewUrl}
          alt={`${zoneLabel} 촬영본`}
          className="block aspect-[4/3] max-h-[calc(28svh/var(--app-zoom))] w-full object-contain"
          style={{ transform: mirrored ? 'scaleX(-1)' : undefined }}
        />

        <div className="absolute top-3 left-1/2 -translate-x-1/2">
          <span className="px-3 py-1.5 rounded-full bg-white/90 text-[#3967A1] text-[11px] font-bold">
            {zoneLabel}
          </span>
        </div>
      </div>

      <div className="flex-shrink-0 bg-white px-4 pt-4 pb-1 flex flex-col gap-3">
        {checking ? (
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-full bg-hairline flex items-center justify-center flex-shrink-0">
              <Loader2 size={15} className="text-muted animate-spin" />
            </div>
            <div className="min-w-0">
              <p className="m-0 text-[15px] font-bold text-content">사진을 확인하고 있어요</p>
              <p className="m-0 mt-0.5 text-[14px] font-medium text-[#687B94] leading-relaxed">
                치아가 제대로 잡혔는지 보는 중이에요.
              </p>
            </div>
          </div>
        ) : problem ? (
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-full bg-warning/15 flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={15} className="text-warning" />
            </div>
            <div className="min-w-0">
              <p className="m-0 text-[15px] font-bold text-content">{CAPTURE_ISSUE_TEXT[problem].label}</p>
              <p className="m-0 mt-0.5 text-[14px] font-medium text-[#687B94] leading-relaxed">
                {quality.message ?? CAPTURE_ISSUE_TEXT[problem].hint}
              </p>
            </div>
          </div>
        ) : unverified ? (
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-full bg-warning/15 flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={15} className="text-warning" />
            </div>
            <div className="min-w-0">
              <p className="m-0 text-[15px] font-bold text-content">치아가 잡혔는지 확인 못 했어요</p>
              <p className="m-0 mt-0.5 text-[14px] font-medium text-[#687B94] leading-relaxed">
                판정 서버에 연결되지 않았어요. 화면에 치아가 다 들어왔는지 직접 확인해 주세요.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-full bg-success/15 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 size={15} className="text-success" />
            </div>
            <div className="min-w-0">
              <p className="m-0 text-[15px] font-bold text-content">잘 찍혔어요</p>
              <p className="m-0 mt-0.5 text-[14px] font-medium text-[#687B94] leading-relaxed">
                다음으로 넘어가면 이 사진이 저장돼요.
              </p>
            </div>
          </div>
        )}

        {uploadError && (
          <p className="m-0 text-[14px] text-danger font-semibold leading-relaxed">{uploadError}</p>
        )}

        </div>
        <div className="sticky bottom-0 flex shrink-0 items-center gap-2.5 bg-white p-4">
          <button
            type="button"
            onClick={onRetake}
            disabled={isUploading}
            className="flex-1 h-14 rounded-[16px] border-[1.5px] border-hairline bg-white
              flex items-center justify-center gap-1.5 text-[15px] font-bold text-content disabled:opacity-40"
          >
            <RotateCcw size={16} />
            다시 찍기
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isUploading || checking}
            className={`flex-1 h-14 rounded-[16px] text-white text-[15px] font-bold
              flex items-center justify-center gap-1.5 disabled:opacity-60
              ${problem || checking ? 'bg-muted' : 'bg-primary-gradient shadow-button'}`}
          >
            {isUploading || checking ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {checking ? '확인 중' : '저장 중'}
              </>
            ) : (
              <>
                {confirmLabel}
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </section>
    </div>
  );
}
