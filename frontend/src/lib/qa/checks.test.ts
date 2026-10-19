import { describe, expect, it } from 'vitest';
import { QA_CHECKS, QA_GROUPS, extraKeys, missingKeys, type QaCheck } from './checks';

const check = (over: Partial<QaCheck> = {}): QaCheck => ({
  id: 't',
  group: '기록',
  label: 't',
  endpoint: 'GET /t',
  run: async () => ({ status: 200, result: null }),
  ...over,
});

describe('필드 대조', () => {
  it('빠진 필드를 짚어낸다', () => {
    const c = check({ expectKeys: ['a', 'b', 'c'] });
    expect(missingKeys(c, { a: 1, c: 3 })).toEqual(['b']);
  });

  it('값이 null이어도 키가 있으면 통과다', () => {
    const c = check({ expectKeys: ['a'] });
    expect(missingKeys(c, { a: null })).toEqual([]);
  });

  it('result가 null이면 전부 빠진 것으로 본다', () => {
    const c = check({ expectKeys: ['a', 'b'] });
    expect(missingKeys(c, null)).toEqual(['a', 'b']);
  });

  it('배열은 첫 원소로 검사한다', () => {
    const c = check({ expectItemKeys: ['x', 'y'] });
    expect(missingKeys(c, [{ x: 1 }])).toEqual(['y']);
  });

  it('빈 배열은 통과시킨다', () => {
    const c = check({ expectItemKeys: ['x'] });
    expect(missingKeys(c, [])).toEqual([]);
  });

  it('기대 목록이 없으면 검사하지 않는다', () => {
    expect(missingKeys(check(), { anything: 1 })).toEqual([]);
    expect(extraKeys(check(), { anything: 1 })).toEqual([]);
  });
});

describe('모르는 필드 탐지', () => {
  it('기대 목록에 없는 키를 짚어낸다', () => {
    const c = check({ expectKeys: ['a'] });
    expect(extraKeys(c, { a: 1, b: 2 })).toEqual(['b']);
  });

  it('배열도 첫 원소로 본다', () => {
    const c = check({ expectItemKeys: ['x'] });
    expect(extraKeys(c, [{ x: 1, z: 2 }])).toEqual(['z']);
  });

  it('딱 맞으면 빈 배열이다', () => {
    const c = check({ expectKeys: ['a', 'b'] });
    expect(extraKeys(c, { a: 1, b: 2 })).toEqual([]);
  });
});

describe('체크 정의', () => {
  it('id가 중복되지 않는다', () => {
    const ids = QA_CHECKS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('모든 체크의 그룹이 목록에 있다', () => {
    for (const c of QA_CHECKS) {
      expect(QA_GROUPS).toContain(c.group);
    }
  });

  it('되돌릴 수 없는 항목은 전체 실행에서 빠진다', () => {
    const destructive = ['user.deleteData', 'auth.logout', 'auth.signUp'];
    for (const id of destructive) {
      expect(QA_CHECKS.find((c) => c.id === id)?.manualOnly).toBe(true);
    }
  });

  it('선행 값이 필요한 체크는 needs를 선언한다', () => {
    for (const c of QA_CHECKS) {
      if (c.endpoint.includes('{id}')) expect(c.needs?.length).toBeGreaterThan(0);
    }
  });

  it('세션이 필요한 체크는 세션을 만드는 체크보다 뒤에 있다', () => {
    const created = QA_CHECKS.findIndex((c) => c.id === 'scan.createSession');
    const needsSession = QA_CHECKS.map((c, i) => ({ c, i })).filter(({ c }) =>
      c.needs?.includes('sessionId'),
    );
    expect(needsSession.length).toBeGreaterThan(0);
    for (const { i } of needsSession) expect(i).toBeGreaterThan(created);
  });
});
