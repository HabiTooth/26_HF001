import { apiClient } from './client';
import type { ApiResponse } from '@/types/api';
import type { LightType, ViewType, ZoneAnalysisResult } from './scan';

export type { LightType, ViewType, ZoneAnalysisResult } from './scan';

export const aiApi = {
  analyze: (scanImageId: number, viewType: ViewType, lightType: LightType) =>
    apiClient.post<ApiResponse<ZoneAnalysisResult>>('/api/ai/analyze', {
      scanImageId,
      viewType,
      lightType,
    }),
};
