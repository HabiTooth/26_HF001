'use client';

import axios from 'axios';
import { useState, useEffect, useRef, useCallback, useMemo, type RefObject } from 'react';
import { useRouter } from 'next/navigation';
import { X, HelpCircle, Check, Loader2, AlertTriangle, Sun, Camera, Bell, User, Smile, ChevronRight, ChevronDown, Info } from 'lucide-react';
import type { ScanStatusType } from '@/components/molecules/ScanStatusBanner';
import { useCameraStream, type CameraMode, type LedMode } from '@/hooks/useCameraStream';
import { useScanDetection } from '@/hooks/useScanDetection';
import { scanApi, type ViewType, type SessionAnalyzeResult } from '@/lib/api/scan';
import type { LightType } from '@/lib/api/common';
import { deviceApi } from '@/lib/api/device';
import { applyServerVerdict, evaluateCaptureBlob, type CaptureQuality } from '@/lib/imageQuality';
import { useAuthStore } from '@/stores/authStore';
import {
  SCAN_ZONES,
  ALL_VIEW_TYPES,
  ZONE_GROUP_ORDER,
  GROUP_LABELS,
  GROUP_HINTS,
  zonesOfGroup,
  estimateMinutes,
  type ScanZone,
} from '@/constants/scanZones';
import { GUIDE_OUTLINE, GUIDE_SHOT, guideTip } from '@/constants/scanGuides';


import GuideItem from '@/components/molecules/GuideItem';
import ToothArchSelector, { type Surface } from '@/components/molecules/ToothArchSelector';
import CameraView from '@/components/organisms/CameraView';
import CaptureReview from '@/components/organisms/CaptureReview';
import ScanExitModal from '@/components/organisms/ScanExitModal';
import ScanHelpSheet from '@/components/organisms/ScanHelpSheet';
import Link from 'next/link';
import Checkbox from '@/components/atoms/Checkbox';
import { useNotificationStore } from '@/stores/notificationStore';
import { useDentitionStore } from '@/stores/dentitionStore';
import { readWebcamPreference, writeWebcamPreference } from '@/lib/cameraSource';
import { controlHost, deviceAddress, streamUrl } from '@/lib/deviceAddress';
import { deviceSnap } from '@/lib/deviceClient';
import { useHardwareShutter } from '@/hooks/useHardwareShutter';

type Step = 1 | 2 | 3 | 4;

const ANALYZE_STEPS = [
  '이미지 품질 확인',
  '치태 의심 영역 탐지',
  '치석 가능 부위 분석',
  '구강 건강 지수 계산',
  '맞춤 리포트 생성',
];

const DEV_SESSION_ID = -1;
const isDev = process.env.NODE_ENV === 'development';

const zoneInfo = (viewType: ViewType | null): ScanZone | undefined =>
  viewType ? SCAN_ZONES.find((z) => z.viewType === viewType) : undefined;

const sortZones = (picked: ViewType[]): ViewType[] => {
  const set = new Set(picked);
  return SCAN_ZONES.filter((z) => set.has(z.viewType)).map((z) => z.viewType);
};

// 테스트용 분석 데이터
const mockScore = (v: ViewType) => 68 + ((v.length * 7 + v.charCodeAt(0)) % 25);
const mockAnalysisResult = (zones: ViewType[]): SessionAnalyzeResult => {
  const scores = zones.map(mockScore);
  return {
    sessionId: 0,
    sessionScore: Math.round(scores.reduce((a, b) => a + b, 0) / (scores.length || 1)),
    validZoneCount: zones.length,
    totalZoneCount: zones.length,
    invalidZones: [],
    failedCount: 0,
    analysisResults: zones.map((viewType, i) => ({
      analysisResultId: i + 1,
      scanImageId: i + 1,
      viewType,
      status: 'COMPLETED',
      zoneScore: scores[i],
      zoneValid: true,
      detectedToothCount: 8,
      scoreVersion: 'mock',
      totalCalculusRatio: 0,
      totalPlaqueRatio: 0,
      toothStatuses: [],
    })),
  };
};

function PageHeader({
  title,
  onExit,
  onHelp,
}: {
  title: string;
  onExit: () => void;
  onHelp: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5 bg-white/80 backdrop-blur-sm border-b border-hairline flex-shrink-0">
      <button
        type="button"
        onClick={onExit}
        className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-hairline transition-colors"
      >
        <X size={20} className="text-content" />
      </button>
      <span className="text-[15px] font-semibold text-content">{title}</span>
      <button
        type="button"
        onClick={onHelp}
        className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-hairline transition-colors"
      >
        <HelpCircle size={20} className="text-muted" />
      </button>
    </div>
  );
}

function ZoneChips({
  selectedZones,
  onToggleZone,
  onSetZones,
}: {
  selectedZones: ViewType[];
  onToggleZone: (z: ViewType) => void;
  onSetZones: (zones: ViewType[]) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {ZONE_GROUP_ORDER.map((group) => {
        const zones = zonesOfGroup(group);
        const picked = zones.filter((z) => selectedZones.includes(z.viewType));
        const on = picked.length;
        const teethOn = picked.reduce((sum, z) => sum + z.teeth.length, 0);
        const teethAll = zones.reduce((sum, z) => sum + z.teeth.length, 0);
        return (
          <div key={group} className="flex flex-col gap-1.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[12px] font-bold text-content">{GROUP_LABELS[group]}</span>
              <span className="text-[11px] font-semibold text-muted tabular-nums">
                {on}/{zones.length}구역 · 치아 {teethOn}/{teethAll}
              </span>
              <span className="text-[10px] text-muted truncate">{GROUP_HINTS[group]}</span>
              <button
                type="button"
                onClick={() => {
                  const ids = zones.map((z) => z.viewType);
                  onSetZones(
                    on === zones.length
                      ? selectedZones.filter((z) => !ids.includes(z))
                      : [...selectedZones, ...ids],
                  );
                }}
                className="ml-auto flex-shrink-0 text-[11px] font-semibold text-muted hover:text-primary transition-colors"
              >
                {on === zones.length ? '해제' : '전체'}
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {zones.map(({ viewType, label, teeth }) => {
                const active = selectedZones.includes(viewType);
                return (
                  <button
                    key={viewType}
                    type="button"
                    onClick={() => onToggleZone(viewType)}
                    aria-pressed={active}
                    title={`FDI ${teeth.join(', ')}`}
                    className={`rounded-[12px] px-2 py-2 border-[1.5px] transition-colors text-left ${
                      active ? 'border-primary bg-primary/5' : 'border-hairline bg-white'
                    }`}
                  >
                    <span className="flex items-center gap-1">
                      <span
                        className={`w-3.5 h-3.5 rounded-[4px] border flex items-center justify-center flex-shrink-0 ${
                          active ? 'bg-primary border-primary' : 'bg-white border-hairline'
                        }`}
                      >
                        {active && <Check size={9} className="text-white" strokeWidth={3.5} />}
                      </span>
                      <span
                        className={`text-[11.5px] font-bold leading-tight break-keep ${
                          active ? 'text-primary' : 'text-content'
                        }`}
                      >
                        {label}
                      </span>
                    </span>
                    <span className="block mt-0.5 ml-[18px] text-[10px] text-muted tabular-nums">
                      치아 {teeth.length}개
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TeethNotice() {
  const { answered, hydrate } = useDentitionStore();

  useEffect(() => hydrate(), [hydrate]);

  if (answered) return null;

  return (
    <Link
      href="/mypage/teeth?from=scan"
      className="flex items-center gap-3 p-3.5 rounded-[14px] bg-primary-light border border-primary/20 no-underline"
    >
      <Smile size={18} className="text-primary flex-shrink-0" />
      <span className="flex-1 min-w-0">
        <span className="block text-[12.5px] font-semibold text-content">
          빠진 치아가 있나요?
        </span>
        <span className="block text-[11px] text-muted">
          등록해야 스캔을 시작할 수 있어요. 분석 결과를 실제 치아 번호에 맞추는 데 써요.
        </span>
      </span>
      <ChevronRight size={16} className="text-primary flex-shrink-0" />
    </Link>
  );
}

function Step1({
  checked,
  onCheck,
  onExit,
  onStart,
  selectedZones,
  onToggleZone,
  onSetZones,
  startError,
  needsToothProfile,
  onSetupProfile,
  webcam,
}: {
  checked: boolean;
  onCheck: (v: boolean) => void;
  onExit: () => void;
  onStart: () => void;
  webcam: { on: boolean; onToggle: (v: boolean) => void } | null;
  selectedZones: ViewType[];
  onToggleZone: (z: ViewType) => void;
  onSetZones: (zones: ViewType[]) => void;
  startError: string | null;
  needsToothProfile: boolean;
  onSetupProfile: () => void;
}) {
  const count = selectedZones.length;
  const allOn = count === ALL_VIEW_TYPES.length;
  const [selectionSurface, setSelectionSurface] = useState<Surface>('LINGUAL');

  return (
    <div className="app-frame max-w-app min-h-[calc(100svh/var(--app-zoom))] mx-auto flex flex-col bg-background relative">
      <div className="aurora-blob-1" />
      <div className="aurora-blob-2" />
      <div className="aurora-blob-3" />

      <div className="flex items-center justify-between px-4 py-3 bg-white/90 backdrop-blur-sm border-b border-hairline flex-shrink-0 relative z-10">
        <button
          type="button"
          onClick={onExit}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-hairline transition-colors"
        >
          <X size={20} className="text-content" />
        </button>
        <span className="text-[15px] font-semibold text-content">AI 스캔</span>
        <div className="flex items-center gap-1.5">
          <Link
            href="/notifications"
            aria-label="알림"
            className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-hairline transition-colors"
          >
            <Bell size={20} className="text-content" />
          </Link>
          <Link
            href="/mypage"
            aria-label="마이페이지"
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-hairline transition-colors"
          >
            <User size={20} className="text-content" />
          </Link>
        </div>
      </div>

      <div
        className="relative flex-shrink-0 h-[190px] overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #427FD3 0%, #5B96E2 55%, #80B5F1 100%)' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/dashboard/scan-clay-studio.webp" alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#2C65AD]/25 via-transparent to-transparent" />

        <div className="px-5 pt-5 pr-[38%] flex flex-col gap-1.5 relative z-10">
          <h1 className="m-0 text-white font-bold leading-tight" style={{ fontSize: '25px' }}>
            실시간 구강 스캔
          </h1>
          <p className="m-0 text-white/80 leading-relaxed" style={{ fontSize: '12.5px' }}>
            찍고 싶은 구역만 골라
            <br />
            원하는 순서로 촬영하세요.
          </p>
        </div>

      </div>
      <div className="bg-white rounded-t-[28px] -mt-4 relative z-10 flex flex-col flex-1">
        <div className="px-5 pt-5 flex flex-col gap-4">
          <TeethNotice />

          <div className="flex flex-col gap-3">
            <div className="flex items-end justify-between gap-2">
              <div className="min-w-0">
                <p className="m-0 text-[15px] font-bold text-content">촬영할 구역 고르기</p>
                <p className="m-0 mt-0.5 text-[11px] text-muted">
                  찍고 싶은 곳만 골라도 되고, 여러 곳을 함께 골라도 돼요
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className="text-[12px] font-bold text-primary whitespace-nowrap">
                  {count}구역 · 약 {estimateMinutes(count)}분
                </span>
                <button
                  type="button"
                  onClick={() => onSetZones(allOn ? [] : ALL_VIEW_TYPES)}
                  className="px-2 py-0.5 rounded-full border border-hairline text-[11px] font-semibold text-muted hover:text-primary hover:border-primary/40 transition-colors whitespace-nowrap"
                >
                  {allOn ? '전체 해제' : '전체 선택'}
                </button>
              </div>
            </div>

            <div className="rounded-[20px] bg-[#F6F9FD] border border-[#E5EDF7] px-3 py-3">
              <ToothArchSelector surface={selectionSurface} onSurfaceChange={setSelectionSurface} selected={selectedZones} captured={[]} onZoneClick={onToggleZone} />
            </div>
            <details>
              <summary className="text-[12px] font-semibold text-[#687B94] cursor-pointer">구역 이름으로 선택하기</summary>
              <div className="mt-3">
            <ZoneChips
              selectedZones={selectedZones}
              onToggleZone={onToggleZone}
              onSetZones={onSetZones}
            />
              </div>
            </details>

            {count === 0 && (
              <p className="m-0 text-[12px] text-danger font-medium text-center">
                최소 한 구역은 선택해 주세요.
              </p>
            )}
          </div>

          <section aria-labelledby="scan-guide-heading" className="-mx-5 mt-1 flex flex-col gap-4 border-t border-hairline bg-[#F3F6FB] px-5 py-5">
            <h2 id="scan-guide-heading" className="m-0 text-[15px] font-bold text-content">촬영 안내</h2>
            <GuideItem
              icon={<Camera size={18} className="text-primary" />}
              text="카메라를 치아 가까이 가져가 주세요"
              sub="5~10cm 거리를 유지해 주세요."
            />
            <GuideItem
              icon={<AlertTriangle size={18} className="text-warning" />}
              text="흔들리지 않게 천천히 움직여 주세요"
              sub="촬영 후 흔들렸는지 바로 확인할 수 있어요."
            />
            <GuideItem
              icon={<Sun size={18} className="text-success" />}
              text="빛이 반사되지 않게 각도를 맞춰 주세요"
              sub="반사가 심하면 분석이 어려워요."
            />
          {webcam && (
            <div className="border-t border-dashed border-hairline pt-4">
              <Checkbox
                checked={webcam.on}
                onChange={webcam.onToggle}
                label="개발용: 스캐너 대신 웹캠으로 촬영"
              />
              <p className="m-0 mt-1 ml-7 text-[11px] text-muted">
                노트북·휴대폰 카메라로 흐름만 확인할 때 써요.
              </p>
            </div>
          )}
          <div className="border-t border-hairline pt-4">
            <Checkbox
              checked={checked}
              onChange={onCheck}
              label="위 안내를 모두 확인했어요"
            />
          </div>
          </section>
        </div>
        <div className="sticky bottom-0 mt-auto px-5 pt-3 pb-4 bg-white/95 backdrop-blur-sm border-t border-hairline">
          {startError && (
            <p className="m-0 mb-2 text-[12px] font-medium text-danger text-center">{startError}</p>
          )}
          <button
            type="button"
            onClick={needsToothProfile ? onSetupProfile : onStart}
            disabled={!needsToothProfile && (!checked || count === 0)}
            className="w-full h-[52px] rounded-[14px] text-white text-[15px] font-semibold
              disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            style={{ background: 'linear-gradient(135deg, #4B7BF5 0%, #6B9BFF 100%)' }}
          >
            {needsToothProfile ? '치아 정보 등록하러 가기' : '스캔 시작하기'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Step2({
  videoRef,
  imgRef,
  isReady,
  cameraError,
  captureError,
  shutterNotice,
  cameraMode,
  status,
  ledMode,
  selectedZones,
  capturedZones,
  currentZone,
  missingTeeth,
  surface,
  onSurfaceChange,
  onZoneClick,
  onExit,
  onHelp,
  onCapture,
  isCapturing,
  onLedToggle,
  onRetry,
  onFinish,
  reviewOverlay,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  imgRef: RefObject<HTMLImageElement | null>;
  isReady: boolean;
  cameraError: string | null;
  captureError: string | null;
  shutterNotice: string | null;
  cameraMode: CameraMode;
  status: ScanStatusType;
  ledMode: LedMode;
  selectedZones: ViewType[];
  capturedZones: ViewType[];
  currentZone: ViewType | null;
  missingTeeth: number[];
  surface: Surface;
  onSurfaceChange: (s: Surface) => void;
  onZoneClick: (z: ViewType) => void;
  onExit: () => void;
  onHelp: () => void;
  onCapture: () => void;
  isCapturing: boolean;
  onLedToggle: (mode: LedMode) => void;
  onRetry: () => void;
  onFinish: () => void;
  reviewOverlay?: React.ReactNode;
}) {
  const [archFolded, setArchFolded] = useState(false);
  const info = zoneInfo(currentZone);
  const done = capturedZones.length;
  const total = selectedZones.length;
  const allDone = done >= total;

  return (
    <div className="app-frame max-w-app mx-auto h-[calc(100svh/var(--app-zoom))] flex flex-col">
      <PageHeader title="실시간 구강 스캔" onExit={onExit} onHelp={onHelp} />

      <div className="bg-white px-3 pt-2 pb-2 flex-shrink-0 border-b border-hairline">
        {!archFolded && (
          <ToothArchSelector
            compact
            mode="capture"
            lockUnselected
            surface={surface}
            onSurfaceChange={onSurfaceChange}
            selected={selectedZones}
            captured={capturedZones}
            current={currentZone}
            onZoneClick={onZoneClick}
          />
        )}
        <div className="flex items-center justify-between gap-2 rounded-xl bg-[#F1F6FF] px-3 py-2 mt-2">
          <span className="text-[13px] font-bold text-[#315D96] truncate">
            {info ? info.fullLabel : '구역을 선택해 주세요'}
          </span>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[12px] font-bold text-muted tabular-nums">
              {done}/{total}
            </span>
            <button
              type="button"
              onClick={() => setArchFolded((v) => !v)}
              aria-expanded={!archFolded}
              className="flex items-center gap-0.5 px-2 py-1 rounded-full bg-hairline/60 text-[11px] font-semibold text-muted"
            >
              {archFolded ? '치아도 보기' : '접기'}
              <ChevronDown
                size={13}
                className={`transition-transform ${archFolded ? '' : 'rotate-180'}`}
              />
            </button>
            {allDone && (
              <button
                type="button"
                onClick={onFinish}
                className="px-3 py-1 rounded-full bg-primary text-white text-[11px] font-bold"
              >
                분석 시작
              </button>
            )}
          </div>
        </div>
      </div>

      {captureError && <p role="alert" className="m-0 bg-[#FFF4DE] px-4 py-2 text-[12px] font-semibold leading-relaxed text-[#926022]">{captureError}</p>}
      {shutterNotice && !captureError && <p role="status" className="m-0 flex items-center gap-2 bg-[#F1F6FF] px-4 py-2 text-[12px] font-medium leading-relaxed text-[#536D8E]"><Info size={14} className="shrink-0 text-primary" />{shutterNotice}</p>}
      <CameraView
        videoRef={videoRef}
        imgRef={imgRef}
        isReady={isReady}
        cameraError={cameraError}
        cameraMode={cameraMode}
        ledMode={ledMode}
        status={status}
        onLedToggle={onLedToggle}
        onCapture={onCapture}
        isCapturing={isCapturing}
        onRetry={onRetry}
        reviewOverlay={reviewOverlay}
        guide={
          currentZone && info
            ? {
                shot: GUIDE_SHOT[currentZone],
                label: info.fullLabel,
                tip: guideTip(currentZone, missingTeeth),
                outline: GUIDE_OUTLINE[currentZone],
              }
            : undefined
        }
      />
    </div>
  );
}

function ScanStateHeading({ label, title, description, tone, role }: {
  label: string;
  title: string;
  description: string;
  tone: 'blue' | 'mint' | 'orange';
  role?: 'alert' | 'status';
}) {
  const colors = {
    blue: ['text-[#4A86D9]', 'text-content', 'text-[#607C92]'],
    mint: ['text-[#328F7C]', 'text-[#254E43]', 'text-[#56786B]'],
    orange: ['text-[#D9743D]', 'text-[#563B2D]', 'text-[#8C6D58]'],
  }[tone];
  return <div className="w-full text-center" role={role} aria-live={role === 'status' ? 'polite' : undefined}>
    <p className={`m-0 text-[13px] leading-5 font-bold ${colors[0]}`}>{label}</p>
    <h2 className={`m-0 mt-2 text-[28px] leading-9 font-bold break-keep ${colors[1]}`}>{title}</h2>
    <p className={`m-0 mt-3 min-h-[48px] text-[15px] leading-6 font-medium whitespace-pre-line break-keep ${colors[2]}`}>{description}</p>
  </div>;
}

function Step3({
  analyzeStep,
  analyzeProgress,
  analyzeError,
  onRetry,
  onReset,
  onUseMock,
}: {
  analyzeStep: number;
  analyzeProgress: number;
  analyzeError: string | null;
  onRetry: () => void;
  onReset: () => void;
  onUseMock: () => void;
}) {
  if (analyzeError) {
    return (
      <div className="app-frame relative isolate overflow-hidden max-w-app min-h-[calc(100svh/var(--app-zoom))] mx-auto bg-[#F1F7FB] flex flex-col">
        <div className="absolute inset-0 -z-10 pointer-events-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/dashboard/scan-error-clay-portrait.webp" alt="" className="w-full h-[calc(100svh/var(--app-zoom))] object-cover object-top" />
        </div>
        <div className="flex-1 px-6 pt-[calc(40svh/var(--app-zoom))] pb-6 flex flex-col gap-5">
        <ScanStateHeading tone="blue" role="alert" label="분석이 잠시 멈췄어요" title="다시 시도해 볼까요?" description={analyzeError} />
        <div className="w-full mt-auto pt-4 flex flex-col gap-2 pb-[env(safe-area-inset-bottom)]">
          <button
            type="button"
            onClick={onRetry}
            className="w-full h-14 rounded-[16px] bg-primary-gradient text-white text-[16px] font-bold shadow-button"
          >
            분석 다시 시도
          </button>
          <button
            type="button"
            onClick={onReset}
            className="w-full h-11 text-[14px] font-semibold text-muted bg-transparent border-none cursor-pointer"
          >
            처음부터 다시 스캔
          </button>
          {isDev && (
            <button
              type="button"
              onClick={onUseMock}
              className="w-full h-10 rounded-[12px] border border-[#E3EAF4] bg-white/70 text-[#8293AA] text-[11px] font-semibold"
            >
              테스트 데이터로 계속 (개발용)
            </button>
          )}
        </div>
        </div>
      </div>
    );
  }

  const currentLabel = ANALYZE_STEPS[Math.min(Math.max(analyzeStep - 1, 0), ANALYZE_STEPS.length - 1)];
  return (
    <div className="app-frame relative isolate overflow-hidden max-w-app min-h-[calc(100svh/var(--app-zoom))] mx-auto bg-[#F0F8F5] flex flex-col">
      <div className="absolute inset-0 -z-10 pointer-events-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/dashboard/scan-analyzing-mint-portrait.webp" alt="" className="w-full h-[calc(100svh/var(--app-zoom))] object-cover object-top" />
      </div>
      <div className="flex-1 px-6 pt-[calc(40svh/var(--app-zoom))] pb-8 flex flex-col gap-5">
        <ScanStateHeading tone="mint" role="status" label="AI 구강 분석" title="치아를 살펴보고 있어요" description="촬영한 사진으로 리포트를 준비하고 있어요" />
        <div className="rounded-[22px] bg-[#F9FFFC]/85 border border-[#CDE8DC] px-5 py-4 shadow-[0_4px_20px_rgba(61,119,95,0.05)]">
          <div className="flex items-center gap-2 mb-3">
            <Loader2 size={18} className="text-[#328F7C] animate-spin" />
            <span className="flex-1 text-[15px] font-bold text-[#254E43]">{currentLabel}</span>
            <span className="text-[23px] font-bold text-[#328F7C] tabular-nums">{analyzeProgress}%</span>
          </div>
          <div role="progressbar" aria-label="분석 진행률" aria-valuemin={0} aria-valuemax={100} aria-valuenow={analyzeProgress} className="h-2.5 bg-[#DFEEE5] rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#35977F] to-[#85CBB0] rounded-full transition-[width] duration-500" style={{ width: `${analyzeProgress}%` }} />
          </div>
        </div>
        <ol className="m-0 p-0 list-none flex flex-col gap-3 px-1">
          {ANALYZE_STEPS.map((label, i) => {
            const done = i + 1 < analyzeStep;
            const active = i + 1 === analyzeStep;
            return <li key={label} className="flex items-center gap-3">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${done ? 'bg-[#328F7C] text-white' : active ? 'bg-[#D5EDE0] text-[#287D68]' : 'bg-[#E8F1EA] text-[#728E80]'}`}>
                {done ? <Check size={14} strokeWidth={3} /> : <span className="text-[12px] font-bold">{i + 1}</span>}
              </span>
              <span className={`text-[14px] ${active ? 'font-bold text-[#287D68]' : done ? 'font-semibold text-[#254E43]' : 'font-medium text-[#728E80]'}`}>{label}</span>
            </li>;
          })}
        </ol>
        <p className="m-0 mt-auto pt-2 text-[13px] font-medium leading-relaxed text-[#648575] text-center">완료되면 자동으로 다음 화면으로 이동해요</p>
      </div>
    </div>
  );
}
function Step4({ onNext, onReset, analysisResult, capturedZones }: {
  onNext: () => void;
  onReset: () => void;
  analysisResult: SessionAnalyzeResult | null;
  capturedZones: ViewType[];
}) {
  return (
    <div className="app-frame relative isolate overflow-hidden max-w-app min-h-[calc(100svh/var(--app-zoom))] mx-auto bg-[#FFFAEF] flex flex-col">
      <div className="absolute inset-0 -z-10 pointer-events-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/dashboard/scan-complete-apricot-portrait.webp" alt="" className="w-full h-[calc(100svh/var(--app-zoom))] object-cover object-top" />
      </div>
      <div className="px-6 pt-[calc(40svh/var(--app-zoom))] flex flex-col items-center gap-5">
        <ScanStateHeading tone="orange" label="리포트 준비 완료" title="분석이 완료됐어요" description="내 치아의 관리 포인트를 확인해 보세요" />
        {analysisResult && (
          <div className="w-full text-center py-1">
            <p className="m-0 text-[13px] font-semibold text-[#8C6D58]">이번 스캔 종합 점수</p>
            {analysisResult.sessionScore === null ? <p className="m-0 mt-3 text-[14px] font-medium text-[#8C6D58]">점수를 낼 수 있는 컷이 없었어요.</p> : (
              <div className="mt-3 flex items-baseline justify-center gap-1.5">
                <span className="text-[64px] font-bold leading-none tracking-[-2px] text-[#D9743D] tabular-nums">{analysisResult.sessionScore}</span>
                <span className="text-[14px] font-semibold text-[#A38670]">/ 100</span>
              </div>
            )}
            <p className="m-0 mt-2 text-[12px] font-medium text-[#9A7E67]">{analysisResult.validZoneCount}개 구역 분석 기준</p>
          </div>
        )}
        {analysisResult && analysisResult.invalidZones.length > 0 && (
          <div className="w-full rounded-[16px] bg-[#FFF5E4] px-4 py-3">
            <p className="m-0 text-[12px] font-bold text-[#9A6C28]">다시 촬영하면 좋아요</p>
            <p className="m-0 mt-1 text-[12px] font-medium text-[#8A744F] break-keep">{analysisResult.invalidZones.map((z) => zoneInfo(z)?.label ?? z).join(', ')} 구역</p>
          </div>
        )}
        <details className="w-full text-center group">
          <summary className="mx-auto w-fit flex items-center gap-1.5 cursor-pointer list-none rounded-full px-3 py-2 text-[13px] font-semibold text-[#8C6D58] hover:bg-white/50 [&::-webkit-details-marker]:hidden">촬영한 구역 {capturedZones.length}개<ChevronDown size={14} className="transition-transform group-open:rotate-180" /></summary>
          <div className="flex flex-wrap justify-center gap-1.5 mt-3">
            {capturedZones.map((zone) => <span key={zone} className="rounded-full bg-[#F6E7D7] px-2.5 py-1.5 text-[12px] font-semibold text-[#956A4D]">{zoneInfo(zone)?.fullLabel ?? zone}</span>)}
          </div>
        </details>
      </div>
      <div className="px-6 pb-[max(24px,env(safe-area-inset-bottom))] flex flex-col gap-2 mt-7">
        <button type="button" onClick={onNext} className="group w-full h-14 rounded-[18px] bg-gradient-to-r from-[#D87943] to-[#E5945E] border border-[#D87943]/20 text-white text-[16px] font-bold flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(169,96,50,0.12)] transition-[filter,transform] hover:brightness-105 active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B96636]">분석 결과 보기<ChevronRight size={18} strokeWidth={2.5} className="transition-transform group-hover:translate-x-0.5" /></button>
        <button type="button" onClick={onReset} className="mx-auto px-4 h-11 text-[13px] font-semibold text-[#8C6D58] rounded-full hover:bg-white/40 transition-colors">다시 스캔하기</button>
      </div>
    </div>
  );
}
interface Shot {
  white: Blob;
  uv: Blob | null;
}

interface PendingShot {
  zone: ViewType;
  shot: Shot;
  previewUrl: string;
  quality: CaptureQuality;
}

export default function ScanPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [selectedZones, setSelectedZones] = useState<ViewType[]>(ALL_VIEW_TYPES);
  const [startError, setStartError] = useState<string | null>(null);
  const {
    answered: toothProfileSet,
    profileLoaded,
    missing,
    hydrate: hydrateDentition,
  } = useDentitionStore();
  const [capturedZones, setCapturedZones] = useState<ViewType[]>([]);
  const [currentZone, setCurrentZone] = useState<ViewType | null>(null);
  const [surface, setSurface] = useState<Surface>('LINGUAL');
  const [pending, setPending] = useState<PendingShot | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [shutterNotice, setShutterNotice] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [analyzeStep, setAnalyzeStep] = useState(0);
  const [analyzeProgress, setAnalyzeProgress] = useState(0);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [analysisResult, setAnalysisResult] = useState<SessionAnalyzeResult | null>(null);
  const refreshNotifications = useNotificationStore((s) => s.refresh);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [analyzeKey, setAnalyzeKey] = useState(0);


  const { deviceId, deviceIp } = useAuthStore();
  const scannerAddress = deviceAddress(deviceIp);
  const [useWebcam, setUseWebcam] = useState(false);

  useEffect(() => {
    setUseWebcam(readWebcamPreference(Boolean(deviceIp)));
  }, [deviceIp]);

  const toggleWebcam = useCallback((next: boolean) => {
    writeWebcamPreference(next);
    setUseWebcam(next);
  }, []);
  const uploadedImageIds = useRef<Map<ViewType, number>>(new Map());
  const pendingRef = useRef<PendingShot | null>(null);

  useEffect(() => hydrateDentition(), [hydrateDentition]);

  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  const {
    videoRef,
    imgRef,
    isReady,
    error: cameraError,
    ledMode,
    cameraMode,
    startCamera,
    stopCamera,
    setLed,
  } = useCameraStream();

  const toggleLed = useCallback(
    (mode: LedMode) => void setLed(ledMode === mode ? 'OFF' : mode),
    [ledMode, setLed],
  );

  const { detectedStatus } = useScanDetection({
    videoRef,
    imgRef,
    enabled: step === 2 && isReady && !pending,
  });

  const startCameraRef = useRef(startCamera);
  const stopCameraRef = useRef(stopCamera);
  useEffect(() => {
    startCameraRef.current = startCamera;
  });
  useEffect(() => {
    stopCameraRef.current = stopCamera;
  });

  useEffect(() => {
    if (step === 2) {
      if (scannerAddress && !useWebcam) {
        startCameraRef.current('esp32', streamUrl(scannerAddress));
      } else {
        startCameraRef.current('device');
      }
    } else {
      stopCameraRef.current();
    }
  }, [step, scannerAddress, useWebcam]);

  useEffect(() => () => {
    if (pendingRef.current) URL.revokeObjectURL(pendingRef.current.previewUrl);
  }, []);

  useEffect(() => {
    const g = zoneInfo(currentZone)?.group;
    if (g) setSurface(g === 'OUTER' ? 'BUCCAL' : 'LINGUAL');
  }, [currentZone]);

  const snap = useCallback(
    async (zone: ViewType, mode: 'white' | 'uv'): Promise<Blob> => {
      const res = await deviceSnap(controlHost(scannerAddress!), zone, mode);
      if (!res.ok) {
        const detail = await res.json().catch(() => null);
        throw new Error(detail?.error ?? `capture proxy ${res.status}`);
      }
      return res.blob();
    },
    [scannerAddress],
  );

  const captureShot = useCallback(async (zone: ViewType): Promise<Shot> => {
    if (cameraMode === 'esp32' && scannerAddress) {
      // 웹 버튼도 두 광원 연속 촬영
      const white = await snap(zone, 'white');
      const uv = await snap(zone, 'uv');
      return { white, uv };
    }
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video?.videoWidth || 640;
    canvas.height = video?.videoHeight || 480;
    if (video) canvas.getContext('2d')?.drawImage(video, 0, 0);
    const white = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b ?? new Blob()), 'image/jpeg', 0.9),
    );
    return { white, uv: null };
  }, [cameraMode, scannerAddress, videoRef, snap]);

  // 촬영 중 스트림 끊김. 촬영 후 재연결
  const restartStream = useCallback(() => {
    if (cameraMode === 'esp32' && scannerAddress) {
      startCameraRef.current('esp32', streamUrl(scannerAddress));
    }
  }, [cameraMode, scannerAddress]);

  const acceptShot = useCallback(
    async (shot: Shot) => {
      if (!currentZone) return;
      const zone = currentZone;
      // 판정·미리보기는 백색 컷 기준
      const blob = shot.white;
      const local = await evaluateCaptureBlob(blob);
      const previewUrl = URL.createObjectURL(blob);

      // 로컬 판정은 힌트. 서버 판정 우선. 세션 없을 때만 로컬로 종료
      const ask = sessionId !== null && sessionId !== DEV_SESSION_ID;
      setPending({
        zone,
        shot,
        previewUrl,
        quality: { ...local, checking: ask, verified: local.ok && !ask ? false : undefined },
      });
      if (!ask) return;

      const settle = (quality: CaptureQuality) =>
        setPending((prev) => (prev?.previewUrl === previewUrl ? { ...prev, quality } : prev));

      const file = new File([blob], 'shot.jpg', { type: blob.type || 'image/jpeg' });
      if (isDev) {
        console.groupCollapsed(`[화질판정] 요청 ${zone}`);
        console.log('POST', `/api/scan-sessions/${sessionId}/images/quality-check`);
        console.log('form', {
          file: `${file.name} ${file.type} ${(file.size / 1024).toFixed(1)}KB`,
          viewType: zone,
          lightType: 'WHITE_LIGHT',
        });
        console.log('로컬 판정', { brightness: local.brightness, sharpness: local.sharpness });
        console.groupEnd();
      }

      try {
        const res = await scanApi.checkCaptureQuality(sessionId, {
          file,
          viewType: zone,
          lightType: 'WHITE_LIGHT',
        });
        if (isDev) {
          console.groupCollapsed(`[화질판정] 응답 ${zone} · ${res.status}`);
          console.log('body', res.data);
          console.log('result', res.data.result);
          console.groupEnd();
        }
        settle(applyServerVerdict(local, res.data.result ?? null));
      } catch (e) {
        // 확인 못 한 건 화면에 표시
        const status = axios.isAxiosError(e) ? e.response?.status : undefined;
        const body = axios.isAxiosError(e) ? e.response?.data : undefined;
        console.error(`[화질판정] 실패 ${zone} · status ${status ?? '응답 없음'}`, body ?? e);
        settle({ ...local, checking: false, verified: false });
      }
    },
    [currentZone, sessionId],
  );

  // 기기 셔터 컷도 같은 확인 화면
  useHardwareShutter({
    host: cameraMode === 'esp32' && scannerAddress ? controlHost(scannerAddress) : null,
    enabled: step === 2 && !pending && !isCapturing,
    onError: setShutterNotice,
    onCapture: async (shot) => {
      setCaptureError(null);
      try {
        await acceptShot(shot);
      } finally {
        restartStream();
      }
    },
  });

  const handleCapture = useCallback(async () => {
    if (isCapturing || !isReady || !currentZone || pending) return;
    setIsCapturing(true);
    setCaptureError(null);
    try {
      await acceptShot(await captureShot(currentZone));
      restartStream();
    } catch (e) {
      const detail = e instanceof Error ? e.message : '';
      setCaptureError(
        `촬영에 실패했어요. 스캐너 연결을 확인해 주세요.${detail ? `
(${detail})` : ''}`,
      );
      restartStream();
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing, isReady, currentZone, pending, captureShot, acceptShot, restartStream]);

  // 스트림은 촬영 시점에 재연결됨. 여기서 또 붙이면 화면 멈춤
  const handleRetake = useCallback(() => {
    setPending((prev) => {
      if (prev) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
    setCaptureError(null);
  }, []);

  const nextUncapturedZone = useCallback(
    (justDone: ViewType) => {
      const done = new Set([...capturedZones, justDone]);
      const order = selectedZones;
      const from = order.indexOf(justDone);
      for (let k = 1; k <= order.length; k++) {
        const z = order[(from + k) % order.length];
        if (!done.has(z)) return z;
      }
      return null;
    },
    [capturedZones, selectedZones],
  );

  const handleConfirmShot = useCallback(async () => {
    if (!pending || !sessionId) return;
    setIsUploading(true);
    setCaptureError(null);
    const { zone, shot, previewUrl } = pending;
    try {
      if (sessionId !== DEV_SESSION_ID) {
        const upload = (blob: Blob, lightType: LightType) =>
          scanApi.uploadImageToSession(sessionId, {
            file: new File([blob], `scan_${zone}_${lightType}.jpg`, { type: 'image/jpeg' }),
            viewType: zone,
            lightType,
          });

        const res = await upload(shot.white, 'WHITE_LIGHT');
        if (shot.uv) await upload(shot.uv, 'UV_LIGHT');
        uploadedImageIds.current.set(zone, res.data.result.imageId);
      }

      URL.revokeObjectURL(previewUrl);
      setPending(null);

      const isRetake = capturedZones.includes(zone);
      setCapturedZones((prev) => (prev.includes(zone) ? prev : [...prev, zone]));

      const next = nextUncapturedZone(zone);
      if (next) setCurrentZone(next);
      else if (!isRetake) setTimeout(() => setStep(3), 400);
    } catch {
      setCaptureError('업로드에 실패했어요. 네트워크를 확인하고 다시 시도해 주세요.');
    } finally {
      setIsUploading(false);
    }
  }, [pending, sessionId, nextUncapturedZone, capturedZones]);

  const handleSetZones = useCallback((zones: ViewType[]) => {
    setSelectedZones(sortZones([...new Set(zones)]));
  }, []);

  const handleToggleZone = useCallback((z: ViewType) => {
    setSelectedZones((prev) =>
      sortZones(prev.includes(z) ? prev.filter((v) => v !== z) : [...prev, z]),
    );
  }, []);

  const handleNavigateZone = useCallback((z: ViewType) => {
    if (pending) return;
    setCurrentZone(z);
    setCaptureError(null);
  }, [pending]);

  useEffect(() => {
    if (step !== 3 || !sessionId) return;
    let n = 0;
    setAnalyzeStep(1);
    setAnalyzeProgress(0);
    setAnalyzeError(null);

    const t = setInterval(() => {
      n++;
      setAnalyzeStep(n + 1);
      setAnalyzeProgress(Math.round((n / ANALYZE_STEPS.length) * 100));
      if (n >= ANALYZE_STEPS.length) clearInterval(t);
    }, 2000);

    scanApi
      .analyzeSession(sessionId)
      .then((res: { data: { result: SessionAnalyzeResult } }) => {
        setAnalysisResult(res.data.result);
        // 분석 직후 생성된 알림 표시
        void refreshNotifications({ popNew: true });
        clearInterval(t);
        setAnalyzeStep(ANALYZE_STEPS.length + 1);
        setAnalyzeProgress(100);
        setTimeout(() => setStep(4), 800);
      })
      .catch(() => {
        clearInterval(t);
        setAnalyzeError(
          '분석 서버가 응답하지 않았어요.\n찍은 사진은 그대로 있으니 다시 시도하면 돼요.',
        );
      });

    return () => clearInterval(t);
  }, [step, sessionId, analyzeKey, capturedZones, refreshNotifications]);

  const handleReset = () => {
    uploadedImageIds.current = new Map();
    if (pending) URL.revokeObjectURL(pending.previewUrl);
    setPending(null);
    setStep(1);
    setSelectedZones(ALL_VIEW_TYPES);
    setCapturedZones([]);
    setCurrentZone(null);
    setSurface('LINGUAL');
    setIsCapturing(false);
    setIsUploading(false);
    setCaptureError(null);
    setChecked(false);
    setAnalyzeStep(0);
    setAnalyzeProgress(0);
    setSessionId(null);
    setAnalysisResult(null);
    setAnalyzeError(null);
    setAnalyzeKey(0);
  };

  const reviewOverlay = useMemo(() => {
    if (!pending) return undefined;
    const remaining = selectedZones.filter(
      (z) => z !== pending.zone && !capturedZones.includes(z),
    ).length;
    const confirmLabel = capturedZones.includes(pending.zone)
      ? '이 컷으로 교체'
      : remaining === 0
        ? '이대로 완료'
        : '이대로 다음';
    return (
      <CaptureReview
        previewUrl={pending.previewUrl}
        mirrored={cameraMode === 'device'}
        quality={pending.quality}
        zoneLabel={zoneInfo(pending.zone)?.fullLabel ?? ''}
        isUploading={isUploading}
        uploadError={captureError}
        confirmLabel={confirmLabel}
        onRetake={handleRetake}
        onConfirm={handleConfirmShot}
      />
    );
  }, [pending, selectedZones, capturedZones, isUploading, captureError, handleRetake, handleConfirmShot, cameraMode]);

  return (
    <div>
      {step === 1 && (
        <Step1
          checked={checked}
          onCheck={setChecked}
          selectedZones={selectedZones}
          onToggleZone={handleToggleZone}
          onSetZones={handleSetZones}
          startError={startError}
          needsToothProfile={profileLoaded && !toothProfileSet}
          onSetupProfile={() => router.push('/mypage/teeth?from=scan')}
          webcam={isDev ? { on: useWebcam, onToggle: toggleWebcam } : null}
          onExit={() => setShowExitModal(true)}
          onStart={async () => {
            setStartError(null);
            const enterScan = (sid: number) => {
              setSessionId(sid);
              uploadedImageIds.current = new Map();
              setCapturedZones([]);
              setCurrentZone(selectedZones[0] ?? null);
              setStep(2);
            };
            try {
              // deviceId 없으면 서버 등록 기기 사용
              let id = deviceId;
              if (id === null) {
                const status = await deviceApi.getStatus().catch(() => null);
                id = status?.data.result?.[0]?.deviceId ?? null;
              }
              if (id === null) {
                setStartError('스캐너가 등록되지 않았어요. 디바이스를 먼저 연결해 주세요.');
                return;
              }
              const res = await scanApi.createSession(id);
              enterScan(res.data.result);
            } catch (e) {
              console.error('세션 생성 실패:', e);
              // 결손치 미등록 시 BE 세션 생성 실패
              const code = axios.isAxiosError(e)
                ? (e.response?.data as { code?: string } | undefined)?.code
                : undefined;
              setStartError(
                code === 'TOOTH_PROFILE_5010'
                  ? '빠진 치아를 먼저 등록해 주세요. 마이페이지 > 치아 정보에서 등록할 수 있어요.'
                  : '스캔을 시작하지 못했어요. 잠시 후 다시 시도해 주세요.',
              );
              if (isDev) {
                console.warn('개발 모드: 업로드 없이 스캔 화면만 띄웁니다');
                enterScan(DEV_SESSION_ID);
              }
            }
          }}
        />
      )}
      {step === 2 && (
        <Step2
          videoRef={videoRef}
          imgRef={imgRef}
          isReady={isReady}
          cameraError={cameraError}
          captureError={captureError}
          shutterNotice={shutterNotice}
          cameraMode={cameraMode}
          status={detectedStatus}
          ledMode={ledMode}
          selectedZones={selectedZones}
          capturedZones={capturedZones}
          currentZone={currentZone}
          missingTeeth={missing}
          surface={surface}
          onSurfaceChange={setSurface}
          onZoneClick={handleNavigateZone}
          onExit={() => setShowExitModal(true)}
          onHelp={() => setShowHelp(true)}
          onCapture={handleCapture}
          isCapturing={isCapturing}
          onLedToggle={toggleLed}
          onFinish={() => setStep(3)}
          onRetry={() => {
            stopCamera();
            if (scannerAddress && !useWebcam) {
              startCamera('esp32', streamUrl(scannerAddress));
            } else {
              startCamera('device');
            }
          }}
          reviewOverlay={reviewOverlay}
        />
      )}
      {step === 3 && (
        <Step3
          analyzeStep={analyzeStep}
          analyzeProgress={analyzeProgress}
          analyzeError={analyzeError}
          onRetry={() => {
            setAnalyzeError(null);
            setAnalyzeStep(0);
            setAnalyzeProgress(0);
            setAnalyzeKey((k) => k + 1);
          }}
          onReset={handleReset}
          onUseMock={() => {
            setAnalyzeError(null);
            setAnalysisResult(mockAnalysisResult(capturedZones));
            setStep(4);
          }}
        />
      )}
      {step === 4 && (
        <Step4
          onNext={() => router.push(`/report/${sessionId}`)}
          onReset={handleReset}
          analysisResult={analysisResult}
          capturedZones={capturedZones}
        />
      )}

      {showExitModal && (
        <ScanExitModal onCancel={() => setShowExitModal(false)} onConfirm={() => router.back()} />
      )}
      {showHelp && <ScanHelpSheet onClose={() => setShowHelp(false)} />}
    </div>
  );
}
