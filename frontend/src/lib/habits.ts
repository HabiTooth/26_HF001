import { toKey } from './streak';

export type HabitId = 'BRUSH_MORNING' | 'BRUSH_NOON' | 'BRUSH_NIGHT' | 'FLOSS' | 'MOUTHWASH';

export interface HabitDefinition {
  id: HabitId;
  label: string;
  hint: string;
}

export const HABITS: HabitDefinition[] = [
  { id: 'BRUSH_MORNING', label: '아침 양치', hint: '일어나서 한 번' },
  { id: 'BRUSH_NOON', label: '점심 양치', hint: '식사 후 한 번' },
  { id: 'BRUSH_NIGHT', label: '저녁 양치', hint: '자기 전 한 번' },
  { id: 'FLOSS', label: '치실', hint: '치아 사이 청소' },
  { id: 'MOUTHWASH', label: '가글', hint: '마무리 헹굼' },
];

export type HabitLog = Record<string, HabitId[]>;

export function doneOn(log: HabitLog, dateKey: string): HabitId[] {
  return log[dateKey] ?? [];
}

export function toggle(log: HabitLog, dateKey: string, id: HabitId): HabitLog {
  const done = doneOn(log, dateKey);
  const next = done.includes(id) ? done.filter((h) => h !== id) : [...done, id];
  const updated = { ...log };
  if (next.length === 0) delete updated[dateKey];
  else updated[dateKey] = next;
  return updated;
}

export function completionRate(log: HabitLog, dateKeys: string[]): number {
  if (dateKeys.length === 0) return 0;
  const total = dateKeys.length * HABITS.length;
  const done = dateKeys.reduce((sum, key) => sum + doneOn(log, key).length, 0);
  return done / total;
}

export function recentKeys(days: number, today = new Date()): string[] {
  return Array.from({ length: days }, (_, i) =>
    toKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() - (days - 1 - i))),
  );
}

const MAX_STREAK_LOOKBACK = 365;

export function currentHabitStreak(log: HabitLog, today = new Date()): number {
  let streak = 0;
  for (let i = 0; i < MAX_STREAK_LOOKBACK; i++) {
    const key = toKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() - i));
    if (doneOn(log, key).length < HABITS.length) {
      if (i === 0) continue;
      break;
    }
    streak++;
  }
  return streak;
}

export interface HabitInsight {
  text: string;
  strong: boolean;
}

export function insight(
  log: HabitLog,
  scans: Array<{ date: string; score: number }>,
): HabitInsight {
  const full: number[] = [];
  const partial: number[] = [];

  for (const scan of scans) {
    const key = scan.date.slice(0, 10);
    (doneOn(log, key).length === HABITS.length ? full : partial).push(scan.score);
  }

  if (full.length < 2 || partial.length < 2) {
    return { text: '기록이 더 쌓이면 습관과 점수의 관계를 보여드릴게요.', strong: false };
  }

  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const diff = Math.round(avg(full) - avg(partial));

  if (diff >= 3) {
    return { text: `습관을 다 지킨 날 점수가 평균 ${diff}점 높았어요.`, strong: true };
  }
  if (diff <= -3) {
    return { text: `아직은 습관과 점수가 반대로 나오고 있어요. 기록을 더 모아볼게요.`, strong: false };
  }
  return { text: '지금까지는 점수 차이가 뚜렷하지 않아요.', strong: false };
}
