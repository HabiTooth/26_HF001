'use client';

import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Clock } from 'lucide-react';
import PageShell from '@/components/organisms/PageShell';
import { ARTICLES, findArticle } from '@/constants/articles';
import PageHeader from '@/components/molecules/PageHeader';

export default function ArticleDetailPage() {
  const basePath = '/articles';
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const article = findArticle(params?.id ?? '');

  const related = article
    ? ARTICLES.filter((a) => a.id !== article.id && a.category === article.category).slice(0, 2)
    : [];

  return (
    <PageShell>
      <PageHeader title={article?.category ?? '구강 건강 정보'} className="sticky top-0 z-20" />

      {article === null ? (
        <div className="px-5 pt-16 flex flex-col items-center gap-3">
          <p className="m-0 text-sm text-muted">찾을 수 없는 글이에요.</p>
          <button
            type="button"
            onClick={() => router.replace(basePath)}
            className="px-4 py-2 rounded-full bg-primary-gradient text-white text-xs font-semibold"
          >
            목록으로
          </button>
        </div>
      ) : (
        <article>
          <div className="relative aspect-[4/3] overflow-hidden bg-[#EAF1FA] isolate">
            <Image src={article.cover} alt="" fill sizes="(max-width: 480px) 100vw, 600px" quality={90} className="object-cover" priority />
            <div className="absolute inset-0 bg-gradient-to-t from-[#17213F]/85 via-[#17213F]/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5 text-white">
              <h1 className="m-0 text-[24px] font-semibold leading-[1.25] tracking-[-0.7px] text-balance drop-shadow-sm">
                {article.title}
              </h1>
              <span className="flex items-center gap-1.5 mt-3 text-[11px] text-white/85">
                <Clock size={12} />
                {article.readMinutes}분 분량
              </span>
            </div>
          </div>

          <div className="bg-white px-6 pt-7 pb-12 flex flex-col gap-5">
            {article.body.map((paragraph, i) => (
              <p key={i} className="m-0 text-[14px] text-content leading-[1.9] break-keep">
                {paragraph}
              </p>
            ))}
          </div>

          <div className="px-5 pt-5">
          {related.length > 0 && (
            <>
              <h2 className="m-0 mb-3 px-1 text-[11px] font-bold text-muted tracking-widest">
                이어서 읽기
              </h2>
              <div className="flex flex-col gap-2">
                {related.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => router.replace(`${basePath}/${a.id}`)}
                    className="bg-white/90 backdrop-blur-sm rounded-[18px] shadow-card p-4 text-left transition-transform active:scale-[0.99]"
                  >
                    <p className="m-0 text-[13px] font-semibold text-content">{a.title}</p>
                    <p className="m-0 mt-1 text-[11px] text-muted">{a.summary}</p>
                  </button>
                ))}
              </div>
            </>
          )}

          <p className="m-0 mt-6 px-1 text-[10px] leading-relaxed text-muted">
            일반적인 구강 관리 정보예요. 증상이 있다면 치과에서 확인해 주세요.
          </p>
          </div>
        </article>
      )}
    </PageShell>
  );
}
