'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import MoreLink from '@/components/atoms/MoreLink';
import { useHabitStore } from '@/stores/habitStore';
import { completionRate, doneOn, recentKeys } from '@/lib/habits';

import HabitWeek from '@/components/molecules/HabitWeek';

export default function HabitSummarySection({
  variant = 'default',
}: {
  variant?: 'default' | 'report';
}) {
  const { log, hydrate } = useHabitStore();

  useEffect(() => hydrate(), [hydrate]);

  const week = useMemo(() => recentKeys(7), []);
  const rate = completionRate(log, week);
  const empty = week.every((key) => doneOn(log, key).length === 0);

  return (
    <Link
      href="/habits"
      className={
        variant === 'report'
          ? 'mt-4 block rounded-[24px] border border-white bg-white p-5 no-underline shadow-[0_6px_24px_rgba(71,105,154,0.045)]'
          : 'block bg-white/90 backdrop-blur-sm rounded-[20px] shadow-card p-5 mt-4 no-underline'
      }
    >
      <div className="flex items-center justify-between mb-1">
        <h2
          className={`m-0 text-content ${variant === 'report' ? 'text-[18px] font-bold tracking-[-0.4px]' : 'text-sm font-semibold'}`}
        >
          최근 일주일 관리 습관
        </h2>
        <MoreLink />
      </div>

      {empty ? (
        <p
          className={`m-0 mb-3 ${variant === 'report' ? 'mt-2 text-[13px] font-medium leading-relaxed text-[#788BA4]' : 'text-[11px] text-muted'}`}
        >
          양치·치실을 기록해두면 점수 변화의 이유를 같이 볼 수 있어요.
        </p>
      ) : (
        <p
          className={`m-0 mb-3 ${variant === 'report' ? 'mt-2 text-[13px] font-medium text-[#788BA4]' : 'text-[11px] text-muted'}`}
        >
          달성률 {Math.round(rate * 100)}%
        </p>
      )}

      <HabitWeek week={week} log={log} />
    </Link>
  );
}
