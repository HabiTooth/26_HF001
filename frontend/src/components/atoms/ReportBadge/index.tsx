import type { ReactNode } from 'react';

export default function ReportBadge({
  children,
  variant = 'default',
}: {
  children: ReactNode;
  variant?: 'default' | 'coverage' | 'action';
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[12px] font-semibold leading-normal ring-1 ring-inset ${variant === 'coverage' ? 'bg-[#E3EBF7] text-[#526B91] ring-[#D3DFF0]' : variant === 'action' ? 'bg-[#E9EFF8] text-[#506A90] ring-transparent' : 'bg-[#EDF3FB] text-[#55769D] ring-[#E0E9F5]'}`}
    >
      {children}
    </span>
  );
}
