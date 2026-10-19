import { SCAN_ZONES } from '@/constants/scanZones';
import type { ViewType } from '@/lib/api/scan';
import type { SurfaceType } from '@/lib/api/report';

// 촬영 구역이 커버하는 치아. 목록에 있고 결과 없으면 깨끗, 목록에 없으면 미촬영
export function teethInZones(zones: ViewType[]): number[] {
  const covered = new Set<number>();
  for (const zone of zones) {
    const found = SCAN_ZONES.find((z) => z.viewType === zone);
    found?.teeth.forEach((tooth) => covered.add(tooth));
  }
  return [...covered].sort((a, b) => a - b);
}

const zoneSurface = (group: string): SurfaceType => (group === 'OUTER' ? 'OUTER' : 'INNER');

// 촬영한 구역의 치아만 남김. 사진에 같이 찍힌 옆 구역 치아는 제외. 촬영 구역 정보 없으면 그대로
export function keepCapturedTeeth<T extends { toothNumber: number }>(
  rows: T[],
  zones: ViewType[],
): T[] {
  if (zones.length === 0) return rows;
  const allowed = new Set(teethInZones(zones));
  return rows.filter((row) => allowed.has(row.toothNumber));
}

// 면까지 맞춰서 남김. 안쪽 구역만 찍었으면 바깥 면 검출은 제외
export function keepCapturedLesions<T extends { toothNumber: number; surfaceType: SurfaceType }>(
  lesions: T[],
  zones: ViewType[],
): T[] {
  if (zones.length === 0) return lesions;
  const allowed: Record<SurfaceType, Set<number>> = { INNER: new Set(), OUTER: new Set() };
  for (const zone of SCAN_ZONES) {
    if (!zones.includes(zone.viewType)) continue;
    zone.teeth.forEach((tooth) => allowed[zoneSurface(zone.group)].add(tooth));
  }
  return lesions.filter((lesion) => allowed[lesion.surfaceType].has(lesion.toothNumber));
}
