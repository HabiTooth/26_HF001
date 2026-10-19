'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  BellOff,
  CalendarCheck,
  FileText,
  Flame,
  ScanLine,
  Trash2,
  TriangleAlert,
} from 'lucide-react';
import NavBar from '@/components/organisms/NavBar';
import PageShell from '@/components/organisms/PageShell';
import { useNotificationStore } from '@/stores/notificationStore';
import {
  permissionState,
  requestPermission,
  type PermissionState,
} from '@/lib/notifications/browser';
import type { NotificationType } from '@/lib/notifications/types';
import PageHeader from '@/components/molecules/PageHeader';

const ICON: Record<NotificationType, React.ElementType> = {
  REPORT_READY: FileText,
  SCAN_REMINDER: ScanLine,
  RISK_ALERT: TriangleAlert,
  STREAK: Flame,
  CHECKUP: CalendarCheck,
};

const ICON_TONE: Record<NotificationType, string> = {
  REPORT_READY: 'bg-primary-light text-primary',
  SCAN_REMINDER: 'bg-primary-light text-primary',
  RISK_ALERT: 'bg-danger/15 text-danger',
  STREAK: 'bg-warning/20 text-[#B87F00]',
  CHECKUP: 'bg-success/15 text-success',
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return '방금';
  if (min < 60) return `${min}분 전`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}시간 전`;
  const day = Math.floor(hour / 24);
  if (day < 7) return `${day}일 전`;
  return iso.slice(0, 10).replace(/-/g, '.');
}

export default function NotificationsPage() {
  const router = useRouter();
  const { items, hydrated, hydrate, markRead, markAllRead, remove, clearAll } =
    useNotificationStore();
  const [permission, setPermission] = useState<PermissionState>('default');

  useEffect(() => {
    hydrate();
    setPermission(permissionState());
  }, [hydrate]);

  const unread = items.filter((n) => !n.read).length;

  const open = (id: number, link?: string) => {
    markRead(id);
    if (link) router.push(link);
  };

  const askPermission = async () => setPermission(await requestPermission());

  return (
    <PageShell withNav>
      <PageHeader
        title="알림"
        right={
          <button
            type="button"
            onClick={markAllRead}
            disabled={unread === 0}
            className="text-xs text-primary disabled:text-muted disabled:opacity-50 px-2"
          >
            모두 읽음
          </button>
        }
      />

      <div className="px-5 pt-4">
        {permission === 'default' && (
          <div className="bg-white/90 backdrop-blur-sm rounded-[20px] shadow-card p-4 mb-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary-light flex items-center justify-center flex-shrink-0">
              <Bell size={18} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="m-0 text-[13px] font-semibold text-content">브라우저 알림 켜기</p>
              <p className="m-0 text-[11px] text-muted">앱을 열어두면 바로 알려드려요.</p>
            </div>
            <button
              type="button"
              onClick={askPermission}
              className="flex-shrink-0 px-3 py-1.5 rounded-full bg-primary-gradient text-white text-xs font-semibold"
            >
              켜기
            </button>
          </div>
        )}

        {permission === 'denied' && (
          <p className="m-0 mb-4 px-1 text-[11px] text-muted">
            브라우저에서 알림이 차단돼 있어요. 주소창 옆 자물쇠에서 허용으로 바꾸면 받을 수 있어요.
          </p>
        )}

        {hydrated && items.length === 0 && (
          <div className="bg-white/90 backdrop-blur-sm rounded-[20px] shadow-card p-10 flex flex-col items-center gap-2">
            <BellOff size={28} className="text-muted" />
            <p className="m-0 text-sm text-muted">아직 받은 알림이 없어요.</p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {items.map((n) => {
            const Icon = ICON[n.type];
            return (
              <div
                key={n.id}
                role="button"
                tabIndex={0}
                onClick={() => open(n.id, n.link)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && open(n.id, n.link)}
                className={`rounded-[18px] shadow-card p-4 flex items-start gap-3 cursor-pointer transition-transform active:scale-[0.99] backdrop-blur-sm bg-white/90 ${
                  n.read ? 'opacity-70' : ''
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${ICON_TONE[n.type]}`}
                >
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {!n.read && (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                    )}
                    <p
                      className={`m-0 text-[13px] truncate ${n.read ? 'text-muted font-medium' : 'text-content font-semibold'}`}
                    >
                      {n.title}
                    </p>
                  </div>
                  <p className="m-0 mt-0.5 text-[12px] text-muted leading-relaxed">{n.body}</p>
                  <p className="m-0 mt-1 text-[10px] text-muted">{relativeTime(n.createdAt)}</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(n.id);
                  }}
                  className="w-7 h-7 flex items-center justify-center rounded-full text-muted hover:bg-hairline transition-colors flex-shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>

        {items.length > 0 && (
          <button type="button" onClick={clearAll} className="w-full mt-4 py-3 text-xs text-muted">
            전체 삭제
          </button>
        )}
      </div>

      <NavBar activeTab="home" />
    </PageShell>
  );
}
