import type { LesionType, RiskLevel } from '@/lib/api/common';
import type { RiskLevel as SummaryRiskLevel } from '@/components/molecules/ToothStatusItem/ToothStatusItem.types';

/** 넓게 칠하는 곳용 */
export const RISK_FILL: Record<RiskLevel, string> = {
  VERY_LOW: '#8FC7E8',
  LOW: '#8ECFB5',
  MEDIUM: '#F0CE8C',
  HIGH: '#EDA98F',
  CRITICAL: '#DE8B95',
};

/** 흰 배경 글자·링용 */
export const RISK_INK: Record<RiskLevel, string> = {
  VERY_LOW: '#4A86D9',
  LOW: '#3EA184',
  MEDIUM: '#C2902F',
  HIGH: '#D07A5C',
  CRITICAL: '#C25C6C',
};

const TO_SUMMARY: Record<SummaryRiskLevel, RiskLevel> = {
  low: 'LOW',
  normal: 'MEDIUM',
  high: 'HIGH',
  'very-high': 'CRITICAL',
};

export const summaryFill = (level: SummaryRiskLevel) => RISK_FILL[TO_SUMMARY[level]];

/** 3D 모형 치아 색. 잇몸과 구분되게 진함 */
export const RISK_MODEL_FILL: Record<RiskLevel, string> = {
  VERY_LOW: '#7EC8F7',
  LOW: '#4FCB94',
  MEDIUM: '#F7B21B',
  HIGH: '#F26A24',
  CRITICAL: '#E42F49',
};

// 3D 병변 마커 색. 고정
export const MARKER_FILL: Record<LesionType, string> = {
  PLAQUE: '#F5B63A',
  CALCULUS: '#E8575A',
};

