'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Bluetooth, Bot, BarChart3, Loader2 } from 'lucide-react';

const OUTLINE_D =
  'M 194 79 C 171 59 138 58 116 76 C 95 94 91 122 100 151 C 106 171 115 194 126 219 L 147 268 C 152 281 160 286 174 283 L 174 221 C 174 202 185 190 200 190 C 215 190 226 202 226 221 L 226 283 C 240 286 248 281 253 268 L 274 219 C 285 194 294 171 300 151 C 309 122 305 94 284 76 C 267 62 245 58 225 64';
const STEM_D = 'M 194 79 L 194 143';

function LogoIcon() {
  return (
    <svg width="40" height="40" viewBox="75 45 255 258" fill="none">
      <defs>
        <linearGradient
          id="onboardingLogoGrad"
          x1="75"
          y1="0"
          x2="330"
          y2="0"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#4A86D9" />
          <stop offset="0.4" stopColor="#93C5FD" />
          <stop offset="1" stopColor="#4A86D9" />
        </linearGradient>
      </defs>
      <path
        d={OUTLINE_D}
        stroke="url(#onboardingLogoGrad)"
        strokeWidth="15.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d={STEM_D} stroke="url(#onboardingLogoGrad)" strokeWidth="15.5" strokeLinecap="round" />
      <circle cx={194} cy={143} r={16.5} fill="url(#onboardingLogoGrad)" />
      <circle cx={222} cy={70} r={16.5} fill="url(#onboardingLogoGrad)" />
    </svg>
  );
}

function FeatureRow({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3.5 py-3 border-b border-hairline last:border-b-0">
      <div className="w-10 h-10 rounded-[12px] bg-primary-light flex items-center justify-center text-primary flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className="m-0 text-[14px] font-semibold text-content">{title}</p>
        <p className="m-0 mt-0.5 text-[12px] text-muted leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function PermissionRow({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-hairline last:border-b-0">
      <div className="w-10 h-10 rounded-[12px] bg-primary-light flex items-center justify-center text-primary flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className="m-0 text-[14px] font-medium text-content">{title}</p>
        <p className="m-0 mt-0.5 text-[12px] text-muted">{desc}</p>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [requesting, setRequesting] = useState(false);

  const handleStart = async () => {
    setRequesting(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      stream.getTracks().forEach((t) => t.stop());
    } catch {}

    router.push('/login');
  };

  return (
    <div className="app-frame max-w-app min-h-[calc(100svh/var(--app-zoom))] mx-auto bg-background px-5 pt-[60px] pb-10 flex flex-col relative">
      <div className="aurora-blob-1" />
      <div className="aurora-blob-2" />
      <div className="aurora-blob-3" />

      <div className="relative z-10 flex flex-col flex-1">
        <div className="flex flex-col items-center gap-2.5 mb-8">
          <div className="w-[72px] h-[72px] bg-white rounded-[24px] flex items-center justify-center shadow-card border border-hairline">
            <LogoIcon />
          </div>
          <h1 className="m-0 text-[26px] font-bold text-content">
            <span className="text-primary">Habi</span>Tooth
          </h1>
          <p className="m-0 text-sm text-muted">가정용 AI 구강 모니터링 디바이스</p>
        </div>

        <div className="bg-white/90 backdrop-blur-sm rounded-[20px] shadow-card px-4 pt-3 pb-1 mb-4">
          <p className="m-0 text-[11px] font-bold text-muted uppercase tracking-widest mb-1">
            주요 기능
          </p>
          <FeatureRow
            icon={<Camera size={20} />}
            title="UV 듀얼 촬영"
            desc="치태·치석을 눈에 보이지 않던 영역까지 감지해요"
          />
          <FeatureRow
            icon={<Bot size={20} />}
            title="AI 구강 모니터링"
            desc="AI가 관리 위험 부위를 정밀하게 분석해요"
          />
          <FeatureRow
            icon={<BarChart3 size={20} />}
            title="3D 리포트"
            desc="구강 상태를 3D로 시각화하고 관리 가이드를 제공해요"
          />
        </div>

        <div className="bg-white/90 backdrop-blur-sm rounded-[20px] shadow-card px-4 pt-3 pb-1 mb-4">
          <p className="m-0 text-[11px] font-bold text-muted uppercase tracking-widest mb-1">
            권한 안내
          </p>
          <PermissionRow icon={<Camera size={20} />} title="카메라" desc="구강 촬영에 필요해요" />
          <PermissionRow
            icon={<Bluetooth size={20} />}
            title="블루투스"
            desc="디바이스 연결에 필요해요"
          />
        </div>

        <div className="flex-1 min-h-6" />

        <button
          type="button"
          onClick={handleStart}
          disabled={requesting}
          className="w-full h-14 rounded-[14px] bg-primary-gradient text-white text-[16px] font-semibold shadow-button disabled:opacity-70 flex items-center justify-center gap-2"
        >
          {requesting ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              권한 요청 중...
            </>
          ) : (
            '시작하기'
          )}
        </button>
      </div>
    </div>
  );
}
