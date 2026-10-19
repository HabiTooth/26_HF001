'use client';

import type { ListItemProps } from './ListItem.types';

export type { ListItemProps } from './ListItem.types';

export default function ListItem({ left, title, subtitle, right, onClick }: ListItemProps) {
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="bg-white/90 backdrop-blur-sm rounded-[14px] shadow-card px-4 py-3.5 flex items-center gap-3 w-full text-left cursor-pointer border-none"
      >
        {left && <div className="flex-shrink-0">{left}</div>}
        <div className="flex-1 min-w-0">
          <p className="m-0 text-[13px] font-medium text-content truncate">{title}</p>
          {subtitle && <div className="flex items-center gap-1.5 mt-0.5">{subtitle}</div>}
        </div>
        {right && <div className="flex-shrink-0">{right}</div>}
      </button>
    );
  }

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-[14px] shadow-card px-4 py-3.5 flex items-center gap-3">
      {left && <div className="flex-shrink-0">{left}</div>}
      <div className="flex-1 min-w-0">
        <p className="m-0 text-[13px] font-medium text-content truncate">{title}</p>
        {subtitle && <div className="flex items-center gap-1.5 mt-0.5">{subtitle}</div>}
      </div>
      {right && <div className="flex-shrink-0">{right}</div>}
    </div>
  );
}
