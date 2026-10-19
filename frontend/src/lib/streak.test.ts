import { describe, expect, it } from 'vitest';
import { computeStreak, monthGrid, nextMilestone, streakMessage, toKey } from './streak';

const TODAY = new Date(2026, 8, 15);

describe('연속 스캔 계산', () => {
  it('기록이 없으면 전부 0이다', () => {
    const s = computeStreak([], TODAY);
    expect(s).toMatchObject({ current: 0, longest: 0, totalDays: 0 });
  });

  it('오늘까지 이어지면 연속으로 센다', () => {
    const s = computeStreak(['2026-09-13', '2026-09-14', '2026-09-15'], TODAY);
    expect(s.current).toBe(3);
  });

  it('오늘 안 찍었어도 어제까지 이어졌으면 유지된다', () => {
    const s = computeStreak(['2026-09-13', '2026-09-14'], TODAY);
    expect(s.current).toBe(2);
  });

  it('그저께까지만 있으면 끊긴 것으로 본다', () => {
    expect(computeStreak(['2026-09-12', '2026-09-13'], TODAY).current).toBe(0);
  });

  it('같은 날 여러 번 찍어도 하루로 센다', () => {
    const s = computeStreak(['2026-09-15T09:00', '2026-09-15T21:00'], TODAY);
    expect(s.current).toBe(1);
    expect(s.totalDays).toBe(1);
  });

  it('최장 기록은 지금 끊긴 구간도 본다', () => {
    const s = computeStreak(
      ['2026-08-01', '2026-08-02', '2026-08-03', '2026-08-04', '2026-09-15'],
      TODAY,
    );
    expect(s.longest).toBe(4);
    expect(s.current).toBe(1);
  });

  it('월을 넘어가도 이어진다', () => {
    const s = computeStreak(['2026-08-31', '2026-09-01'], new Date(2026, 8, 1));
    expect(s.current).toBe(2);
  });

  it('입력 순서가 뒤죽박죽이어도 같다', () => {
    const asc = computeStreak(['2026-09-13', '2026-09-14', '2026-09-15'], TODAY);
    const desc = computeStreak(['2026-09-15', '2026-09-13', '2026-09-14'], TODAY);
    expect(desc).toEqual(asc);
  });

  it('null은 무시한다', () => {
    expect(computeStreak([null, '2026-09-15', undefined], TODAY).totalDays).toBe(1);
  });
});

describe('월 달력 그리드', () => {
  const scanned = new Set(['2026-09-15']);

  it('7의 배수 칸으로 채운다', () => {
    expect(monthGrid(2026, 8, scanned, TODAY).length % 7).toBe(0);
  });

  it('해당 월 날짜를 빠짐없이 담는다', () => {
    const days = monthGrid(2026, 8, scanned, TODAY).filter((c) => c.day !== null);
    expect(days).toHaveLength(30);
    expect(days[0].day).toBe(1);
    expect(days[29].day).toBe(30);
  });

  it('첫 날 앞에 요일만큼 빈 칸이 붙는다', () => {
    const cells = monthGrid(2026, 8, scanned, TODAY);
    const lead = cells.findIndex((c) => c.day === 1);
    expect(lead).toBe(new Date(2026, 8, 1).getDay());
  });

  it('스캔한 날과 오늘을 표시한다', () => {
    const cell = monthGrid(2026, 8, scanned, TODAY).find((c) => c.day === 15);
    expect(cell).toMatchObject({ scanned: true, isToday: true, isFuture: false });
  });

  it('오늘 이후는 미래로 본다', () => {
    const cell = monthGrid(2026, 8, scanned, TODAY).find((c) => c.day === 16);
    expect(cell?.isFuture).toBe(true);
  });

  it('윤년 2월도 29일까지 만든다', () => {
    const days = monthGrid(2028, 1, new Set(), new Date(2028, 1, 10)).filter((c) => c.day);
    expect(days).toHaveLength(29);
  });
});

describe('보조 표시', () => {
  it('다음 목표는 현재보다 큰 값이다', () => {
    expect(nextMilestone(0)).toBe(3);
    expect(nextMilestone(3)).toBe(7);
    expect(nextMilestone(100)).toBeNull();
  });

  it('연속 일수마다 문구가 다르다', () => {
    const texts = [0, 1, 5, 10, 40].map(streakMessage);
    expect(new Set(texts).size).toBe(texts.length);
  });

  it('날짜 키는 0을 채운다', () => {
    expect(toKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});
