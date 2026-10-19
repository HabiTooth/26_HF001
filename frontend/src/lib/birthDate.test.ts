import { describe, expect, it } from 'vitest';
import { asIsoDate, formatBirthDate } from './birthDate';

describe('formatBirthDate', () => {
  it('연도까지는 그대로 둔다', () => {
    expect(formatBirthDate('1995')).toBe('1995');
  });

  it('다섯 번째 자리부터 하이픈을 넣는다', () => {
    expect(formatBirthDate('19950')).toBe('1995-0');
    expect(formatBirthDate('199503')).toBe('1995-03');
    expect(formatBirthDate('19950315')).toBe('1995-03-15');
  });

  it('이미 하이픈이 있어도 자리수가 안 밀린다', () => {
    expect(formatBirthDate('1995-03-15')).toBe('1995-03-15');
  });

  it('여덟 자리를 넘기면 버린다', () => {
    expect(formatBirthDate('1995031599')).toBe('1995-03-15');
  });

  it('숫자가 아닌 입력은 무시한다', () => {
    expect(formatBirthDate('19a9b5/03')).toBe('1995-03');
    expect(formatBirthDate('')).toBe('');
  });

  it('지우면 하이픈이 따라 지워진다', () => {
    expect(formatBirthDate('1995-')).toBe('1995');
    expect(formatBirthDate('1995-03-')).toBe('1995-03');
  });
});

describe('asIsoDate', () => {
  it('완성된 날짜만 넘긴다', () => {
    expect(asIsoDate('1995-03-15')).toBe('1995-03-15');
  });

  it('입력 중인 값은 빈 값으로 준다', () => {
    expect(asIsoDate('1995-03')).toBe('');
    expect(asIsoDate('1995')).toBe('');
    expect(asIsoDate('')).toBe('');
  });
});
