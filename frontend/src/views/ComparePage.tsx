'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Loader2,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import NavBar from '@/components/organisms/NavBar';
import PageShell from '@/components/organisms/PageShell';
import OralViewer3D from '@/components/organisms/OralViewer3D';
import type { ToothAnalysisResult } from '@/components/organisms/OralViewer3D/ThreeScene';
import { reportApi, type SessionReport, type ToothLesion } from '@/lib/api/report';
import type { RiskLevel } from '@/lib/api/common';
import { useSessionIndex } from '@/hooks/useSessionIndex';
import { compareSummary, compareTeeth, type ToothChange } from '@/lib/compare';
import { useDentitionStore } from '@/stores/dentitionStore';
import { excludeMissingTeeth } from '@/lib/toothMapping';
import { keepCapturedLesions, keepCapturedTeeth } from '@/lib/scanCoverage';
import { scanApi } from '@/lib/api/scan';
import type { ViewType } from '@/lib/api/scan';
import { RISK_LABEL, formatDateTime, formatShortDate } from '@/lib/score';
import { toothName } from '@/lib/dentition';
import { RISK_MODEL_FILL } from '@/lib/riskColors';
import { RISK_TAG } from '@/lib/lesionRisk';

const toViewerResults = (
  report: SessionReport | null,
  missing: number[],
  zones: ViewType[],
): ToothAnalysisResult[] =>
  keepCapturedTeeth(excludeMissingTeeth(report?.toothStatuses ?? [], missing), zones).map((t) => ({
    toothNumber: String(t.toothNumber),
    lesionType: t.lesionType ?? '',
    areaRatio: t.areaRatio,
    riskLevel: t.riskLevel as ToothAnalysisResult['riskLevel'],
  }));

const RISK_RANK: RiskLevel[] = ['VERY_LOW', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// #RRGGBB 두 색 혼합. three 번들 회피
function lerpHex(from: string, to: string, t: number): string {
  const channel = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  const mixed = [0, 1, 2].map((i) =>
    Math.round(lerp(channel(from, i), channel(to, i), t))
      .toString(16)
      .padStart(2, '0'),
  );
  return `#${mixed.join('')}`;
}

function worstRiskByTooth(results: ToothAnalysisResult[]): Map<string, RiskLevel> {
  const worst = new Map<string, RiskLevel>();
  for (const r of results) {
    const kept = worst.get(r.toothNumber);
    if (!kept || RISK_RANK.indexOf(r.riskLevel) > RISK_RANK.indexOf(kept)) {
      worst.set(r.toothNumber, r.riskLevel);
    }
  }
  return worst;
}

// 슬라이더 위치로 색 혼합. 한쪽에만 있으면 깨끗 색에서 시작
function blendToothColors(
  before: ToothAnalysisResult[],
  after: ToothAnalysisResult[],
  t: number,
): Record<string, string> {
  const a = worstRiskByTooth(before);
  const b = worstRiskByTooth(after);
  const colors: Record<string, string> = {};
  new Set([...a.keys(), ...b.keys()]).forEach((fdi) => {
    colors[fdi] = lerpHex(
      RISK_MODEL_FILL[a.get(fdi) ?? 'VERY_LOW'],
      RISK_MODEL_FILL[b.get(fdi) ?? 'VERY_LOW'],
      t,
    );
  });
  return colors;
}

function ChangeChip({
  change,
  tone,
  active,
  onClick,
}: {
  change: ToothChange;
  tone: 'good' | 'bad';
  active: boolean;
  onClick: () => void;
}) {
  const good = tone === 'good';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      data-tooth={change.toothNumber}
      className={`w-[156px] flex-none rounded-2xl bg-white/90 p-3.5 text-left shadow-card backdrop-blur-sm transition-shadow ${
        active ? 'ring-2 ring-primary/60' : 'ring-1 ring-hairline'
      }`}
    >
      <span
        className={`inline-block rounded-md px-1.5 py-0.5 text-[10.5px] font-bold ${
          good ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'
        }`}
      >
        {good ? '좋아짐' : '나빠짐'}
      </span>
      <p className="m-0 mt-2 text-[13.5px] font-semibold leading-tight text-content">
        {toothName(change.toothNumber)}
      </p>
      <p className="m-0 mt-0.5 text-[11px] text-muted">{change.toothNumber}번</p>
      <div className="mt-2.5 flex items-center gap-1.5 text-[11.5px] text-muted">
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: RISK_MODEL_FILL[change.before] }}
        />
        {RISK_TAG[change.before]}
        <ArrowRight size={11} className="flex-shrink-0" />
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: RISK_MODEL_FILL[change.after] }}
        />
        <span className="font-semibold text-content">{RISK_TAG[change.after]}</span>
      </div>
    </button>
  );
}

export default function ComparePage() {
  const router = useRouter();
  const { sessions, loading: finding } = useSessionIndex();
  const [beforeId, setBeforeId] = useState<number | null>(null);
  const [afterId, setAfterId] = useState<number | null>(null);
  const [before, setBefore] = useState<SessionReport | null>(null);
  const [after, setAfter] = useState<SessionReport | null>(null);
  const [beforeLesions, setBeforeLesions] = useState<ToothLesion[]>([]);
  const [afterLesions, setAfterLesions] = useState<ToothLesion[]>([]);
  const [beforeZones, setBeforeZones] = useState<ViewType[]>([]);
  const [afterZones, setAfterZones] = useState<ViewType[]>([]);
  // 0 기준 스캔, 1 비교 스캔. 놓으면 가까운 쪽
  const [blend, setBlend] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [failed, setFailed] = useState<number[]>([]);
  const { missing, hydrate: hydrateDentition } = useDentitionStore();

  useEffect(() => hydrateDentition(), [hydrateDentition]);
  useEffect(() => {
    if (sessions.length < 2 || afterId !== null) return;
    setAfterId(sessions[0].sessionId);
    setBeforeId(sessions[1].sessionId);
  }, [sessions, afterId]);

  const load = useCallback(
    (
      id: number,
      setReport: (r: SessionReport | null) => void,
      setLesions: (l: ToothLesion[]) => void,
      setZones: (z: ViewType[]) => void,
    ) => {
      reportApi
        .getSessionReport(id)
        .then((res) => setReport(res.data.result))
        .catch(() => {
          setReport(null);
          setFailed((prev) => [...new Set([...prev, id])]);
        });
      reportApi
        .getMeshCoordinates(id)
        .then((res) => setLesions(res.data.result?.lesions ?? []))
        .catch(() => setLesions([]));
      // 촬영 구역 밖 치아 제외용
      scanApi
        .getCaptureStatus(id)
        .then((res) =>
          setZones([...new Set((res.data.result?.capturedZones ?? []).map((z) => z.viewType))]),
        )
        .catch(() => setZones([]));
    },
    [],
  );
  useEffect(() => {
    if (beforeId !== null) load(beforeId, setBefore, setBeforeLesions, setBeforeZones);
  }, [beforeId, load]);
  useEffect(() => {
    if (afterId !== null) load(afterId, setAfter, setAfterLesions, setAfterZones);
  }, [afterId, load]);

  const beforeResults = useMemo(
    () => toViewerResults(before, missing, beforeZones),
    [before, missing, beforeZones],
  );
  const afterResults = useMemo(
    () => toViewerResults(after, missing, afterZones),
    [after, missing, afterZones],
  );

  const diff = useMemo(
    () =>
      compareTeeth(
        beforeResults.map((t) => ({ toothNumber: Number(t.toothNumber), riskLevel: t.riskLevel })),
        afterResults.map((t) => ({ toothNumber: Number(t.toothNumber), riskLevel: t.riskLevel })),
      ),
    [beforeResults, afterResults],
  );

  const ready = before !== null && after !== null;
  const scoreDelta = ready ? after.totalScore - before.totalScore : null;
  const liveScore = ready ? Math.round(lerp(before.totalScore, after.totalScore, blend)) : null;
  // 마커·툴팁은 가까운 스캔 기준
  const toothColors = useMemo(
    () => blendToothColors(beforeResults, afterResults, blend),
    [beforeResults, afterResults, blend],
  );
  const nearAfter = blend >= 0.5;
  const viewerResults = nearAfter ? afterResults : beforeResults;
  const viewerLesions = keepCapturedLesions(
    excludeMissingTeeth(nearAfter ? afterLesions : beforeLesions, missing),
    nearAfter ? afterZones : beforeZones,
  );

  const label = (id: number | null) => {
    const found = sessions.find((s) => s.sessionId === id);
    return found ? formatShortDate(found.scannedAt) : '';
  };
  const changes = [...diff.worsened, ...diff.improved];

  const snap = () => setBlend((v) => (v >= 0.5 ? 1 : 0));

  // 변화 캐러셀. 휠 → 가로 스크롤
  const railRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      e.preventDefault();
      rail.scrollBy({ left: e.deltaY, behavior: 'auto' });
    };
    rail.addEventListener('wheel', onWheel, { passive: false });
    return () => rail.removeEventListener('wheel', onWheel);
  }, [changes.length]);
  useEffect(() => {
    if (!selected || !railRef.current) return;
    const rail = railRef.current;
    const card = rail.querySelector<HTMLElement>(`[data-tooth="${selected}"]`);
    if (!card) return;
    // scrollIntoView는 세로 스크롤 유발. 가로만 직접
    rail.scrollTo({
      left: card.offsetLeft - (rail.clientWidth - card.clientWidth) / 2,
      behavior: 'smooth',
    });
  }, [selected]);
  const slide = (dir: -1 | 1) => railRef.current?.scrollBy({ left: dir * 170, behavior: 'smooth' });

  const Select = ({
    value,
    onChange,
    label: name,
  }: {
    value: number | null;
    onChange: (id: number) => void;
    label: string;
  }) => (
    <label className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="text-[11px] font-semibold text-white">{name}</span>
      <select
        value={value ?? ''}
        onChange={(e) => {
          onChange(Number(e.target.value));
          setSelected(null);
        }}
        className="h-10 w-full rounded-[12px] border border-white/30 bg-white/90 px-2 text-[12px] text-content"
      >
        {sessions.map((s) => (
          <option key={s.sessionId} value={s.sessionId}>
            {formatDateTime(s.scannedAt) || `세션 ${s.sessionId}`}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <PageShell withNav>
      <div className="bg-white/90 backdrop-blur-sm">
        <div className="flex items-center px-4 py-3">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="뒤로 가기"
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-hairline transition-colors"
          >
            <ChevronLeft size={20} className="text-content" />
          </button>
          <span className="flex-1 text-center text-[16px] font-semibold text-content">
            스캔 비교
          </span>
          <div className="w-9" />
        </div>
      </div>

      {finding ? (
        <div className="px-5 pt-16 flex flex-col items-center gap-2">
          <Loader2 size={20} className="animate-spin text-primary" />
          <p className="m-0 text-[12px] text-muted">지난 스캔을 찾고 있어요</p>
        </div>
      ) : sessions.length < 2 ? (
        <div className="px-5 pt-16 flex flex-col items-center gap-2">
          <p className="m-0 text-sm text-muted">비교하려면 스캔이 2번 이상 필요해요.</p>
          <button
            type="button"
            onClick={() => router.push('/scan')}
            className="mt-2 px-4 py-2 rounded-full bg-primary-gradient text-white text-xs font-semibold"
          >
            스캔하러 가기
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4 pb-4">
          {!ready && failed.length > 0 && (
            <div className="mx-5 mt-4 bg-white/90 backdrop-blur-sm rounded-[20px] shadow-card p-5">
              <p className="m-0 text-[13px] font-semibold text-content">
                이 스캔의 결과를 불러오지 못했어요
              </p>
              <p className="m-0 mt-1 text-[12px] text-muted leading-relaxed">
                잠시 후 다시 시도하거나 위에서 다른 날짜를 골라 주세요.
              </p>
            </div>
          )}

          <div className="relative isolate -mt-1 overflow-hidden bg-[#155974] pb-7 text-white">
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-2 z-0 overflow-hidden blur-[4px]"
            >
              <Image
                src="/images/dashboard/compare-blue-studio.webp"
                alt=""
                fill
                priority
                sizes="100vw"
                className="object-cover object-center"
              />
            </div>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[42%] bg-gradient-to-t from-[#123D59]/45 via-[#123D59]/15 to-transparent"
            />
            <div className="relative z-10 isolate [filter:none]">
              <div className="relative flex items-end gap-2 px-5 pb-3 pt-5">
                <Select value={beforeId} onChange={setBeforeId} label="기준" />
                <ArrowRight size={16} className="mb-3 flex-shrink-0 text-white/70" />
                <Select value={afterId} onChange={setAfterId} label="비교" />
              </div>
              <div
                className={`relative ${selected ? 'h-[420px] sm:h-[340px]' : 'h-[360px] sm:h-[300px]'}`}
              >
                <OralViewer3D
                  analysisResults={viewerResults}
                  lesions={viewerLesions}
                  minimal
                  zoom={1.25}
                  fitToViewport
                  resolutionScale={1.5}
                  idleMarkers={false}
                  toothColors={toothColors}
                  selectedTooth={selected}
                  onToothSelect={setSelected}
                />
                {selected && (
                  <div className="pointer-events-none absolute left-4 top-3 flex items-center gap-2">
                    <span className="rounded-full bg-white/70 px-3 py-1.5 text-[13px] font-semibold text-content shadow-card backdrop-blur-sm">
                      {toothName(Number(selected))} · {selected}번
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelected(null)}
                      aria-label="전체 보기"
                      className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full bg-white/70 shadow-card backdrop-blur-sm"
                    >
                      <X size={14} className="text-content" />
                    </button>
                  </div>
                )}
              </div>

              <div className="relative mx-3 mt-4 px-2 pb-4 pt-3">
                <div className="mx-2">
                  <div className="flex items-center justify-between text-[12.5px] font-semibold">
                    <span className={blend < 0.5 ? 'text-white' : 'text-white/80'}>
                      기준 {label(beforeId)}
                      {before && <span className="ml-1 tabular-nums">{before.totalScore}점</span>}
                    </span>
                    <span className={blend >= 0.5 ? 'text-white' : 'text-white/80'}>
                      비교 {label(afterId)}
                      {after && <span className="ml-1 tabular-nums">{after.totalScore}점</span>}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(blend * 100)}
                    onChange={(e) => setBlend(Number(e.target.value) / 100)}
                    onPointerUp={snap}
                    onKeyUp={snap}
                    onTouchEnd={snap}
                    aria-label="기준 스캔과 비교 스캔 사이"
                    className="compare-range compare-range-dark mt-1 w-full"
                  />
                  <p className="m-0 mt-1 text-center text-[12px] text-white/90">
                    {blend === 1
                      ? '비교 스캔이에요. 왼쪽으로 끌면 기준 스캔으로 돌아가요'
                      : blend === 0
                        ? '기준 스캔이에요. 오른쪽으로 끌면 비교 스캔으로 바뀌어요'
                        : '두 스캔 사이를 섞어 보는 중이에요'}
                  </p>
                </div>
                {ready && (
                  <div className="px-5 pt-4 text-center">
                    <div className="flex items-end justify-center gap-2">
                      <span className="text-[22px] font-bold text-white/80 tabular-nums leading-none">
                        {before.totalScore}
                      </span>
                      <ArrowRight size={16} className="mb-1 text-white/60" />
                      <span className="text-[56px] font-bold text-white tabular-nums leading-none tracking-[-2px]">
                        {liveScore}
                      </span>
                      <span className="mb-1 text-sm text-white/85">점</span>
                      {scoreDelta !== null && scoreDelta !== 0 && (
                        <span
                          className={`mb-2 ml-1 flex items-center gap-0.5 rounded-full px-2 py-1 text-xs font-bold ${
                            scoreDelta > 0 ? 'bg-success text-white' : 'bg-danger text-white'
                          }`}
                        >
                          {scoreDelta > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {scoreDelta > 0 ? '+' : ''}
                          {scoreDelta}
                        </span>
                      )}
                    </div>
                    <p className="m-0 mt-2.5 text-[14px] font-semibold leading-relaxed text-white">
                      {compareSummary(diff, scoreDelta)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {ready && changes.length === 0 && (
            <div className="mx-5 bg-white/90 backdrop-blur-sm rounded-[20px] shadow-card p-5">
              <h2 className="m-0 text-[15px] font-semibold text-content mb-1">치아별 변화</h2>
              <p className="m-0 text-[12.5px] text-muted leading-relaxed">
                {beforeId === afterId
                  ? '같은 스캔끼리 비교하고 있어요. 위에서 다른 날짜를 골라 주세요.'
                  : '두 스캔 사이에 위험도가 바뀐 치아가 없어요.'}
              </p>
            </div>
          )}

          {ready && changes.length > 0 && (
            <div className="pt-2">
              <div className="flex items-baseline justify-between px-5 mb-2">
                <h2 className="m-0 text-[15px] font-semibold text-content">치아별 변화</h2>
                <span className="text-[12px] text-muted">
                  <b className="font-semibold text-success">좋아짐 {diff.improved.length}</b>
                  {' · '}
                  <b className="font-semibold text-danger">나빠짐 {diff.worsened.length}</b>
                </span>
              </div>
              <div className="mb-2 flex items-center justify-between px-5">
                <p className="m-0 text-[12px] text-muted">누르면 위 모형에서 그 치아를 봐요</p>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => slide(-1)}
                    aria-label="이전 카드"
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 shadow-card"
                  >
                    <ChevronLeft size={14} className="text-content" />
                  </button>
                  <button
                    type="button"
                    onClick={() => slide(1)}
                    aria-label="다음 카드"
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 shadow-card"
                  >
                    <ChevronRight size={14} className="text-content" />
                  </button>
                </div>
              </div>
              <div
                ref={railRef}
                className="flex gap-2.5 overflow-x-auto px-5 py-1.5 [scrollbar-width:none]"
              >
                {changes.map((c) => (
                  <ChangeChip
                    key={c.toothNumber}
                    change={c}
                    tone={c.delta < 0 ? 'good' : 'bad'}
                    active={selected === String(c.toothNumber)}
                    onClick={() => {
                      setSelected(String(c.toothNumber));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  />
                ))}
              </div>

              <div className="mx-5 mt-2 bg-white/90 backdrop-blur-sm rounded-[20px] shadow-card p-5">
                <p className="m-0 mb-2 text-[12px] font-semibold text-muted">바뀐 치아 전체</p>
                <div className="divide-y divide-hairline">
                  {changes.map((c) => (
                    <button
                      key={c.toothNumber}
                      type="button"
                      onClick={() => {
                        setSelected(String(c.toothNumber));
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="flex w-full items-center gap-2 py-2 text-left"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-semibold text-content">
                          {toothName(c.toothNumber)}
                        </span>
                        <span className="block text-[10.5px] text-muted">{c.toothNumber}번</span>
                      </span>
                      <span className="text-[12px] text-muted">{RISK_LABEL[c.before]}</span>
                      <ArrowRight size={11} className="flex-shrink-0 text-muted" />
                      <span
                        className={`text-[12px] font-semibold ${c.delta < 0 ? 'text-success' : 'text-danger'}`}
                      >
                        {RISK_LABEL[c.after]}
                      </span>
                    </button>
                  ))}
                </div>
                {diff.onlyInAfter.length > 0 && (
                  <p className="m-0 mt-3 text-[11px] text-muted leading-relaxed">
                    {diff.onlyInAfter.map((n) => toothName(n)).join(', ')}은 기준 스캔에 없어서
                    비교에서 뺐어요. 두 스캔의 촬영 구역이 달랐어요.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <NavBar activeTab="home" />
    </PageShell>
  );
}
