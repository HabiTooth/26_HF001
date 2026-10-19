// BE가 결손 반영된 FDI를 보냄. 등록한 결손치 번호로 오는 행은 모델 오류로 보고 제외
export function excludeMissingTeeth<T extends { toothNumber: number }>(
  rows: T[],
  missing: number[],
): T[] {
  if (missing.length === 0) return rows;
  return rows.filter((row) => !missing.includes(row.toothNumber));
}

// 제외된 행 수. 리포트 안내용
export function countMissingConflicts(rows: { toothNumber: number }[], missing: number[]): number {
  return rows.length - excludeMissingTeeth(rows, missing).length;
}
