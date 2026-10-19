'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Eye, EyeOff } from 'lucide-react';
import Input from '@/components/atoms/Input';

export default function PasswordChangePage() {
  const router = useRouter();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const nextLengthError = next && next.length < 8 ? '비밀번호는 8자 이상이어야 해요' : undefined;
  const confirmError = confirm && next !== confirm ? '비밀번호가 일치하지 않아요' : undefined;
  const sameError = next && current && next === current ? '현재 비밀번호와 동일해요' : undefined;

  const canSave = !!(current && next.length >= 8 && !confirmError && !sameError && confirm);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      router.back();
    }, 800);
  };

  const EyeButton = ({ show, onToggle }: { show: boolean; onToggle: () => void }) => (
    <button type="button" onClick={onToggle} className="flex items-center text-muted bg-transparent border-none cursor-pointer p-0">
      {show ? <EyeOff size={20} /> : <Eye size={20} />}
    </button>
  );

  return (
    <div className="app-frame max-w-app min-h-[calc(100svh/var(--app-zoom))] mx-auto bg-background px-5 pt-[56px] pb-10 flex flex-col relative">
      <div className="aurora-blob-1" />
      <div className="aurora-blob-2" />
      <div className="aurora-blob-3" />

      <div className="flex items-center mb-8 relative z-10">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-white/60 transition-colors bg-transparent border-none cursor-pointer text-content"
        >
          <ChevronLeft size={22} />
        </button>
        <h2 className="absolute left-1/2 -translate-x-1/2 m-0 text-[18px] font-bold text-content">
          비밀번호 변경
        </h2>
      </div>

      <div className="bg-white/90 backdrop-blur-sm rounded-[20px] shadow-card p-5 flex flex-col gap-4 relative z-10">
        <Input
          label="현재 비밀번호"
          type={showCurrent ? 'text' : 'password'}
          placeholder="현재 비밀번호를 입력해주세요"
          value={current}
          onChange={setCurrent}
          rightIcon={<EyeButton show={showCurrent} onToggle={() => setShowCurrent(v => !v)} />}
        />
        <Input
          label="새 비밀번호"
          type={showNext ? 'text' : 'password'}
          placeholder="8자 이상 입력해주세요"
          value={next}
          onChange={setNext}
          error={nextLengthError ?? sameError}
          rightIcon={<EyeButton show={showNext} onToggle={() => setShowNext(v => !v)} />}
        />
        <Input
          label="새 비밀번호 확인"
          type={showConfirm ? 'text' : 'password'}
          placeholder="새 비밀번호를 다시 입력해주세요"
          value={confirm}
          onChange={setConfirm}
          error={confirmError}
          rightIcon={<EyeButton show={showConfirm} onToggle={() => setShowConfirm(v => !v)} />}
        />
      </div>

      <div className="flex-1" />

      <button
        type="button"
        onClick={handleSave}
        disabled={!canSave || isSaving}
        className="w-full h-14 rounded-[14px] text-white text-[16px] font-semibold bg-primary-gradient shadow-button disabled:opacity-50 disabled:cursor-not-allowed transition-opacity relative z-10 mt-6"
      >
        {isSaving ? '변경 중...' : '변경하기'}
      </button>
    </div>
  );
}
