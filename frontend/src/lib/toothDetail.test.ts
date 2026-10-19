import { describe, expect, it } from 'vitest';
import { buildToothDetail, focusOrder, type LesionRow } from './toothDetail';
import { countToothStates } from './lesionState';

const rows: LesionRow[] = [
  { toothNumber: 11, lesionType: 'CALCULUS', areaRatio: 1, riskLevel: 'VERY_LOW' },
  { toothNumber: 16, lesionType: 'PLAQUE', areaRatio: 12, riskLevel: 'MEDIUM' },
  { toothNumber: 26, lesionType: 'CALCULUS', areaRatio: 9, riskLevel: 'HIGH' },
  { toothNumber: 26, lesionType: 'PLAQUE', areaRatio: 30, riskLevel: 'HIGH' },
  { toothNumber: 31, lesionType: null, areaRatio: 0, riskLevel: 'VERY_LOW' },
];

describe('focusOrder', () => {
  it('skips clean-range rows and puts calculus before plaque at the same risk', () => {
    expect(focusOrder(rows)).toEqual(['26', '16']);
  });
});

describe('buildToothDetail', () => {
  it('treats a clean-range area as a note, not a lesion', () => {
    const detail = buildToothDetail({ fdi: '11', rows, previousRows: [], scanned: true });
    expect(detail.state).toBe('clean');
    expect(detail.primary).toBeNull();
    expect(detail.minor).toEqual([{ lesionType: 'CALCULUS', areaRatio: 1, riskLevel: 'VERY_LOW' }]);
    expect(detail.cta).toBeNull();
  });

  it('prefers calculus as the primary lesion and compares with the previous scan', () => {
    const previous: LesionRow[] = [
      { toothNumber: 26, lesionType: 'CALCULUS', areaRatio: 14, riskLevel: 'CRITICAL' },
    ];
    const detail = buildToothDetail({ fdi: '26', rows, previousRows: previous, scanned: true });
    expect(detail.primary?.lesionType).toBe('CALCULUS');
    expect(detail.previousArea).toBe(14);
    expect(detail.change).toBe('better');
    expect(detail.cta?.href).toBe('/clinics?tooth=26&lesion=CALCULUS');
  });
});

describe('countToothStates', () => {
  it('counts a clean-range tooth as clean', () => {
    const counts = countToothStates({
      teeth: [11, 16, 26, 31, 41],
      missing: [],
      scanned: [11, 16, 26, 31],
      results: rows.map((r) => ({ ...r, lesionType: r.lesionType ?? '' })),
      lesions: [],
    });
    expect(counts).toEqual({ calculus: 1, plaque: 1, clean: 2, unscanned: 1 });
  });
});
