'use client';

import { useState } from 'react';
import ApiChecks from '@/components/qa/ApiChecks';
import ScreenChecks from '@/components/qa/ScreenChecks';

const TABS = [
  { id: 'screen', label: '화면 QA' },
  { id: 'api', label: 'API 스모크 테스트' },
] as const;

type Tab = (typeof TABS)[number]['id'];

export default function QaPage() {
  const [tab, setTab] = useState<Tab>('screen');

  return (
    <main className="max-w-[860px] mx-auto p-6 min-h-screen bg-gray-50">
      <h1 className="m-0 text-xl font-bold text-gray-900">QA</h1>

      <div className="mt-3 mb-4 flex gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-[13px] font-semibold border-b-2 -mb-px ${
              tab === t.id
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-400'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'screen' ? <ScreenChecks /> : <ApiChecks />}
    </main>
  );
}
