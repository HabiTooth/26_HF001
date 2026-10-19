'use client';

import { useRouter } from 'next/navigation';
import MoreLink from '@/components/atoms/MoreLink';
import ToothStatusItem from '@/components/molecules/ToothStatusItem';
import { RISK_FILL } from '@/lib/riskColors';
import { scoreDiffText, scoreGrade } from '@/lib/score';
import type { ReportSummaryProps, RiskLevel } from './ReportSummary.types';

const RISK_RANK: Record<RiskLevel, number> = { low: 0, normal: 1, high: 2, 'very-high': 3 };

const GRADE_STYLE: Record<string, string> = {
  A: 'bg-success/15 text-success',
  B: 'bg-primary/15 text-primary',
  C: 'bg-warning/20 text-[#B87F00]',
  D: 'bg-warning/20 text-[#B87F00]',
  F: 'bg-danger/15 text-danger',
};

export function focusText(plaque?: RiskLevel, calculus?: RiskLevel): string | null {
  if (!plaque || !calculus) return null;
  const worst = Math.max(RISK_RANK[plaque], RISK_RANK[calculus]);
  if (worst <= RISK_RANK.low) return '치태와 치석 모두 잘 관리되고 있어요';
  if (RISK_RANK[plaque] === RISK_RANK[calculus]) return '치태와 치석을 함께 살펴보면 좋아요';
  return RISK_RANK[plaque] > RISK_RANK[calculus]
    ? '치태가 상대적으로 더 신경 쓰여요'
    : '치석이 상대적으로 더 신경 쓰여요';
}

export default function ReportSummary({
  score,
  prevScore,
  status,
  date,
  reportId,
  plaqueScore,
  calculusScore,
  plaqueRisk,
  calculusRisk,
  teeth,
  totalTeeth,
}: ReportSummaryProps) {
  const router = useRouter();
  const diff = prevScore !== undefined ? score - prevScore : null;
  const grade = scoreGrade(score);
  const focus = focusText(plaqueRisk, calculusRisk);

  const chips =
    teeth && teeth.length > 0
      ? [
          {
            label: '양호',
            color: RISK_FILL.LOW,
            count: teeth.filter((r) => r === 'VERY_LOW' || r === 'LOW').length,
          },
          {
            label: '주의',
            color: RISK_FILL.HIGH,
            count: teeth.filter((r) => r === 'MEDIUM' || r === 'HIGH').length,
          },
          {
            label: '위험',
            color: RISK_FILL.CRITICAL,
            count: teeth.filter((r) => r === 'CRITICAL').length,
          },
          {
            label: '미촬영',
            color: '#CDD7E3',
            count: Math.max((totalTeeth ?? teeth.length) - teeth.length, 0),
          },
        ].filter((c) => c.count > 0)
      : [];

  const open = reportId ? () => router.push(`/report/${reportId}`) : undefined;

  return (
    <div
      role={open ? 'button' : undefined}
      tabIndex={open ? 0 : undefined}
      onClick={open}
      onKeyDown={open ? (e) => (e.key === 'Enter' || e.key === ' ') && open() : undefined}
      className={`bg-white rounded-[24px] border border-white shadow-[0_6px_24px_rgba(71,105,154,0.045)] p-5 mt-4 ${
        open ? 'cursor-pointer transition-transform active:scale-[0.99]' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div><h3 className="m-0 text-sm font-bold text-content">최근 분석 결과</h3>{date && <p className="m-0 mt-1 text-[11px] font-medium text-[#687B94] tabular-nums">{date}</p>}</div>
        {open && <MoreLink label="전체 보기" />}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex flex-col items-center justify-center w-[106px] h-[112px] flex-shrink-0">
          <svg viewBox="0 0 32 34" className="absolute inset-0 w-full h-full" aria-hidden="true"><path d="M16 5C11 2 2 2 2 10C2 16 4 20 5 26C6 31 8 33 11 31C13 29 13 27 16 27C19 27 19 29 21 31C24 33 26 31 27 26C28 20 30 16 30 10C30 2 21 2 16 5Z" fill="#E4F0FF" /></svg>
          <span className="relative text-[40px] font-bold leading-none tracking-[-1.5px] text-[#4A86D9] tabular-nums">{score}</span>
          <span className="relative text-[10px] font-semibold text-[#6785AD] mt-1">종합 점수</span>
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${GRADE_STYLE[grade]}`}>
              {grade}
            </span>
            <span className="text-sm font-bold text-content">{status}</span>
          </div>
          {diff !== null && <span className="text-xs font-medium text-[#667791]">{scoreDiffText(diff)}</span>}
          {focus && <span className="text-xs font-medium text-[#667791]">{focus}</span>}
        </div>
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-4">
          {chips.map(({ label, color, count }) => (
            <span
              key={label}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-hairline/40 text-[11px] text-content"
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: color }}
              />
              {label}
              <b className="font-bold tabular-nums">{count}</b>
            </span>
          ))}
        </div>
      )}

      {(plaqueScore !== undefined || calculusScore !== undefined) && (
        <div className="mt-5 pt-4 border-t border-[#EDF1F7]">
          <h4 className="m-0 text-[13px] font-bold text-content mb-3">위험도 요약</h4>
          <div className="grid grid-cols-2 gap-3">
            {plaqueScore !== undefined && plaqueRisk && <ToothStatusItem label="치태" score={plaqueScore} riskLevel={plaqueRisk} />}
            {calculusScore !== undefined && calculusRisk && <ToothStatusItem label="치석" score={calculusScore} riskLevel={calculusRisk} />}
          </div>
        </div>
      )}
    </div>
  );
}
