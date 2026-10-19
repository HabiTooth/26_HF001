'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Clock, Sparkles } from 'lucide-react';
import NavBar from '@/components/organisms/NavBar';
import PageShell from '@/components/organisms/PageShell';
import { dashboardApi } from '@/lib/api/dashboard';
import { isRisky } from '@/constants/products';
import {
  ARTICLES,
  ARTICLE_CATEGORIES,
  sortByRelevance,
  type ArticleCategory,
} from '@/constants/articles';
import type { LesionType } from '@/lib/api/common';
import PageHeader from '@/components/molecules/PageHeader';

export default function ArticlesPage() {
  const basePath = '/articles';
  const router = useRouter();
  const [filter, setFilter] = useState<ArticleCategory | null>(null);
  const [risky, setRisky] = useState<LesionType[]>([]);
  const [hasScan, setHasScan] = useState<boolean | null>(null);

  useEffect(() => {
    dashboardApi
      .getScore()
      .then((res) => {
        const score = res.data.result;
        if (score) setHasScan(score.sessionId !== null);
      })
      .catch(() => {});
    dashboardApi
      .getRisk()
      .then((res) =>
        setRisky(
          (res.data.result?.categories ?? [])
            .filter((c) => isRisky(c.riskLevel))
            .map((c) => c.lesionType),
        ),
      )
      .catch(() => {});
  }, []);

  const list = useMemo(() => {
    const filtered = filter ? ARTICLES.filter((a) => a.category === filter) : ARTICLES;
    if (hasScan === false) {
      return [...filtered].sort((a, b) => Number(b.category === '기기 사용') - Number(a.category === '기기 사용'));
    }
    return sortByRelevance(filtered, risky);
  }, [filter, risky, hasScan]);

  const isRecommended = (relatedTo: LesionType[]) =>
    hasScan !== false && risky.length > 0 && relatedTo.some((t) => risky.includes(t));

  return (
    <PageShell withNav>
      <PageHeader title="구강 건강 정보" />

      <div className="px-5 pt-4">
        {hasScan === false ? (
          <p className="m-0 mb-3 px-1 text-[11px] text-muted">
            첫 스캔 전에 알아두면 좋은 기기 사용 글을 먼저 모았어요.
          </p>
        ) : risky.length > 0 && (
          <p className="m-0 mb-3 px-1 text-[11px] text-muted">
            최근 스캔 결과와 관련된 글을 위로 올렸어요.
          </p>
        )}

        <div className="flex gap-2 overflow-x-auto pb-3 -mx-5 px-5">
          <button
            type="button"
            onClick={() => setFilter(null)}
            className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === null
                ? 'bg-primary text-white'
                : 'bg-white/90 text-muted border border-hairline'
            }`}
          >
            전체
          </button>
          {ARTICLE_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setFilter(c)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === c
                  ? 'bg-primary text-white'
                  : 'bg-white/90 text-muted border border-hairline'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2.5">
          {list.map((article) => (
            <button
              key={article.id}
              type="button"
              onClick={() => router.push(`${basePath}/${article.id}`)}
              className="bg-white/90 backdrop-blur-sm rounded-[18px] shadow-card p-3.5 text-left transition-transform active:scale-[0.99] flex items-center gap-4"
            >
              <div className="relative w-[88px] h-[104px] shrink-0 overflow-hidden rounded-[14px] bg-[#EAF1FA]">
                <Image src={article.cover} alt="" fill sizes="180px" quality={90} className="object-cover scale-[1.15] origin-[50%_30%]" />
              </div>
              <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-[10px] font-semibold text-primary">{article.category}</span>
                {isRecommended(article.relatedTo) && (
                  <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-warning/20 text-[9px] font-bold text-[#B87F00]">
                    <Sparkles size={9} />내 결과와 관련
                  </span>
                )}
              </div>
              <p className="m-0 text-[14px] font-semibold text-content leading-snug">
                {article.title}
              </p>
              <p className="m-0 mt-1 text-[12px] text-muted leading-relaxed">{article.summary}</p>
              <span className="flex items-center gap-1 mt-2 text-[10px] text-muted">
                <Clock size={10} />
                {article.readMinutes}분
              </span>
              </div>
            </button>
          ))}
        </div>

        <p className="m-0 mt-4 px-1 text-[10px] leading-relaxed text-muted">
          일반적인 구강 관리 정보예요. 증상이 있다면 치과에서 확인해 주세요.
        </p>
      </div>

      <NavBar activeTab="home" />
    </PageShell>
  );
}
