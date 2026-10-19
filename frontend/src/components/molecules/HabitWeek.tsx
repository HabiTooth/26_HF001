'use client';

import { useId } from 'react';
import { HABITS, doneOn, type HabitLog } from '@/lib/habits';
import { toKey } from '@/lib/streak';

const WEEK_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

export default function HabitWeek({ week, log }: { week: string[]; log: HabitLog }) {
  const instanceId = useId();
  const todayKey = toKey(new Date());
  return (
          <div className="grid grid-cols-7 gap-1.5">
            {week.map((key) => {
              const rate = doneOn(log, key).length / HABITS.length;
              const day = new Date(key).getDay();
              const isToday = key === todayKey;
              const toothPath = 'M16 5C11 2 2 2 2 10C2 15 4 18 5 23C6 28 8 30 11 28C13 26 13 21 16 21C19 21 19 26 21 28C24 30 26 28 27 23C28 18 30 15 30 10C30 2 21 2 16 5Z';
              const clipId = `${instanceId}-tooth-${key}`;
              const gradientId = `${instanceId}-water-${key}`;
              return (
                <div key={key} className="flex flex-col items-center gap-1.5">
                  <svg viewBox="0 0 32 32" className="w-full max-w-[38px] overflow-visible" role="img" aria-label={`${key}${isToday ? ' 오늘' : ''}, ${doneOn(log, key).length}/${HABITS.length} 완료`}>
                    <defs>
                      <clipPath id={clipId}><path d={toothPath} /></clipPath>
                      <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#AFD4FF" />
                        <stop offset="100%" stopColor="#609FFF" />
                      </linearGradient>
                    </defs>
                    <path d={toothPath} fill="#F3F8FF" />
                    <g clipPath={`url(#${clipId})`}>
                      <rect x="0" y={30 - rate * 28} width="32" height={rate * 28} fill={`url(#${gradientId})`} />
                      {rate > 0 && rate < 1 && <path d={`M0 ${30 - rate * 28}H32`} stroke="white" strokeOpacity=".7" strokeWidth="1" />}
                    </g>
                    <path d={toothPath} fill="none" stroke="white" strokeOpacity=".9" strokeWidth=".65" />
                  </svg>
                  <span className={`text-[10px] ${isToday ? 'text-primary font-semibold' : 'text-muted'}`}>{WEEK_LABELS[day]}</span>
                </div>
              );
            })}
          </div>
  );
}
