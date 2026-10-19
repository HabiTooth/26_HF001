'use client';

import CareGuideCard from '@/components/molecules/CareGuideCard';
import type { CareGuideSectionProps } from './CareGuideSection.types';

export default function CareGuideSection({ items }: CareGuideSectionProps) {
  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-[20px] shadow-card p-5 mt-4">
      <h2 className="text-sm font-semibold text-gray-800 mb-4">맞춤 관리 추천</h2>
      <div className="flex flex-col gap-3">
        {items.map((item, index) => (
          <CareGuideCard key={index} {...item} />
        ))}
      </div>
    </div>
  );
}