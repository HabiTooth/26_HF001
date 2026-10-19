'use client';

import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface ConfirmSheetProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmSheet({
  open,
  title,
  description,
  confirmLabel,
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmSheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-content/40"
      onClick={() => !busy && onCancel()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-sheet-title"
        onClick={(e) => e.stopPropagation()}
        className="hero-rise w-full max-w-app rounded-t-[24px] bg-white px-5 pb-[calc(20px+env(safe-area-inset-bottom,0px))] pt-5 shadow-card"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-hairline" />
        <h2 id="confirm-sheet-title" className="m-0 text-[16px] font-semibold text-content">
          {title}
        </h2>
        {description && (
          <p className="m-0 mt-1.5 text-[13px] leading-relaxed text-muted">{description}</p>
        )}
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="h-12 flex-1 rounded-[14px] border border-hairline bg-white text-[14px] font-semibold text-content disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`flex h-12 flex-1 items-center justify-center gap-1.5 rounded-[14px] text-[14px] font-semibold text-white disabled:opacity-60 ${
              danger ? 'bg-danger' : 'bg-primary-gradient shadow-button'
            }`}
          >
            {busy && <Loader2 size={15} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
