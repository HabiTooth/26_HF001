'use client';

import { useState } from 'react';
import axios from 'axios';
import { ChevronDown, Play, Loader2 } from 'lucide-react';
import {
  QA_CHECKS,
  QA_GROUPS,
  extraKeys,
  missingKeys,
  type QaCheck,
  type QaContext,
} from '@/lib/qa/checks';

type Status = 'idle' | 'running' | 'pass' | 'warn' | 'fail' | 'skip';

interface Outcome {
  status: Status;
  httpStatus?: number;
  ms?: number;
  message?: string;
  missing?: string[];
  extra?: string[];
  body?: unknown;
}

const STATUS_STYLE: Record<Status, string> = {
  idle: 'bg-gray-100 text-gray-400',
  running: 'bg-blue-100 text-blue-600',
  pass: 'bg-emerald-100 text-emerald-700',
  warn: 'bg-amber-100 text-amber-700',
  fail: 'bg-red-100 text-red-700',
  skip: 'bg-gray-100 text-gray-400',
};

const STATUS_LABEL: Record<Status, string> = {
  idle: '대기',
  running: '실행 중',
  pass: '통과',
  warn: '주의',
  fail: '실패',
  skip: '건너뜀',
};

function errorMessage(e: unknown): string {
  if (!axios.isAxiosError(e)) return e instanceof Error ? e.message : String(e);

  if (e.code === 'ECONNABORTED') return '타임아웃';
  if (!e.response) {
    return '응답 없음 — 서버가 죽었거나, 응답에 CORS 헤더가 없어 브라우저가 막았어요';
  }

  const contentType = String(e.response.headers['content-type'] ?? '');
  if (contentType.includes('text/html')) {
    return 'JSON이 아니라 HTML이 왔어요 (ngrok 경고 페이지나 에러 페이지일 수 있음)';
  }

  const body = e.response.data as { message?: string } | undefined;
  return body?.message ?? e.message;
}

export default function ApiChecks() {
  const [ctx, setCtx] = useState<QaContext>({ deviceId: null, sessionId: null, scanImageId: null });
  const [outcomes, setOutcomes] = useState<Record<string, Outcome>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [includeOptIn, setIncludeOptIn] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const runOne = async (check: QaCheck, current: QaContext): Promise<QaContext> => {
    const missingCtx = (check.needs ?? []).filter((k) => current[k] === null);
    if (missingCtx.length > 0) {
      setOutcomes((o) => ({
        ...o,
        [check.id]: { status: 'skip', message: `${missingCtx.join(', ')} 없음` },
      }));
      return current;
    }

    setOutcomes((o) => ({ ...o, [check.id]: { status: 'running' } }));
    const started = performance.now();

    try {
      const res = await check.run(current);
      const ms = Math.round(performance.now() - started);
      const result = res.result;

      const missing = missingKeys(check, result);
      const extra = extraKeys(check, result);
      const envelopeOk = res.success !== false;
      const isEmpty = result === null || result === undefined;

      let status: Status = 'pass';
      let message: string | undefined;
      if (!envelopeOk) {
        status = 'fail';
        message = res.message ?? 'success=false';
      } else if (isEmpty) {
        status = 'skip';
        message = '데이터 없음 (result가 비어 있어 필드를 검사하지 못함)';
      } else if (missing.length > 0) {
        status = 'fail';
        message = `응답에 없는 필드: ${missing.join(', ')}`;
      } else if (extra.length > 0) {
        status = 'warn';
        message = `프론트가 모르는 필드: ${extra.join(', ')}`;
      }

      setOutcomes((o) => ({
        ...o,
        [check.id]: { status, httpStatus: res.status, ms, message, missing, extra, body: result },
      }));

      const captured = Object.fromEntries(
        Object.entries(check.capture?.(result) ?? {}).filter(([, v]) => v !== null),
      );
      if (Object.keys(captured).length > 0) {
        const next = { ...current, ...captured };
        setCtx(next);
        return next;
      }
      return current;
    } catch (e) {
      const ms = Math.round(performance.now() - started);
      setOutcomes((o) => ({
        ...o,
        [check.id]: {
          status: 'fail',
          ms,
          httpStatus: axios.isAxiosError(e) ? e.response?.status : undefined,
          message: errorMessage(e),
          body: axios.isAxiosError(e) ? e.response?.data : undefined,
        },
      }));
      return current;
    }
  };

  const runAll = async () => {
    setIsRunning(true);
    setOutcomes({});
    let current = ctx;
    for (const check of QA_CHECKS) {
      if (check.manualOnly) {
        setOutcomes((o) => ({
          ...o,
          [check.id]: { status: 'skip', message: '전체 실행 대상 아님 — 개별 실행만 가능' },
        }));
        continue;
      }
      if (check.optIn && !includeOptIn) {
        setOutcomes((o) => ({ ...o, [check.id]: { status: 'skip', message: '쓰기 항목 제외됨' } }));
        continue;
      }
      current = await runOne(check, current);
    }
    setIsRunning(false);
  };

  const counts = QA_CHECKS.reduce(
    (acc, c) => {
      const s = outcomes[c.id]?.status ?? 'idle';
      acc[s] = (acc[s] ?? 0) + 1;
      return acc;
    },
    {} as Record<Status, number>,
  );

  return (
    <div>
      <p className="m-0 text-xs text-gray-500">
        프론트가 기대하는 필드가 실제 응답에 있는지 확인해요. 로그인된 토큰으로 요청해요.
      </p>

      <div className="mt-4 bg-white rounded-xl p-4 flex flex-wrap items-end gap-4">
        {(['deviceId', 'sessionId', 'scanImageId'] as const).map((key) => (
          <label key={key} className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-gray-500">{key}</span>
            <input
              type="number"
              value={ctx[key] ?? ''}
              placeholder="자동"
              onChange={(e) =>
                setCtx((c) => ({ ...c, [key]: e.target.value === '' ? null : Number(e.target.value) }))
              }
              className="w-28 h-9 px-2 rounded-lg border border-gray-200 text-sm tabular-nums"
            />
          </label>
        ))}

        <label className="flex items-center gap-2 h-9 cursor-pointer">
          <input
            type="checkbox"
            checked={includeOptIn}
            onChange={(e) => setIncludeOptIn(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-xs text-gray-700">
            쓰기 · 느린 항목 포함
          </span>
        </label>

        <button
          type="button"
          onClick={runAll}
          disabled={isRunning}
          className="ml-auto h-9 px-4 rounded-lg bg-gray-900 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-40"
        >
          {isRunning ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
          전체 실행
        </button>
      </div>

      <div className="mt-3 flex gap-2 text-[11px]">
        {(['pass', 'warn', 'fail', 'skip'] as const).map((s) => (
          <span key={s} className={`px-2 py-1 rounded-full font-semibold ${STATUS_STYLE[s]}`}>
            {STATUS_LABEL[s]} {counts[s] ?? 0}
          </span>
        ))}
      </div>

      {QA_GROUPS.map((group) => {
        const checks = QA_CHECKS.filter((c) => c.group === group);
        if (checks.length === 0) return null;

        return (
          <section key={group} className="mt-5">
            <h2 className="m-0 mb-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
              {group}
            </h2>
            <div className="bg-white rounded-xl divide-y divide-gray-100 overflow-hidden">
              {checks.map((check) => {
                const outcome = outcomes[check.id] ?? { status: 'idle' as Status };
                const isOpen = expanded === check.id;

                return (
                  <div key={check.id}>
                    <div className="flex items-center gap-3 px-4 py-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-1 rounded-full w-16 text-center flex-shrink-0 ${STATUS_STYLE[outcome.status]}`}
                      >
                        {STATUS_LABEL[outcome.status]}
                      </span>

                      <div className="flex-1 min-w-0">
                        <p className="m-0 text-[13px] text-gray-900">
                          {check.label}
                          {check.manualOnly ? (
                            <span className="ml-1.5 text-[10px] text-red-600 font-semibold">
                              위험
                            </span>
                          ) : (
                            check.optIn && (
                              <span className="ml-1.5 text-[10px] text-amber-600 font-semibold">
                                쓰기
                              </span>
                            )
                          )}
                        </p>
                        <p className="m-0 font-mono text-[11px] text-gray-400 truncate">
                          {check.endpoint}
                        </p>
                        {outcome.message && (
                          <p
                            className={`m-0 mt-0.5 text-[11px] ${
                              outcome.status === 'fail' ? 'text-red-600' : 'text-amber-600'
                            }`}
                          >
                            {outcome.message}
                          </p>
                        )}
                      </div>

                      <span className="text-[11px] text-gray-400 tabular-nums flex-shrink-0">
                        {outcome.httpStatus ?? ''}
                        {outcome.ms !== undefined && ` · ${outcome.ms}ms`}
                      </span>

                      <button
                        type="button"
                        onClick={() => setExpanded(isOpen ? null : check.id)}
                        disabled={outcome.body === undefined}
                        className="p-1 text-gray-400 disabled:opacity-20"
                      >
                        <ChevronDown
                          size={16}
                          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (
                            check.manualOnly &&
                            !window.confirm(`${check.label}

되돌릴 수 없어요. 실행할까요?`)
                          ) {
                            return;
                          }
                          runOne(check, ctx);
                        }}
                        disabled={isRunning}
                        className={`text-[11px] font-semibold disabled:opacity-30 ${
                          check.manualOnly ? 'text-red-600' : 'text-gray-600'
                        }`}
                      >
                        실행
                      </button>
                    </div>

                    {isOpen && outcome.body !== undefined && (
                      <pre className="m-0 px-4 pb-3 text-[11px] leading-relaxed text-gray-600 overflow-x-auto">
                        {JSON.stringify(outcome.body, null, 2)}
                      </pre>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
