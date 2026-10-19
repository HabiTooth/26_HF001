'use client';

import { SCAN_STATUS } from '@/constants/scanStatus';
import type { ScanStatusBannerProps } from './ScanStatusBanner.types';

export type { ScanStatusBannerProps, ScanStatusType } from './ScanStatusBanner.types';

export default function ScanStatusBanner({ status }: ScanStatusBannerProps) {
  const { bg, border, textColor, Icon, label, sub } = SCAN_STATUS[status];
  return (
    <div key={status} className={`animate-fade-banner flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl border ${bg} ${border}`}>
      <div className="flex items-center gap-1.5">
        <Icon size={15} className={textColor} />
        <span className={`text-[13px] font-semibold ${textColor}`}>{label}</span>
      </div>
      <span className="text-[11px] text-muted">{sub}</span>
    </div>
  );
}
