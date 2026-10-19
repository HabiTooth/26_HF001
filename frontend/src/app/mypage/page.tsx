'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { userApi, type NotificationSetting, type Profile } from '@/lib/api/user';
import type { DeviceStatusResponse } from '@/lib/api/device';
import {
  User, ChevronLeft, ChevronRight, Bell, Shield, FileText,
  Smartphone, Clock, LogOut, UserX, Lock, Smile,
} from 'lucide-react';
import NavBar from '@/components/organisms/NavBar';
import { useDentitionStore } from '@/stores/dentitionStore';
import { missingSummary } from '@/lib/dentition';

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${on ? 'bg-[#4B7BF5]' : 'bg-hairline'}`}
    >
      <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${on ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
    </button>
  );
}


function MenuItem({
  icon, label, right, onClick,
}: {
  icon: React.ReactNode;
  label: React.ReactNode;
  right?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3.5 transition-colors ${onClick ? 'cursor-pointer active:bg-black/[0.03]' : ''}`}
    >
      <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0 text-[13px]">{label}</div>
      {right === undefined ? <ChevronRight size={16} className="text-muted flex-shrink-0" /> : right}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="m-0 mb-2 px-1 text-[11px] font-bold text-muted uppercase tracking-widest">{title}</p>
      <div className="bg-white/90 backdrop-blur-sm rounded-[20px] shadow-card overflow-hidden divide-y divide-hairline">
        {children}
      </div>
    </div>
  );
}


export default function MyPage() {
  const router = useRouter();
  const { email, logout } = useAuthStore();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [notification, setNotification] = useState<NotificationSetting | null>(null);
  const [device, setDevice] = useState<DeviceStatusResponse | null>(null);
  const { missing, hydrate: hydrateDentition } = useDentitionStore();

  useEffect(() => {
    hydrateDentition();
    userApi.getProfile().then((res) => setProfile(res.data.result)).catch(() => {});
    userApi.getNotification().then((res) => setNotification(res.data.result)).catch(() => {});
    userApi.getDeviceStatus().then((res) => {
      const list = res.data.result;
      if (list.length > 0) setDevice(list[0]);
    }).catch(() => {});
  }, [hydrateDentition]);

  const toggleNotification = (key: keyof NotificationSetting) => {
    if (!notification) return;
    const next = { ...notification, [key]: !notification[key] };
    setNotification(next);
    userApi.updateNotification(next).catch(() => setNotification(notification));
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div
      className="app-frame max-w-app min-h-[calc(100svh/var(--app-zoom))] mx-auto px-5 pt-14 pb-[104px] flex flex-col relative"
      style={{ backgroundColor: '#EEF2FF' }}
    >
      <div className="aurora-blob-1" />
      <div className="aurora-blob-2" />
      <div className="aurora-blob-3" />

      <div className="flex items-center mb-6 relative z-10">
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/60 transition-colors bg-transparent border-none cursor-pointer"
        >
          <ChevronLeft size={22} className="text-content" />
        </button>
        <h1 className="absolute left-1/2 -translate-x-1/2 m-0 text-[18px] font-bold text-content">마이페이지</h1>
      </div>

      <div className="bg-white/90 backdrop-blur-sm rounded-[20px] shadow-card p-5 mb-6 relative z-10 flex items-center gap-4">
        <div className="w-[64px] h-[64px] rounded-full bg-primary-light flex items-center justify-center flex-shrink-0">
          <User size={32} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="m-0 text-[16px] font-bold text-content">{profile?.name ?? email?.split('@')[0] ?? '사용자'}</p>
          <p className="m-0 mt-0.5 text-[14px] text-muted truncate">{profile?.email ?? email ?? ''}</p>
        </div>
        <button
          type="button"
          onClick={() => router.push('/mypage/profile')}
          className="px-3 h-8 rounded-[10px] border border-hairline text-[12px] font-semibold text-content bg-transparent cursor-pointer flex-shrink-0 hover:bg-hairline transition-colors"
        >
          프로필 편집
        </button>
      </div>

      <div className="relative z-10">
        <Section title="계정 관리">
          <MenuItem
            icon={<Lock size={15} className="text-primary" />}
            label="비밀번호 변경"
            onClick={() => router.push('/mypage/password')}
          />
          <MenuItem
            icon={<Smartphone size={15} className="text-primary" />}
            label={
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-content">디바이스 관리</span>
                  <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${device?.connected ? 'bg-success/15 text-success' : 'bg-hairline text-muted'}`}>
                    {device ? (device.connected ? '연결됨' : '등록됨') : '미등록'}
                  </span>
                </div>
                {device && (
                  <>
                    <p className="m-0 mt-0.5 text-[11px] text-muted">
                      {device.serialNumber} · {device.modelName}
                    </p>
                    <p className="m-0 text-[11px] text-muted flex items-center gap-1">
                      <Clock size={10} />
                      {device.lastConnectedAt?.slice(0, 16).replace('T', ' ') ?? '연결 기록 없음'}
                    </p>
                  </>
                )}
              </div>
            }
            onClick={() => router.push('/mypage/device')}
          />
          <MenuItem
            icon={<Clock size={15} className="text-primary" />}
            label="기록 이력 관리"
            onClick={() => router.push('/mypage/history')}
          />
          <MenuItem
            icon={<Smile size={15} className="text-primary" />}
            label={
              <div>
                <p className="m-0 font-medium text-content">치아 정보</p>
                <p className="m-0 text-[11px] text-muted">{missingSummary(missing)}</p>
              </div>
            }
            onClick={() => router.push('/mypage/teeth')}
          />
        </Section>

        <Section title="알림 설정">
          <MenuItem
            icon={<Bell size={15} className="text-primary" />}
            label="푸시 알림"
            right={
              <Toggle
                on={notification?.pushNotificationEnabled ?? false}
                onToggle={() => toggleNotification('pushNotificationEnabled')}
              />
            }
          />
          <MenuItem
            icon={<Bell size={15} className="text-primary" />}
            label="분석 리포트 알림"
            right={
              <Toggle
                on={notification?.reportNotificationEnabled ?? false}
                onToggle={() => toggleNotification('reportNotificationEnabled')}
              />
            }
          />
        </Section>

        <Section title="기타">
          <MenuItem
            icon={<FileText size={15} className="text-primary" />}
            label="이용약관"
            onClick={() => router.push('/terms')}
          />
          <MenuItem
            icon={<Shield size={15} className="text-primary" />}
            label="개인정보 처리방침"
            onClick={() => router.push('/privacy')}
          />
          <MenuItem
            icon={<LogOut size={15} className="text-danger" />}
            label={<span className="text-danger font-semibold">로그아웃</span>}
            right={null}
            onClick={handleLogout}
          />
          <MenuItem
            icon={<UserX size={15} className="text-danger" />}
            label={
              <div>
                <p className="m-0 text-danger font-semibold">회원 탈퇴</p>
                <p className="m-0 text-[11px] text-muted">스캔 기록을 전부 지워요</p>
              </div>
            }
            right={null}
            onClick={() => router.push('/mypage/withdraw')}
          />
        </Section>
        </div>
      <NavBar activeTab="mypage" />
    </div>
  );
}
