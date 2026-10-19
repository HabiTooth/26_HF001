'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, Clock } from 'lucide-react';

import { ARTICLES, sortByRelevance } from '@/constants/articles';
import { isRisky } from '@/constants/products';
import type { LesionType, RiskLevel } from '@/lib/api/common';

export default function NextStepsSection({
  categories,
}: {
  categories: Array<{ lesionType: LesionType; riskLevel: RiskLevel }>;
}) {
  const risky = categories.filter((c) => isRisky(c.riskLevel)).map((c) => c.lesionType);
  const articles = sortByRelevance(ARTICLES, risky).slice(0, 2);

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-[20px] shadow-card p-5 mt-4">
      <div className="flex items-center justify-between mb-1">
        <h2 className="m-0 text-sm font-semibold text-content">관련 아티클 읽기</h2>
      </div>
      <p className="m-0 mb-4 text-[13px] text-muted">
        {risky.length > 0
          ? '위험도가 높은 항목에 맞춰 골랐어요.'
          : '지금 상태를 유지하는 데 도움이 돼요.'}
      </p>

      <div className="flex flex-col divide-y divide-hairline">
        {articles.map((article) => (
          <Link
            key={article.id}
            href={`/articles/${article.id}`}
            className="flex items-center gap-3 py-3 no-underline"
          >
            <span className="relative h-[72px] w-[88px] shrink-0 overflow-hidden rounded-[14px] bg-[#EDF3FB]">
              <Image src={article.cover} alt="" fill sizes="88px" className="object-cover" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[11px] font-semibold text-primary">
                {article.category}
              </span>
              <span className="my-1 block text-[14px] font-semibold leading-relaxed text-content">
                {article.title}
              </span>
              <span className="flex items-center gap-1 text-[12px] text-muted">
                <Clock size={9} />
                {article.readMinutes}분
              </span>
            </span>
            <ChevronRight size={14} className="text-muted flex-shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}
