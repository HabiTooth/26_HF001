'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import MoreLink from '@/components/atoms/MoreLink';
import type { HistoryItem, HistoryListSectionProps } from './HistoryListSection.types';

const GRADE_STYLE: Record<string, string> = {
  A: 'bg-success/15 text-success',
  B: 'bg-primary/15 text-primary',
  C: 'bg-warning/20 text-[#B87F00]',
  D: 'bg-warning/20 text-[#B87F00]',
  F: 'bg-danger/15 text-danger',
};

function Row({ item }: { item: HistoryItem }) {
  return (
    <>
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl text-[15px] font-bold ${
            GRADE_STYLE[item.grade] ?? 'bg-hairline/60 text-muted'
          }`}
        >
          {item.grade}
        </div>
        <div>
          <p className="m-0 text-[13px] font-semibold text-content">{item.date}</p>
          <p className="m-0 text-[11px] text-muted">{item.time}</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <p className="m-0 text-[20px] font-bold leading-none text-primary tabular-nums">
          {item.score}
          <span className="ml-0.5 text-[11px] font-normal text-muted">/100</span>
        </p>
        {item.sessionId != null && <ChevronRight size={16} className="text-gray-300" />}
      </div>
    </>
  );
}

export default function HistoryListSection({ items }: HistoryListSectionProps) {
  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-[20px] shadow-card p-5 mt-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="m-0 text-[15px] font-semibold text-content">지난 측정 기록</h2>
        <Link href="/mypage/history" className="no-underline">
          <MoreLink label="전체 보기" />
        </Link>
      </div>
      {items.length === 0 && (
        <p className="m-0 py-6 text-center text-[12px] text-muted">
          아직 스캔 기록이 없어요. 첫 스캔을 하면 여기에 쌓여요.
        </p>
      )}
      <div className="space-y-1">
        {items.map((item, index) =>
          item.sessionId == null ? (
            <div
              key={index}
              className="flex items-center justify-between py-3 border-b border-hairline last:border-none"
            >
              <Row item={item} />
            </div>
          ) : (
            <Link
              key={index}
              href={`/report/${item.sessionId}`}
              className="flex items-center justify-between py-3 border-b border-hairline last:border-none no-underline -mx-2 px-2 rounded-lg transition-colors active:bg-primary-light/60"
            >
              <Row item={item} />
            </Link>
          ),
        )}
      </div>
    </div>
  );
}
