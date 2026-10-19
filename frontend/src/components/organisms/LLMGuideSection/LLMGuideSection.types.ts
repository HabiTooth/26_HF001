import type { FocusChip } from '@/lib/toothDetail';

export type GuideType = 'good' | 'warning' | 'danger';

export interface GuideItem {
  type: GuideType;
  title: string;
  description: string;
  tooth?: number;
}

export interface LLMGuideSectionProps {
  items: GuideItem[];
  isLoading?: boolean;
  /** 생성 중. 수 분 소요 */
  generating?: boolean;
  failed?: boolean;
  onRetry?: () => void;
  onToothClick?: (tooth: number) => void;
  focusTeeth?: FocusChip[];
}
