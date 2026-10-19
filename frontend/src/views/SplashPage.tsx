'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { destinationAfterLogin } from '@/lib/authRouting';
import { isTokenExpired } from '@/lib/tokenStorage';

const OUTLINE_D =
  'M 194 79 C 171 59 138 58 116 76 C 95 94 91 122 100 151 C 106 171 115 194 126 219 L 147 268 C 152 281 160 286 174 283 L 174 221 C 174 202 185 190 200 190 C 215 190 226 202 226 221 L 226 283 C 240 286 248 281 253 268 L 274 219 C 285 194 294 171 300 151 C 309 122 305 94 284 76 C 267 62 245 58 225 64';
const STEM_D = 'M 194 79 L 194 143';

export default function SplashPage() {
  const router = useRouter();
  const outlineRef = useRef<SVGPathElement>(null);
  const stemRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    [outlineRef, stemRef].forEach((ref) => {
      const el = ref.current;
      if (!el) return;
      const len = Math.ceil(el.getTotalLength());
      el.style.setProperty('--len', `${len}`);
      el.style.strokeDasharray = `${len}`;
      el.style.strokeDashoffset = `${len}`;
      void el.getBoundingClientRect();
      el.classList.add('active');
    });

    let cancelled = false;
    (async () => {
      const { token, clearAuth } = useAuthStore.getState();
      // 만료 토큰은 로컬에서 정리
      if (token && isTokenExpired(token)) clearAuth();
      const valid = token && !isTokenExpired(token);
      const [dest] = await Promise.all([
        valid ? destinationAfterLogin() : Promise.resolve('/onboarding'),
        new Promise((r) => setTimeout(r, 3500)),
      ]);
      if (!cancelled) router.push(dest);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="splash-page">
      <div className="splash-wrap">
        <svg
          width="160"
          height="160"
          viewBox="75 45 255 258"
          fill="none"
          style={{ overflow: 'visible' }}
        >
          <defs>
            <linearGradient
              id="toothGrad"
              x1="75"
              y1="0"
              x2="330"
              y2="0"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0" stopColor="#a8d8ff" />
              <stop offset="0.4" stopColor="#e8f6ff" />
              <stop offset="0.5" stopColor="#ffffff" />
              <stop offset="0.6" stopColor="#e8f6ff" />
              <stop offset="1" stopColor="#a8d8ff" />
              <animateTransform
                attributeName="gradientTransform"
                type="translate"
                from="-255 0"
                to="255 0"
                dur="2.6s"
                repeatCount="indefinite"
              />
            </linearGradient>
          </defs>
          <path
            ref={outlineRef}
            d={OUTLINE_D}
            stroke="url(#toothGrad)"
            strokeWidth="15.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            className="splash-outline"
          />
          <path
            ref={stemRef}
            d={STEM_D}
            stroke="url(#toothGrad)"
            strokeWidth="15.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            className="splash-stem"
          />
          <circle cx={194} cy={143} r={16.5} fill="url(#toothGrad)" className="splash-dot-lower" />
          <circle cx={222} cy={70} r={16.5} fill="url(#toothGrad)" className="splash-dot-upper" />
        </svg>

        <div style={{ textAlign: 'center' }}>
          <div className="splash-title">
            {'HabiTooth'.split('').map((ch, i) => (
              <span
                key={i}
                className="splash-letter"
                style={
                  {
                    display: 'inline-block',
                    '--delay': `${1.55 + i * 0.045}s`,
                  } as React.CSSProperties
                }
              >
                {ch}
              </span>
            ))}
          </div>
          <p className="splash-tagline">가정용 AI 구강 모니터링 디바이스</p>
        </div>
      </div>
    </div>
  );
}
