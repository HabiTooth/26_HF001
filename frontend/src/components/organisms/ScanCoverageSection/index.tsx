'use client';

import { Check, X } from 'lucide-react';
import { GROUP_HINTS, GROUP_LABELS, ZONE_GROUP_ORDER, zonesOfGroup } from '@/constants/scanZones';
import type { ViewType } from '@/lib/api/scan';

export default function ScanCoverageSection({ captured }: { captured: ViewType[] }) {
  const shot = new Set(captured);

  return (
    <div>
      <p className="m-0 mb-3 text-[11px] text-muted">
        안 찍은 구역은 위 모형에서 회색으로 보여요.
      </p>

      <div className="flex flex-col gap-3">
        {ZONE_GROUP_ORDER.map((group) => {
          const zones = zonesOfGroup(group);
          const picked = zones.filter((z) => shot.has(z.viewType));
          const on = picked.length;
          const teethOn = picked.reduce((sum, z) => sum + z.teeth.length, 0);
          const teethAll = zones.reduce((sum, z) => sum + z.teeth.length, 0);

          return (
            <div key={group}>
              <div className="flex items-baseline gap-1.5 mb-1.5">
                <span className="text-[12px] font-bold text-content">{GROUP_LABELS[group]}</span>
                <span className="text-[11px] font-semibold text-muted tabular-nums">
                  {on}/{zones.length}구역 · 치아 {teethOn}/{teethAll}
                </span>
                <span className="text-[10px] text-muted truncate">{GROUP_HINTS[group]}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {zones.map(({ viewType, label, teeth }) => {
                  const done = shot.has(viewType);
                  return (
                    <span
                      key={viewType}
                      title={`FDI ${teeth.join(', ')}`}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium border ${
                        done
                          ? 'bg-primary-light text-primary border-primary/25'
                          : 'bg-transparent text-muted/70 border-hairline border-dashed'
                      }`}
                    >
                      {done ? <Check size={10} strokeWidth={3} /> : <X size={10} strokeWidth={3} />}
                      <span className={done ? '' : 'line-through'}>{label}</span>
                      <span className={`tabular-nums ${done ? 'opacity-70' : 'opacity-60'}`}>
                        {teeth.length}개
                      </span>
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
