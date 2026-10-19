'use client';

import { create } from 'zustand';
import { authApi } from '@/lib/api/auth';
import { readToken, readEmail, writeAuth, clearStoredAuth } from '@/lib/tokenStorage';
import { clearAppData } from '@/lib/localData';
import { useDentitionStore } from './dentitionStore';
import { useNotificationStore } from './notificationStore';
import { useHabitStore } from './habitStore';

function decodeEmail(token: string): string | null {
  try {
    return (JSON.parse(atob(token.split('.')[1])) as { sub?: string }).sub ?? null;
  } catch {
    return null;
  }
}

interface AuthState {
  token: string | null;
  email: string | null;
  deviceId: number | null;
  deviceIp: string | null;
  setToken: (token: string, remember?: boolean) => void;
  setDevice: (deviceId: number, deviceIp: string | null) => void;
  clearDevice: () => void;
  clearAuth: () => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: readToken(),
  email: readEmail(),
  deviceId: typeof window !== 'undefined' ? Number(localStorage.getItem('deviceId')) || null : null,
  deviceIp: typeof window !== 'undefined' ? localStorage.getItem('deviceIp') : null,
  setToken: (token, remember = false) => {
    const email = decodeEmail(token);
    writeAuth(token, email, remember);
    set({ token, email });
  },
  setDevice: (deviceId, deviceIp) => {
    localStorage.setItem('deviceId', String(deviceId));
    if (deviceIp) localStorage.setItem('deviceIp', deviceIp);
    set({ deviceId, deviceIp: deviceIp ?? get().deviceIp });
  },
  clearDevice: () => {
    localStorage.removeItem('deviceId');
    localStorage.removeItem('deviceIp');
    set({ deviceId: null, deviceIp: null });
  },
  clearAuth: () => {
    clearStoredAuth();
    clearAppData();
    localStorage.removeItem('deviceId');
    localStorage.removeItem('deviceIp');
    useDentitionStore.getState().clear();
    useNotificationStore.getState().clear();
    useHabitStore.getState().clear();
    set({ token: null, email: null, deviceId: null, deviceIp: null });
  },
  logout: async () => {
    try {
      await authApi.logout();
    } finally {
      get().clearAuth();
    }
  },
}));
