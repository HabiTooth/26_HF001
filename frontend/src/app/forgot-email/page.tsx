'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, CheckCircle2 } from 'lucide-react';
import Input from '@/components/atoms/Input';

function maskEmail(email: string) {
  const [local, domain] = email.split('@');
  return local.slice(0, 3) + '****@' + domain;
}

const MOCK_RESULT = maskEmail('habitooth2233@gmail.com');

export default function ForgotEmailPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [found, setFound] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const canSubmit = name.trim().length > 0 && phone.trim().length > 0;

  const handleFind = () => {
    setIsLoading(true);
    setNotFound(false);
    setTimeout(() => {
      setIsLoading(false);
      setFound(true);
    }, 900);
  };

  return (
    <div className="app-frame max-w-app min-h-[calc(100svh/var(--app-zoom))] mx-auto bg-background px-5 pt-[56px] pb-10 flex flex-col relative">
      <div className="aurora-blob-1" />
      <div className="aurora-blob-2" />
      <div className="aurora-blob-3" />

      <div className="flex items-center mb-8 relative z-10">
        <button type="button" onClick={() => router.back()}
          className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-white/60 transition-colors bg-transparent border-none cursor-pointer text-content">
          <ChevronLeft size={22} />
        </button>
        <h2 className="absolute left-1/2 -translate-x-1/2 m-0 text-[18px] font-bold text-content">이메일 찾기</h2>
      </div>

      {!found ? (
        <>
          <p className="m-0 mb-6 text-[14px] text-muted leading-relaxed relative z-10">
            가입 시 등록한 이름과 전화번호를 입력하면<br />이메일을 확인할 수 있어요.
          </p>

          <div className="bg-white/90 backdrop-blur-sm rounded-[20px] shadow-card p-5 flex flex-col gap-4 relative z-10">
            <Input label="이름" type="text" placeholder="이름을 입력해주세요" value={name} onChange={setName} />
            <Input label="전화번호" type="text" placeholder="010-0000-0000" value={phone} onChange={v => { setPhone(v); setNotFound(false); }}
              error={notFound ? '일치하는 계정을 찾을 수 없어요' : undefined} />
          </div>

          <div className="flex-1" />

          <button type="button" onClick={handleFind} disabled={!canSubmit || isLoading}
            className="w-full h-14 rounded-[14px] text-white text-[16px] font-semibold bg-primary-gradient shadow-button disabled:opacity-50 disabled:cursor-not-allowed transition-opacity relative z-10 mt-6">
            {isLoading ? '확인 중...' : '이메일 찾기'}
          </button>
        </>
      ) : (
        <div className="flex flex-col items-center relative z-10 pt-8">
          <div className="w-[72px] h-[72px] rounded-full bg-success/15 flex items-center justify-center mb-5">
            <CheckCircle2 size={36} className="text-success" />
          </div>
          <p className="m-0 text-[16px] font-bold text-content mb-2">이메일을 찾았어요!</p>
          <p className="m-0 text-[14px] text-muted mb-8">가입된 이메일 주소예요.</p>

          <div className="w-full bg-white/90 backdrop-blur-sm rounded-[20px] shadow-card px-5 py-4 mb-8 flex items-center justify-center">
            <span className="text-[17px] font-bold text-primary">{MOCK_RESULT}</span>
          </div>

          <div className="w-full flex flex-col gap-3">
            <button type="button"
              onClick={() => router.push('/forgot-password')}
              className="w-full h-14 rounded-[14px] text-white text-[16px] font-semibold bg-primary-gradient shadow-button">
              비밀번호 찾기
            </button>
            <button type="button" onClick={() => router.push('/login')}
              className="w-full h-11 text-[14px] font-semibold text-primary bg-transparent border-none cursor-pointer">
              로그인으로 이동
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
