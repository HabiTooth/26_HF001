'use client';

import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

interface PageHeaderProps {
  title: ReactNode;
  onBack?: () => void;
  right?: ReactNode;
  className?: string;
  divider?: string;
}

export default function PageHeader({
  title,
  onBack,
  right,
  className = '',
  divider = 'border-hairline',
}: PageHeaderProps) {
  const router = useRouter();
  return (
    <div
      className={`flex items-center px-4 py-3 bg-white/90 backdrop-blur-sm border-b ${divider} ${className}`}
    >
      <button
        type="button"
        onClick={onBack ?? (() => router.back())}
        aria-label="뒤로 가기"
        className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-hairline transition-colors"
      >
        <ChevronLeft size={20} className="text-content" />
      </button>
      <span className="flex-1 text-center text-[15px] font-semibold text-content truncate px-2">
        {title}
      </span>
      {right ?? <div className="w-9" />}
    </div>
  );
}
