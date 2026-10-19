'use client';

import { create } from 'zustand';
import type { AppNotification } from '@/lib/notifications/types';
import { showLocal } from '@/lib/notifications/browser';
import { notificationApi } from '@/lib/api/notification';

// 이미 띄운 브라우저 알림. 중복 방지용
const POPPED_KEY = 'habitooth.notifications.popped';
const MAX_POPPED = 300;

function readPopped(): number[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(POPPED_KEY);
    return raw ? (JSON.parse(raw) as number[]) : [];
  } catch {
    return [];
  }
}

function writePopped(ids: number[]) {
  try {
    localStorage.setItem(POPPED_KEY, JSON.stringify(ids.slice(0, MAX_POPPED)));
  } catch {
  }
}

interface NotificationState {
  items: AppNotification[];
  hydrated: boolean;
  loading: boolean;
  hydrate: () => void;
  refresh: (options?: { popNew?: boolean }) => Promise<void>;
  markRead: (id: number) => void;
  markAllRead: () => void;
  remove: (id: number) => void;
  clearAll: () => void;
  clear: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  items: [],
  hydrated: false,
  loading: false,

  hydrate: () => {
    if (get().hydrated) return;
    set({ hydrated: true });
    void get().refresh();
  },

  refresh: async ({ popNew = false } = {}) => {
    set({ loading: true });
    try {
      const items = (await notificationApi.getAll()).data.result ?? [];
      set({ items, hydrated: true });

      if (!popNew) return;
      const popped = readPopped();
      const fresh = items.filter((n) => !n.read && !popped.includes(n.id));
      if (fresh.length === 0) return;
      fresh.forEach(showLocal);
      writePopped([...fresh.map((n) => n.id), ...popped]);
    } catch {
      // 실패 시 화면 유지
    } finally {
      set({ loading: false });
    }
  },

  markRead: (id) => {
    set({ items: get().items.map((n) => (n.id === id ? { ...n, read: true } : n)) });
    notificationApi.markRead(id).catch(() => get().refresh());
  },

  markAllRead: () => {
    set({ items: get().items.map((n) => ({ ...n, read: true })) });
    notificationApi.markAllRead().catch(() => get().refresh());
  },

  remove: (id) => {
    set({ items: get().items.filter((n) => n.id !== id) });
    notificationApi.remove(id).catch(() => get().refresh());
  },

  clearAll: () => {
    set({ items: [] });
    notificationApi.removeAll().catch(() => get().refresh());
  },

  clear: () => set({ items: [], hydrated: false, loading: false }),
}));

export const unreadCount = (items: AppNotification[]) => items.filter((n) => !n.read).length;
