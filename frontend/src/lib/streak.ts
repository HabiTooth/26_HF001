const DAY_MS = 86_400_000;

export const toKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const shiftKey = (key: string, days: number) => {
  const [y, m, d] = key.split('-').map(Number);
  return toKey(new Date(y, m - 1, d + days));
};

export interface StreakStats {
  current: number;
  longest: number;
  totalDays: number;
  scanned: Set<string>;
}

export function computeStreak(dates: Array<string | null | undefined>, today = new Date()): StreakStats {
  const scanned = new Set(
    dates.filter((d): d is string => Boolean(d)).map((d) => d.slice(0, 10)),
  );

  if (scanned.size === 0) {
    return { current: 0, longest: 0, totalDays: 0, scanned };
  }

  const sorted = [...scanned].sort();

  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    run = shiftKey(sorted[i - 1], 1) === sorted[i] ? run + 1 : 1;
    if (run > longest) longest = run;
  }

  const todayKey = toKey(today);
  let cursor = scanned.has(todayKey) ? todayKey : shiftKey(todayKey, -1);
  let current = 0;
  while (scanned.has(cursor)) {
    current++;
    cursor = shiftKey(cursor, -1);
  }

  return { current, longest, totalDays: scanned.size, scanned };
}

export interface CalendarCell {
  key: string | null;
  day: number | null;
  scanned: boolean;
  isToday: boolean;
  isFuture: boolean;
}

export function monthGrid(year: number, month: number, scanned: Set<string>, today = new Date()): CalendarCell[] {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const lead = first.getDay();
  const todayKey = toKey(today);

  const cells: CalendarCell[] = [];
  for (let i = 0; i < lead; i++) {
    cells.push({ key: null, day: null, scanned: false, isToday: false, isFuture: false });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const key = toKey(new Date(year, month, day));
    cells.push({
      key,
      day,
      scanned: scanned.has(key),
      isToday: key === todayKey,
      isFuture: key > todayKey,
    });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ key: null, day: null, scanned: false, isToday: false, isFuture: false });
  }
  return cells;
}

export function streakMessage(current: number): string {
  if (current === 0) return '오늘 스캔하면 기록이 시작돼요';
  if (current === 1) return '오늘부터 시작이에요';
  if (current < 7) return '이 흐름 그대로 가봐요';
  if (current < 30) return '습관이 잡혀가고 있어요';
  return '꾸준함이 대단해요';
}

export const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

export const nextMilestone = (current: number): number | null =>
  [3, 7, 14, 30, 100].find((m) => m > current) ?? null;

export { DAY_MS };
