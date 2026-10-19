'use client';

import type { CareGuideCardProps } from './CareGuideCard.types';

export default function CareGuideCard({ icon, title, description }: CareGuideCardProps) {
  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-[20px] shadow-card p-4 flex items-center text-left gap-3">
      <div className="w-10 h-10 bg-[#F0F4FF] rounded-xl flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-800">{title}</p>
        <p className="text-xs text-gray-400 mt-1 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}