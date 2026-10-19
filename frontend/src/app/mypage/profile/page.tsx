'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Camera, User, CalendarDays } from 'lucide-react';
import Input from '@/components/atoms/Input';
import { asIsoDate, formatBirthDate, todayIso } from '@/lib/birthDate';
import { userApi } from '@/lib/api/user';
import { apiErrorMessage } from '@/lib/apiError';

const KakaoIcon = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
    <path d="M10 2C5.58 2 2 4.9 2 8.44c0 2.26 1.46 4.25 3.68 5.37l-.94 3.5 4.08-2.69c.38.05.77.08 1.18.08 4.42 0 8-2.9 8-6.44S14.42 2 10 2z" fill="#3A1D1D" />
  </svg>
);

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66 2.84z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="float-field active" style={{ opacity: 0.7 }}>
      <label className="float-label">{label}</label>
      <span className="float-input pt-[14px] text-[15px] text-content select-none">{value}</span>
    </div>
  );
}

function SocialButton({ linked, onToggle }: { linked: boolean; onToggle: () => void }) {
  return linked
    ? <button type="button" onClick={onToggle}
        className="text-[12px] font-semibold text-muted bg-transparent border border-hairline rounded-[8px] px-3 h-7 cursor-pointer hover:border-danger hover:text-danger transition-colors">
        연동 해제
      </button>
    : <button type="button" onClick={onToggle}
        className="text-[12px] font-semibold text-primary bg-transparent border border-primary/30 rounded-[8px] px-3 h-7 cursor-pointer hover:bg-primary hover:text-white transition-colors">
        연동하기
      </button>;
}

export default function ProfileEditPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const visitRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [lastVisit, setLastVisit] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [kakaoLinked, setKakaoLinked] = useState(false);
  const [googleLinked, setGoogleLinked] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    userApi
      .getProfile()
      .then((res) => {
        const p = res.data.result;
        setEmail(p.email);
        setName(p.name ?? '');
        setBirthDate(p.birthDate ?? '');
        setLastVisit(p.lastDentalVisitAt ?? '');
      })
      .catch((e) => setLoadError(apiErrorMessage(e, '프로필을 불러오지 못했어요.')));
  }, []);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUrl(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await userApi.updateProfile({
        name: name.trim(),
        birthDate: birthDate || undefined,
        lastDentalVisitAt: lastVisit || undefined,
      });
      router.back();
    } catch (e) {
      setSaveError(apiErrorMessage(e, '저장에 실패했어요. 잠시 후 다시 시도해 주세요.'));
    } finally {
      setIsSaving(false);
    }
  };

  const canSave = name.trim().length > 0;

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
        <h2 className="absolute left-1/2 -translate-x-1/2 m-0 text-[18px] font-bold text-content">프로필 편집</h2>
      </div>

      <div className="flex flex-col items-center mb-8 relative z-10">
        <div className="relative">
          <div className="w-[88px] h-[88px] rounded-full bg-white shadow-card border border-hairline flex items-center justify-center overflow-hidden">
            {avatarUrl
              ? <img src={avatarUrl} alt="프로필" className="w-full h-full object-cover" />
              : <User size={40} className="text-primary" />}
          </div>
          <button type="button" onClick={() => fileRef.current?.click()}
            className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center border-2 border-white shadow-sm cursor-pointer">
            <Camera size={14} className="text-white" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
        </div>
        <button type="button" onClick={() => fileRef.current?.click()}
          className="mt-2.5 text-[13px] font-semibold text-primary bg-transparent border-none cursor-pointer">
          사진 변경
        </button>
      </div>

      {loadError && (
        <p className="m-0 mb-3 px-1 text-[13px] text-danger relative z-10">{loadError}</p>
      )}

      <div className="bg-white/90 backdrop-blur-sm rounded-[20px] shadow-card p-5 flex flex-col gap-4 relative z-10 mb-4">
        <ReadOnlyField label="이메일" value={email} />
        <Input label="이름" type="text" placeholder="이름을 입력해주세요" value={name} onChange={setName} />
        <Input
          label="생년월일"
          type="text"
          inputMode="numeric"
          placeholder="1995-03-15"
          value={birthDate}
          onChange={(v) => setBirthDate(formatBirthDate(v))}
          rightIcon={
            <span className="relative flex items-center">
              <button
                type="button"
                aria-label="달력에서 고르기"
                onClick={() => {
                  const el = dateRef.current;
                  if (!el) return;
                  // showPicker 막는 브라우저용 포커스 폴백
                  if (typeof el.showPicker === 'function') el.showPicker();
                  else el.focus();
                }}
                className="p-1 -m-1 text-muted hover:text-primary transition-colors"
              >
                <CalendarDays size={18} />
              </button>
              <input
                ref={dateRef}
                type="date"
                tabIndex={-1}
                aria-hidden
                max={todayIso()}
                value={asIsoDate(birthDate)}
                onChange={(e) => setBirthDate(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
              />
            </span>
          }
        />
        <Input
          label="마지막 치과 방문일"
          type="text"
          inputMode="numeric"
          placeholder="2026-03-01"
          value={lastVisit}
          onChange={(v) => setLastVisit(formatBirthDate(v))}
          rightIcon={
            <span className="relative flex items-center">
              <button
                type="button"
                aria-label="달력에서 고르기"
                onClick={() => {
                  const el = visitRef.current;
                  if (!el) return;
                  if (typeof el.showPicker === 'function') el.showPicker();
                  else el.focus();
                }}
                className="p-1 -m-1 text-muted hover:text-primary transition-colors"
              >
                <CalendarDays size={18} />
              </button>
              <input
                ref={visitRef}
                type="date"
                tabIndex={-1}
                aria-hidden
                max={todayIso()}
                value={asIsoDate(lastVisit)}
                onChange={(e) => setLastVisit(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
              />
            </span>
          }
        />
        <p className="m-0 -mt-1 px-1 text-[10.5px] text-muted leading-relaxed">
          6개월이 지나면 정기 검진 알림을 보내요.
        </p>
      </div>

      <div className="bg-white/90 backdrop-blur-sm rounded-[20px] shadow-card px-5 py-4 relative z-10 mb-4">
        <p className="m-0 mb-3 text-[11px] font-bold text-muted uppercase tracking-widest">소셜 계정 연동</p>
        <div className="flex flex-col divide-y divide-hairline">
          <div className="flex items-center gap-3 py-3">
            <div className="w-8 h-8 rounded-full bg-[#FEE500] flex items-center justify-center flex-shrink-0"><KakaoIcon /></div>
            <span className="flex-1 text-[13px] font-medium text-content">카카오</span>
            <SocialButton linked={kakaoLinked} onToggle={() => setKakaoLinked(v => !v)} />
          </div>
          <div className="flex items-center gap-3 py-3">
            <div className="w-8 h-8 rounded-full bg-white border border-hairline flex items-center justify-center flex-shrink-0"><GoogleIcon /></div>
            <span className="flex-1 text-[13px] font-medium text-content">Google</span>
            <SocialButton linked={googleLinked} onToggle={() => setGoogleLinked(v => !v)} />
          </div>
        </div>
      </div>

      <div className="flex-1" />

      {saveError && (
        <p className="m-0 mt-4 text-[13px] text-danger text-center relative z-10">{saveError}</p>
      )}

      <button type="button" onClick={handleSave} disabled={!canSave || isSaving}
        className="w-full h-14 rounded-[14px] text-white text-[16px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-opacity relative z-10 mt-6"
        style={{ background: 'linear-gradient(135deg, #4B7BF5 0%, #6B9BFF 100%)', boxShadow: '0 4px 16px rgba(75,123,245,0.35)' }}>
        {isSaving ? '저장 중...' : '저장하기'}
      </button>
    </div>
  );
}
