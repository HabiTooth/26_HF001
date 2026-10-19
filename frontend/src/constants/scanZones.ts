import type { ViewType } from '@/lib/api/scan';

export type ZoneGroup = 'UPPER' | 'LOWER' | 'OUTER';

export interface ScanZone {
  viewType: ViewType;
  label: string;
  fullLabel: string;
  group: ZoneGroup;
  teeth: number[];
}

// 좌/우는 촬영자 기준
export const SCAN_ZONES: ScanZone[] = [
  { viewType: 'UPPER_RIGHT_MOLAR',    label: '오른쪽 어금니',     fullLabel: '윗니 오른쪽 어금니',   group: 'UPPER', teeth: [18, 17, 16] },
  { viewType: 'UPPER_RIGHT_PREMOLAR', label: '오른쪽 송곳니 쪽', fullLabel: '윗니 오른쪽 송곳니 쪽', group: 'UPPER', teeth: [15, 14, 13] },
  { viewType: 'UPPER_FRONT',          label: '앞니',            fullLabel: '윗니 앞니',            group: 'UPPER', teeth: [12, 11, 21, 22] },
  { viewType: 'UPPER_LEFT_PREMOLAR',  label: '왼쪽 송곳니 쪽', fullLabel: '윗니 왼쪽 송곳니 쪽', group: 'UPPER', teeth: [23, 24, 25] },
  { viewType: 'UPPER_LEFT_MOLAR',     label: '왼쪽 어금니',     fullLabel: '윗니 왼쪽 어금니',     group: 'UPPER', teeth: [26, 27, 28] },

  { viewType: 'LOWER_RIGHT_MOLAR',    label: '오른쪽 어금니',     fullLabel: '아랫니 오른쪽 어금니',   group: 'LOWER', teeth: [48, 47, 46] },
  { viewType: 'LOWER_RIGHT_PREMOLAR', label: '오른쪽 송곳니 쪽', fullLabel: '아랫니 오른쪽 송곳니 쪽', group: 'LOWER', teeth: [45, 44, 43] },
  { viewType: 'LOWER_FRONT',          label: '앞니',            fullLabel: '아랫니 앞니',            group: 'LOWER', teeth: [42, 41, 31, 32] },
  { viewType: 'LOWER_LEFT_PREMOLAR',  label: '왼쪽 송곳니 쪽', fullLabel: '아랫니 왼쪽 송곳니 쪽', group: 'LOWER', teeth: [33, 34, 35] },
  { viewType: 'LOWER_LEFT_MOLAR',     label: '왼쪽 어금니',     fullLabel: '아랫니 왼쪽 어금니',     group: 'LOWER', teeth: [36, 37, 38] },

  { viewType: 'OUTER_RIGHT',  label: '오른쪽 볼 쪽', fullLabel: '오른쪽 볼 쪽', group: 'OUTER', teeth: [18, 17, 16, 15, 14, 13, 48, 47, 46, 45, 44, 43] },
  { viewType: 'OUTER_CENTER', label: '앞니 입술 쪽', fullLabel: '앞니 입술 쪽', group: 'OUTER', teeth: [12, 11, 21, 22, 42, 41, 31, 32] },
  { viewType: 'OUTER_LEFT',   label: '왼쪽 볼 쪽', fullLabel: '왼쪽 볼 쪽', group: 'OUTER', teeth: [23, 24, 25, 26, 27, 28, 33, 34, 35, 36, 37, 38] },
];

export const zonesOfGroup = (group: ZoneGroup) =>
  SCAN_ZONES.filter((z) => z.group === group);

export const GROUP_LABELS: Record<ZoneGroup, string> = {
  UPPER: '윗니 안쪽',
  LOWER: '아랫니 안쪽',
  OUTER: '치아 바깥쪽',
};

export const GROUP_HINTS: Record<ZoneGroup, string> = {
  UPPER: '혀가 닿는 면이에요',
  LOWER: '혀가 닿는 면이에요',
  OUTER: '입술과 볼에 닿는 면이에요',
};

export const TOOTH_TO_LINGUAL_ZONE = new Map<number, ViewType>(
  SCAN_ZONES.filter((z) => z.group !== 'OUTER').flatMap((z) =>
    z.teeth.map((t) => [t, z.viewType] as const),
  ),
);

export const TOOTH_TO_BUCCAL_ZONE = new Map<number, ViewType>(
  SCAN_ZONES.filter((z) => z.group === 'OUTER').flatMap((z) =>
    z.teeth.map((t) => [t, z.viewType] as const),
  ),
);

export const toothToZone = (tooth: number, surface: 'LINGUAL' | 'BUCCAL') =>
  (surface === 'LINGUAL' ? TOOTH_TO_LINGUAL_ZONE : TOOTH_TO_BUCCAL_ZONE).get(tooth) ?? null;

export const ALL_VIEW_TYPES: ViewType[] = SCAN_ZONES.map((z) => z.viewType);

export const ZONE_GROUP_ORDER: ZoneGroup[] = ['UPPER', 'LOWER', 'OUTER'];

export const estimateMinutes = (zoneCount: number) => Math.max(1, Math.ceil((zoneCount * 20) / 60));
