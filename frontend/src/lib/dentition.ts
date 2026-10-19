export const WISDOM_TEETH = [18, 28, 38, 48];

export const ORTHO_PREMOLARS = [14, 24, 34, 44];

export const UPPER_ROW = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
export const LOWER_ROW = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

export const ALL_TEETH = [...UPPER_ROW, ...LOWER_ROW];

const VALID = new Set(ALL_TEETH);

export function normalizeMissing(teeth: Array<number | string>): number[] {
  const cleaned = teeth
    .map((t) => Number(t))
    .filter((t) => VALID.has(t));
  return [...new Set(cleaned)].sort((a, b) => a - b);
}

export function toggleTooth(missing: number[], tooth: number): number[] {
  if (!VALID.has(tooth)) return missing;
  return missing.includes(tooth)
    ? missing.filter((t) => t !== tooth)
    : normalizeMissing([...missing, tooth]);
}

export function setGroup(missing: number[], group: number[], on: boolean): number[] {
  return on
    ? normalizeMissing([...missing, ...group])
    : missing.filter((t) => !group.includes(t));
}

export const hasAll = (missing: number[], group: number[]) =>
  group.every((t) => missing.includes(t));

export const presentCount = (missing: number[]) => ALL_TEETH.length - missing.length;

export function missingSummary(missing: number[]): string {
  if (missing.length === 0) return '빠진 치아 없음';

  const wisdom = WISDOM_TEETH.filter((t) => missing.includes(t)).length;
  const others = missing.filter((t) => !WISDOM_TEETH.includes(t)).length;

  const parts: string[] = [];
  if (wisdom > 0) parts.push(`사랑니 ${wisdom}개`);
  if (others > 0) parts.push(`그 외 ${others}개`);
  return `${parts.join(', ')} 없음`;
}

const TYPE_BY_POSITION: Record<number, string> = {
  1: '앞니',
  2: '앞니',
  3: '송곳니',
  4: '작은어금니',
  5: '작은어금니',
  6: '어금니',
  7: '어금니',
  8: '사랑니',
};

export function toothName(tooth: number): string {
  const quadrant = Math.floor(tooth / 10);
  const position = tooth % 10;
  const type = TYPE_BY_POSITION[position];
  if (!type) return `${tooth}번`;

  const jaw = quadrant === 1 || quadrant === 2 ? '윗니' : '아랫니';
  const side = quadrant === 1 || quadrant === 4 ? '오른쪽' : '왼쪽';
  return `${jaw} ${side} ${type}`;
}

