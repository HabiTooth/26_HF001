import { describe, expect, it } from 'vitest';
import { compareSummary, compareTeeth, type ToothRisk } from './compare';

const t = (toothNumber: number, riskLevel: ToothRisk['riskLevel']): ToothRisk => ({
  toothNumber,
  riskLevel,
});

describe('치아별 변화 비교', () => {
  it('위험도가 내려가면 좋아진 것으로 본다', () => {
    const r = compareTeeth([t(11, 'HIGH')], [t(11, 'LOW')]);
    expect(r.improved).toHaveLength(1);
    expect(r.improved[0].delta).toBe(-2);
    expect(r.worsened).toHaveLength(0);
  });

  it('위험도가 올라가면 나빠진 것으로 본다', () => {
    const r = compareTeeth([t(11, 'LOW')], [t(11, 'CRITICAL')]);
    expect(r.worsened).toHaveLength(1);
    expect(r.worsened[0].delta).toBe(3);
  });

  it('같으면 양쪽 어디에도 안 들어간다', () => {
    const r = compareTeeth([t(11, 'MEDIUM')], [t(11, 'MEDIUM')]);
    expect(r.improved).toHaveLength(0);
    expect(r.worsened).toHaveLength(0);
    expect(r.unchanged).toBe(1);
  });

  it('같은 치아의 치태·치석 행은 가장 높은 위험도 하나로 합쳐 한 번만 비교한다', () => {
    const r = compareTeeth([t(16, 'LOW'), t(16, 'MEDIUM')], [t(16, 'HIGH'), t(16, 'VERY_LOW')]);
    expect(r.worsened).toHaveLength(1);
    expect(r.worsened[0]).toMatchObject({ toothNumber: 16, before: 'MEDIUM', after: 'HIGH' });
    expect(r.improved).toHaveLength(0);
  });

  it('이전 스캔에 없던 치아는 변화가 아니라 따로 센다', () => {
    const r = compareTeeth([t(11, 'LOW')], [t(11, 'LOW'), t(48, 'HIGH')]);
    expect(r.onlyInAfter).toEqual([48]);
    expect(r.worsened).toHaveLength(0);
  });

  it('이번 스캔에 없는 치아는 무시한다', () => {
    const r = compareTeeth([t(11, 'LOW'), t(48, 'CRITICAL')], [t(11, 'LOW')]);
    expect(r.unchanged).toBe(1);
    expect(r.worsened).toHaveLength(0);
    expect(r.onlyInAfter).toEqual([]);
  });

  it('변화 폭이 큰 치아를 앞에 둔다', () => {
    const r = compareTeeth([t(11, 'LOW'), t(12, 'LOW')], [t(11, 'MEDIUM'), t(12, 'CRITICAL')]);
    expect(r.worsened.map((c) => c.toothNumber)).toEqual([12, 11]);
  });

  it('폭이 같으면 치식 번호 순이다', () => {
    const r = compareTeeth([t(21, 'LOW'), t(11, 'LOW')], [t(21, 'HIGH'), t(11, 'HIGH')]);
    expect(r.worsened.map((c) => c.toothNumber)).toEqual([11, 21]);
  });

  it('빈 입력에도 터지지 않는다', () => {
    expect(compareTeeth([], [])).toMatchObject({ improved: [], worsened: [], unchanged: 0 });
  });
});

describe('변화 요약 문구', () => {
  const empty = { improved: [], worsened: [], unchanged: 0, onlyInAfter: [] };
  const change = (n: number) =>
    Array.from({ length: n }, (_, i) => ({
      toothNumber: 11 + i,
      before: 'LOW' as const,
      after: 'HIGH' as const,
      delta: 2,
    }));

  it('변화가 없으면 없다고 말한다', () => {
    expect(compareSummary(empty, 0)).toContain('바뀐 치아가 없어요');
  });

  it('좋아지기만 하면 나빠졌다는 말이 안 섞인다', () => {
    const text = compareSummary({ ...empty, improved: change(3) }, 5);
    expect(text).toContain('3개');
    expect(text).not.toContain('나빠');
  });

  it('나빠지기만 하면 좋아졌다는 말이 안 섞인다', () => {
    const text = compareSummary({ ...empty, worsened: change(2) }, -4);
    expect(text).toContain('2개');
    expect(text).not.toContain('좋아');
  });

  it('섞여 있고 점수가 올랐으면 그 점을 짚는다', () => {
    const text = compareSummary({ ...empty, improved: change(3), worsened: change(1) }, 6);
    expect(text).toContain('나아졌어요');
  });

  it('섞여 있고 점수가 내렸으면 단정하지 않는다', () => {
    const text = compareSummary({ ...empty, improved: change(1), worsened: change(3) }, -6);
    expect(text).not.toContain('나아졌어요');
  });
});
