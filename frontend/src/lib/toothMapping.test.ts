import { describe, expect, it } from 'vitest';
import { countMissingConflicts, excludeMissingTeeth } from './toothMapping';

const rows = (...teeth: number[]) => teeth.map((toothNumber) => ({ toothNumber }));

describe('excludeMissingTeeth', () => {
  it('결손치가 없으면 그대로', () => {
    const input = rows(11, 14, 28, 48);
    expect(excludeMissingTeeth(input, [])).toBe(input);
  });

  it('결손치 번호로 온 행만 제외', () => {
    expect(excludeMissingTeeth(rows(13, 14, 15), [14])).toEqual(rows(13, 15));
  });

  it('다른 번호는 밀지 않음', () => {
    expect(excludeMissingTeeth(rows(15, 16, 17, 18), [14])).toEqual(rows(15, 16, 17, 18));
  });

  it('여러 결손치 동시 제외', () => {
    expect(excludeMissingTeeth(rows(14, 24, 34, 44, 11), [14, 24, 34, 44])).toEqual(rows(11));
  });

  it('행의 다른 필드 유지', () => {
    const input = [{ toothNumber: 16, riskLevel: 'HIGH' }];
    expect(excludeMissingTeeth(input, [14])).toEqual(input);
  });
});

describe('countMissingConflicts', () => {
  it('제외된 행 수', () => {
    expect(countMissingConflicts(rows(13, 14, 15), [14])).toBe(1);
    expect(countMissingConflicts(rows(13, 15), [14])).toBe(0);
  });
});
