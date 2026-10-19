'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowDownUp, ChevronLeft, ChevronRight } from 'lucide-react';
import NavBar from '@/components/organisms/NavBar';
import PageShell from '@/components/organisms/PageShell';
import ConfirmSheet from '@/components/molecules/ConfirmSheet';
import { useSessionIndex } from '@/hooks/useSessionIndex';
import {
  historyApi,
  type HistoryList,
  type HistoryPeriodFilter,
  type HistoryScoreFilter,
} from '@/lib/api/history';
import { userApi } from '@/lib/api/user';
import type { RiskLevel } from '@/lib/api/common';
import { RISK_TAG } from '@/lib/lesionRisk';
import { RISK_MODEL_FILL } from '@/lib/riskColors';
import { formatDate, scoreGrade } from '@/lib/score';
import PageHeader from '@/components/molecules/PageHeader';

const PERIOD_LABELS: Record<HistoryPeriodFilter, string> = {
  ALL: '전체',
  ONE_MONTH: '1개월',
  THREE_MONTHS: '3개월',
  SIX_MONTHS: '6개월',
};

const SCORE_ORDER: HistoryScoreFilter[] = ['ALL', 'HIGH', 'MEDIUM', 'LOW'];
const SCORE_LABELS: Record<HistoryScoreFilter, string> = {
  ALL: '모든 점수',
  HIGH: '80점 이상',
  MEDIUM: '70~79점',
  LOW: '70점 미만',
};

const GRADE_STYLE: Record<string, string> = {
  A: 'bg-success/15 text-success',
  B: 'bg-primary/15 text-primary',
  C: 'bg-warning/20 text-[#B87F00]',
  D: 'bg-warning/20 text-[#B87F00]',
  F: 'bg-danger/15 text-danger',
};

function RiskDot({ label, level }: { label: string; level: RiskLevel }) {
  return (
    <span className="flex items-center gap-1 text-[11px] text-muted">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: RISK_MODEL_FILL[level] }} />
      {label} {RISK_TAG[level]}
    </span>
  );
}

export default function HistoryListPage() {
  const { idByDate } = useSessionIndex();
  const [page, setPage] = useState(0);
  const [period, setPeriod] = useState<HistoryPeriodFilter>('ALL');
  const [scoreFilter, setScoreFilter] = useState<HistoryScoreFilter>('ALL');
  const [data, setData] = useState<HistoryList | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setIsLoading(true);
    historyApi
      .getList({ period, scoreFilter, page, size: 20 })
      .then((res) => setData(res.data.result))
      .catch(() => setData(null))
      .finally(() => setIsLoading(false));
  }, [period, scoreFilter, page, reloadKey]);

  const deleteAll = async () => {
    setIsDeleting(true);
    try {
      await userApi.deleteData();
      setPage(0);
      setReloadKey((k) => k + 1);
      setConfirming(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const cycleScore = () => {
    const next = SCORE_ORDER[(SCORE_ORDER.indexOf(scoreFilter) + 1) % SCORE_ORDER.length];
    setScoreFilter(next);
    setPage(0);
  };

  const totalPages = data?.totalPages ?? 0;
  const totalCount = data?.totalCount ?? 0;

  return (
    <PageShell withNav>
      <PageHeader
        title="기록 이력"
        right={
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={isDeleting || totalCount === 0}
            className="w-9 text-right text-[12px] font-semibold text-danger disabled:opacity-30 whitespace-nowrap"
          >
            전체 삭제
          </button>
        }
      />

      <div className="px-5 pt-4 flex flex-col gap-3">
        <div className="flex items-center gap-1.5">
          <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
            {(Object.keys(PERIOD_LABELS) as HistoryPeriodFilter[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  setPeriod(k);
                  setPage(0);
                }}
                aria-pressed={period === k}
                className={`px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-colors whitespace-nowrap ${
                  period === k
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white/90 text-muted border-hairline'
                }`}
              >
                {PERIOD_LABELS[k]}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={cycleScore}
            className={`ml-auto flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-semibold border whitespace-nowrap transition-colors ${
              scoreFilter === 'ALL'
                ? 'bg-white/90 text-muted border-hairline'
                : 'bg-primary-light text-primary border-primary/30'
            }`}
          >
            <ArrowDownUp size={12} />
            {SCORE_LABELS[scoreFilter]}
          </button>
        </div>

        <p className="m-0 text-[11px] text-muted">{totalCount}건 · 누르면 그날 리포트로 넘어가요</p>

        <div className="bg-white/90 backdrop-blur-sm rounded-[20px] shadow-card px-5 py-1">
          {isLoading && (
            <p className="m-0 py-12 text-center text-[13px] text-muted">불러오는 중...</p>
          )}
          {!isLoading && (data?.items.length ?? 0) === 0 && (
            <p className="m-0 py-12 text-center text-[13px] text-muted">기록이 없어요.</p>
          )}
          {data?.items.map((h, i) => {
            const sessionId = idByDate(h.date);
            const grade = scoreGrade(h.score);
            const row = (
              <>
                <div
                  className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-[15px] font-bold ${
                    GRADE_STYLE[grade] ?? 'bg-hairline/60 text-muted'
                  }`}
                >
                  {grade}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="m-0 text-[13px] font-semibold text-content">{formatDate(h.date)}</p>
                  <div className="mt-1 flex gap-2.5">
                    <RiskDot label="치태" level={h.plaqueRiskLevel} />
                    <RiskDot label="치석" level={h.calculusRiskLevel} />
                  </div>
                </div>
                <p className="m-0 text-[20px] font-bold leading-none text-primary tabular-nums">
                  {h.score}
                  <span className="ml-0.5 text-[11px] font-normal text-muted">/100</span>
                </p>
                {sessionId === null ? (
                  <span className="w-4" />
                ) : (
                  <ChevronRight size={16} className="text-gray-300" />
                )}
              </>
            );
            const cls =
              'flex items-center gap-3 py-3 border-b border-hairline last:border-none -mx-2 px-2 rounded-lg';
            return sessionId === null ? (
              <div key={`${h.date}-${i}`} className={cls}>
                {row}
              </div>
            ) : (
              <Link
                key={`${h.date}-${i}`}
                href={`/report/${sessionId}`}
                className={`${cls} no-underline transition-colors active:bg-primary-light/60`}
              >
                {row}
              </Link>
            );
          })}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1 py-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              aria-label="이전 페이지"
              className="w-8 h-8 flex items-center justify-center rounded-full disabled:opacity-30 hover:bg-white/70 transition-colors"
            >
              <ChevronLeft size={16} className="text-content" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                className={`w-8 h-8 rounded-full text-[13px] font-semibold transition-colors ${
                  p === page ? 'bg-primary text-white' : 'text-muted hover:bg-white/70'
                }`}
              >
                {p + 1}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              aria-label="다음 페이지"
              className="w-8 h-8 flex items-center justify-center rounded-full disabled:opacity-30 hover:bg-white/70 transition-colors"
            >
              <ChevronRight size={16} className="text-content" />
            </button>
          </div>
        )}
      </div>

      <ConfirmSheet
        open={confirming}
        title="기록을 전부 지울까요?"
        description="스캔 세션, 촬영한 사진, 분석 리포트가 모두 지워지고 되돌릴 수 없어요."
        confirmLabel="전부 지우기"
        danger
        busy={isDeleting}
        onConfirm={deleteAll}
        onCancel={() => setConfirming(false)}
      />

      <NavBar activeTab="history" />
    </PageShell>
  );
}
