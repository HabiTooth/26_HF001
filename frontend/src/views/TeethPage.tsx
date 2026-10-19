'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check } from 'lucide-react';
import PageShell from '@/components/organisms/PageShell';
import ToothArch from '@/components/organisms/ToothArch';
import { useDentitionStore } from '@/stores/dentitionStore';
import {
  ALL_TEETH,
  ORTHO_PREMOLARS,
  WISDOM_TEETH,
  hasAll,
  missingSummary,
  presentCount,
  toothName,
} from '@/lib/dentition';
import PageHeader from '@/components/molecules/PageHeader';

export default function TeethPage() {
  const router = useRouter();
  const fromScan = useSearchParams().get('from') === 'scan';
  const { missing, hydrate, toggle, setPreset, save, reset, saving, saveError } =
    useDentitionStore();
  const [saved, setSaved] = useState(false);
  const [touched, setTouched] = useState<number | null>(null);

  useEffect(() => hydrate(), [hydrate]);

  const handleSave = async () => {
    if (!(await save())) return;
    setSaved(true);
    // 저장 확인 후 이동용
    setTimeout(() => (fromScan ? router.replace('/scan') : router.back()), 900);
  };

  const preset = (label: string, group: number[]) => {
    const on = hasAll(missing, group);
    return (
      <button
        key={label}
        type="button"
        onClick={() => setPreset(group, !on)}
        className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors ${
          on ? 'bg-primary text-white' : 'bg-white text-muted border border-hairline'
        }`}
      >
        {label}
      </button>
    );
  };

  return (
    <PageShell>
      <PageHeader title="치아 정보" />

      <div className="px-5 pt-4 flex flex-col gap-4">
        <div className="bg-white/90 backdrop-blur-sm rounded-[20px] shadow-card p-4">
          <p className="m-0 text-[13.5px] font-semibold text-content mb-2">
            빠진 치아가 있으면 알려주세요
          </p>
          <p className="m-0 text-[12.5px] text-muted leading-[1.45]">
            사랑니를 뽑았거나 교정하면서 뺀 치아가 있으면 표시해 주세요.
          </p>
          <p className="m-0 mt-1.5 text-[12.5px] text-muted leading-[1.45]">
            그 자리를 분석에서 빼기 때문에, 없는 치아가 계속 &quot;안 찍힌 곳&quot;으로 잡히는 걸
            막을 수 있어요.
          </p>
        </div>

        <p className="m-0 px-1 text-[11.5px] text-muted leading-[1.45]">
          안쪽 어금니가 바깥, 앞니가 가운데예요. 잘 모르겠으면 아래 버튼으로 한 번에 골라도 돼요.
        </p>

        <div className="bg-white/90 backdrop-blur-sm rounded-[20px] shadow-card p-5">
          <div className="flex flex-wrap gap-1.5 mb-4">
            {preset('사랑니 4개 다 뽑았어요', WISDOM_TEETH)}
            {preset('교정하면서 4개 뺐어요', ORTHO_PREMOLARS)}
            <button
              type="button"
              onClick={reset}
              className="px-3 py-1.5 rounded-full text-[11px] font-semibold bg-white text-muted border border-hairline"
            >
              전부 있어요
            </button>
          </div>

          <ToothArch
            missing={missing}
            selected={touched}
            onToggle={(tooth) => {
              setTouched(tooth);
              toggle(tooth);
            }}
          />

          <div className="mt-1 h-9 flex items-center justify-center rounded-[12px] bg-hairline/40">
            <span className="text-[12px] text-content">
              {touched === null
                ? '치아를 눌러서 없는 자리를 표시해 주세요'
                : `${toothName(touched)} · ${missing.includes(touched) ? '없어요' : '있어요'}`}
            </span>
          </div>

          <div className="flex items-center gap-3 mt-3">
            <span className="flex items-center gap-1.5 text-[11px] text-muted">
              <span className="w-3.5 h-3.5 rounded-full bg-white border-2 border-[#c95460]" />
              있어요
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-muted">
              <span className="w-3.5 h-3.5 rounded-full bg-[#cd6d7b]/75 border-2 border-[#b8505f]" />
              없어요
            </span>
            <span className="text-[11px] text-muted">거울 볼 때 기준이에요</span>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-sm rounded-[20px] shadow-card p-4 flex items-center justify-between">
          <span className="text-[12px] text-muted">
            {missing.length === 0
              ? missingSummary(missing)
              : missing.map(toothName).slice(0, 2).join(', ') +
                (missing.length > 2 ? ` 외 ${missing.length - 2}개` : '')}
          </span>
          <span className="text-[12px] font-bold text-content tabular-nums">
            {presentCount(missing)} / {ALL_TEETH.length}
          </span>
        </div>

        {saveError && (
          <p className="m-0 px-3 py-2 rounded-[10px] bg-danger/10 text-[11.5px] font-medium text-danger leading-snug">
            {saveError}
          </p>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving || saved}
          className="w-full h-13 py-4 rounded-[14px] bg-primary-gradient text-white text-[15px] font-semibold shadow-button flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {saved ? <Check size={18} /> : null}
          {saving ? '저장 중이에요' : saved ? '저장했어요' : '저장'}
        </button>

        <p className="m-0 px-1 text-[10px] text-muted leading-relaxed">
          나중에 사랑니를 빼거나 교정을 시작하면 여기서 다시 고칠 수 있어요.
        </p>
      </div>
    </PageShell>
  );
}
