import type { RiskLevel } from '@/lib/api/common';
import type { RiskLevel as SummaryRiskLevel } from '@/components/molecules/ToothStatusItem/ToothStatusItem.types';

const SUMMARY_RISK: Record<RiskLevel, SummaryRiskLevel> = {
  VERY_LOW: 'low',
  LOW: 'low',
  MEDIUM: 'normal',
  HIGH: 'high',
  CRITICAL: 'very-high',
};

export const toSummaryRisk = (level: RiskLevel): SummaryRiskLevel => SUMMARY_RISK[level];

export const RISK_LABEL: Record<RiskLevel, string> = {
  VERY_LOW: '매우 좋음',
  LOW: '좋음',
  MEDIUM: '보통',
  HIGH: '주의',
  CRITICAL: '위험',
};

// 음수 오름 표현 방지
export function scoreDiffText(diff: number): string {
  if (diff > 0) return `지난 스캔보다 ${diff}점 올랐어요`;
  if (diff < 0) return `지난 스캔보다 ${-diff}점 내려갔어요`;
  return '지난 스캔과 점수가 같아요';
}

export function scoreStatus(score: number): string {
  if (score >= 90) return '아주 좋아요';
  if (score >= 80) return '양호해요';
  if (score >= 70) return '주의가 필요해요';
  return '관리가 필요해요';
}

export function scoreGrade(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const [date, time] = iso.split('T');
  return `${date.replace(/-/g, '.')} ${(time ?? '').slice(0, 5)}`.trim();
}

export const formatDate = (iso: string | null | undefined) =>
  iso ? iso.slice(0, 10).replace(/-/g, '.') : '';

export const formatShortDate = (iso: string | null | undefined) => {
  if (!iso) return '';
  const [, m, d] = iso.slice(0, 10).split('-');
  return `${Number(m)}/${d}`;
};

export const formatTime = (t: string | null | undefined) => (t ? t.slice(0, 5) : '');
