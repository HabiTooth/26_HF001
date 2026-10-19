'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Hospital,
  Target,
  Brush,
  PillBottle,
  Moon,
  Apple,
  ShieldCheck,
  Droplet,
  RefreshCw,
  CalendarCheck,
  SprayCan,
  ArrowUp,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import NavBar from '@/components/organisms/NavBar';
import PageShell from '@/components/organisms/PageShell';
import ReportHero from '@/components/organisms/ReportHero';
import { focusText } from '@/components/organisms/ReportSummary/ReportSummary';
import LLMGuideSection from '@/components/organisms/LLMGuideSection';
import CareGuideSection from '@/components/organisms/CareGuideSection';
import TrendChartSection from '@/components/organisms/TrendChartSection';
import NextStepsSection from '@/components/organisms/NextStepsSection';
import HabitSummarySection from '@/components/organisms/HabitSummarySection';
import ScrollTopButton from '@/components/atoms/ScrollTopButton';
import ScoreExplanation from '@/components/organisms/ScoreExplanation';
import ZoneReportSection from '@/components/organisms/ZoneReportSection';
import type { ToothAnalysisResult } from '@/components/organisms/OralViewer3D/ThreeScene';
import type { GuideItem } from '@/components/organisms/LLMGuideSection/LLMGuideSection.types';
import {
  reportApi,
  type LlmReport,
  type SessionReport,
  type SessionZoneReport,
  type ToothLesion,
} from '@/lib/api/report';
import { historyApi, type HistoryScoreTrendItem } from '@/lib/api/history';
import { formatDate, formatShortDate, toSummaryRisk } from '@/lib/score';
import { ALL_TEETH } from '@/lib/dentition';
import { useDentitionStore } from '@/stores/dentitionStore';
import { countMissingConflicts, excludeMissingTeeth } from '@/lib/toothMapping';
import { LESION_LABEL, RISK_ORDER, worstByLesion } from '@/lib/lesionRisk';
import { countToothStates } from '@/lib/lesionState';
import { buildToothDetail, focusOrder } from '@/lib/toothDetail';
import { RISK_MODEL_FILL } from '@/lib/riskColors';
import type { FocusChip } from '@/lib/toothDetail';
import { keepCapturedLesions, keepCapturedTeeth, teethInZones } from '@/lib/scanCoverage';
import { scanApi, type ViewType } from '@/lib/api/scan';
import { compareSummary, compareTeeth } from '@/lib/compare';
import { useSessionIndex } from '@/hooks/useSessionIndex';
import type { RiskLevel } from '@/lib/api/common';

const GUIDE_TYPE: Record<RiskLevel, GuideItem['type']> = {
  VERY_LOW: 'good',
  LOW: 'good',
  MEDIUM: 'warning',
  HIGH: 'warning',
  CRITICAL: 'danger',
};

// 게이트웨이 오류(502·503·504)
const isGatewayHiccup = (status: number | undefined) =>
  status === 502 || status === 503 || status === 504;

// 실패 원인 한 줄 로그용
function describeAxiosError(e: unknown): string {
  if (!axios.isAxiosError(e)) return e instanceof Error ? e.message : String(e);
  const method = e.config?.method?.toUpperCase() ?? '';
  const url = e.config?.url ?? '';
  const status = e.response?.status;
  return `${method} ${url} → ${status ?? e.code ?? '응답 없음'}`;
}

const ICON_SIZE = 20;
const ICON_CLASS = 'text-[#4A86D9]';
const renderLucide = (Icon: LucideIcon) => <Icon size={ICON_SIZE} className={ICON_CLASS} />;

const renderPng = (src: string, alt: string, size: number = ICON_SIZE) => (
  <Image
    src={src}
    alt={alt}
    width={size}
    height={size}
    className="shrink-0 object-contain"
    style={{ width: size, height: size }}
  />
);

const MANAGEMENT_ICONS: Record<string, () => React.ReactNode> = {
  '치과 스케일링': () => renderLucide(Hospital),
  '집중 부위 칫솔질': () => renderLucide(Target),
  '올바른 칫솔질 방법': () => renderPng('/icons/management/toothbrush.png', '칫솔'),
  '치실 사용': () => renderPng('/icons/management/dental-floss.png', '치실'),
  '치간칫솔 사용': () => renderPng('/icons/management/interdental-brush.webp', '치간칫솔', 34),
  '구강세정제 사용': () => renderLucide(PillBottle),
  '혀 세정': () => renderPng('/icons/management/tongue-scraper.png', '혀 세정'),
  '취침 전 칫솔질': () => renderLucide(Moon),
  '균형 잡힌 식단과 간식 조절': () => renderLucide(Apple),
  '구강 면역력 관리': () => renderLucide(ShieldCheck),
  '수분 섭취와 구강 건조 관리': () => renderLucide(Droplet),
  '칫솔 관리와 교체': () => renderLucide(RefreshCw),
  '정기 검진': () => renderLucide(CalendarCheck),
  '구강세정기 사용': () => renderLucide(SprayCan),
};

export default function ReportPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const sessionId = Number(params?.id);

  const [report, setReport] = useState<SessionReport | null>(null);
  const [zoneReport, setZoneReport] = useState<SessionZoneReport | null>(null);
  const [llm, setLlm] = useState<LlmReport | null>(null);
  const [llmLoading, setLlmLoading] = useState(true);
  const [llmFailed, setLlmFailed] = useState(false);
  const [llmGenerating, setLlmGenerating] = useState(false);
  const [llmKey, setLlmKey] = useState(0);
  const [previous, setPrevious] = useState<SessionReport | null>(null);
  const { sessions } = useSessionIndex();
  const { missing, hydrate: hydrateDentition } = useDentitionStore();
  const [trend, setTrend] = useState<HistoryScoreTrendItem[]>([]);
  const [capturedZones, setCapturedZones] = useState<ViewType[]>([]);
  const [lesions, setLesions] = useState<ToothLesion[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  // 확대 상태를 history에 추가. 뒤로 가기로 닫힘
  const focusPushed = useRef(false);
  const selectTooth = useCallback((fdi: string | null) => {
    if (typeof window !== 'undefined') {
      if (fdi && !focusPushed.current) {
        // 빼면 popstate에서 새로고침
        window.history.pushState(
          { ...window.history.state, toothFocus: true },
          '',
          window.location.href,
        );
        focusPushed.current = true;
      } else if (!fdi && focusPushed.current) {
        focusPushed.current = false;
        window.history.back();
      }
    }
    setSelected(fdi);
  }, []);
  useEffect(() => {
    const onPop = () => {
      if (!focusPushed.current) return;
      focusPushed.current = false;
      setSelected(null);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => hydrateDentition(), [hydrateDentition]);

  useEffect(() => {
    if (!Number.isFinite(sessionId)) return;
    let cancelled = false;

    setLlm(null);
    setZoneReport(null);
    reportApi
      .getZoneReport(sessionId)
      .then((res) => {
        if (!cancelled) setZoneReport(res.data.result);
      })
      .catch(() => {});

    reportApi
      .getSessionReport(sessionId)
      .then((res) => setReport(res.data.result))
      .catch(() => {});

    // 3D 마커용 폴리곤. 없으면 비율 띠로 대체
    reportApi
      .getMeshCoordinates(sessionId)
      .then((res) => setLesions(res.data.result?.lesions ?? []))
      .catch(() => setLesions([]));

    setLlmLoading(true);
    setLlmFailed(false);
    setLlmGenerating(false);
    const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

    // 저장본 조회. 게이트웨이 오류는 재시도
    const fetchStored = async (): Promise<LlmReport | null> => {
      for (let attempt = 0; ; attempt++) {
        try {
          const res = await reportApi.getLlmReport(sessionId);
          return res.data?.result ?? null;
        } catch (e) {
          const status = axios.isAxiosError(e) ? e.response?.status : undefined;
          if (status === 404) return null;
          if (isGatewayHiccup(status) && attempt < 2) {
            await wait(3000 * (attempt + 1));
            continue;
          }
          throw e;
        }
      }
    };

    // 생성 요청이 끊겨도 서버는 계속 생성. 저장본 폴링
    const waitForGenerated = async (): Promise<LlmReport | null> => {
      const deadline = Date.now() + 4 * 60_000;
      while (Date.now() < deadline && !cancelled) {
        await wait(15_000);
        try {
          const res = await reportApi.getLlmReport(sessionId);
          if (res.data?.result) return res.data.result;
        } catch (e) {
          const status = axios.isAxiosError(e) ? e.response?.status : undefined;
          if (status !== 404 && !isGatewayHiccup(status)) throw e;
        }
      }
      return null;
    };

    (async () => {
      try {
        const stored = await fetchStored();
        if (cancelled) return;
        if (stored) {
          setLlm(stored);
          return;
        }
        setLlmGenerating(true);
        try {
          const res = await reportApi.generateLlmReport(sessionId);
          if (!cancelled) setLlm(res.data.result);
        } catch (e) {
          const status = axios.isAxiosError(e) ? e.response?.status : undefined;
          const timedOut = axios.isAxiosError(e) && e.code === 'ECONNABORTED';
          if (!isGatewayHiccup(status) && !timedOut) throw e;
          console.warn(`AI 가이드 생성 응답이 끊겨서 저장본을 기다려요 (${describeAxiosError(e)})`);
          const generated = await waitForGenerated();
          if (cancelled) return;
          if (!generated) throw e;
          setLlm(generated);
        }
      } catch (e) {
        if (cancelled) return;
        console.warn(`AI 가이드를 못 받아왔어요 (${describeAxiosError(e)})`);
        setLlmFailed(true);
      } finally {
        if (!cancelled) {
          setLlmLoading(false);
          setLlmGenerating(false);
        }
      }
    })();

    historyApi
      .getScoreTrend()
      .then((res) => setTrend(res.data.result))
      .catch(() => {});

    scanApi
      .getCaptureStatus(sessionId)
      .then((res) =>
        setCapturedZones([
          ...new Set((res.data.result?.capturedZones ?? []).map((z) => z.viewType)),
        ]),
      )
      .catch(() => setCapturedZones([]));

    return () => {
      cancelled = true;
    };
  }, [sessionId, llmKey]);

  const currentRef = sessions.find((x) => x.sessionId === sessionId) ?? null;
  const previousRef = sessions.find((x) => x.sessionId < sessionId) ?? null;
  const previousId = previousRef?.sessionId ?? null;

  useEffect(() => {
    if (previousId === null) return;
    reportApi
      .getSessionReport(previousId)
      .then((res) => setPrevious(res.data.result))
      .catch(() => setPrevious(null));
  }, [previousId]);

  const scannedTeeth = useMemo(() => teethInZones(capturedZones), [capturedZones]);
  const viewerLesions = useMemo(
    () => keepCapturedLesions(excludeMissingTeeth(lesions, missing), capturedZones),
    [lesions, missing, capturedZones],
  );

  const teeth = useMemo(
    () => keepCapturedTeeth(excludeMissingTeeth(report?.toothStatuses ?? [], missing), capturedZones),
    [report, missing, capturedZones],
  );
  const prevTeeth = useMemo(
    () => excludeMissingTeeth(previous?.toothStatuses ?? [], missing),
    [previous, missing],
  );
  const missingConflicts = useMemo(
    () => countMissingConflicts(report?.toothStatuses ?? [], missing),
    [report, missing],
  );

  const diff = useMemo(
    () =>
      compareTeeth(
        prevTeeth.map((t) => ({ toothNumber: t.toothNumber, riskLevel: t.riskLevel })),
        teeth.map((t) => ({ toothNumber: t.toothNumber, riskLevel: t.riskLevel })),
      ),
    [prevTeeth, teeth],
  );

  const toothCounts = useMemo(
    () =>
      countToothStates({
        teeth: ALL_TEETH,
        missing,
        scanned: scannedTeeth,
        results: teeth.map((t) => ({
          toothNumber: t.toothNumber,
          lesionType: t.lesionType ?? '',
          areaRatio: t.areaRatio,
          riskLevel: t.riskLevel,
        })),
        lesions,
      }),
    [teeth, lesions, missing, scannedTeeth],
  );

  const riskCategories = useMemo(() => worstByLesion(teeth), [teeth]);

  const focusTeeth = useMemo<FocusChip[]>(
    () =>
      focusOrder(teeth).map((fdi) => {
        const rows = teeth.filter((t) => String(t.toothNumber) === fdi && t.lesionType);
        const top = rows.reduce((kept, row) =>
          RISK_ORDER.indexOf(row.riskLevel) > RISK_ORDER.indexOf(kept.riskLevel) ? row : kept,
        );
        const lesion = rows.some((r) => r.lesionType === 'CALCULUS') ? '치석' : '치태';
        return { fdi, label: `${fdi}번 ${lesion}`, color: RISK_MODEL_FILL[top.riskLevel] };
      }),
    [teeth],
  );

  const toothDetail = useMemo(
    () =>
      selected
        ? buildToothDetail({
            fdi: selected,
            rows: teeth,
            previousRows: prevTeeth,
            scanned: scannedTeeth.includes(Number(selected)),
          })
        : null,
    [selected, teeth, prevTeeth, scannedTeeth],
  );

  const aiNote = useMemo(() => {
    if (!selected || !llm || !toothDetail) return null;
    const items = llm.riskDetail ?? [];
    const lesion = toothDetail.primary ? LESION_LABEL[toothDetail.primary.lesionType] : null;
    const direct = items.find((r) => r.title.includes(`${selected}번`));
    const hit =
      direct ??
      (lesion ? items.find((r) => `${r.title} ${r.detail}`.includes(lesion)) : undefined) ??
      items[0];
    if (!hit) return null;
    // 항목 제목은 전체 요약용. 치아별 제목으로 교체
    const title = direct ? '이 치아 맞춤 가이드' : lesion ? `${lesion} 관리 포인트` : '관리 포인트';
    return { title, description: hit.detail };
  }, [selected, llm, toothDetail]);

  const focusTooth = useCallback(
    (tooth: number | string | null) => {
      selectTooth(tooth === null ? null : String(tooth));
      if (tooth !== null && typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    [selectTooth],
  );

  const analysisResults: ToothAnalysisResult[] = useMemo(
    () =>
      teeth.map((t) => ({
        toothNumber: String(t.toothNumber),
        lesionType: t.lesionType ?? '',
        areaRatio: t.areaRatio,
        riskLevel: t.riskLevel as ToothAnalysisResult['riskLevel'],
      })),
    [teeth],
  );

  const guideItems: GuideItem[] = (llm?.riskDetail ?? []).map((r) => {
    const tooth = Number(r.title.match(/(\d{2})번/)?.[1]);
    const known = teeth.some((t) => t.toothNumber === tooth);
    return {
      type: GUIDE_TYPE[r.riskLevel],
      title: r.title,
      description: r.detail,
      tooth: known ? tooth : undefined,
    };
  });

  const careGuideItems = (llm?.management ?? []).map((m) => {
    const renderIcon = MANAGEMENT_ICONS[m.title] ?? (() => renderLucide(Brush));
    if (!MANAGEMENT_ICONS[m.title]) {
      console.warn('[MANAGEMENT_ICONS] 매칭 안 됨:', JSON.stringify(m.title));
    }
    return {
      icon: renderIcon(),
      title: m.title,
      description: m.detail,
    };
  });

  const prevScore = trend.length > 1 ? trend[trend.length - 2].score : undefined;
  const isV2 =
    llm !== null &&
    (llm.score != null || llm.interpretation != null || llm.actions != null || llm.notice != null);

  const heroMessage = report
    ? focusText(
        toSummaryRisk(riskCategories[0].riskLevel),
        toSummaryRisk(riskCategories[1].riskLevel),
      )
    : null;

  return (
    <PageShell withNav>
      <ReportHero
        date={formatDate(currentRef?.scannedAt)}
        score={
          llm?.score?.total ?? (zoneReport ? zoneReport.sessionScore : (report?.totalScore ?? null))
        }
        prevScore={llm?.score ? (llm.score.prevTotal ?? undefined) : prevScore}
        scoreDelta={llm?.score ? llm.score.delta : undefined}
        coverage={
          llm?.score
            ? { captured: llm.score.capturedZoneCount, total: llm.score.totalZoneCount }
            : zoneReport
              ? { captured: zoneReport.capturedZoneCount, total: zoneReport.totalZoneCount }
              : null
        }
        message={heroMessage}
        counts={toothCounts}
        analysisResults={analysisResults}
        lesions={viewerLesions}
        scannedTeeth={scannedTeeth}
        focusTeeth={focusTeeth}
        selected={selected}
        detail={toothDetail}
        aiNote={aiNote}
        onSelect={selectTooth}
        onBack={() => router.back()}
      />

      <main className="px-5 [&_h2]:text-[18px] [&_h2]:font-bold [&_h2]:tracking-[-0.4px]">
        {missingConflicts > 0 && (
          <p className="m-0 mt-4 rounded-xl bg-warning/15 px-4 py-3 text-[12.5px] leading-relaxed text-[#8A5A00]">
            등록한 결손치 자리에서 온 결과 {missingConflicts}개는 제외했어요.{' '}
            <Link href="/mypage/teeth" className="font-semibold underline">
              치아 정보
            </Link>
            에서 결손치 등록이 맞는지 확인해 주세요.
          </p>
        )}
        <TrendChartSection
          data={trend.map((t) => ({ date: formatShortDate(t.date), score: t.score }))}
          change={
            previous !== null && report !== null
              ? {
                  delta: isV2 ? (llm?.score?.delta ?? null) : report.totalScore - previous.totalScore,
                  previousDate: formatShortDate(previousRef?.scannedAt ?? ''),
                  improved: diff.improved.length,
                  worsened: diff.worsened.length,
                  summary: compareSummary(
                    diff,
                    isV2 ? null : report.totalScore - previous.totalScore,
                  ),
                }
              : null
          }
        />

        {isV2 && llm ? (
          <ScoreExplanation report={llm} section="score" />
        ) : (
          <LLMGuideSection
            items={guideItems}
            isLoading={llmLoading}
            generating={llmGenerating}
            failed={llmFailed}
            onRetry={() => setLlmKey((k) => k + 1)}
            onToothClick={focusTooth}
            focusTeeth={focusTeeth}
          />
        )}

        {!isV2 && careGuideItems.length > 0 && <CareGuideSection items={careGuideItems} />}

        {isV2 && llm && <ScoreExplanation report={llm} section="actions" />}

        {zoneReport && (
          <ZoneReportSection
            report={zoneReport}
            selected={selected}
            onSelect={focusTooth}
            focusTeeth={focusTeeth}
            coverage={
              llm?.score
                ? { captured: llm.score.capturedZoneCount, total: llm.score.totalZoneCount }
                : undefined
            }
          />
        )}

        <NextStepsSection categories={riskCategories} />
        <HabitSummarySection variant="report" />
        {llm?.disclaimer && (
          <p className="mb-0 mt-5 px-1 text-[11px] leading-relaxed text-[#8A94A6]">
            {llm.disclaimer}
          </p>
        )}
      </main>
      <ScrollTopButton label="3D 모형으로" icon={ArrowUp} />
      <NavBar activeTab="history" />
    </PageShell>
  );
}
