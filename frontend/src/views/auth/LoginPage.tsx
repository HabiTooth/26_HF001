'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import Input from '@/components/atoms/Input';
import Checkbox from '@/components/atoms/Checkbox';
import { authApi } from '@/lib/api/auth';
import { useAuthStore } from '@/stores/authStore';
import { destinationAfterLogin } from '@/lib/authRouting';

const KakaoIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M10 2C5.58 2 2 4.9 2 8.44c0 2.26 1.46 4.25 3.68 5.37l-.94 3.5 4.08-2.69c.38.05.77.08 1.18.08 4.42 0 8-2.9 8-6.44S14.42 2 10 2z" fill="#3A1D1D" />
  </svg>
);

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const OUTLINE_D = 'M 194 79 C 171 59 138 58 116 76 C 95 94 91 122 100 151 C 106 171 115 194 126 219 L 147 268 C 152 281 160 286 174 283 L 174 221 C 174 202 185 190 200 190 C 215 190 226 202 226 221 L 226 283 C 240 286 248 281 253 268 L 274 219 C 285 194 294 171 300 151 C 309 122 305 94 284 76 C 267 62 245 58 225 64';
const STEM_D = 'M 194 79 L 194 143';

const LogoIcon = () => (
  <svg width="40" height="40" viewBox="75 45 255 258" fill="none">
    <defs>
      <linearGradient id="loginLogoGrad" x1="75" y1="0" x2="330" y2="0" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#4A86D9" />
        <stop offset="0.4" stopColor="#93C5FD" />
        <stop offset="0.5" stopColor="#BFDBFE" />
        <stop offset="0.6" stopColor="#93C5FD" />
        <stop offset="1" stopColor="#4A86D9" />
        <animateTransform attributeName="gradientTransform" type="translate" from="-255 0" to="255 0" dur="2.6s" repeatCount="indefinite" />
      </linearGradient>
    </defs>
    <path d={OUTLINE_D} stroke="url(#loginLogoGrad)" strokeWidth="15.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d={STEM_D} stroke="url(#loginLogoGrad)" strokeWidth="15.5" strokeLinecap="round" />
    <circle cx={194} cy={143} r={16.5} fill="url(#loginLogoGrad)" />
    <circle cx={222} cy={70} r={16.5} fill="url(#loginLogoGrad)" />
  </svg>
);

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [shakeEmail, setShakeEmail] = useState(false);
  const [shakePassword, setShakePassword] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const setToken = useAuthStore((s) => s.setToken);

  const handleLogin = async () => {
    if (isLoading) return;
    let hasError = false;
    if (!email) { setShakeEmail(true); hasError = true; setTimeout(() => setShakeEmail(false), 500); }
    if (!password) { setShakePassword(true); hasError = true; setTimeout(() => setShakePassword(false), 500); }
    if (hasError) return;
    setIsLoading(true);
    setApiError(null);
    try {
      const res = await authApi.login({ email, password });
      setToken(res.data.result.accessToken, rememberMe);
      router.push(await destinationAfterLogin());
    } catch {
      setApiError('이메일 또는 비밀번호가 올바르지 않아요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-frame max-w-app min-h-[calc(100svh/var(--app-zoom))] mx-auto bg-background px-5 pt-[60px] pb-10 flex flex-col relative z-10">
      <div className="aurora-blob-1" />
      <div className="aurora-blob-2" />
      <div className="aurora-blob-3" />

      <div className="flex flex-col items-center gap-2.5 mb-8 relative z-10">
        <div className="w-[72px] h-[72px] bg-white rounded-[24px] flex items-center justify-center shadow-card border border-hairline">
          <LogoIcon />
        </div>
        <h1 className="m-0 text-[26px] font-bold text-content">
          <span className="text-primary">Habi</span>Tooth
        </h1>
        <p className="m-0 text-sm text-muted">가정용 AI 구강 모니터링 디바이스</p>
      </div>

      <div className="bg-white/90 backdrop-blur-sm rounded-[20px] shadow-card p-6 mb-5 relative z-10">
        <div className="flex flex-col gap-4 mb-4">
          <Input label="이메일" type="email" value={email} onChange={setEmail} shake={shakeEmail} />
          <Input
            label="비밀번호"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={setPassword}
            shake={shakePassword}
            rightIcon={
              <button type="button" onClick={() => setShowPassword((v) => !v)} className="flex items-center text-muted bg-transparent border-none cursor-pointer p-0">
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            }
          />
        </div>

        <div className="flex items-center justify-between mb-5">
          <Checkbox label="로그인 유지" checked={rememberMe} onChange={setRememberMe} />
          <div className="flex items-center gap-1.5 text-[13px]">
            <Link href="/forgot-email" className="text-primary no-underline">이메일 찾기</Link>
            <span className="text-muted">·</span>
            <Link href="/forgot-password" className="text-primary no-underline">비밀번호 찾기</Link>
          </div>
        </div>

        {apiError && (
          <p className="text-[13px] text-danger text-center mb-3 -mt-1">{apiError}</p>
        )}
        <button
          type="button"
          onClick={handleLogin}
          disabled={isLoading}
          className={`w-full h-[54px] rounded-[14px] text-white text-base font-semibold bg-primary-gradient shadow-button relative flex items-center justify-center cursor-pointer disabled:cursor-not-allowed transition-opacity ${!email || !password ? 'opacity-50' : ''}`}
        >
          <span className={`transition-opacity duration-150 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>로그인</span>
          <span className={`absolute transition-opacity duration-150 ${isLoading ? 'opacity-100' : 'opacity-0'}`}>
            <Loader2 size={20} className="animate-spin" />
          </span>
        </button>

        <p className="mt-4 mb-0 text-center text-sm text-muted">
          아직 계정이 없으신가요?{' '}
          <Link href="/register" className="text-primary font-semibold no-underline">회원가입</Link>
        </p>
      </div>

      <div className="flex items-center gap-3 mb-4 relative z-10">
        <div className="flex-1 h-px bg-hairline" />
        <span className="text-xs text-muted">또는</span>
        <div className="flex-1 h-px bg-hairline" />
      </div>

      <div className="flex flex-col gap-3 relative z-10">
        <button
          type="button"
          onClick={() => {
            const clientId = process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID;
            const redirectUri = `${window.location.origin}/oauth/kakao`;
            window.location.href = `https://kauth.kakao.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code`;
          }}
          className="w-full h-[50px] bg-white border border-hairline rounded-[14px] flex items-center justify-center gap-2 text-[15px] font-medium text-content cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card"
        >
          <KakaoIcon />
          카카오로 시작하기
        </button>
        <button
          type="button"
          onClick={() => {
            const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
            const redirectUri = `${window.location.origin}/oauth/google`;
            const scope = encodeURIComponent('email profile');
            window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
          }}
          className="w-full h-[50px] bg-white border border-hairline rounded-[14px] flex items-center justify-center gap-2 text-[15px] font-medium text-content cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card"
        >
          <GoogleIcon />
          Google로 시작하기
        </button>
      </div>
    </div>
  );
}
