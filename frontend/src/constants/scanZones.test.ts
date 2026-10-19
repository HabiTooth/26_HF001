import { describe, expect, it } from 'vitest';
import {
  ALL_VIEW_TYPES,
  SCAN_ZONES,
  TOOTH_TO_BUCCAL_ZONE,
  TOOTH_TO_LINGUAL_ZONE,
  ZONE_GROUP_ORDER,
  estimateMinutes,
  toothToZone,
  zonesOfGroup,
} from './scanZones';

/** FDI 영구치 32개 */
const ALL_FDI = [1, 2, 3, 4].flatMap((q) => [1, 2, 3, 4, 5, 6, 7, 8].map((n) => q * 10 + n));

describe('구역 정의', () => {
  it('13구역이다', () => {
    expect(SCAN_ZONES).toHaveLength(13);
    expect(ALL_VIEW_TYPES).toHaveLength(13);
  });

  it('설측 10구역, 협측 3구역으로 나뉜다', () => {
    expect(zonesOfGroup('UPPER')).toHaveLength(5);
    expect(zonesOfGroup('LOWER')).toHaveLength(5);
    expect(zonesOfGroup('OUTER')).toHaveLength(3);
  });

  it('viewType이 중복되지 않는다', () => {
    expect(new Set(ALL_VIEW_TYPES).size).toBe(SCAN_ZONES.length);
  });

  it('모든 구역이 그룹 순서에 포함된다', () => {
    for (const zone of SCAN_ZONES) {
      expect(ZONE_GROUP_ORDER).toContain(zone.group);
    }
  });

  it('빈 구역이 없다', () => {
    for (const zone of SCAN_ZONES) {
      expect(zone.teeth.length).toBeGreaterThan(0);
      expect(zone.label).not.toBe('');
      expect(zone.fullLabel).not.toBe('');
    }
  });
});

describe('치식 매핑', () => {
  it('설측이 영구치 32개를 빠짐없이 덮는다', () => {
    const covered = zonesOfGroup('UPPER')
      .concat(zonesOfGroup('LOWER'))
      .flatMap((z) => z.teeth);
    expect([...new Set(covered)].sort((a, b) => a - b)).toEqual(ALL_FDI.sort((a, b) => a - b));
  });

  it('협측도 영구치 32개를 빠짐없이 덮는다', () => {
    const covered = zonesOfGroup('OUTER').flatMap((z) => z.teeth);
    expect([...new Set(covered)].sort((a, b) => a - b)).toEqual(ALL_FDI.sort((a, b) => a - b));
  });

  it('같은 면 안에서 한 치아가 두 구역에 들어가지 않는다', () => {
    for (const group of [zonesOfGroup('UPPER').concat(zonesOfGroup('LOWER')), zonesOfGroup('OUTER')]) {
      const all = group.flatMap((z) => z.teeth);
      expect(all).toHaveLength(new Set(all).size);
    }
  });

  it('사랑니가 빠지지 않았다', () => {
    for (const wisdom of [18, 28, 38, 48]) {
      expect(toothToZone(wisdom, 'LINGUAL')).not.toBeNull();
      expect(toothToZone(wisdom, 'BUCCAL')).not.toBeNull();
    }
  });

  it('상악 치아는 상악 구역, 하악 치아는 하악 구역에 들어간다', () => {
    for (const tooth of ALL_FDI) {
      const zone = toothToZone(tooth, 'LINGUAL');
      const isUpper = tooth < 30;
      expect(zone?.startsWith(isUpper ? 'UPPER' : 'LOWER')).toBe(true);
    }
  });

  it('좌우가 촬영자 기준으로 맞다 (1, 4사분면이 우측)', () => {
    expect(toothToZone(16, 'LINGUAL')).toBe('UPPER_RIGHT_MOLAR');
    expect(toothToZone(26, 'LINGUAL')).toBe('UPPER_LEFT_MOLAR');
    expect(toothToZone(46, 'LINGUAL')).toBe('LOWER_RIGHT_MOLAR');
    expect(toothToZone(36, 'LINGUAL')).toBe('LOWER_LEFT_MOLAR');
  });

  it('협측 앞니 구역은 위아래 앞니 각각 4개만 포함한다', () => {
    expect(SCAN_ZONES.find((zone) => zone.viewType === 'OUTER_CENTER')?.teeth)
      .toEqual([12, 11, 21, 22, 42, 41, 31, 32]);
    for (const tooth of [13, 43]) {
      expect(toothToZone(tooth, 'BUCCAL')).toBe('OUTER_RIGHT');
    }
    for (const tooth of [23, 33]) {
      expect(toothToZone(tooth, 'BUCCAL')).toBe('OUTER_LEFT');
    }
  });

  it('없는 치아 번호는 null을 준다', () => {
    expect(toothToZone(99, 'LINGUAL')).toBeNull();
    expect(toothToZone(0, 'BUCCAL')).toBeNull();
  });

  it('Map 크기가 32개다', () => {
    expect(TOOTH_TO_LINGUAL_ZONE.size).toBe(32);
    expect(TOOTH_TO_BUCCAL_ZONE.size).toBe(32);
  });
});

describe('예상 소요 시간', () => {
  it('구역이 없어도 최소 1분', () => {
    expect(estimateMinutes(0)).toBe(1);
  });

  it('구역 수에 따라 늘어난다', () => {
    expect(estimateMinutes(3)).toBe(1);
    expect(estimateMinutes(13)).toBe(5);
  });

  it('구역이 늘면 시간이 줄지 않는다', () => {
    for (let n = 1; n <= 13; n++) {
      expect(estimateMinutes(n)).toBeGreaterThanOrEqual(estimateMinutes(n - 1));
    }
  });
});
