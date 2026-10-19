'use client';

import { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';

// 아래로 내려가면 뜨는 맨 위로 버튼. 탭바 위, 앱 프레임 안쪽 오른쪽
export default function ScrollTopButton({
  label,
  icon: Icon,
  showAfter = 480,
}: {
  label: string;
  icon: LucideIcon;
  showAfter?: number;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > showAfter);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [showAfter]);

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label={label}
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      className={`fixed bottom-[calc(72px+env(safe-area-inset-bottom))] right-[max(16px,calc((100vw/var(--app-zoom)-480px)/2+16px))] z-40 flex h-10 items-center gap-1.5 rounded-full bg-[#173A73]/85 pl-3 pr-4 text-[12px] font-bold text-white shadow-[0_6px_18px_rgba(23,58,115,0.3)] backdrop-blur-md transition-all duration-200 ${visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'}`}
    >
      <Icon size={15} />
      {label}
    </button>
  );
}
