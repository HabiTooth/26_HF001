import type { AxiosResponse } from 'axios';
import { apiClient } from './client';
import type { ApiResponse } from '@/types/api';
import type { LesionType, RiskLevel } from './common';
import type { ViewType } from './scan';

export interface PolygonPoint {
  x: number;
  y: number;
}

export interface SessionReport {
  sessionId: number;
  totalScore: number;
  summary: {
    totalPlaqueRatio: number;
    totalCalculusRatio: number;
  };
  toothStatuses: Array<{
    toothNumber: number;
    lesionType: LesionType | null;
    areaRatio: number;
    riskLevel: RiskLevel;
  }>;
}

// 치아 bbox 기준 0~1. u=1 사용자 오른쪽, v=0 사진 위
export interface LesionPolygonPoint {
  u: number;
  v: number;
}

// OUTER 입술·볼 쪽, INNER 혀·입천장 쪽
export type SurfaceType = 'OUTER' | 'INNER';

export interface ToothLesion {
  toothNumber: number;
  surfaceType: SurfaceType;
  lesionType: LesionType;
  polygon: LesionPolygonPoint[];
}

export interface MeshCoordinates {
  sessionId: number;
  lesions: ToothLesion[];
}

export interface SingleImageReport {
  analysisResultId: number;
  scanImageId: number;
  taskId: string;
  analysisStatus: 'SUCCESS' | 'FAILED';
  viewType: ViewType;
  totalScore: number | null;
  recommendation: string;
  teeth: Array<{
    areaId: number;
    toothNumber: number;
    templateRegionId: string | null;
    jawType: string;
    surfaceType: string;
    viewType: ViewType;
    status?: 'DETECTED' | 'NOT_DETECTED' | 'SKIPPED';
    lesionType: LesionType | null;
    areaRatio: number | null;
    toothScore: number | null;
    riskLevel: RiskLevel | null;
  }>;
  issues: Array<{
    toothNumber: number;
    templateRegionId: string | null;
    lesionType: LesionType;
    confidence: number | null;
    riskLevel: RiskLevel;
    polygon: PolygonPoint[];
  }>;
  createdAt: string;
  imageFileUrl?: string | null;
  overlayFileUrl?: string | null;
}

export interface ZoneReport {
  viewType: ViewType;
  surfaceType: SurfaceType;
  captured: boolean;
  lightTypes: Array<'WHITE_LIGHT' | 'UV_LIGHT'>;
  whiteScanImageId: number | null;
  uvScanImageId: number | null;
  zoneScore: number | null;
  zoneValid: boolean;
  calculusZoneScore: number | null;
  plaqueZoneScore: number | null;
  detectedToothCount: number | null;
  expectedToothCount: number | null;
  coverageRatio: number | null;
}

export interface SessionZoneReport {
  sessionId: number;
  scannedAt: string;
  sessionScore: number | null;
  validZoneCount: number;
  capturedZoneCount: number;
  totalZoneCount: number;
  confirmedToothCount: number;
  detectedToothCount: number | null;
  expectedToothCount: number | null;
  calculusToothCount: number;
  plaqueToothCount: number;
  zones: ZoneReport[];
}

export interface ReportScore {
  total: number;
  prevTotal: number | null;
  delta: number | null;
  calculusDeduction: number;
  plaqueDeduction: number;
  totalDeduction: number;
  recoverableByBrushing: number;
  ceilingByBrushing: number;
  ceilingAfterScaling: number;
  calculusToothCount: number;
  plaqueToothCount: number;
  detectedToothCount: number;
  capturedZoneCount: number;
  totalZoneCount: number;
  primaryReason: string;
  flags: string[];
  formulaText: string;
  zones: Array<{
    viewType: ViewType;
    name: string;
    score: number;
    calculusDeduction: number;
    plaqueDeduction: number;
  }>;
  scoreMismatch: unknown | null;
}

export interface ReportAction {
  code: string;
  title: string;
  detail: string;
  tag: string;
  points: number;
}

export interface LlmReport {
  sessionId: number;
  riskDetail?: Array<{
    title: string;
    detail: string;
    riskLevel: RiskLevel;
  }>;
  management: Array<{
    title: string;
    detail: string;
  }>;
  disclaimer: string;
  score?: ReportScore | null;
  interpretation?: string[] | null;
  interpretationSource?: string | null;
  actions?: ReportAction[] | null;
  notice?: string | null;
  logicVersion?: string;
}

const generating = new Map<number, Promise<AxiosResponse<ApiResponse<LlmReport>>>>();

export const reportApi = {
  getZoneReport: (sessionId: number) =>
    apiClient.get<ApiResponse<SessionZoneReport>>(`/api/reports/scan-sessions/${sessionId}/zones`),

  getImageFile: (scanImageId: number, overlay = false, signal?: AbortSignal) =>
    apiClient.get<Blob>(`/api/scan-images/${scanImageId}/${overlay ? 'overlay' : 'file'}`, {
      responseType: 'blob',
      signal,
    }),

  getSessionReport: (sessionId: number) =>
    apiClient.get<ApiResponse<SessionReport>>(`/api/reports/scan-sessions/${sessionId}/simple`),

  getMeshCoordinates: (sessionId: number) =>
    apiClient.get<ApiResponse<MeshCoordinates>>(`/api/reports/scan-sessions/${sessionId}/3d`),

  getSingleImageReport: (scanImageId: number) =>
    apiClient.get<ApiResponse<SingleImageReport>>(`/api/reports/scan-images/${scanImageId}`),

  // 저장본 조회. 없으면 404
  getLlmReport: (sessionId: number) =>
    apiClient.get<ApiResponse<LlmReport>>(`/api/reports/scan-sessions/${sessionId}/llm-report`),

  generateLlmReport: (sessionId: number) => {
    // 이펙트 중복 실행 시 생성 요청 1회 제한
    const running = generating.get(sessionId);
    if (running) return running;

    const req = apiClient
      .post<
        ApiResponse<LlmReport>
      >(`/api/reports/scan-sessions/${sessionId}/llm-report`, null, { timeout: 300_000 })
      .finally(() => generating.delete(sessionId));

    generating.set(sessionId, req);
    return req;
  },
};
