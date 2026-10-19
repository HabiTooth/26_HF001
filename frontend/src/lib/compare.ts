import type { RiskLevel } from '@/lib/api/common';

const RANK: Record<RiskLevel, number> = {
  VERY_LOW: 0,
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

export interface ToothRisk {
  toothNumber: number;
  riskLevel: RiskLevel;
}

export interface ToothChange {
  toothNumber: number;
  before: RiskLevel;
  after: RiskLevel;
  delta: number;
}

export interface CompareResult {
  improved: ToothChange[];
  worsened: ToothChange[];
  unchanged: number;
  onlyInAfter: number[];
}

// 치아당 관리 위험도 우선 순위에 맞춰서 합침
function worstPerTooth(rows: ToothRisk[]): Map<number, RiskLevel> {
  const worst = new Map<number, RiskLevel>();
  for (const row of rows) {
    const kept = worst.get(row.toothNumber);
    if (kept === undefined || RANK[row.riskLevel] > RANK[kept])
      worst.set(row.toothNumber, row.riskLevel);
  }
  return worst;
}

export function compareTeeth(before: ToothRisk[], after: ToothRisk[]): CompareResult {
  const beforeMap = worstPerTooth(before);
  const afterRows = [...worstPerTooth(after)].map(([toothNumber, riskLevel]) => ({
    toothNumber,
    riskLevel,
  }));

  const improved: ToothChange[] = [];
  const worsened: ToothChange[] = [];
  const onlyInAfter: number[] = [];
  let unchanged = 0;

  for (const tooth of afterRows) {
    const prev = beforeMap.get(tooth.toothNumber);
    if (prev === undefined) {
      onlyInAfter.push(tooth.toothNumber);
      continue;
    }

    const delta = RANK[tooth.riskLevel] - RANK[prev];
    const change = { toothNumber: tooth.toothNumber, before: prev, after: tooth.riskLevel, delta };

    if (delta < 0) improved.push(change);
    else if (delta > 0) worsened.push(change);
    else unchanged++;
  }

  const bySeverity = (a: ToothChange, b: ToothChange) =>
    Math.abs(b.delta) - Math.abs(a.delta) || a.toothNumber - b.toothNumber;

  return {
    improved: improved.sort(bySeverity),
    worsened: worsened.sort(bySeverity),
    unchanged,
    onlyInAfter: onlyInAfter.sort((a, b) => a - b),
  };
}

export function compareSummary(result: CompareResult, scoreDelta: number | null): string {
  const { improved, worsened } = result;

  if (improved.length === 0 && worsened.length === 0) {
    return '두 스캔 사이에 바뀐 치아가 없어요.';
  }
  if (worsened.length === 0) {
    return `${improved.length}개 치아가 좋아졌어요.`;
  }
  if (improved.length === 0) {
    return `${worsened.length}개 치아가 나빠졌어요.`;
  }
  if (scoreDelta !== null && scoreDelta > 0) {
    return `${improved.length}개가 좋아지고 ${worsened.length}개가 나빠졌지만, 전체적으로는 나아졌어요.`;
  }
  return `${improved.length}개가 좋아지고 ${worsened.length}개가 나빠졌어요.`;
}
