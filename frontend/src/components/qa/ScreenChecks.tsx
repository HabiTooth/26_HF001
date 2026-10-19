'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  ChevronDown,
  Clipboard,
  ExternalLink,
  Monitor,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  SCREEN_CHECKS,
  SCREEN_GROUPS,
  STATUS_LABEL,
  STATUS_STYLE,
  type ScreenStatus,
} from '@/lib/qa/screens';
import {
  canCaptureDisplay,
  clearShots,
  deleteShot,
  fromDisplay,
  fromFile,
  listShots,
  putShot,
  type Shot,
} from '@/lib/qa/shots';

const RESULT_KEY = 'habitooth.qa.screens';

interface Result {
  status: ScreenStatus;
  note: string;
  checked: string[];
}

type Results = Record<string, Result>;

const blank = (): Result => ({ status: 'idle', note: '', checked: [] });

function readResults(): Results {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(RESULT_KEY) ?? '{}') as Results;
  } catch {
    return {};
  }
}

function markdownReport(results: Results, shots: Shot[]): string {
  const lines = ['# 프론트 QA 결과', '', `- 작성 ${new Date().toLocaleString('ko-KR')}`, ''];

  for (const group of SCREEN_GROUPS) {
    const screens = SCREEN_CHECKS.filter((s) => s.group === group);
    if (screens.length === 0) continue;
    lines.push(`## ${group}`, '');

    for (const screen of screens) {
      const r = results[screen.id] ?? blank();
      const shotCount = shots.filter((s) => s.screenId === screen.id).length;
      lines.push(
        `- **${screen.label}** (\`${screen.path}\`) — ${STATUS_LABEL[r.status]}` +
          (shotCount > 0 ? ` · 스크린샷 ${shotCount}장` : ''),
      );
      for (const point of screen.points) {
        lines.push(`  - [${r.checked.includes(point) ? 'x' : ' '}] ${point}`);
      }
      if (r.note.trim()) lines.push(`  - 메모: ${r.note.trim()}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

export default function ScreenChecks() {
  const [results, setResults] = useState<Results>({});
  const [shots, setShots] = useState<Shot[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const openRef = useRef<string | null>(null);

  useEffect(() => {
    setResults(readResults());
    listShots()
      .then(setShots)
      .catch(() => {});
  }, []);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const persist = (next: Results) => {
    setResults(next);
    try {
      localStorage.setItem(RESULT_KEY, JSON.stringify(next));
    } catch {
      setToast('결과를 저장하지 못했어요');
    }
  };

  const update = (id: string, patch: Partial<Result>) =>
    persist({ ...results, [id]: { ...(results[id] ?? blank()), ...patch } });

  const addShot = useCallback(async (screenId: string, dataUrl: string) => {
    const shot: Shot = {
      id: `${screenId}-${Date.now()}`,
      screenId,
      dataUrl,
      takenAt: new Date().toISOString(),
      note: '',
    };
    await putShot(shot);
    setShots((prev) => [...prev, shot]);
  }, []);

  useEffect(() => {
    const onPaste = async (e: ClipboardEvent) => {
      const screenId = openRef.current;
      if (!screenId) return;
      const file = [...(e.clipboardData?.items ?? [])]
        .find((i) => i.type.startsWith('image/'))
        ?.getAsFile();
      if (!file) return;
      e.preventDefault();
      try {
        await addShot(screenId, await fromFile(file));
        setToast('붙여넣은 이미지를 저장했어요');
      } catch {
        setToast('이미지를 읽지 못했어요');
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [addShot]);

  const capture = async (screenId: string) => {
    setBusy(true);
    try {
      await addShot(screenId, await fromDisplay());
    } catch {
      setToast('화면 캡처를 취소했거나 실패했어요');
    } finally {
      setBusy(false);
    }
  };

  const counts = useMemo(() => {
    const acc: Record<ScreenStatus, number> = { idle: 0, pass: 0, fail: 0, hold: 0 };
    for (const screen of SCREEN_CHECKS) acc[(results[screen.id] ?? blank()).status]++;
    return acc;
  }, [results]);

  const copyReport = async () => {
    await navigator.clipboard.writeText(markdownReport(results, shots));
    setToast('결과를 마크다운으로 복사했어요');
  };

  const resetAll = async () => {
    if (!window.confirm('결과와 스크린샷을 전부 지울까요? 되돌릴 수 없어요.')) return;
    await clearShots();
    localStorage.removeItem(RESULT_KEY);
    setResults({});
    setShots([]);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setPreview(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div>
      <p className="m-0 text-xs text-gray-500">
        화면을 하나씩 열어보고 통과 여부와 스크린샷을 남겨요. 결과는 이 브라우저에만 저장돼요.
      </p>

      <div className="mt-4 bg-white rounded-xl p-4 flex flex-wrap items-center gap-2">
        {(['pass', 'fail', 'hold', 'idle'] as const).map((s) => (
          <span
            key={s}
            className={`px-2 py-1 rounded-full text-[11px] font-semibold ${STATUS_STYLE[s]}`}
          >
            {STATUS_LABEL[s]} {counts[s]}
          </span>
        ))}
        <span className="text-[11px] text-gray-400">스크린샷 {shots.length}장</span>

        <button
          type="button"
          onClick={copyReport}
          className="ml-auto h-9 px-3 rounded-lg bg-gray-900 text-white text-xs font-semibold flex items-center gap-1.5"
        >
          <Clipboard size={13} />
          결과 복사
        </button>
        <button
          type="button"
          onClick={resetAll}
          className="h-9 px-3 rounded-lg border border-gray-200 text-xs font-semibold text-red-600"
        >
          전부 지우기
        </button>
      </div>

      {toast && <p className="m-0 mt-2 text-[11px] font-semibold text-blue-600">{toast}</p>}

      {SCREEN_GROUPS.map((group) => {
        const screens = SCREEN_CHECKS.filter((s) => s.group === group);
        if (screens.length === 0) return null;

        return (
          <section key={group} className="mt-5">
            <h2 className="m-0 mb-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
              {group}
            </h2>
            <div className="bg-white rounded-xl divide-y divide-gray-100 overflow-hidden">
              {screens.map((screen) => {
                const result = results[screen.id] ?? blank();
                const isOpen = open === screen.id;
                const mine = shots.filter((s) => s.screenId === screen.id);

                return (
                  <div key={screen.id}>
                    <div className="flex items-center gap-3 px-4 py-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-1 rounded-full w-12 text-center flex-shrink-0 ${STATUS_STYLE[result.status]}`}
                      >
                        {STATUS_LABEL[result.status]}
                      </span>

                      <div className="flex-1 min-w-0">
                        <p className="m-0 text-[13px] text-gray-900">
                          {screen.label}
                          {screen.needsParam && (
                            <span className="ml-1.5 text-[10px] font-semibold text-amber-600">
                              id 필요
                            </span>
                          )}
                        </p>
                        <p className="m-0 font-mono text-[11px] text-gray-400 truncate">
                          {screen.path}
                        </p>
                      </div>

                      {mine.length > 0 && (
                        <span className="text-[10px] text-gray-400 flex-shrink-0">
                          📷 {mine.length}
                        </span>
                      )}

                      <a
                        href={screen.path}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 text-gray-400 hover:text-gray-700"
                        title="새 탭에서 열기"
                      >
                        <ExternalLink size={14} />
                      </a>

                      <button
                        type="button"
                        onClick={() => {
                          setOpen(isOpen ? null : screen.id);
                          setPreview(isOpen ? null : screen.path);
                        }}
                        className="p-1 text-gray-400"
                      >
                        <ChevronDown
                          size={16}
                          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        />
                      </button>
                    </div>

                    {isOpen && (
                      <div className="px-4 pb-4 flex flex-col gap-3">
                        <div className="flex gap-1.5">
                          {(['pass', 'fail', 'hold', 'idle'] as const).map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => update(screen.id, { status: s })}
                              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold ${
                                result.status === s
                                  ? STATUS_STYLE[s]
                                  : 'bg-gray-50 text-gray-400 border border-gray-200'
                              }`}
                            >
                              {STATUS_LABEL[s]}
                            </button>
                          ))}
                        </div>

                        <ul className="m-0 p-0 list-none flex flex-col gap-1">
                          {screen.points.map((point) => (
                            <li key={point}>
                              <label className="flex items-start gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={result.checked.includes(point)}
                                  onChange={(e) =>
                                    update(screen.id, {
                                      checked: e.target.checked
                                        ? [...result.checked, point]
                                        : result.checked.filter((p) => p !== point),
                                    })
                                  }
                                  className="mt-0.5 w-3.5 h-3.5 flex-shrink-0"
                                />
                                <span className="text-[12px] text-gray-700 leading-[1.5]">
                                  {point}
                                </span>
                              </label>
                            </li>
                          ))}
                        </ul>

                        <textarea
                          value={result.note}
                          onChange={(e) => update(screen.id, { note: e.target.value })}
                          placeholder="이상한 점, 재현 방법 등"
                          className="w-full h-16 p-2 rounded-lg border border-gray-200 text-[12px] resize-y"
                        />

                        <div className="flex flex-wrap gap-1.5">
                          {canCaptureDisplay() && (
                            <button
                              type="button"
                              onClick={() => capture(screen.id)}
                              disabled={busy}
                              className="h-8 px-3 rounded-lg bg-gray-900 text-white text-[11px] font-semibold flex items-center gap-1.5 disabled:opacity-40"
                            >
                              <Monitor size={12} />
                              화면 캡처
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => fileInput.current?.click()}
                            className="h-8 px-3 rounded-lg border border-gray-200 text-[11px] font-semibold text-gray-700 flex items-center gap-1.5"
                          >
                            <Upload size={12} />
                            파일 선택
                          </button>
                          <span className="h-8 px-2 flex items-center text-[11px] text-gray-400">
                            <Camera size={12} className="mr-1" />
                            Win+Shift+S 로 자르고 여기서 Ctrl+V 해도 돼요
                          </span>
                        </div>

                        {mine.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {mine.map((shot) => (
                              <div key={shot.id} className="relative">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={shot.dataUrl}
                                  alt=""
                                  className="w-24 rounded-lg border border-gray-200"
                                />
                                <a
                                  href={shot.dataUrl}
                                  download={`${screen.id}-${shot.takenAt.slice(0, 19).replace(/[:T]/g, '')}.jpg`}
                                  className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[9px] no-underline"
                                >
                                  저장
                                </a>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await deleteShot(shot.id);
                                    setShots((prev) => prev.filter((s) => s.id !== shot.id));
                                  }}
                                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center"
                                >
                                  <Trash2 size={10} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          const screenId = open;
          e.target.value = '';
          if (!file || !screenId) return;
          try {
            await addShot(screenId, await fromFile(file));
          } catch {
            setToast('이미지를 읽지 못했어요');
          }
        }}
      />

      {preview && (
        <div className="fixed right-6 top-6 bottom-6 z-50 w-[390px] flex flex-col bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 flex-shrink-0">
            <span className="flex-1 font-mono text-[11px] text-gray-500 truncate">{preview}</span>
            <button
              type="button"
              onClick={() => setPreview(null)}
              className="w-6 h-6 flex items-center justify-center rounded text-gray-500 hover:bg-gray-100"
              aria-label="미리보기 닫기"
            >
              <X size={14} />
            </button>
          </div>
          <iframe src={preview} title="미리보기" className="flex-1 w-full border-0" />
        </div>
      )}
    </div>
  );
}
