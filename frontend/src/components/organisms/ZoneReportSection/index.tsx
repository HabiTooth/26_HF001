'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Camera, Check, ChevronRight, X, Loader2 } from 'lucide-react';
import {
  reportApi,
  type SessionZoneReport,
  type SingleImageReport,
  type ZoneReport,
} from '@/lib/api/report';
import { SCAN_ZONES } from '@/constants/scanZones';
import type { ViewType } from '@/lib/api/scan';
import { toothName } from '@/lib/dentition';
import type { FocusChip } from '@/lib/toothDetail';
import ReportTooth from '@/components/molecules/ReportTooth';
import { RISK_MODEL_FILL } from '@/lib/riskColors';
import { RISK_ORDER, RISK_TAG } from '@/lib/lesionRisk';
import ReportBadge from '@/components/atoms/ReportBadge';
import ZoneScoreMap from '@/components/molecules/ZoneScoreMap';
import type { Surface } from '@/components/molecules/ToothArchSelector';

const TOOTH_TYPE: Record<number, string> = {
  1: '가운데 앞니',
  2: '옆 앞니',
  3: '송곳니',
  4: '첫째 작은어금니',
  5: '둘째 작은어금니',
  6: '첫째 어금니',
  7: '둘째 어금니',
  8: '사랑니',
};
const toothLabel = (tooth: number) =>
  toothName(tooth).replace(
    /작은어금니|어금니|앞니|송곳니|사랑니/,
    TOOTH_TYPE[tooth % 10] ?? '치아',
  );

function ScanPhoto({ id, label }: { id: number; label: string }) {
  const [overlay, setOverlay] = useState(true);
  const [state, setState] = useState<{
    url?: string;
    loading: boolean;
    unavailable?: boolean;
    original?: boolean;
  }>({ loading: true });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let url: string | undefined;
    setState({ loading: true });
    (async () => {
      let original = !overlay;
      try {
        let response;
        try {
          response = await reportApi.getImageFile(id, overlay, controller.signal);
        } catch (error) {
          if (controller.signal.aborted || !overlay) throw error;
          response = await reportApi.getImageFile(id, false, controller.signal);
          original = true;
        }
        if (controller.signal.aborted) return;
        if (
          response.data.type &&
          !response.data.type.startsWith('image/') &&
          response.data.type !== 'application/octet-stream'
        )
          throw new Error('Invalid image');
        url = URL.createObjectURL(response.data);
        setState({ url, loading: false, original });
      } catch {
        if (!controller.signal.aborted) setState({ loading: false, unavailable: true });
      }
    })();
    return () => {
      controller.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [id, overlay, retry]);

  return (
    <div>
      <div className="relative overflow-hidden rounded-[20px] bg-[#E5EEF9] shadow-[0_4px_16px_rgba(60,101,158,0.08)]">
        <button
          type="button"
          aria-pressed={overlay}
          onClick={() => setOverlay((value) => !value)}
          className={`absolute right-3 top-3 z-10 rounded-full px-3 py-2 text-[12px] font-bold shadow-sm ring-1 backdrop-blur-md ${overlay ? 'bg-[#173A73]/70 text-white ring-white/25' : 'bg-white/85 text-primary ring-white/70'}`}
        >
          {overlay ? '검출 표시 켜짐' : '원본 보기'}
        </button>
        <div className="relative flex aspect-[4/3] items-center justify-center bg-[#E8EFF8]">
          {state.loading ? (
            <Loader2
              size={22}
              className="animate-spin text-primary"
              aria-label="사진 불러오는 중"
            />
          ) : state.url ? (
            <Image
              src={state.url}
              width={1600}
              height={1200}
              unoptimized
              alt={`${label} ${state.original ? '촬영 원본' : '검출 영역 표시 사진'}`}
              className="h-full w-full object-contain"
              onError={() => setState({ loading: false, unavailable: true })}
            />
          ) : (
            <div className="px-3 text-center text-[13px] text-[#62758E]">
              <Camera size={24} className="mx-auto mb-2" />
              <p>사진을 불러오지 못했어요</p>
              <button
                type="button"
                onClick={() => setRetry((value) => value + 1)}
                className="font-bold text-primary"
              >
                다시 불러오기
              </button>
            </div>
          )}
        </div>
      </div>
      {overlay && state.original && (
        <p className="m-0 px-3 py-2 text-[12px] text-[#62758E]">
          검출 표시가 없어 원본 사진을 보여드려요.
        </p>
      )}
    </div>
  );
}

function ZoneDetail({
  zone,
  selected,
  onSelect,
}: {
  zone: ZoneReport;
  selected: string | null;
  onSelect: (tooth: string) => void;
}) {
  const [reports, setReports] = useState<SingleImageReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [light, setLight] = useState<'white' | 'uv'>(
    zone.whiteScanImageId !== null ? 'white' : 'uv',
  );
  const [focused, setFocused] = useState<number | null>(null);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setReports([]);
    const ids = [
      ...new Set(
        [zone.whiteScanImageId, zone.uvScanImageId].filter((id): id is number => id !== null),
      ),
    ];
    Promise.allSettled(ids.map((id) => reportApi.getSingleImageReport(id))).then((results) => {
      if (!active) return;
      setReports(results.flatMap((r) => (r.status === 'fulfilled' ? [r.value.data.result] : [])));
      setFailed(results.some((r) => r.status === 'rejected'));
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [zone.whiteScanImageId, zone.uvScanImageId, retry]);
  const definition = SCAN_ZONES.find((z) => z.viewType === zone.viewType);
  // 사진에 같이 찍힌 옆 구역 치아는 제외
  const toothNumbers = [...new Set(reports.flatMap((r) => r.teeth.map((t) => t.toothNumber)))]
    .filter((tooth) => definition?.teeth.includes(tooth) ?? true)
    .sort((a, b) => a - b);
  const name = definition?.fullLabel ?? zone.viewType;
  const activeTooth =
    focused ?? (selected && toothNumbers.includes(Number(selected)) ? Number(selected) : null);
  const rowsFor = (tooth: number, id: number | null) =>
    reports
      .find((r) => r.scanImageId === id)
      ?.teeth.filter(
        (t) =>
          t.toothNumber === tooth &&
          t.status !== 'NOT_DETECTED' &&
          t.status !== 'SKIPPED' &&
          t.areaRatio !== null,
      ) ?? [];
  const ratioFor = (tooth: number, id: number | null) => {
    const rows = rowsFor(tooth, id);
    return rows.length ? `${Math.max(...rows.map((t) => t.areaRatio ?? 0))}%` : '미확인';
  };
  return (
    <div className="px-5 pb-5 pt-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="m-0 text-[15px] font-bold text-content">{name}</h3>
          <p className="mb-0 mt-1 text-[13px] text-[#62758E]">
            확인된 치아 {zone.detectedToothCount ?? '—'}
            {zone.expectedToothCount != null ? ` / ${zone.expectedToothCount}` : ''}개
          </p>
        </div>
        <strong className="text-2xl text-primary">
          {zone.zoneScore ?? '—'}
          <span className="ml-1 text-[13px] font-medium text-[#62758E]">/ 100</span>
        </strong>
      </div>
      <div className="mb-4 flex flex-wrap gap-4 text-[13px] font-semibold text-[#62758E]">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#E07A6A]" />
          치석 점수 {zone.calculusZoneScore ?? '—'}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#E8C56B]" />
          치태 점수 {zone.plaqueZoneScore ?? '—'}
        </span>
      </div>
      <div
        className="mb-3 flex gap-1 rounded-full bg-[#E3EDFA] p-1"
        role="group"
        aria-label="촬영 광원"
      >
        {(
          [
            { key: 'white', id: zone.whiteScanImageId, label: '백색광 · 치석' },
            { key: 'uv', id: zone.uvScanImageId, label: 'UV · 치태' },
          ] as const
        )
          .filter((item) => item.id !== null)
          .map((item) => (
            <button
              key={item.key}
              type="button"
              aria-pressed={light === item.key}
              onClick={() => setLight(item.key)}
              className={`min-h-10 flex-1 rounded-full text-[13px] font-bold transition-colors ${light === item.key ? 'bg-white text-primary shadow-sm' : 'text-[#62758E]'}`}
            >
              {item.label}
            </button>
          ))}
      </div>
      <div>
        {light === 'white' && zone.whiteScanImageId !== null && (
          <ScanPhoto
            key={`white-${zone.whiteScanImageId}`}
            id={zone.whiteScanImageId}
            label="백색광 · 치석"
          />
        )}
        {light === 'uv' && zone.uvScanImageId !== null && (
          <ScanPhoto key={`uv-${zone.uvScanImageId}`} id={zone.uvScanImageId} label="UV · 치태" />
        )}
      </div>
      {loading && (
        <p className="mt-4 text-center text-[13px] text-[#62758E]">치아별 분석을 불러오고 있어요</p>
      )}
      {failed && (
        <button
          type="button"
          onClick={() => setRetry((value) => value + 1)}
          className="mt-3 text-[13px] font-semibold text-primary"
        >
          치아별 분석 다시 불러오기
        </button>
      )}
      {toothNumbers.length > 0 && (
        <div className="mt-4">
          <h4 className="mb-2 mt-0 text-[15px] font-bold text-content">치아별 분석</h4>
          <p className="mb-3 mt-0 text-[13px] text-[#62758E]">
            색으로 상태를 보고, 치아를 눌러 자세히 확인해요.
          </p>
          {[true, false].map((upper) => {
            const jawTeeth = toothNumbers.filter((tooth) => tooth < 30 === upper);
            if (!jawTeeth.length) return null;
            return (
              <div key={String(upper)} className="mt-3">
                <p className="mb-1.5 mt-0 text-center text-[12px] font-semibold text-[#62758E]">
                  {upper ? '윗니' : '아랫니'}
                </p>
                <div
                  className="flex flex-wrap justify-center gap-x-1.5 gap-y-2"
                  role="group"
                  aria-label={`${upper ? '윗니' : '아랫니'} 치아별 상태`}
                >
                  {jawTeeth.map((tooth) => {
                    const rows = rowsFor(
                      tooth,
                      light === 'white' ? zone.whiteScanImageId : zone.uvScanImageId,
                    );
                    const risk = rows
                      .map((r) => r.riskLevel)
                      .filter((r) => r !== null)
                      .sort((a, b) => RISK_ORDER.indexOf(b) - RISK_ORDER.indexOf(a))[0];
                    return (
                      <button
                        key={tooth}
                        type="button"
                        aria-label={`${toothLabel(tooth)} · ${risk ? RISK_TAG[risk] : '미확인'}`}
                        aria-pressed={activeTooth === tooth}
                        onClick={() => setFocused(tooth)}
                        className="flex w-[60px] flex-none flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[#31557F] transition-transform active:scale-95"
                      >
                        <ReportTooth
                          compact
                          selected={activeTooth === tooth}
                          outlined={!risk}
                          color={risk ? RISK_MODEL_FILL[risk] : '#E6EDF5'}
                        >
                          {activeTooth === tooth ? <Check size={14} aria-hidden /> : null}
                        </ReportTooth>
                        <span className="text-center text-[11px] font-semibold leading-snug text-[#62758E]">
                          {Math.floor(tooth / 10) === 1 || Math.floor(tooth / 10) === 4
                            ? '오른쪽'
                            : '왼쪽'}
                          <span className="block">{TOOTH_TYPE[tooth % 10]}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <div className="mt-4 flex flex-wrap justify-center gap-x-3 gap-y-2 py-1 text-[11px] font-semibold text-[#62758E]">
            {RISK_ORDER.map((risk) => (
              <span key={risk} className="flex items-center gap-1">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: RISK_MODEL_FILL[risk] }}
                />
                {RISK_TAG[risk]}
              </span>
            ))}
            <span className="flex w-full items-center justify-center gap-1.5 text-[#8291A5]">
              <span className="h-3 w-3 rounded border border-dashed border-[#8291A5]" aria-hidden />
              미확인
            </span>
          </div>
          {activeTooth !== null && (
            <div className="mt-4 border-t border-[#D8E6F8] pt-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="m-0 text-[15px] font-bold text-content">
                    {toothLabel(activeTooth)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onSelect(String(activeTooth))}
                  className="shrink-0 rounded-full bg-[#EDF4FF] px-3 py-2 text-[12px] font-bold text-primary"
                >
                  3D에서 보기
                </button>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 rounded-[16px] bg-white/65 px-4 py-3.5">
                <div className="border-t-2 border-[#D7A69E] pt-2">
                  <span className="flex items-center gap-1.5 text-[12px] font-semibold text-[#87645E]">
                    치석 면적
                  </span>
                  <strong className="mt-1 block text-[24px] font-bold tabular-nums text-[#815C55]">
                    {ratioFor(activeTooth, zone.whiteScanImageId)}
                  </strong>
                </div>
                <div className="border-t-2 border-[#D9C28C] pt-2">
                  <span className="text-[12px] font-semibold text-[#8A7851]">치태 면적</span>
                  <strong className="mt-1 block text-[24px] font-bold tabular-nums text-[#82734F]">
                    {ratioFor(activeTooth, zone.uvScanImageId)}
                  </strong>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      <Link
        href="/compare"
        className="mt-5 flex items-center justify-between rounded-[14px] bg-white px-4 py-3 text-[13px] font-semibold text-primary no-underline"
      >
        이 구역의 변화는 스캔 비교에서
        <ChevronRight size={16} />
      </Link>
    </div>
  );
}

export default function ZoneReportSection({
  report,
  selected,
  onSelect,
  focusTeeth = [],
  coverage,
}: {
  report: SessionZoneReport;
  selected: string | null;
  onSelect: (tooth: string) => void;
  focusTeeth?: FocusChip[];
  coverage?: { captured: number; total: number };
}) {
  const [opened, setOpened] = useState<ViewType | null>(null);
  const [surface, setSurface] = useState<Surface>(() => {
    const captured = (group: string) =>
      report.zones.some(
        (z) => z.captured && SCAN_ZONES.find((d) => d.viewType === z.viewType)?.group === group,
      );
    return !captured('UPPER') && !captured('LOWER') && captured('OUTER') ? 'BUCCAL' : 'LINGUAL';
  });
  useEffect(() => {
    if (!selected) return;
    setOpened((current) => {
      const includes = (view: ViewType) =>
        SCAN_ZONES.find((z) => z.viewType === view)?.teeth.includes(Number(selected));
      if (current && includes(current)) return current;
      return report.zones.find((z) => z.captured && includes(z.viewType))?.viewType ?? current;
    });
  }, [selected, report.zones]);
  useEffect(() => {
    if (!opened) return;
    const group = SCAN_ZONES.find((z) => z.viewType === opened)?.group;
    if (group) setSurface(group === 'OUTER' ? 'BUCCAL' : 'LINGUAL');
  }, [opened]);
  const zone = report.zones.find((z) => z.viewType === opened && z.captured);
  return (
    <section className="mt-4 overflow-hidden rounded-[24px] border border-white bg-white p-5 shadow-[0_6px_24px_rgba(71,105,154,0.045)]">
      <div className="flex items-start justify-between gap-3">
        <h2 className="m-0 text-[18px] font-bold leading-snug tracking-[-0.4px] text-content">
          구역별 분석 · 촬영 사진
        </h2>
        <ReportBadge variant="coverage">
          {coverage?.captured ?? report.capturedZoneCount}/
          {coverage?.total ?? report.totalZoneCount}구역
        </ReportBadge>
      </div>
      <p className="mb-5 mt-2 text-[14px] font-medium leading-relaxed text-[#62758E]">
        구역을 누르면 촬영 사진과 검출 부위를 볼 수 있어요. 숫자는 구역 점수예요.
      </p>
      <ZoneScoreMap
        zones={report.zones}
        surface={surface}
        onSurfaceChange={setSurface}
        opened={opened}
        onZoneClick={(zone) => setOpened(opened === zone ? null : zone)}
      />
      <p className="mb-0 mt-3 text-[12px] text-[#62758E]">
        미촬영 구역과 점수가 없는 구역은 종합 점수에 포함되지 않아요.
      </p>
      {focusTeeth.length > 0 && (
        <details className="mt-4 border-t border-hairline pt-4">
          <summary className="cursor-pointer text-[13px] font-semibold text-[#62758E]">
            신경 쓸 치아 {focusTeeth.length}개
          </summary>
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="신경 쓸 치아">
            {focusTeeth.map((tooth) => (
              <button
                key={tooth.fdi}
                type="button"
                onClick={() => onSelect(tooth.fdi)}
                className="flex items-center rounded-full px-3 py-2 text-[13px] font-semibold text-content"
                style={{ backgroundColor: `color-mix(in srgb, ${tooth.color} 16%, white)` }}
              >
                {toothLabel(Number(tooth.fdi))} {tooth.label.includes('치석') ? '치석' : '치태'}
              </button>
            ))}
          </div>
        </details>
      )}
      {zone && (
        <div id={`zone-detail-${report.sessionId}`} className="-mx-5 -mb-5 mt-5 bg-[#F2F7FE]">
          <div className="flex min-h-12 items-center justify-between bg-[#E1EDFD] px-5 py-2 text-[13px] font-bold text-[#3C6FAF]">
            <span>선택한 구역 상세</span>
            <button
              type="button"
              onClick={() => setOpened(null)}
              aria-label="구역 상세 닫기"
              className="flex min-h-9 items-center gap-1.5 px-1 text-[13px] font-bold text-[#3C6FAF]"
            >
              닫기 <X size={15} />
            </button>
          </div>
          <ZoneDetail
            key={zone.viewType}
            zone={zone}
            selected={selected}
            onSelect={onSelect}
          />
        </div>
      )}
    </section>
  );
}
