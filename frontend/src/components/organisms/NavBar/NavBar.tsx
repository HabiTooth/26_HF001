'use client';

import { Home, ScanLine, CalendarDays, User } from 'lucide-react';
import Link from 'next/link';
import type { NavBarProps } from './NavBar.types';

export default function NavBar({ activeTab = 'home' }: NavBarProps) {
  const tabs = [
    { id: 'home', label: '홈', icon: Home, href: '/dashboard' },
    { id: 'scan', label: '스캔', icon: ScanLine, href: '/scan' },
    { id: 'history', label: '기록', icon: CalendarDays, href: '/streak' },
    { id: 'mypage', label: '마이페이지', icon: User, href: '/mypage' },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-app bg-white/95 backdrop-blur-sm border-t border-hairline flex items-stretch h-14 box-content pb-[env(safe-area-inset-bottom)] z-50">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium whitespace-nowrap no-underline ${
              isActive ? 'text-primary' : 'text-muted'
            }`}
          >
            <Icon size={20} strokeWidth={isActive ? 2.4 : 1.8} />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}