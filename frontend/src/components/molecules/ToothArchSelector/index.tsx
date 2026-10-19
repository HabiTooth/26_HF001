'use client';

import { useId, useState } from 'react';
import { Check, Hand, Info } from 'lucide-react';
import type { ViewType } from '@/lib/api/scan';
import { toothToZone, SCAN_ZONES } from '@/constants/scanZones';

export type Surface = 'LINGUAL' | 'BUCCAL';
export interface ToothArchSelectorProps {
  surface: Surface;
  onSurfaceChange: (s: Surface) => void;
  selected: ViewType[];
  captured: ViewType[];
  current?: ViewType | null;
  onZoneClick: (zone: ViewType) => void;
  lockUnselected?: boolean;
  className?: string;
  compact?: boolean;
  mode?: 'selection' | 'capture';
}

export function archTeeth(lower: boolean, surface: Surface) {
  const positions = [
    [108, 57, 22, 29, -4],
    [85, 62, 20, 27, -17],
    [65, 76, 20, 28, -33],
    [50, 95, 22, 23, -53],
    [40, 118, 23, 24, -70],
    [35, 144, 26, 27, -82],
    [33, 173, 27, 28, -88],
    [34, 203, 26, 27, -92],
  ];
  return Array.from({ length: 16 }, (_, i) => {
    const quadrant = lower ? (i < 8 ? 3 : 4) : i < 8 ? 2 : 1;
    const n = i < 8 ? 8 - i : i - 7;
    const [x, y, width, height, rotation] = positions[n - 1];
    const left = i < 8;
    const upperX = left ? x : 240 - x;
    const upperRotation = left ? rotation : -rotation;
    const fdi = quadrant * 10 + n;
    // 아랫니는 윗니를 180도 돌린 배치. 윗니 오른쪽이 화면 오른쪽이면 아랫니 오른쪽은 화면 왼쪽
    return {
      fdi,
      n,
      lower,
      width,
      height,
      zone: toothToZone(fdi, surface),
      x: lower ? 480 - upperX : upperX,
      y: lower ? 260 - y : y,
      rotation: lower ? upperRotation + 180 : upperRotation,
    };
  });
}

export function crownPath(n: number) {
  if (n <= 2) return 'M-9-13Q0-16 9-13C12-10 8 8 5 12Q0 16-5 12C-8 8-12-10-9-13Z';
  if (n === 3) return 'M0-15C4-14 10-6 10 0C10 7 5 13 0 14C-5 13-10 7-10 0C-10-6-4-14 0-15Z';
  if (n <= 5) return 'M-8-10C-3-14 6-13 10-6C14 1 9 10 2 12C-6 14-12 7-12 0Q-12-6-8-10Z';
  return 'M-10-12C-6-15-3-12 0-12C4-12 7-15 11-11C15-7 13 0 13 6C13 12 8 14 2 14C-5 15-12 13-13 7C-14 0-15-7-10-12Z';
}

export default function ToothArchSelector({
  surface,
  onSurfaceChange,
  selected,
  captured,
  current = null,
  onZoneClick,
  lockUnselected = false,
  className = '',
  compact = false,
  mode = 'selection',
}: ToothArchSelectorProps) {
  const uid = useId().replace(/:/g, '');
  const [lastZone, setLastZone] = useState<ViewType | null>(null);
  const selectedSet = new Set(selected);
  const capturedSet = new Set(captured);
  const teeth = [...archTeeth(false, surface), ...archTeeth(true, surface)];
  const zones = [
    ...new Set(teeth.map((t) => t.zone).filter((zone): zone is ViewType => zone !== null)),
  ];
  const nameOf = (zone: ViewType) => SCAN_ZONES.find((z) => z.viewType === zone)?.fullLabel ?? zone;

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="grid grid-cols-2 gap-1 p-1 rounded-full bg-[#EDF3FA] w-full max-w-[300px]">
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
            onClick={() => {
              setLastZone(null);
              onSurfaceChange(value);
            }}
            className={`rounded-full py-1.5 text-[12px] font-bold transition-colors ${surface === value ? 'bg-white text-[#397BCB] shadow-sm' : 'text-[#7589A3]'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {surface === 'BUCCAL' && (
        <div className="mt-3 flex items-center justify-center gap-1.5 text-[12px] font-semibold leading-relaxed text-[#7186A3]" role="note">
          <Info size={13} className="shrink-0" aria-hidden />
          <span>위아래 함께 · 총 3구역</span>
        </div>
      )}
      <svg
        viewBox="0 0 480 224"
        className={`w-full mt-2 ${compact ? 'max-h-[152px]' : 'max-h-[218px]'}`}
        role="group"
        aria-label={`${surface === 'LINGUAL' ? '안쪽' : '바깥쪽'} 촬영 구역 선택`}
      >
        <defs>
          <linearGradient id={`${uid}-ivory`} x1="0" y1="0" x2="0.25" y2="1">
            <stop stopColor="#FFFFFF" />
            <stop offset=".5" stopColor="#F5FAFF" />
            <stop offset="1" stopColor="#DBEBFF" />
          </linearGradient>
          <linearGradient id={`${uid}-selected`} x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#AFD4FF" />
            <stop offset="1" stopColor="#609FFF" />
          </linearGradient>
          <linearGradient id={`${uid}-done`} x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#D4F3EA" />
            <stop offset="1" stopColor="#9CDCCC" />
          </linearGradient>
          <linearGradient id={`${uid}-active`} x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#FFDB9A" />
            <stop offset="1" stopColor="#F2AA4C" />
          </linearGradient>
          <radialGradient id={`${uid}-light`} cx="35%" cy="20%" r="80%">
            <stop stopColor="#FFFFFF" stopOpacity=".5" />
            <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
        </defs>
        <text x="120" y="26" textAnchor="middle" fill="#405571" fontSize="17" fontWeight="700">
          윗니
        </text>
        <text x="360" y="26" textAnchor="middle" fill="#405571" fontSize="17" fontWeight="700">
          아랫니
        </text>
        <text x="120" y="150" textAnchor="middle" fill="#91A3B9" fontSize="12" fontWeight="500">
          {surface === 'LINGUAL' ? '안쪽 면' : '바깥 면'}
        </text>
        <text x="360" y="122" textAnchor="middle" fill="#91A3B9" fontSize="12" fontWeight="500">
          {surface === 'LINGUAL' ? '안쪽 면' : '바깥 면'}
        </text>
        {zones.map((zone) => {
          const locked = lockUnselected && !selectedSet.has(zone);
          const active = current === zone;
          const done = capturedSet.has(zone);
          const picked = selectedSet.has(zone);
          const fill = locked
            ? '#F1F5FA'
            : `url(#${uid}-${active ? 'active' : done ? 'done' : picked ? 'selected' : 'ivory'})`;
          const stroke = locked
            ? '#DCE6F1'
            : active
              ? '#D58B2B'
              : done
                ? '#82CDB9'
                : picked
                  ? '#6AA7F4'
                  : '#ACCFF7';
          return (
            <g
              key={zone}
              role="button"
              tabIndex={locked ? -1 : 0}
              aria-disabled={locked}
              aria-pressed={picked}
              aria-current={active ? 'step' : undefined}
              aria-label={`${nameOf(zone)}${done ? ', 촬영 완료' : ''}${active ? ', 현재 촬영 중' : ''}`}
              onClick={() => {
                if (!locked) {
                  setLastZone(zone);
                  onZoneClick(zone);
                }
              }}
              onKeyDown={(e) => {
                if (!locked && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  setLastZone(zone);
                  onZoneClick(zone);
                }
              }}
              className="outline-none [&:focus-visible_path]:stroke-[#255BA4] [&:focus-visible_path]:stroke-[3]"
              style={{ cursor: locked ? 'not-allowed' : 'pointer' }}
            >
              <title>{nameOf(zone)}</title>
              {teeth
                .filter((t) => t.zone === zone)
                .map((t) => {
                  return (
                    <g
                      key={t.fdi}
                      data-tooth={t.fdi}
                      transform={`translate(${t.x} ${t.y}) rotate(${t.rotation}) scale(${t.width / (t.n <= 3 ? 22 : 28)} ${t.height / 30})`}
                      opacity={locked ? 0.65 : 1}
                    >
                      <path
                        d={crownPath(t.n)}
                        fill={fill}
                        stroke={stroke}
                        strokeWidth={active ? 2 : 1.1}
                        strokeDasharray={locked ? '2 2' : undefined}
                        strokeLinejoin="round"
                      />
                      <path d={crownPath(t.n)} fill={`url(#${uid}-light)`} pointerEvents="none" />
                      {t.n <= 2 && (
                        <path
                          d="M-7-11Q0-13 7-11"
                          fill="none"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          opacity=".85"
                          pointerEvents="none"
                        />
                      )}
                      {t.n >= 4 && !active && (
                        <path
                          d={t.n >= 6 ? 'M-4 1Q0-1 4 0' : 'M-2 0Q0-1 2 0'}
                          fill="none"
                          stroke={picked || active || done ? '#FFFFFF' : '#A5C8EF'}
                          strokeWidth=".9"
                          strokeLinecap="round"
                          opacity=".75"
                          pointerEvents="none"
                        />
                      )}
                      {active && <g fill="none" stroke="#885111" strokeWidth="1.3" pointerEvents="none"><rect x="-5" y="-3" width="10" height="7" rx="2" /><path d="M-2-3v-1h4v1" /><circle cx="0" cy=".5" r="1.6" /></g>}
                      {done && !active && (
                        <path
                          d="M-3 4l2 2 4-4"
                          fill="none"
                          stroke="#378E73"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          pointerEvents="none"
                        />
                      )}
                    </g>
                  );
                })}
            </g>
          );
        })}
      </svg>
      {mode === 'selection' && (
        <div className="mt-3 flex w-full items-start gap-2.5 rounded-2xl rounded-tl-md bg-[#EAF3FF] px-3 py-2.5">
          <Hand size={17} className="mt-0.5 shrink-0 text-[#4D8CE3]" aria-hidden />
          <div className="min-w-0" role="status" aria-live="polite">
            <p className="m-0 text-[12px] font-semibold leading-relaxed text-[#3967A1]">
              {lastZone ? `${nameOf(lastZone)} · ${selectedSet.has(lastZone) ? '선택됨' : '선택 해제'}` : '치아를 눌러 촬영할 구역을 골라주세요'}
            </p>
            <p className="m-0 mt-0.5 text-[11px] leading-relaxed text-[#718BAE]">한 번 더 누르면 선택이 해제돼요</p>
          </div>
        </div>
      )}
      {mode === 'capture' && (
        <div aria-label="촬영 상태 범례" className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] font-semibold text-[#7186A3]">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full border border-dashed border-[#B8C7D9] bg-[#F1F5FA]" />미선택</span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-b from-[#AFD4FF] to-[#609FFF]" />
            촬영 예정
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full border border-[#D58B2B] bg-gradient-to-b from-[#FFDB9A] to-[#F2AA4C] ring-2 ring-[#FFF1D7]" />
            촬영 중
          </span>
          <span className="flex items-center gap-1.5">
            <span className="flex h-3 w-3 items-center justify-center rounded-full bg-[#C4ECDF]"><Check size={10} className="text-[#378E73]" /></span>
            촬영 완료
          </span>
        </div>
      )}
    </div>
  );
}
