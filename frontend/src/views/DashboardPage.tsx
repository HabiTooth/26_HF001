'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import ScoreCard from '@/components/molecules/ScoreCard';
import NavBar from '@/components/organisms/NavBar';
import PageShell from '@/components/organisms/PageShell';
import QuickMenu from '@/components/organisms/QuickMenu';
import ReportSummary from '@/components/organisms/ReportSummary';
import Header from '@/components/organisms/Header';
import HabitSummarySection from '@/components/organisms/HabitSummarySection';
import { historyApi, type HistoryToday } from '@/lib/api/history';
import { toKey } from '@/lib/streak';
import {
  dashboardApi,
  type DashboardReport,
  type DashboardRisk,
} from '@/lib/api/dashboard';
import { formatDateTime, scoreStatus, toSummaryRisk } from '@/lib/score';

export default function DashboardPage() {
  const [score, setScore] = useState<HistoryToday | null>(null);
  const [scoreState, setScoreState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [report, setReport] = useState<DashboardReport | null>(null);
  const [risk, setRisk] = useState<DashboardRisk | null>(null);

  useEffect(() => {
    Promise.allSettled([
      historyApi.getToday(),
      dashboardApi.getReport(),
      dashboardApi.getRisk(),
    ]).then(([s, r, k]) => {
      if (s.status === 'fulfilled') setScore(s.value.data.result);
      setScoreState(s.status === 'fulfilled' ? 'ready' : 'error');
      if (r.status === 'fulfilled') setReport(r.value.data.result);
      if (k.status === 'fulfilled') setRisk(k.value.data.result);
    });
  }, []);

  const plaque = risk?.categories.find((c) => c.lesionType === 'PLAQUE');
  const calculus = risk?.categories.find((c) => c.lesionType === 'CALCULUS');

  const hasScore = score !== null && score.date.slice(0, 10) === toKey(new Date());
  const hasReport = report !== null && report.sessionId !== null;

  return (
    <PageShell withNav>
      <main className="px-5 pt-5">
        <div className="relative isolate -mx-5 -mt-5 px-5 pt-5 pb-3 rounded-b-[32px] overflow-hidden bg-[#4A86D9]">
        <Image src="/images/dashboard/clay-landscape.webp" alt="" fill sizes="(max-width: 600px) 100vw, 600px" className="object-cover sm:object-[50%_85%]" priority />
        <div className="absolute inset-0 bg-gradient-to-r from-[#3B72BC]/35 via-transparent to-transparent" />
        <div className="relative z-10">
        <Header inverse />

        <ScoreCard
          state={scoreState}
          score={hasScore ? score!.score! : null}
          prevScore={
            hasScore && score!.scoreDiff !== null ? score!.score! - score!.scoreDiff! : undefined
          }
        />
        </div>
        </div>

        <QuickMenu />

        {hasReport && (
          <ReportSummary
            score={report!.averageScore}
            status={scoreStatus(report!.averageScore)}
            date={formatDateTime(report!.scannedAt)}
            reportId={String(report!.sessionId)}
            plaqueScore={plaque?.affectedRatio}
            calculusScore={calculus?.affectedRatio}
            plaqueRisk={plaque && toSummaryRisk(plaque.riskLevel)}
            calculusRisk={calculus && toSummaryRisk(calculus.riskLevel)}
          />
        )}
        <HabitSummarySection />
      </main>
      <NavBar activeTab="home" />
    </PageShell>
  );
}
