'use client';

import { create } from 'zustand';
import { doneOn, toggle, type HabitId, type HabitLog } from '@/lib/habits';
import { habitApi } from '@/lib/api/habit';

const KEY = 'habitooth.habits';
const RANGE_DAYS = 365;

function read(): HabitLog {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as HabitLog) : {};
  } catch {
    return {};
  }
}

function write(log: HabitLog) {
  try {
    localStorage.setItem(KEY, JSON.stringify(log));
  } catch {
  }
}

const dateKey = (d: Date) => d.toISOString().slice(0, 10);

interface HabitState {
  log: HabitLog;
  hydrated: boolean;
  hydrate: () => void;
  refresh: () => Promise<void>;
  toggleHabit: (dateKey: string, id: HabitId) => void;
  clear: () => void;
}

export const useHabitStore = create<HabitState>((set, get) => ({
  log: {},
  hydrated: false,

  hydrate: () => {
    if (get().hydrated) return;
    // 캐시 먼저 적용
    set({ log: read(), hydrated: true });
    void get().refresh();
  },

  refresh: async () => {
    const to = new Date();
    const from = new Date(to.getTime() - RANGE_DAYS * 86_400_000);
    try {
      const res = await habitApi.getHabits(dateKey(from), dateKey(to));
      const log: HabitLog = {};
      for (const row of res.data.result?.logs ?? []) log[row.date] = row.habits;
      write(log);
      set({ log, hydrated: true });
    } catch {
      // 실패 시 캐시 유지
    }
  },

  toggleHabit: (key, id) => {
    const next = toggle(get().log, key, id);
    write(next);
    set({ log: next });
    habitApi.updateHabits(key, doneOn(next, key)).catch(() => get().refresh());
  },

  clear: () => set({ log: {}, hydrated: false }),
}));
