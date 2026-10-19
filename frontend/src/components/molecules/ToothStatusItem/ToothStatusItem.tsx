'use client';

import ScoreRing from '@/components/atoms/ScoreRing';
import { summaryFill } from '@/lib/riskColors';
import type { ToothStatusItemProps, RiskLevel } from './ToothStatusItem.types';

const getRiskLabel = (riskLevel: RiskLevel) => {
  if (riskLevel === 'low') return '낮음';
  if (riskLevel === 'normal') return '보통';
  if (riskLevel === 'high') return '높음';
  return '매우 높음';
};

export default function ToothStatusItem({ label, score, riskLevel }: ToothStatusItemProps) {
  const color = summaryFill(riskLevel);

  return (
    <div
      className="rounded-2xl p-3 flex flex-col gap-2"
      style={{ backgroundColor: `${summaryFill(riskLevel)}1A` }}
    >
      <div className="flex items-center gap-1 whitespace-nowrap overflow-hidden">
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        <span className="text-[11px] font-medium text-gray-700 truncate">{label}</span>
        <span className="text-[10px] text-gray-400 flex-shrink-0">{getRiskLabel(riskLevel)}</span>
      </div>
      <div className="flex justify-center">
        <ScoreRing score={score} color={color} size={80} strokeWidth={8} />
      </div>
    </div>
  );
}