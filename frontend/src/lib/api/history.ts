import { apiClient } from './client';
import type { ApiResponse } from '@/types/api';
import type { RiskLevel } from './common';
import type { ViewType } from './scan';
import type { SurfaceType } from './report';
import type { LesionType } from './common';

export interface ZoneScoreTrendItem {
  sessionId: number;
  date: string;
  zoneScore: number;
  calculusZoneScore: number | null;
  plaqueZoneScore: number | null;
}

export interface ToothTrendItem {
  sessionId: number;
  date: string;
  viewType: ViewType;
  areaRatio: number;
  toothScore: number;
  riskLevel: RiskLevel;
}

export type HistoryPeriodFilter = 'ALL' | 'ONE_MONTH' | 'THREE_MONTHS' | 'SIX_MONTHS';
export type HistoryScoreFilter = 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface HistoryToday {
  sessionId: number;
  date: string;
  time: string;
  score: number;
  riskLevel: RiskLevel;
  scoreDiff: number | null;
}

export interface HistoryScoreTrendItem {
  sessionId: number;
  date: string;
  score: number;
}

export interface HistoryRecordItem {
  sessionId: number;
  date: string;
  time: string;
  score: number;
  riskLevel: RiskLevel;
}

export interface HistoryListItem {
  sessionId: number;
  date: string;
  score: number;
  plaqueRiskLevel: RiskLevel;
  calculusRiskLevel: RiskLevel;
}

export interface HistoryList {
  totalCount: number;
  page: number;
  size: number;
  totalPages: number;
  items: HistoryListItem[];
}

export const historyApi = {
  getZoneTrend: (viewType: ViewType) =>
    apiClient.get<ApiResponse<ZoneScoreTrendItem[]>>(`/api/history/zones/${viewType}/trend`, {
      params: { limit: 30 },
    }),

  getToothTrend: (toothNumber: number, surface: SurfaceType, lesionType: LesionType) =>
    apiClient.get<ApiResponse<ToothTrendItem[]>>(`/api/history/teeth/${toothNumber}/trend`, {
      params: { surface, lesionType, limit: 30 },
    }),

  // 기록 없으면 null
  getToday: () => apiClient.get<ApiResponse<HistoryToday | null>>('/api/history/today'),

  getScoreTrend: () => apiClient.get<ApiResponse<HistoryScoreTrendItem[]>>('/api/history/graph'),

  getRecords: () => apiClient.get<ApiResponse<HistoryRecordItem[]>>('/api/history/compare'),

  getList: (params?: {
    period?: HistoryPeriodFilter;
    scoreFilter?: HistoryScoreFilter;
    page?: number;
    size?: number;
  }) => apiClient.get<ApiResponse<HistoryList>>('/api/history/list', { params }),
};
