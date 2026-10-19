import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';
import type { LlmReport } from '@/lib/api/report';

const actionHref = (code: string) => {
  if (code === 'SCALING') return '/clinics';
  if (code === 'RECAPTURE') return '/scan';
  return '/products';
};

const MARKER = ['#F0DB98', '#C9DDF6', '#D6E6DD'];
const CARD =
  'mt-4 rounded-[24px] border border-white bg-white p-5 shadow-[0_6px_24px_rgba(71,105,154,0.045)]';

export default function ScoreExplanation({
  report,
  section = 'all',
}: {
  report: LlmReport;
  section?: 'all' | 'score' | 'actions';
}) {
  const score = report.score;
  const segments = score
    ? [
        { label: '종합 점수', value: score.total, color: '#738DC8' },
        { label: '치석 감점', value: score.calculusDeduction, color: '#CF9EAC' },
        { label: '치태 감점', value: score.plaqueDeduction, color: '#D8BE86' },
      ]
    : [];
  // 같은 숫자가 두 번 보이지 않게, 회복할 점수 없는 항목은 생략
  const expectations = score
    ? [
        score.recoverableByBrushing > 0
          ? {
              label: '칫솔질로 치태를 관리하면',
              value: score.ceilingByBrushing,
              hint: `치태 감점 중 ${score.recoverableByBrushing}점 회복 가능`,
              color: '#869BC9',
            }
          : null,
        score.ceilingAfterScaling > score.total
          ? {
              label: '스케일링으로 치석을 제거하면',
              value: score.ceilingAfterScaling,
              hint: '치석을 제거했을 때의 예상 점수예요.',
              color: '#C394A7',
            }
          : null,
      ].filter((item): item is NonNullable<typeof item> => item !== null)
    : [];
  return (
    <>
      {section !== 'actions' && score && (
        <section className={CARD}>
          <h2 className="m-0 text-[18px] font-bold tracking-[-0.4px] text-content">
            {score.total}점은 이렇게 나왔어요
          </h2>
          <div
            className="mb-3 mt-5 flex h-3 overflow-hidden rounded-full bg-[#EEF2F7]"
            role="img"
            aria-label={segments.map((s) => `${s.label} ${s.value}점`).join(', ')}
          >
            {segments.map((segment) => (
              <span
                key={segment.label}
                style={{
                  width: `${Math.max(0, Math.min(100, segment.value))}%`,
                  backgroundColor: segment.color,
                }}
              />
            ))}
          </div>
          <ul
            aria-label="점수 막대 범례"
            className="mb-0 mt-0 flex list-none flex-wrap gap-x-4 gap-y-2 p-0"
          >
            {segments.map((segment) => (
              <li
                key={segment.label}
                className="flex items-center gap-1.5 text-[13px] font-semibold text-[#4E607B]"
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: segment.color }} />
                {segment.label}
              </li>
            ))}
          </ul>
          {!!report.interpretation?.length && (
            <div className="-mx-5 mt-5 bg-[#FBF6EC] px-5 py-4">
              <span className="inline-flex items-center rounded-full bg-[#F0E4C8] px-2.5 py-1 text-[12px] font-bold text-[#7A5A1E]">
                AI 해석
              </span>
              <div
                className="mt-2"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(to bottom, transparent 0, transparent 27px, #ECE2CC 27px, #ECE2CC 28px)',
                }}
              >
                {report.interpretation.slice(0, 3).map((text, i) => (
                  <p
                    key={i}
                    className="m-0 break-keep text-[14px] font-medium leading-7 text-content"
                  >
                    {text}
                  </p>
                ))}
              </div>
            </div>
          )}
          {expectations.length > 0 && (
            <div className="mt-5 space-y-4">
              <p className="m-0 text-[14px] font-bold text-[#405A80]">관리 후 기대할 수 있는 변화</p>
              {expectations.map((item) => (
                <div key={item.label}>
                  <p className="m-0 text-[13px] font-semibold text-[#4E607B]">{item.label}</p>
                  <p className="mb-0 mt-1.5 flex items-baseline gap-1.5 text-[14px] font-semibold tabular-nums text-[#4E607B]">
                    {score.total}
                    <span className="text-[#8FA5C3]">→</span>
                    <strong className="text-[28px] font-bold leading-none tracking-[-0.5px] text-[#4C7EC8]">
                      {item.value}
                    </strong>
                  </p>
                  <div
                    className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-[#E2E8F2]"
                    aria-hidden
                  >
                    <span style={{ width: `${score.total}%`, backgroundColor: '#BAC8DF' }} />
                    <span
                      style={{
                        width: `${Math.max(0, item.value - score.total)}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                  <p className="mb-0 mt-1.5 text-[13px] leading-relaxed text-[#4E607B]">
                    {item.hint}
                  </p>
                </div>
              ))}
              <p className="mb-0 mt-2 text-[12px] leading-relaxed text-[#62718A]">
                이번 촬영 구역의 감점을 기준으로 한 예상이며, 다음 측정 결과와 다를 수 있어요.
              </p>
            </div>
          )}
        </section>
      )}
      {section !== 'score' && !!report.actions?.length && (
        <section className={`${CARD} overflow-hidden`}>
          <div className="relative -mx-5 -mt-5 mb-5 h-[160px] overflow-hidden bg-[#E8F2FD]">
            <Image
              src="/images/dashboard/report-care-banner.webp"
              alt="스캐너와 칫솔, 치실이 놓인 구강 관리 공간"
              fill
              sizes="(max-width: 640px) 90vw, 600px"
              className="object-cover object-right"
            />
            <p className="absolute left-4 top-5 m-0 max-w-[45%] text-[15px] font-bold leading-relaxed text-[#42618A]">
              오늘의 관리가
              <br />
              다음 변화를 만들어요
            </p>
          </div>
          <h2 className="mb-1 mt-0 text-[18px] font-bold tracking-[-0.4px] text-content">
            지금 할 일
          </h2>
          <ol className="mb-0 mt-1 list-none divide-y divide-hairline p-0">
            {report.actions.slice(0, 3).map((action, i) => {
              const href = actionHref(action.code);
              const buttonLabel =
                action.code === 'SCALING'
                  ? '근처 치과 찾기'
                  : action.code === 'RECAPTURE'
                    ? '다음 스캔하기'
                    : '관리 용품 추천';
              const buttonHref =
                href === '/products' ? `/products?session=${report.sessionId}` : href;
              const title = (
                <span className="relative isolate inline px-0.5">
                  <svg
                    viewBox="0 0 180 24"
                    preserveAspectRatio="none"
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[18px] w-full"
                  >
                    <path
                      d={i % 2 === 0 ? 'M5 15 Q65 10 175 13' : 'M5 12 Q100 17 175 11'}
                      fill="none"
                      stroke={MARKER[i]}
                      strokeWidth={10}
                      strokeLinecap="round"
                      opacity={0.7}
                    />
                  </svg>
                  {action.title}
                </span>
              );
              return (
                <li key={`${action.code}-${i}`} className="flex gap-3.5 py-5 last:pb-1">
                  <span
                    aria-label={`${i + 1}순위`}
                    className={`pt-0.5 text-[20px] font-bold leading-none tabular-nums tracking-[-0.8px] ${i === 0 ? 'text-[#647A9A]' : 'text-[#A3B1C4]'}`}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h3 className="m-0 text-[15px] font-bold leading-relaxed text-content">
                        {title}
                      </h3>
                      <span
                        className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-[13px] font-semibold ${action.code === 'SCALING' ? 'bg-[#F4E5EB] text-[#96647B]' : action.code === 'RECAPTURE' ? 'bg-[#E3ECFA] text-[#5275A7]' : 'bg-[#E3F0EA] text-[#547E70]'}`}
                      >
                        {action.tag || '관리 안내'}
                      </span>
                    </div>
                    <p className="mb-0 mt-2 break-keep text-[15px] font-medium leading-[1.75] text-[#4E607B]">
                      {action.detail}
                    </p>
                    <Link
                      href={buttonHref}
                      className={`mt-3 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold no-underline transition-opacity hover:opacity-85 ${action.code === 'SCALING' ? 'bg-[#F4E5EB] text-[#87536B]' : action.code === 'RECAPTURE' ? 'bg-[#E3ECFA] text-[#406392]' : 'bg-[#E3F0EA] text-[#426B5D]'}`}
                    >
                      {buttonLabel}
                      <ArrowUpRight size={14} aria-hidden />
                    </Link>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      )}
      {section !== 'score' && report.notice && (
        <p className="mt-4 px-1 text-[13px] font-medium leading-relaxed text-[#4E607B]">
          {report.notice}
        </p>
      )}
    </>
  );
}
