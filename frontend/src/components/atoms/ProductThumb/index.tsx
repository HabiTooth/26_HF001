import type { ProductArt } from '@/constants/products';
import Image from 'next/image';

const ART: Record<ProductArt, React.ReactNode> = {
  brush: (
    <g>
      <rect x="14" y="40" width="34" height="8" rx="4" fill="#4A86D9" />
      <rect x="44" y="38" width="16" height="12" rx="5" fill="#7EB8F7" />
      <g stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round">
        <path d="M47 38v-7M51 38v-9M55 38v-7M59 38v-5" />
      </g>
      <rect x="14" y="42" width="12" height="4" rx="2" fill="#3A78CA" />
    </g>
  ),
  electric: (
    <g>
      <rect x="18" y="30" width="16" height="30" rx="7" fill="#6B5BD2" />
      <rect x="22" y="36" width="8" height="3" rx="1.5" fill="#FFFFFF" opacity="0.7" />
      <rect x="22" y="42" width="8" height="3" rx="1.5" fill="#FFFFFF" opacity="0.45" />
      <rect x="23" y="16" width="6" height="16" rx="3" fill="#A99CEC" />
      <circle cx="26" cy="14" r="8" fill="#FFFFFF" stroke="#A99CEC" strokeWidth="2.5" />
      <g stroke="#6B5BD2" strokeWidth="2" strokeLinecap="round">
        <path d="M22 14h8M26 10v8" />
      </g>
      <path
        d="M44 26l-6 12h6l-4 12"
        stroke="#F0B65A"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </g>
  ),
  paste: (
    <g>
      <path d="M22 26h28l-4 34a4 4 0 01-4 3.6H30a4 4 0 01-4-3.6z" fill="#4BC8A0" />
      <path d="M26 40h20l-2 20a4 4 0 01-4 3.6h-8a4 4 0 01-4-3.6z" fill="#FFFFFF" opacity="0.55" />
      <rect x="26" y="18" width="20" height="9" rx="3" fill="#2FA37F" />
      <rect x="32" y="10" width="8" height="9" rx="2.5" fill="#2FA37F" />
    </g>
  ),
  tartar: (
    <g>
      <path d="M22 26h28l-4 34a4 4 0 01-4 3.6H30a4 4 0 01-4-3.6z" fill="#4A86D9" />
      <path d="M26 40h20l-2 20a4 4 0 01-4 3.6h-8a4 4 0 01-4-3.6z" fill="#FFFFFF" opacity="0.5" />
      <rect x="26" y="18" width="20" height="9" rx="3" fill="#3A78CA" />
      <rect x="32" y="10" width="8" height="9" rx="2.5" fill="#3A78CA" />
      <path d="M55 20l1.8 5.2L62 27l-5.2 1.8L55 34l-1.8-5.2L48 27l5.2-1.8z" fill="#FFD66B" />
    </g>
  ),
  floss: (
    <g>
      <rect x="16" y="24" width="40" height="30" rx="10" fill="#EE8A86" />
      <circle cx="36" cy="39" r="10" fill="#FFFFFF" opacity="0.85" />
      <circle cx="36" cy="39" r="3.5" fill="#EE8A86" />
      <path
        d="M56 40c6 2 8 8 4 14"
        stroke="#FFFFFF"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M56 40c6 2 8 8 4 14"
        stroke="#D96B67"
        strokeWidth="1"
        strokeLinecap="round"
        fill="none"
      />
    </g>
  ),
  interdental: (
    <g transform="translate(0, -9.5)">
      <rect x="12" y="42" width="30" height="7" rx="3.5" fill="#F0B65A" />
      <rect x="12" y="43.5" width="10" height="4" rx="2" fill="#D99A3C" />
      <path d="M42 45.5h22" stroke="#8A94A6" strokeWidth="2" strokeLinecap="round" />
      <g stroke="#C97F2E" strokeWidth="2" strokeLinecap="round">
        <path d="M46 39v13M51 37v17M56 38v15M61 40v11" />
      </g>
    </g>
  ),
  waterjet: (
    <g>
      <rect x="16" y="34" width="22" height="30" rx="7" fill="#3FA8CC" />
      <rect x="21" y="41" width="12" height="4" rx="2" fill="#FFFFFF" opacity="0.6" />
      <rect x="24" y="20" width="6" height="15" rx="3" fill="#7ACBE3" />
      <path
        d="M27 20c0-4 6-6 6-10"
        stroke="#7ACBE3"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      />
      <g fill="#67E8F9">
        <circle cx="42" cy="16" r="3.2" />
        <circle cx="50" cy="22" r="2.4" />
        <circle cx="57" cy="29" r="1.8" />
      </g>
    </g>
  ),
  mouthwash: (
    <g>
      <path d="M20 30h32v28a6 6 0 01-6 6H26a6 6 0 01-6-6z" fill="#7BC96F" />
      <path d="M20 44h32v14a6 6 0 01-6 6H26a6 6 0 01-6-6z" fill="#FFFFFF" opacity="0.4" />
      <rect x="28" y="20" width="16" height="11" rx="3" fill="#5AA84E" />
      <rect x="30" y="12" width="12" height="9" rx="3" fill="#8FD684" />
      <g fill="#FFFFFF" opacity="0.75">
        <circle cx="55" cy="24" r="4" />
        <circle cx="61" cy="32" r="2.6" />
      </g>
    </g>
  ),
  tongue: (
    <g>
      <path d="M20 40c0-9 7-15 16-15s16 6 16 15-7 14-16 14-16-5-16-14z" fill="#F09AB0" />
      <path d="M36 25v29" stroke="#D97A93" strokeWidth="2" strokeLinecap="round" />
      <rect x="14" y="44" width="44" height="6" rx="3" fill="#7EB8F7" />
      <rect x="52" y="44" width="14" height="6" rx="3" fill="#4A86D9" />
    </g>
  ),
};

export default function ProductThumb({
  art,
  tint,
  size = 56,
  clay = false,
}: {
  art: ProductArt;
  tint: string;
  size?: number;
  clay?: boolean;
}) {
  return (
    <div
      className="rounded-[16px] flex items-center justify-center flex-shrink-0 overflow-hidden"
      style={{ backgroundColor: tint, width: size, height: size }}
    >
      {clay ? (
        <Image
          src={`/images/products/clay/${art}.webp`}
          alt=""
          width={size}
          height={size}
          sizes={`${size}px`}
          className="w-full h-full object-contain p-2"
        />
      ) : (
        <svg width={size - 6} height={size - 6} viewBox="0 0 72 72" aria-hidden>
          {ART[art]}
        </svg>
      )}
    </div>
  );
}
