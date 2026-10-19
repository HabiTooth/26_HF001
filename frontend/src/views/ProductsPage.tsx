'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Check, ChevronRight } from 'lucide-react';
import NavBar from '@/components/organisms/NavBar';
import PageShell from '@/components/organisms/PageShell';
import ProductThumb from '@/components/atoms/ProductThumb';
import { dashboardApi } from '@/lib/api/dashboard';
import { reportApi } from '@/lib/api/report';
import { LESION_LABEL, worstByLesion, type LesionRisk } from '@/lib/lesionRisk';
import { excludeMissingTeeth } from '@/lib/toothMapping';
import { useDentitionStore } from '@/stores/dentitionStore';
import { isRisky, recommendProducts, shopUrl, type ProductArt } from '@/constants/products';

import { RISK_LABEL } from '@/lib/score';
import PageHeader from '@/components/molecules/PageHeader';

const PRODUCT_REASON: Record<ProductArt, string> = {
  brush: '매일 쓰는 기본 용품으로, 부드럽고 작은 헤드를 골랐어요.',
  paste: '매일 칫솔질에 함께 쓸 기본 관리 용품이에요.',
  electric: '닦는 시간과 압력을 확인하고 싶을 때 살펴보세요.',
  floss: '칫솔이 닿기 어려운 치아 사이를 관리할 때 써요.',
  interdental: '치아 사이 관리에 쓸 수 있는 작은 솔이에요.',
  tartar: '치석 관리 항목을 고려해 고른 치약 종류예요.',
  waterjet: '치아 사이 관리를 보조할 용품으로 골랐어요.',
  mouthwash: '칫솔질 후 함께 쓸 보조 용품으로 골랐어요.',
  tongue: '치아와 함께 혀도 관리하고 싶을 때 살펴보세요.',
};

export default function ProductsPage() {
  const params = useSearchParams();
  const sessionId = Number(params.get('session'));
  const fromReport = Number.isFinite(sessionId) && sessionId > 0;

  const [categories, setCategories] = useState<LesionRisk[]>([]);
  const [loaded, setLoaded] = useState(false);
  const { missing, hydrate } = useDentitionStore();

  useEffect(() => hydrate(), [hydrate]);

  useEffect(() => {
    setLoaded(false);
    // 리포트 경유 시 그 스캔 기준
    const load = fromReport
      ? reportApi
          .getSessionReport(sessionId)
          .then((res) => worstByLesion(excludeMissingTeeth(res.data.result?.toothStatuses ?? [], missing)))
      : dashboardApi.getRisk().then((res) => res.data.result?.categories ?? []);

    load
      .then(setCategories)
      .catch(() => setCategories([]))
      .finally(() => setLoaded(true));
  }, [fromReport, sessionId, missing]);

  const risky = categories.filter((c) => isRisky(c.riskLevel));
  const products = useMemo(() => recommendProducts(categories), [categories]);

  const matched = (helpsWith: string[]) => risky.some((c) => helpsWith.includes(c.lesionType));

  return (
    <PageShell withNav decorative={false} className="!bg-[#F8F6F0]">
      <PageHeader title="관리 용품 추천" divider="border-[#F3E4B5]" />

      <div className="px-5 pt-4 flex flex-col gap-4">
        <section className="relative isolate overflow-hidden -mx-5 -mt-4 bg-[#FFF3CF] px-5 py-6 min-h-[184px]">
          <Image
            src="/images/products/clay/care-shelf-pastel.webp"
            alt=""
            fill
            sizes="(max-width: 600px) 100vw, 600px"
            className="object-cover"
            priority
          />
          <div className="relative z-10 max-w-[55%]">
            <p className="m-0 text-[11px] font-semibold text-[#7C7162]">매일의 구강 관리</p>
            <h1 className="m-0 mt-2 text-[23px] font-bold leading-[1.3] text-[#49443E] break-keep">
              내 치아에 맞는
              <br />
              관리 용품
            </h1>
            <p className="m-0 mt-3 text-[12px] font-semibold text-[#746A5D] leading-relaxed">
              고를 때 살펴볼 기준까지
              <br />
              함께 알려드려요
            </p>
          </div>
        </section>
        <div className="bg-white rounded-[22px] border border-white shadow-[0_4px_20px_rgba(71,105,154,0.04)] p-5">
          <div className="flex items-baseline justify-between mb-2">
            <h2 className="m-0 text-sm font-bold text-content">추천 기준</h2>
            <span className="text-[11px] font-medium text-[#687B94]">
              {fromReport ? '이 리포트 기준' : '가장 최근 스캔 기준'}
            </span>
          </div>
          {!loaded ? (
            <p className="m-0 text-[12px] text-muted">불러오는 중이에요.</p>
          ) : risky.length === 0 ? (
            <p className="m-0 text-[12px] font-medium text-[#687B94] leading-relaxed">
              지금은 특별히 신경 쓸 항목이 없어요. 지금 쓰는 것들을 그대로 유지해도 괜찮아요.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {risky.map((c) => (
                <span
                  key={c.lesionType}
                  className="px-2.5 py-1 rounded-full bg-danger/10 text-[11px] font-semibold text-danger"
                >
                  {LESION_LABEL[c.lesionType]} {RISK_LABEL[c.riskLevel]}
                </span>
              ))}
              <p className="m-0 w-full mt-1 text-[11px] text-muted">
                이 결과에 도움이 되는 용품을 위로 올렸어요.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-1">
          <h2 className="m-0 text-[16px] font-bold text-content">
            추천 용품 <span className="text-[#4A86D9] ml-1">{products.length}</span>
          </h2>
          <span className="text-[10px] font-medium text-[#687B94]">
            용품 종류를 표현한 그림이에요
          </span>
        </div>

        {products.map((product) => {
          const highlighted = matched(product.helpsWith);
          return (
            <article
              key={product.id}
              className="bg-white rounded-[24px] border border-white shadow-[0_6px_24px_rgba(71,105,154,0.05)] overflow-hidden"
            >
              <div className="p-4 pb-3">
                <div className="flex items-center gap-3">
                  <ProductThumb art={product.art} tint={product.tint} size={72} clay />

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-[#687B94]">
                        {product.category}
                      </span>
                      {highlighted && (
                        <span className="px-2 py-1 rounded-full bg-[#E4F0FF] text-[10px] font-bold text-[#4A86D9]">
                          내 결과와 관련
                        </span>
                      )}
                    </div>

                    <h3 className="m-0 mt-1 text-[16px] leading-snug font-bold text-content break-keep">
                      {product.name}
                    </h3>
                    <p className="m-0 mt-1 text-[11.5px] font-medium leading-relaxed text-[#687B94]">
                      {PRODUCT_REASON[product.art]}
                    </p>
                  </div>
                </div>
                <details className="mt-3 group">
                  <summary className="cursor-pointer text-[11px] font-semibold text-[#4A86D9]">
                    고를 때 확인할 기준
                  </summary>
                  <ul className="m-0 mt-2 p-0 list-none flex flex-col gap-1.5">
                    {product.lookFor.map((item) => (
                      <li key={item} className="flex items-start gap-1.5">
                        <Check
                          size={14}
                          className="text-primary flex-shrink-0 mt-[2px]"
                          strokeWidth={2.5}
                        />
                        <span className="text-[12px] font-medium text-[#687B94] leading-relaxed">
                          {item}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              </div>

              {product.items.length > 0 && (
                <div className="mx-4 mb-4 rounded-[14px] bg-[#F5F8FC] divide-y divide-[#E7EEF8]">
                  {product.items.map((item) => (
                    <a
                      key={item.keyword}
                      href={shopUrl(item.keyword)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 px-3 py-2.5 no-underline transition-colors active:bg-hairline/40"
                    >
                      <span className="flex-1 min-w-0">
                        {item.brand && (
                          <span className="text-[10px] font-semibold text-muted mr-1.5">
                            {item.brand}
                          </span>
                        )}
                        <span className="text-[12px] font-semibold text-content">{item.name}</span>
                      </span>
                      <span className="flex items-center gap-0.5 flex-shrink-0 text-[11px] font-bold text-[#7BA828]">
                        올리브영
                        <ChevronRight size={13} />
                      </span>
                    </a>
                  ))}
                </div>
              )}
            </article>
          );
        })}

        <p className="m-0 px-1 text-[10px] leading-relaxed text-muted">
          제품을 누르면 올리브영 검색 결과로 이동해요. 가격과 재고는 올리브영에서 확인해 주세요.
          이미 굳은 치석은 용품으로 없앨 수 없고 치과에서 제거해야 해요.
        </p>
      </div>

      <NavBar activeTab="home" />
    </PageShell>
  );
}
