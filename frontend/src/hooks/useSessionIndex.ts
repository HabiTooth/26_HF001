'use client';

import { useEffect, useState } from 'react';
import { historyApi } from '@/lib/api/history';

export interface SessionRef {
  sessionId: number;
  scannedAt: string;
  score: number | null;
}

export interface SessionIndex {
  sessions: SessionRef[];
  loading: boolean;
  idByDate: (date: string | null | undefined) => number | null;
}

const newestFirst = (list: SessionRef[]) =>
  [...list].sort((a, b) => b.sessionId - a.sessionId);

export function useSessionIndex(): SessionIndex {
  const [sessions, setSessions] = useState<SessionRef[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    historyApi
      .getRecords()
      .then((res) =>
        (res.data.result ?? [])
          .filter((item) => item.sessionId != null)
          .map((item) => ({
            sessionId: item.sessionId,
            scannedAt: item.time ? `${item.date}T${item.time}` : item.date,
            score: item.score ?? null,
          })),
      )
      .catch(() => [] as SessionRef[])
      .then((list) => {
        if (!alive) return;
        setSessions(newestFirst(list));
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const idByDate = (date: string | null | undefined) => {
    if (!date) return null;
    const key = date.slice(0, 10);
    return sessions.find((s) => s.scannedAt.slice(0, 10) === key)?.sessionId ?? null;
  };

  return { sessions, loading, idByDate };
}
