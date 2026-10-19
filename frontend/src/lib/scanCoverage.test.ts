import { describe, expect, it } from 'vitest';
import { keepCapturedLesions, keepCapturedTeeth } from './scanCoverage';

describe('촬영 구역 밖 치아 제외', () => {
  it('찍은 구역 치아만 남김', () => {
    const rows = [11, 12, 13, 21, 22, 23].map((toothNumber) => ({ toothNumber }));
    expect(keepCapturedTeeth(rows, ['UPPER_FRONT']).map((r) => r.toothNumber)).toEqual([
      11, 12, 21, 22,
    ]);
  });

  it('촬영 구역 정보 없으면 그대로', () => {
    const rows = [{ toothNumber: 13 }];
    expect(keepCapturedTeeth(rows, [])).toBe(rows);
  });

  it('검출은 면까지 맞춰서 남김', () => {
    const lesions = [
      { toothNumber: 11, surfaceType: 'INNER' as const },
      { toothNumber: 11, surfaceType: 'OUTER' as const },
      { toothNumber: 13, surfaceType: 'INNER' as const },
    ];
    expect(keepCapturedLesions(lesions, ['UPPER_FRONT'])).toEqual([lesions[0]]);
    expect(keepCapturedLesions(lesions, ['OUTER_CENTER'])).toEqual([lesions[1]]);
  });
});
