import type { ReactNode } from 'react';

export default function GuideItem({ icon, text, sub }: { icon: ReactNode; text: string; sub: string }) {
  return (
    <div className="flex items-start gap-3.5">
      <div className="w-9 h-9 rounded-[12px] bg-primary-light flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="pt-0.5">
        <p className="m-0 text-[13px] font-semibold text-content">{text}</p>
        <p className="m-0 text-[12px] text-muted mt-0.5">{sub}</p>
      </div>
    </div>
  );
}
