export type RiskLevel = 'low' | 'normal' | 'high' | 'very-high';

export interface ToothStatusItemProps {
  label: string;
  score: number;
  riskLevel: RiskLevel;
}