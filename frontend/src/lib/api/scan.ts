import { apiClient } from './client';
import type { ApiResponse } from '@/types/api';

import type { LesionType, LightType, RiskLevel } from './common';

export type { LesionType, LightType, RiskLevel } from './common';

export type ViewType =
  | 'UPPER_RIGHT_MOLAR' | 'UPPER_RIGHT_PREMOLAR' | 'UPPER_FRONT'
  | 'UPPER_LEFT_PREMOLAR' | 'UPPER_LEFT_MOLAR'
  | 'LOWER_RIGHT_MOLAR' | 'LOWER_RIGHT_PREMOLAR' | 'LOWER_FRONT'
  | 'LOWER_LEFT_PREMOLAR' | 'LOWER_LEFT_MOLAR'
  | 'OUTER_LEFT' | 'OUTER_CENTER' | 'OUTER_RIGHT';

export interface ToothStatus {
  toothNumber: number;
  templateRegionId: string | null;
  lesionType: LesionType | null;
  areaRatio: number | null;
  riskLevel: RiskLevel;
}

export interface ZoneAnalysisResult {
  analysisResultId: number;
  scanImageId: number;
  viewType: ViewType;
  status: string;
  zoneScore: number | null;
  zoneValid: boolean;
  detectedToothCount: number;
  scoreVersion: string;
  totalCalculusRatio: number;
  totalPlaqueRatio: number;
  toothStatuses: ToothStatus[];
}

export interface SessionAnalyzeResult {
  sessionId: number;
  sessionScore: number | null;
  validZoneCount: number;
  totalZoneCount: number;
  invalidZones: ViewType[];
  failedCount: number;
  analysisResults: ZoneAnalysisResult[];
}

export interface ScanCaptureStatus {
  sessionId: number;
  uploadedImageCount: number;
  capturedZoneCount: number;
  totalZoneCount: number;
  canAnalyze: boolean;
  capturedZones: Array<{
    scanImageId: number;
    viewType: ViewType;
    lightType: LightType;
  }>;
}

export type RetakeReason = 'BLURRY' | 'TOOTH_NOT_DETECTED' | 'LOW_CONFIDENCE';

export interface CaptureQualityResult {
  needsRetake: boolean;
  reason: RetakeReason | null;
  message: string | null;
  detail: {
    blurScore?: number;
    blurThreshold?: number;
    lightType?: string;
    detectedCount?: number;
    expectedCount?: number;
    meanConfidence?: number;
    minConfidence?: number;
    coverageRatio?: number;
    borderTouchingCount?: number;
  } | null;
}

export const scanApi = {
  createSession: (deviceId: number) =>
    apiClient.post<ApiResponse<number>>('/api/scan-sessions', null, { params: { deviceId } }),

  uploadImageToSession: (
    sessionId: number,
    params: { file: File; viewType: ViewType; lightType: LightType },
  ) => {
    const formData = new FormData();
    formData.append('file', params.file);
    const metadataJson = JSON.stringify({
      viewType: params.viewType,
      lightType: params.lightType,
    });
    const metadataBlob = new Blob([metadataJson], { type: 'application/json' });
    formData.append('metadata', metadataBlob);
    return apiClient.post<ApiResponse<{ imageId: number; imageUrl: string }>>(
      `/api/scan-sessions/${sessionId}/images`,
      formData,
    );
  },

  // 이미지 퀄리티 판정만. 저장 안 함
  checkCaptureQuality: (
    sessionId: number,
    params: { file: File; viewType: ViewType; lightType?: LightType },
  ) => {
    const formData = new FormData();
    formData.append('file', params.file);
    formData.append('viewType', params.viewType);
    if (params.lightType) formData.append('lightType', params.lightType);
    return apiClient.post<ApiResponse<CaptureQualityResult>>(
      `/api/scan-sessions/${sessionId}/images/quality-check`,
      formData,
    );
  },

  getCaptureStatus: (sessionId: number) =>
    apiClient.get<ApiResponse<ScanCaptureStatus>>(`/api/scan-sessions/${sessionId}/capture-status`),

  analyzeSession: (sessionId: number, target?: LesionType) =>
    apiClient.post<ApiResponse<SessionAnalyzeResult>>(
      `/api/scan-sessions/${sessionId}/analyze`,
      null,
      target ? { params: { target } } : undefined,
    ),
};
