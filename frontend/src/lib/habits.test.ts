import { describe, expect, it } from 'vitest';
import {
  HABITS,
  completionRate,
  currentHabitStreak,
  doneOn,
  insight,
  recentKeys,
  toggle,
  type HabitLog,
} from './habits';

const TODAY = new Date(2026, 8, 15);
const allDone = HABITS.map((h) => h.id);

describe('체크 토글', () => {
  it('없던 항목은 켜진다', () => {
    expect(doneOn(toggle({}, '2026-09-15', 'FLOSS'), '2026-09-15')).toEqual(['FLOSS']);
  });

  it('있던 항목은 꺼진다', () => {
    const log: HabitLog = { '2026-09-15': ['FLOSS', 'MOUTHWASH'] };
    expect(doneOn(toggle(log, '2026-09-15', 'FLOSS'), '2026-09-15')).toEqual(['MOUTHWASH']);
  });

  it('마지막 항목을 끄면 그 날짜는 사라진다', () => {
    const next = toggle({ '2026-09-15': ['FLOSS'] }, '2026-09-15', 'FLOSS');
    expect(Object.keys(next)).toEqual([]);
  });

  it('원본을 건드리지 않는다', () => {
    const log: HabitLog = { '2026-09-15': ['FLOSS'] };
    toggle(log, '2026-09-15', 'MOUTHWASH');
    expect(log['2026-09-15']).toEqual(['FLOSS']);
  });
});

describe('달성률', () => {
  it('아무것도 안 하면 0이다', () => {
    expect(completionRate({}, ['2026-09-15'])).toBe(0);
  });

  it('다 하면 1이다', () => {
    expect(completionRate({ '2026-09-15': allDone }, ['2026-09-15'])).toBe(1);
  });

  it('날짜가 없으면 0으로 나누지 않는다', () => {
    expect(completionRate({ '2026-09-15': allDone }, [])).toBe(0);
  });

  it('여러 날 평균으로 센다', () => {
    const log: HabitLog = { '2026-09-14': allDone };
    expect(completionRate(log, ['2026-09-14', '2026-09-15'])).toBe(0.5);
  });
});

describe('최근 날짜 목록', () => {
  it('오늘로 끝나는 오름차순이다', () => {
    const keys = recentKeys(3, TODAY);
    expect(keys).toEqual(['2026-09-13', '2026-09-14', '2026-09-15']);
  });

  it('월 경계를 넘어간다', () => {
    expect(recentKeys(2, new Date(2026, 8, 1))).toEqual(['2026-08-31', '2026-09-01']);
  });
});

describe('습관 연속 일수', () => {
  it('오늘 아직 안 채웠어도 어제까지 이어지면 센다', () => {
    const log: HabitLog = { '2026-09-14': allDone, '2026-09-13': allDone };
    expect(currentHabitStreak(log, TODAY)).toBe(2);
  });

  it('일부만 체크한 날은 끊긴다', () => {
    const log: HabitLog = { '2026-09-14': ['FLOSS'], '2026-09-13': allDone };
    expect(currentHabitStreak(log, TODAY)).toBe(0);
  });

  it('기록이 없으면 0이다', () => {
    expect(currentHabitStreak({}, TODAY)).toBe(0);
  });
});

describe('습관과 점수 관계', () => {
  const full = { '2026-09-01': allDone, '2026-09-02': allDone };

  it('표본이 모자라면 단정하지 않는다', () => {
    const r = insight(full, [{ date: '2026-09-01', score: 90 }]);
    expect(r.strong).toBe(false);
  });

  it('다 지킨 날 점수가 확실히 높으면 짚어준다', () => {
    const r = insight(full, [
      { date: '2026-09-01', score: 92 },
      { date: '2026-09-02', score: 90 },
      { date: '2026-09-03', score: 70 },
      { date: '2026-09-04', score: 72 },
    ]);
    expect(r.strong).toBe(true);
    expect(r.text).toContain('20점');
  });

  it('차이가 작으면 강하게 말하지 않는다', () => {
    const r = insight(full, [
      { date: '2026-09-01', score: 81 },
      { date: '2026-09-02', score: 80 },
      { date: '2026-09-03', score: 80 },
      { date: '2026-09-04', score: 79 },
    ]);
    expect(r.strong).toBe(false);
  });
});
