'use client';

import { useRouter } from 'next/navigation';
import { scoreDiffText } from '@/lib/score';
import type { ScoreCardProps } from './ScoreCard.types';

export default function ScoreCard({ score, prevScore, state = 'ready' }: ScoreCardProps) {
  const router = useRouter();
  const diff = score !== null && prevScore !== undefined ? score - prevScore : null;
  return (
    <section className="relative overflow-hidden min-h-[280px] pt-4 pb-3" aria-label="오늘의 구강 점수">
      <div className="relative z-10">
        <p className="m-0 text-[18px] font-bold text-white">오늘의 구강 점수</p>
        {score === null ? <p className="m-0 mt-4 max-w-[175px] text-[24px] font-bold leading-[1.4] tracking-[-.7px] text-white break-keep">{state === 'loading' ? '오늘 기록을 확인하고 있어요' : state === 'error' ? '기록을 불러오지 못했어요' : '오늘은 아직 스캔 전이에요!'}</p> : <p className="m-0 mt-2 flex items-baseline gap-1 text-white tabular-nums"><strong className="text-[68px] font-bold leading-none tracking-[-3px]">{score}</strong><span className="text-[17px] text-white/60">/100</span></p>}
        {diff !== null && <p className="mt-3 mb-0 inline-flex items-center gap-1 rounded-full bg-white/20 border border-white/15 px-3 py-1.5 max-w-[190px] text-[11px] font-semibold leading-relaxed text-white/95">{diff > 0 ? '↑' : diff < 0 ? '↓' : '·'} {scoreDiffText(diff)}</p>}
        <p className="m-0 mt-4 max-w-[170px] text-[13px] font-medium leading-relaxed text-white/90 break-keep">{score === null ? state === 'ready' ? '스캔하고 오늘의 치아 상태를 확인해 보세요.' : '잠시 후 다시 확인해 주세요.' : '오늘도 내 치아를 알아가는 작은 습관.'}</p>
        <button type="button" onClick={() => router.push('/scan')} className="mt-6 w-fit rounded-[14px] bg-white/20 border border-white/35 px-4 py-3.5 text-[13px] font-semibold text-white backdrop-blur-sm active:scale-[0.99] transition-transform">AI 스캔 시작하기 →</button>
      </div>
    </section>
  );
}
