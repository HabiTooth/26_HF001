'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import Input from '@/components/atoms/Input';

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [step, setStep] = useState<'verify' | 'reset' | 'done'>('verify');
  const [email, setEmail] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | undefined>();

  const emailFormatError = email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? '올바른 이메일 형식이 아니에요' : undefined;
  const pwLengthError = newPw && newPw.length < 8 ? '비밀번호는 8자 이상이어야 해요' : undefined;
  const pwMatchError = confirmPw && newPw !== confirmPw ? '비밀번호가 일치하지 않아요' : undefined;

  const handleVerify = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setStep('reset');
    }, 900);
  };

  const handleReset = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setStep('done');
    }, 900);
  };

  const EyeBtn = ({ show, onToggle }: { show: boolean; onToggle: () => void }) => (
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
        <button type="button" onClick={() => step === 'reset' ? setStep('verify') : router.back()}
          className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-white/60 transition-colors bg-transparent border-none cursor-pointer text-content">
          <ChevronLeft size={22} />
        </button>
        <h2 className="absolute left-1/2 -translate-x-1/2 m-0 text-[18px] font-bold text-content">비밀번호 찾기</h2>
      </div>

      {step === 'verify' && (
        <>
          <p className="m-0 mb-6 text-[14px] text-muted leading-relaxed relative z-10">
            가입된 이메일을 입력하면<br />비밀번호를 재설정할 수 있어요.
          </p>
          <div className="bg-white/90 backdrop-blur-sm rounded-[20px] shadow-card p-5 relative z-10">
            <Input label="이메일" type="email" placeholder="가입한 이메일을 입력해주세요"
              value={email} onChange={v => { setEmail(v); setEmailError(undefined); }}
              error={emailError ?? emailFormatError} />
          </div>
          <div className="flex-1" />
          <button type="button" onClick={handleVerify}
            disabled={!email || !!emailFormatError || isLoading}
            className="w-full h-14 rounded-[14px] text-white text-[16px] font-semibold bg-primary-gradient shadow-button disabled:opacity-50 disabled:cursor-not-allowed transition-opacity relative z-10 mt-6">
            {isLoading ? '확인 중...' : '다음'}
          </button>
        </>
      )}

      {step === 'reset' && (
        <>
          <p className="m-0 mb-6 text-[14px] text-muted leading-relaxed relative z-10">
            <span className="font-semibold text-primary">{email}</span> 계정의<br />새 비밀번호를 설정해주세요.
          </p>
          <div className="bg-white/90 backdrop-blur-sm rounded-[20px] shadow-card p-5 flex flex-col gap-4 relative z-10">
            <Input label="새 비밀번호" type={showNew ? 'text' : 'password'} placeholder="8자 이상 입력해주세요"
              value={newPw} onChange={setNewPw} error={pwLengthError}
              rightIcon={<EyeBtn show={showNew} onToggle={() => setShowNew(v => !v)} />} />
            <Input label="새 비밀번호 확인" type={showConfirm ? 'text' : 'password'} placeholder="비밀번호를 다시 입력해주세요"
              value={confirmPw} onChange={setConfirmPw} error={pwMatchError}
              rightIcon={<EyeBtn show={showConfirm} onToggle={() => setShowConfirm(v => !v)} />} />
          </div>
          <div className="flex-1" />
          <button type="button" onClick={handleReset}
            disabled={!newPw || newPw.length < 8 || !!pwMatchError || !confirmPw || isLoading}
            className="w-full h-14 rounded-[14px] text-white text-[16px] font-semibold bg-primary-gradient shadow-button disabled:opacity-50 disabled:cursor-not-allowed transition-opacity relative z-10 mt-6">
            {isLoading ? '변경 중...' : '비밀번호 변경'}
          </button>
        </>
      )}

      {step === 'done' && (
        <div className="flex flex-col items-center relative z-10 pt-8">
          <div className="w-[72px] h-[72px] rounded-full bg-success/15 flex items-center justify-center mb-5">
            <CheckCircle2 size={36} className="text-success" />
          </div>
          <p className="m-0 text-[16px] font-bold text-content mb-2">비밀번호가 변경됐어요!</p>
          <p className="m-0 text-[14px] text-muted mb-10">새 비밀번호로 로그인해주세요.</p>
          <button type="button" onClick={() => router.push('/login')}
            className="w-full h-14 rounded-[14px] text-white text-[16px] font-semibold bg-primary-gradient shadow-button">
            로그인으로 이동
          </button>
        </div>
      )}
    </div>
  );
}
