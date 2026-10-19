'use client';

import { create } from 'zustand';
import { normalizeMissing, setGroup, toggleTooth } from '@/lib/dentition';
import { userApi } from '@/lib/api/user';

const KEY = 'habitooth.dentition';
const DONE_KEY = 'habitooth.dentition.set';

function read(): number[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? normalizeMissing(JSON.parse(raw) as number[]) : [];
  } catch {
    return [];
  }
}

function write(missing: number[], answered: boolean) {
  try {
    localStorage.setItem(KEY, JSON.stringify(missing));
    if (answered) localStorage.setItem(DONE_KEY, 'true');
  } catch {
    // 저장 실패해도 세션 판정 유지
  }
}

interface DentitionState {
  missing: number[];
  hydrated: boolean;
  answered: boolean;
  profileLoaded: boolean;
  saving: boolean;
  saveError: string | null;
  hydrate: () => void;
  toggle: (tooth: number) => void;
  setPreset: (group: number[], on: boolean) => void;
  save: () => Promise<boolean>;
  reset: () => void;
  clear: () => void;
}

export const useDentitionStore = create<DentitionState>((set, get) => ({
  missing: [],
  hydrated: false,
  answered: false,
  profileLoaded: false,
  saving: false,
  saveError: null,

  hydrate: () => {
    if (get().hydrated) return;

    // 캐시 먼저 적용. 빈 모형 방지
    const answered =
      typeof window !== 'undefined' && localStorage.getItem(DONE_KEY) === 'true';
    set({ missing: read(), hydrated: true, answered });

    void userApi
      .getToothProfile()
      .then((res) => {
        const profile = res.data.result;
        if (!profile) return;
        const missing = normalizeMissing(profile.missingTeeth ?? []);
        write(missing, profile.isSet);
        set({ missing, answered: profile.isSet });
      })
      .catch(() => {})
      .finally(() => set({ profileLoaded: true }));
  },

  toggle: (tooth) => set({ missing: toggleTooth(get().missing, tooth), saveError: null }),

  setPreset: (group, on) =>
    set({ missing: setGroup(get().missing, group, on), saveError: null }),

  save: async () => {
    const missing = get().missing;
    set({ saving: true, saveError: null });
    try {
      await userApi.updateToothProfile(missing);
      write(missing, true);
      set({ answered: true, saving: false });
      return true;
    } catch {
      set({ saving: false, saveError: '저장하지 못했어요. 잠시 후 다시 시도해 주세요.' });
      return false;
    }
  },

  reset: () => set({ missing: [], saveError: null }),

  // 빼면 다음 로그인에서 hydrate 건너뜀
  clear: () =>
    set({
      missing: [],
      hydrated: false,
      answered: false,
      profileLoaded: false,
      saving: false,
      saveError: null,
    }),
}));
