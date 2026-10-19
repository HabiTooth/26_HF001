import { CheckCircle2, AlertCircle, XCircle, AlertTriangle, Sun } from 'lucide-react';
import type { ScanStatusType } from '@/components/molecules/ScanStatusBanner/ScanStatusBanner.types';

export interface ScanStatusCopy {
  bg: string;
  border: string;
  textColor: string;
  Icon: React.ElementType;
  label: string;
  sub: string;
}

export const SCAN_STATUS: Record<ScanStatusType, ScanStatusCopy> = {
  good: {
    bg: 'bg-success/10',
    border: 'border-success/40',
    textColor: 'text-success',
    Icon: CheckCircle2,
    label: '잘 찍히고 있어요',
    sub: '거리와 조명이 알맞아요.',
  },
  far: {
    bg: 'bg-warning/10',
    border: 'border-warning/40',
    textColor: 'text-warning',
    Icon: AlertCircle,
    label: '너무 멀어요',
    sub: '카메라를 치아에 조금 더 가까이 대 주세요.',
  },
  close: {
    bg: 'bg-danger/10',
    border: 'border-danger/40',
    textColor: 'text-danger',
    Icon: XCircle,
    label: '너무 가까워요',
    sub: '카메라를 조금 멀리 대 주세요.',
  },
  shaking: {
    bg: 'bg-danger/10',
    border: 'border-danger/40',
    textColor: 'text-danger',
    Icon: AlertTriangle,
    label: '흔들리고 있어요',
    sub: '카메라를 고정하고 천천히 움직여 주세요.',
  },
  dark: {
    bg: 'bg-warning/10',
    border: 'border-warning/40',
    textColor: 'text-warning',
    Icon: Sun,
    label: '조명이 부족해요',
    sub: '조명을 밝게 하거나 그림자를 피해 주세요.',
  },
  complete: {
    bg: 'bg-success/10',
    border: 'border-success/40',
    textColor: 'text-success',
    Icon: CheckCircle2,
    label: '스캔 범위가 충분해요',
    sub: '천천히 마무리해 주세요.',
  },
};

export const SCAN_STATUS_ORDER: ScanStatusType[] = [
  'good',
  'far',
  'close',
  'shaking',
  'dark',
  'complete',
];
