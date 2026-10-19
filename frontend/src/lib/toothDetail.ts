import type { LesionType, RiskLevel } from '@/lib/api/common';
import { toothName } from '@/lib/dentition';
import { RISK_ORDER, RISK_TAG } from '@/lib/lesionRisk';
import { isActiveLesion } from '@/lib/lesionState';

export interface LesionRow {
  toothNumber: number;
  lesionType: LesionType | null;
  areaRatio: number;
  riskLevel: RiskLevel;
}

export type ToothChange = 'better' | 'worse' | 'same' | 'first';

export interface FocusChip {
  fdi: string;
  label: string;
  color: string;
}

export interface ToothDetail {
  fdi: string;
  name: string;
  state: 'lesion' | 'clean' | 'unscanned';
  // 치석 먼저
  rows: Array<{ lesionType: LesionType; areaRatio: number; riskLevel: RiskLevel }>;
  primary: ToothDetail['rows'][number] | null;
  // 깨끗 범위라 병변으로 안 센 것
  minor: ToothDetail['rows'];
  riskLabel: string;
  previousArea: number | null;
  change: ToothChange;
  tip: string;
  cta: { label: string; href: string } | null;
}

const rank = (level: RiskLevel) => RISK_ORDER.indexOf(level);

const beats = (a: LesionRow, b: LesionRow) =>
  rank(a.riskLevel) !== rank(b.riskLevel)
    ? rank(a.riskLevel) > rank(b.riskLevel)
    : a.lesionType === 'CALCULUS' && b.lesionType !== 'CALCULUS';

// 위험도 순. 같으면 치석 먼저, 면적 큰 순
export function focusOrder(rows: LesionRow[]): string[] {
  const best = new Map<number, LesionRow>();
  for (const row of rows) {
    if (!row.lesionType || !isActiveLesion(row)) continue;
    const kept = best.get(row.toothNumber);
    if (!kept || beats(row, kept)) best.set(row.toothNumber, row);
  }
  return [...best.values()]
    .sort(
      (a, b) =>
        rank(b.riskLevel) - rank(a.riskLevel) ||
        Number(b.lesionType === 'CALCULUS') - Number(a.lesionType === 'CALCULUS') ||
        b.areaRatio - a.areaRatio,
    )
    .map((row) => String(row.toothNumber));
}

function tipFor(row: ToothDetail['primary']) {
  if (!row) return '';
  const serious = rank(row.riskLevel) >= rank('HIGH');
  if (row.lesionType === 'CALCULUS') {
    return serious
      ? '치석은 굳어 있어 칫솔로는 안 없어져요. 가까운 시일에 스케일링을 받아보세요.'
      : '치석이 시작되는 자리예요. 잇몸선을 따라 꼼꼼히 닦고 다음 스캔에서 변화를 확인해요.';
  }
  return serious
    ? '치태가 넓게 보여요. 이 부위부터 칫솔을 45도로 기울여 10초 더 닦고 치실로 마무리해요.'
    : '치태가 조금 보여요. 저녁 양치 때 이 부위를 먼저 닦아보세요.';
}

// 출발 치아 쿼리 부착
function ctaFor(row: ToothDetail['primary'], fdi: string) {
  if (!row) return null;
  const query = `?tooth=${fdi}&lesion=${row.lesionType}`;
  return row.lesionType === 'CALCULUS'
    ? { label: '근처 치과 찾기', href: `/clinics${query}` }
    : { label: '관리 방법 보기', href: `/articles/brushing-basics${query}` };
}

export function buildToothDetail(input: {
  fdi: string;
  rows: LesionRow[];
  previousRows: LesionRow[];
  scanned: boolean;
}): ToothDetail {
  const tooth = Number(input.fdi);
  const own = input.rows
    .filter((r): r is LesionRow & { lesionType: LesionType } => Boolean(r.lesionType))
    .filter((r) => r.toothNumber === tooth && r.areaRatio > 0)
    .map(({ lesionType, areaRatio, riskLevel }) => ({ lesionType, areaRatio, riskLevel }))
    .sort((a, b) => Number(b.lesionType === 'CALCULUS') - Number(a.lesionType === 'CALCULUS'));
  const rows = own.filter(isActiveLesion);
  const minor = own.filter((r) => !isActiveLesion(r));
  const primary =
    rows.reduce<ToothDetail['rows'][number] | null>(
      (kept, row) =>
        !kept ||
        rank(row.riskLevel) > rank(kept.riskLevel) ||
        (rank(row.riskLevel) === rank(kept.riskLevel) && row.lesionType === 'CALCULUS')
          ? row
          : kept,
      null,
    ) ?? null;

  const previous = primary
    ? (input.previousRows.find(
        (r) => r.toothNumber === tooth && r.lesionType === primary.lesionType,
      ) ?? null)
    : null;
  let change: ToothChange = 'first';
  if (primary && previous) {
    const gap = rank(primary.riskLevel) - rank(previous.riskLevel);
    change = gap < 0 ? 'better' : gap > 0 ? 'worse' : 'same';
  }

  const state = primary ? 'lesion' : input.scanned ? 'clean' : 'unscanned';
  return {
    fdi: input.fdi,
    name: toothName(tooth),
    state,
    rows,
    primary,
    minor,
    riskLabel: primary ? RISK_TAG[primary.riskLevel] : state === 'clean' ? '깨끗' : '미촬영',
    previousArea: previous ? previous.areaRatio : null,
    change,
    tip: primary
      ? tipFor(primary)
      : state === 'clean'
        ? '이번 스캔에서 병변이 안 보여요. 지금처럼 유지해 주세요.'
        : '이번 스캔에 안 잡혔어요. 다음 스캔에서 이 구역을 찍어보세요.',
    cta: ctaFor(primary, input.fdi),
  };
}

