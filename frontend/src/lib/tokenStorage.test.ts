import { beforeEach, describe, expect, it } from 'vitest';
import { clearStoredAuth, isTokenExpired, readEmail, readToken, writeAuth } from './tokenStorage';

// exp만 든 가짜 JWT
function jwt(expSeconds?: number): string {
  const payload = btoa(JSON.stringify(expSeconds === undefined ? {} : { exp: expSeconds }));
  return `header.${payload}.signature`;
}

const HOUR = 3600;
const now = () => Math.floor(Date.now() / 1000);

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('로그인 유지', () => {
  it('체크하면 localStorage에 남는다', () => {
    writeAuth('token-a', 'a@b.com', true);
    expect(localStorage.getItem('accessToken')).toBe('token-a');
    expect(sessionStorage.getItem('accessToken')).toBeNull();
  });

  it('체크 안 하면 sessionStorage에만 남는다', () => {
    writeAuth('token-b', 'a@b.com', false);
    expect(sessionStorage.getItem('accessToken')).toBe('token-b');
    expect(localStorage.getItem('accessToken')).toBeNull();
  });

  it('둘 중 어디에 있든 읽어낸다', () => {
    writeAuth('token-c', 'c@b.com', true);
    expect(readToken()).toBe('token-c');
    expect(readEmail()).toBe('c@b.com');

    clearStoredAuth();
    writeAuth('token-d', 'd@b.com', false);
    expect(readToken()).toBe('token-d');
    expect(readEmail()).toBe('d@b.com');
  });

  it('저장 위치를 바꾸면 반대쪽은 지워진다', () => {
    writeAuth('old', 'old@b.com', true);
    writeAuth('new', 'new@b.com', false);

    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(sessionStorage.getItem('accessToken')).toBe('new');
    expect(readToken()).toBe('new');
  });

  it('이메일이 없으면 토큰만 저장한다', () => {
    writeAuth('token-e', null, true);
    expect(readToken()).toBe('token-e');
    expect(readEmail()).toBeNull();
  });

  it('로그아웃하면 양쪽 다 비운다', () => {
    writeAuth('token-f', 'f@b.com', true);
    sessionStorage.setItem('accessToken', 'stale');
    clearStoredAuth();

    expect(readToken()).toBeNull();
    expect(readEmail()).toBeNull();
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(sessionStorage.getItem('accessToken')).toBeNull();
  });

  it('저장된 게 없으면 null이다', () => {
    expect(readToken()).toBeNull();
    expect(readEmail()).toBeNull();
  });
});

describe('토큰 만료 판정', () => {
  it('미래 exp는 살아 있다', () => {
    expect(isTokenExpired(jwt(now() + HOUR))).toBe(false);
  });

  it('과거 exp는 만료다', () => {
    expect(isTokenExpired(jwt(now() - HOUR))).toBe(true);
  });

  it('exp가 없으면 만료로 보지 않는다', () => {
    expect(isTokenExpired(jwt())).toBe(false);
  });

  it('형식이 깨진 토큰은 만료로 친다', () => {
    expect(isTokenExpired('not-a-jwt')).toBe(true);
    expect(isTokenExpired('')).toBe(true);
    expect(isTokenExpired('a.b.c')).toBe(true);
  });
});
