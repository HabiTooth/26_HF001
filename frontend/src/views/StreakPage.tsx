'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import NavBar from '@/components/organisms/NavBar';
import PageShell from '@/components/organisms/PageShell';
import { historyApi, type HistoryRecordItem } from '@/lib/api/history';
import HistoryListSection from '@/components/organisms/HistoryListSection';
import { useSessionIndex } from '@/hooks/useSessionIndex';
import { formatDate, formatTime, scoreGrade } from '@/lib/score';
import {
  DAY_LABELS,
  computeStreak,
  monthGrid,
  nextMilestone,
  streakMessage,
} from '@/lib/streak';
import PageHeader from '@/components/molecules/PageHeader';

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex-1 flex flex-col items-center gap-1 py-4">
      <span className="text-2xl font-bold text-content tabular-nums">{value}</span>
      <span className="text-[11px] text-muted">{label}</span>
    </div>
  );
}

export default function StreakPage() {
  const [dates, setDates] = useState<string[]>([]);
  const [records, setRecords] = useState<HistoryRecordItem[]>([]);
  const { idByDate } = useSessionIndex();
  const [cursor, setCursor] = useState(() => new Date());

  useEffect(() => {
    historyApi
      .getList({ period: 'ALL', size: 200 })
      .then((res) => setDates((res.data.result?.items ?? []).map((i) => i.date)))
      .catch(() => {});

    historyApi
      .getRecords()
      .then((res) => setRecords(res.data.result ?? []))
      .catch(() => {});
  }, []);

  const stats = useMemo(() => computeStreak(dates), [dates]);

  const { current } = stats;

  const cells = useMemo(
    () => monthGrid(cursor.getFullYear(), cursor.getMonth(), stats.scanned),
    [cursor, stats.scanned],
  );

  const goal = nextMilestone(current);
  const shiftMonth = (delta: number) =>
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));

  const isThisMonth =
    cursor.getFullYear() === new Date().getFullYear() &&
    cursor.getMonth() === new Date().getMonth();

  return (
    <PageShell withNav>
      <PageHeader title="스캔 기록" />

      <div className="px-5 pt-4 flex flex-col gap-4">
        <div className="relative overflow-hidden bg-gradient-to-br from-[#4A86D9] to-[#73B0F1] rounded-[24px] p-6 text-white min-h-[172px] flex items-center">
          <Image src="/images/dashboard/streak-flame.webp" alt="" fill sizes="(max-width: 480px) 100vw, 440px" className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-r from-[#285EA8]/35 via-transparent to-transparent" />
          <div className="relative z-10 flex-1 min-w-0 pr-24">
            <p className="m-0 text-sm font-semibold opacity-90">연속 스캔 기록</p>
            <p className="m-0 text-4xl font-bold leading-tight tabular-nums">
              {current}
              <span className="text-lg font-semibold opacity-80 ml-1">일</span>
            </p>
            <p className="m-0 mt-1 text-xs opacity-90">{streakMessage(current)}</p>
          </div>
        </div>

        {goal !== null && (
          <div className="bg-white/90 backdrop-blur-sm rounded-[20px] shadow-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-content">다음 목표 {goal}일</span>
              <span className="text-xs text-muted tabular-nums">
                {current} / {goal}
              </span>
            </div>
            <div className="w-full h-2 bg-hairline rounded-full overflow-hidden">
              <div
                className="h-2 rounded-full bg-primary-gradient transition-[width] duration-500"
                style={{ width: `${Math.min(100, (current / goal) * 100)}%` }}
              />
            </div>
          </div>
        )}

        <div className="bg-white/90 backdrop-blur-sm rounded-[20px] shadow-card flex divide-x divide-hairline">
          <Stat value={String(stats.longest)} label="최장 연속" />
          <Stat value={String(stats.totalDays)} label="스캔한 날" />
          <Stat
            value={String(
              [...stats.scanned].filter((k) =>
                k.startsWith(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`),
              ).length,
            )}
            label="이번 달"
          />
        </div>

        <div className="bg-white/90 backdrop-blur-sm rounded-[20px] shadow-card p-5">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              aria-label="이전 달"
              onClick={() => shiftMonth(-1)}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-hairline transition-colors"
            >
              <ChevronLeft size={18} className="text-muted" />
            </button>
            <span className="text-sm font-semibold text-content">
              {cursor.getFullYear()}년 {cursor.getMonth() + 1}월
            </span>
            <button
              type="button"
              aria-label="다음 달"
              onClick={() => shiftMonth(1)}
              disabled={isThisMonth}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-hairline transition-colors disabled:opacity-30"
            >
              <ChevronRight size={18} className="text-muted" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAY_LABELS.map((d) => (
              <span key={d} className="text-center text-[10px] text-muted py-1">
                {d}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-1">
            {cells.map((cell, i) => {
              if (cell.day === null) return <div key={`pad-${i}`} className="aspect-square sm:aspect-auto sm:h-12" />;

              const dot = [
                'relative w-10 h-10 flex items-center justify-center text-[12px] tabular-nums transition-transform',
                cell.scanned ? 'text-[#4A86D9] font-semibold' : cell.isFuture ? 'text-muted/35' : 'text-muted',
                cell.isToday && !cell.scanned ? 'rounded-full ring-1 ring-primary/40 text-primary font-semibold' : '',
              ].join(' ');
              const stamp = <>
                {cell.scanned && <svg viewBox="0 0 32 32" className="absolute inset-0 w-10 h-10 -rotate-6" aria-hidden="true"><path d="M16 5C11 2 2 2 2 10C2 15 4 18 5 23C6 28 8 30 11 28C13 26 13 21 16 21C19 21 19 26 21 28C24 30 26 28 27 23C28 18 30 15 30 10C30 2 21 2 16 5Z" fill="#D7EBFF" stroke="#A6CBF6" strokeWidth=".6" /></svg>}
                <span className="relative z-10">{cell.day}</span>
              </>;

              const sessionId = cell.scanned ? idByDate(cell.key) : null;

              return (
                <div key={cell.key} className="aspect-square sm:aspect-auto sm:h-12 flex items-center justify-center">
                  {sessionId === null ? (
                    <span className={dot} aria-label={`${cell.day}일${cell.scanned ? ' 스캔 완료' : ''}`}>{stamp}</span>
                  ) : (
                    <Link
                      href={`/report/${sessionId}`}
                      aria-label={`${cell.day}일 스캔 완료, 리포트 보기`}
                      className={`${dot} no-underline active:scale-90`}
                    >
                      {stamp}
                    </Link>
                  )}
                </div>
              );
            })}
          </div>

          <p className="m-0 mt-3 text-[11px] text-muted">
            스캔을 마친 날에는 치아 스탬프가 찍혀요. 스탬프를 누르면 그날 리포트를 볼 수 있어요.
          </p>
        </div>

        <HistoryListSection
          items={records.map((r) => ({
            sessionId: idByDate(r.date),
            date: formatDate(r.date),
            time: formatTime(r.time),
            score: r.score,
            grade: scoreGrade(r.score),
          }))}
        />
      </div>

      <NavBar activeTab="history" />
    </PageShell>
  );
}
