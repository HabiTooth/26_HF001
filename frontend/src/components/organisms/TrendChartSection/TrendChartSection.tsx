'use client';

import Link from 'next/link';
import { ArrowLeftRight, ChevronRight } from 'lucide-react';
import TrendPlot from '@/components/molecules/TrendPlot';
import ReportBadge from '@/components/atoms/ReportBadge';
import type { TrendChartSectionProps } from './TrendChartSection.types';

export default function TrendChartSection({ data, change }: TrendChartSectionProps) {
  return (
    <section className="mt-4 rounded-[24px] border border-white bg-white p-5 shadow-[0_6px_24px_rgba(71,105,154,0.045)]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="m-0 text-[18px] font-bold tracking-[-0.4px] text-content">점수 변화 추이</h2>
        {data.length > 0 && <ReportBadge>최근 {data.length}회</ReportBadge>}
      </div>
      {data.length > 0 ? (
        <>
          <TrendPlot
            data={data.map((point) => ({ date: point.date, value: point.score }))}
            label="구강 점수 변화"
            height={150}
          />
          {change && (
            <div className="mt-4 border-t border-hairline pt-4">
              <p className="m-0 text-[11px] font-bold tracking-wide text-[#8292AB]">직전 스캔 대비</p>
              <Link
                href="/compare"
                className="mt-2 flex items-center gap-3 rounded-[16px] border border-[#DCE6F3] bg-[#F7FAFE] px-4 py-3 no-underline"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary">
                  <ArrowLeftRight size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-[14px] font-bold text-content">
                    {change.previousDate} 스캔보다
                    {change.delta !== null && change.delta !== 0 && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[12px] font-bold ${change.delta > 0 ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'}`}
                      >
                        {change.delta > 0 ? '+' : ''}
                        {change.delta}점
                      </span>
                    )}
                    {change.delta === 0 && (
                      <span className="rounded-full bg-hairline px-2 py-0.5 text-[12px] font-bold text-muted">
                        같음
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-[12px] text-[#62758E]">
                    {change.improved + change.worsened === 0
                      ? change.summary
                      : `좋아진 치아 ${change.improved} · 나빠진 치아 ${change.worsened}`}
                  </span>
                </span>
                <ChevronRight size={16} className="shrink-0 text-primary" />
              </Link>
            </div>
          )}
        </>
      ) : (
        <p className="mb-0 mt-5 py-5 text-center text-[14px] text-[#788BA4]">
          스캔 기록이 쌓이면 점수 변화를 볼 수 있어요.
        </p>
      )}
    </section>
  );
}
