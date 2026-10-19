'use client';

import { GUM_LOWER, GUM_UPPER, PALATE, TONGUE_SHADE, TOOTH_SHAPES } from '@/constants/toothShapes';
import { LOWER_ROW, UPPER_ROW } from '@/lib/dentition';

const ALL = [...UPPER_ROW, ...LOWER_ROW];

export default function ToothArch({
  missing,
  onToggle,
  selected,
}: {
  missing: number[];
  onToggle: (tooth: number) => void;
  selected: number | null;
}) {
  const order = selected === null ? ALL : [...ALL.filter((t) => t !== selected), selected];

  return (
    <div className="relative w-full max-w-[300px] mx-auto">
      <svg viewBox="242 62 540 900" className="w-full h-auto block">
        <defs>
          <linearGradient id="arch-gum-upper" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e8848f" />
            <stop offset="62%" stopColor="#e37886" />
            <stop offset="100%" stopColor="#dd6c7c" />
          </linearGradient>
          <linearGradient id="arch-gum-lower" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e37886" />
            <stop offset="100%" stopColor="#da6a7a" />
          </linearGradient>
          {ALL.map((tooth) =>
            TOOTH_SHAPES[tooth]?.detail ? (
              <clipPath key={tooth} id={`arch-clip-${tooth}`}>
                <path d={TOOTH_SHAPES[tooth].base} />
              </clipPath>
            ) : null,
          )}
        </defs>

        <path d={GUM_UPPER} fill="url(#arch-gum-upper)" />
        <path d={GUM_LOWER} fill="url(#arch-gum-lower)" />
        <path d={PALATE} fill="#bf5468" opacity="0.6" />
        <path d={TONGUE_SHADE} fill="#bf5468" opacity="0.4" />

        {order.map((tooth) => {
          const shape = TOOTH_SHAPES[tooth];
          if (!shape) return null;

          const gone = missing.includes(tooth);
          const active = selected === tooth;

          return (
            <g
              key={tooth}
              role="button"
              tabIndex={0}
              aria-label={`${tooth}번 치아`}
              aria-pressed={gone}
              onClick={() => onToggle(tooth)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter' && e.key !== ' ') return;
                e.preventDefault();
                onToggle(tooth);
              }}
              className="cursor-pointer outline-none"
              style={
                active ? { filter: 'drop-shadow(0 0 5px rgba(74, 134, 217, 0.75))' } : undefined
              }
            >
              <path
                d={shape.base}
                fill={gone ? '#cd6d7b' : active ? '#e8f1fd' : '#ffffff'}
                fillOpacity={gone ? 0.75 : 1}
                stroke={active ? '#4A86D9' : gone ? '#b8505f' : '#c95460'}
                strokeWidth={active ? 5 : 3.5}
                strokeLinejoin="round"
                className="transition-[fill,stroke] duration-150"
              />
              {shape.detail && !gone && (
                <path
                  d={shape.detail}
                  clipPath={`url(#arch-clip-${tooth})`}
                  fill="#dfe4ea"
                  opacity={0.55}
                  pointerEvents="none"
                />
              )}
              {/* 앞니 터치 영역 확장용 */}
              <path d={shape.base} fill="transparent" stroke="transparent" strokeWidth={14} />
            </g>
          );
        })}
      </svg>

      <span className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 text-[10px] font-semibold text-muted">
        오른쪽
      </span>
      <span className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 text-[10px] font-semibold text-muted">
        왼쪽
      </span>
    </div>
  );
}
