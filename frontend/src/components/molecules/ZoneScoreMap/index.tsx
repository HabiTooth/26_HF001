'use client';

import { useId } from 'react';
import type { ViewType } from '@/lib/api/scan';
import { SCAN_ZONES } from '@/constants/scanZones';
import { archTeeth, crownPath, type Surface } from '@/components/molecules/ToothArchSelector';

export interface ZoneScore {
  viewType: ViewType;
  captured: boolean;
  zoneScore: number | null;
}

// 구역 점수 색. 하단 범례와 동일
export const SCORE_BANDS = [
  { min: 90, label: '좋음', fill: '#C9EBDD', stroke: '#7FC9AE', ink: '#2E7A5E' },
  { min: 75, label: '양호', fill: '#D3E5FA', stroke: '#86B6F0', ink: '#2F66B2' },
  { min: 60, label: '주의', fill: '#FBE8BE', stroke: '#E7BF63', ink: '#8A6413' },
  { min: 0, label: '관리 필요', fill: '#F8D3D3', stroke: '#E79A9A', ink: '#A33F3F' },
];
const UNCAPTURED = { fill: '#F3F6FA', stroke: '#D4DEEA', ink: '#9AA9BC' };
const bandOf = (score: number) => SCORE_BANDS.find((b) => score >= b.min) ?? SCORE_BANDS[3];

// 스캔 페이지 치식도에 구역 점수를 얹은 지도. 구역을 누르면 상세
export default function ZoneScoreMap({
  zones,
  surface,
  onSurfaceChange,
  opened,
  onZoneClick,
}: {
  zones: ZoneScore[];
  surface: Surface;
  onSurfaceChange: (s: Surface) => void;
  opened: ViewType | null;
  onZoneClick: (zone: ViewType) => void;
}) {
  const uid = useId().replace(/:/g, '');
  const teeth = [...archTeeth(false, surface), ...archTeeth(true, surface)];
  const zoneIds = [
    ...new Set(teeth.map((t) => t.zone).filter((zone): zone is ViewType => zone !== null)),
  ];
  const nameOf = (zone: ViewType) => SCAN_ZONES.find((z) => z.viewType === zone)?.fullLabel ?? zone;

  return (
    <div className="flex flex-col items-center">
      <div className="grid w-full max-w-[300px] grid-cols-2 gap-1 rounded-full bg-[#EDF3FA] p-1">
        {(
          [
            ['LINGUAL', '안쪽'],
            ['BUCCAL', '바깥쪽'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={surface === value}
            onClick={() => onSurfaceChange(value)}
            className={`rounded-full py-1.5 text-[12px] font-bold transition-colors ${surface === value ? 'bg-white text-[#397BCB] shadow-sm' : 'text-[#7589A3]'}`}
          >
            {label}
          </button>
        ))}
      </div>
      <svg
        viewBox="0 0 480 224"
        className="mt-2 w-full max-h-[218px]"
        role="group"
        aria-label={`${surface === 'LINGUAL' ? '안쪽' : '바깥쪽'} 구역별 점수`}
      >
        <defs>
          <radialGradient id={`${uid}-light`} cx="35%" cy="20%" r="80%">
            <stop stopColor="#FFFFFF" stopOpacity=".55" />
            <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
        </defs>
        <text x="120" y="26" textAnchor="middle" fill="#405571" fontSize="17" fontWeight="700">
          윗니
        </text>
        <text x="360" y="26" textAnchor="middle" fill="#405571" fontSize="17" fontWeight="700">
          아랫니
        </text>
        {zoneIds.map((zone) => {
          const item = zones.find((z) => z.viewType === zone);
          const captured = Boolean(item?.captured);
          const score = item?.zoneScore ?? null;
          const tone = captured && score !== null ? bandOf(score) : UNCAPTURED;
          const active = opened === zone;
          const members = teeth.filter((t) => t.zone === zone);
          // 위아래 아치에 걸친 바깥쪽 구역은 윗니 치아 위에 알약
          const upper = members.filter((t) => !t.lower);
          const anchor = upper.length > 0 ? upper : members;
          const cx = anchor.reduce((sum, t) => sum + t.x, 0) / anchor.length;
          const cy = anchor.reduce((sum, t) => sum + t.y, 0) / anchor.length;
          const label = captured ? (score === null ? '—' : String(score)) : '';
          return (
            <g
              key={zone}
              role="button"
              tabIndex={captured ? 0 : -1}
              aria-disabled={!captured}
              aria-expanded={active}
              aria-label={`${nameOf(zone)} ${captured ? (score !== null ? `${score}점` : '분석 미완료') : '미촬영'}`}
              onClick={() => captured && onZoneClick(zone)}
              onKeyDown={(e) => {
                if (captured && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onZoneClick(zone);
                }
              }}
              className="outline-none [&:focus-visible_path]:stroke-[#255BA4] [&:focus-visible_path]:stroke-[3]"
              style={{ cursor: captured ? 'pointer' : 'default' }}
            >
              <title>{nameOf(zone)}</title>
              {members.map((t) => (
                <g
                  key={t.fdi}
                  transform={`translate(${t.x} ${t.y}) rotate(${t.rotation}) scale(${t.width / (t.n <= 3 ? 22 : 28)} ${t.height / 30})`}
                >
                  <path
                    d={crownPath(t.n)}
                    fill={tone.fill}
                    stroke={active ? '#255BA4' : tone.stroke}
                    strokeWidth={active ? 2.2 : 1.1}
                    strokeDasharray={captured ? undefined : '2 2'}
                    strokeLinejoin="round"
                  />
                  <path d={crownPath(t.n)} fill={`url(#${uid}-light)`} pointerEvents="none" />
                </g>
              ))}
              {label && (
                <g>
                  <rect
                    x={cx - 17}
                    y={cy - 10}
                    width="34"
                    height="20"
                    rx="10"
                    fill="#FFFFFF"
                    stroke={active ? '#255BA4' : tone.stroke}
                    strokeWidth="1"
                  />
                  <text
                    x={cx}
                    y={cy + 4.5}
                    textAnchor="middle"
                    fill={tone.ink}
                    fontSize="12.5"
                    fontWeight="700"
                  >
                    {label}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] font-semibold text-[#62758E]">
        {SCORE_BANDS.map((band) => (
          <span key={band.label} className="flex items-center gap-1">
            <span
              className="h-2.5 w-2.5 rounded-full border"
              style={{ backgroundColor: band.fill, borderColor: band.stroke }}
            />
            {band.label}
            {band.min > 0 ? ` ${band.min}+` : ''}
          </span>
        ))}
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full border border-dashed border-[#B4C2D3] bg-[#F3F6FA]" />
          미촬영
        </span>
      </div>
    </div>
  );
}
