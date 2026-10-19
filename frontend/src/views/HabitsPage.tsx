'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Lightbulb } from 'lucide-react';
import NavBar from '@/components/organisms/NavBar';
import PageShell from '@/components/organisms/PageShell';
import { historyApi } from '@/lib/api/history';
import { useHabitStore } from '@/stores/habitStore';
import {
  HABITS,
  completionRate,
  currentHabitStreak,
  doneOn,
  insight,
  recentKeys,
} from '@/lib/habits';
import { toKey } from '@/lib/streak';
import HabitWeek from '@/components/molecules/HabitWeek';
import PageHeader from '@/components/molecules/PageHeader';

export default function HabitsPage() {
  const { log, hydrate, toggleHabit } = useHabitStore();
  const [scans, setScans] = useState<Array<{ date: string; score: number }>>([]);

  useEffect(() => {
    hydrate();
    historyApi
      .getScoreTrend()
      .then((res) => setScans(res.data.result ?? []))
      .catch(() => {});
  }, [hydrate]);

  const todayKey = toKey(new Date());
  const done = doneOn(log, todayKey);
  const week = useMemo(() => recentKeys(7), []);
  const weekRate = completionRate(log, week);
  const streak = currentHabitStreak(log);
  const tip = useMemo(() => insight(log, scans), [log, scans]);

  return (
    <PageShell withNav>
      <PageHeader title="구강 습관" />

      <div className="px-5 pt-4 flex flex-col gap-4">
        <section className="rounded-[22px] bg-gradient-to-br from-[#548BDA] to-[#86BAF1] p-5 text-white flex items-center justify-between gap-4" aria-label="오늘 관리 현황">
          <div>
            <p className="m-0 text-[11px] text-white/75">오늘 할 일</p>
            <p className="m-0 mt-1 flex items-baseline gap-1.5 tabular-nums"><strong className="text-[42px] font-semibold leading-none tracking-[-1.5px]">{done.length}</strong><span className="text-lg text-white/65">/ {HABITS.length}</span></p>
            <p className="m-0 mt-3 text-[12px] font-medium">{done.length === HABITS.length ? '오늘 관리도 모두 마쳤어요' : done.length === 0 ? '하나씩 체크해 보세요' : `남은 ${HABITS.length - done.length}개도 천천히 해봐요`}</p>
          </div>
          <svg viewBox="0 0 80 80" className="w-[80px] h-[80px] shrink-0 -rotate-90" role="progressbar" aria-label="오늘 습관 완료" aria-valuemin={0} aria-valuemax={HABITS.length} aria-valuenow={done.length}>
            <circle cx="40" cy="40" r="32" fill="none" stroke="white" strokeOpacity=".2" strokeWidth="6" />
            <circle cx="40" cy="40" r="32" fill="none" stroke="white" strokeOpacity=".9" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${done.length / HABITS.length * 201.06} 201.06`} />
          </svg>
        </section>
        <div className="bg-white/90 backdrop-blur-sm rounded-[20px] shadow-card p-5">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="m-0 text-sm font-semibold text-content">체크리스트</h2>
          </div>

          <div className="flex flex-col gap-2">
            {HABITS.map((habit) => {
              const checked = done.includes(habit.id);
              return (
                <button
                  key={habit.id}
                  type="button"
                  onClick={() => toggleHabit(todayKey, habit.id)}
                  aria-pressed={checked}
                  className={`flex items-center gap-3 p-3 rounded-[14px] border transition-colors text-left ${
                    checked ? 'bg-primary-light border-primary/30' : 'bg-white border-hairline'
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                      checked ? 'bg-primary text-white' : 'border-2 border-hairline'
                    }`}
                  >
                    {checked && <Check size={14} strokeWidth={3} />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span
                      className={`block text-[13px] font-medium ${checked ? 'text-primary' : 'text-content'}`}
                    >
                      {habit.label}
                    </span>
                    <span className="block text-[11px] text-muted">{habit.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-sm rounded-[20px] shadow-card p-5">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="m-0 text-sm font-semibold text-content">최근 일주일 관리 습관</h2>
            <span className="text-xs text-muted tabular-nums">
              달성률 {Math.round(weekRate * 100)}%
            </span>
          </div>

          <HabitWeek week={week} log={log} />

          {streak > 0 && (
            <p className="m-0 mt-3 text-xs text-muted">
              {streak}일 연속으로 전부 지키고 있어요.
            </p>
          )}
        </div>

        <div
          className={`rounded-[20px] shadow-card p-4 flex items-start gap-3 backdrop-blur-sm ${
            tip.strong ? 'bg-success/10' : 'bg-white/90'
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              tip.strong ? 'bg-success/20 text-success' : 'bg-primary-light text-primary'
            }`}
          >
            <Lightbulb size={16} />
          </div>
          <p className="m-0 text-[12px] text-content leading-relaxed pt-1.5">{tip.text}</p>
        </div>
      </div>

      <NavBar activeTab="home" />
    </PageShell>
  );
}
