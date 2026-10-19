import { describe, expect, it } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import { apiErrorMessage } from './apiError';

function axiosError(status?: number, data?: unknown): AxiosError {
  const config = { headers: new AxiosHeaders() };
  const err = new AxiosError('요청 실패', 'ERR', config);
  if (status !== undefined) {
    err.response = {
      status,
      statusText: '',
      data,
      headers: new AxiosHeaders(),
      config,
    };
  }
  return err;
}

const FALLBACK = '기본 문구';

describe('API 에러 문구', () => {
  it('응답이 없으면 연결 실패로 안내한다', () => {
    expect(apiErrorMessage(axiosError(), FALLBACK)).toBe('서버에 연결할 수 없어요.');
  });

  it('401과 403은 로그인 만료로 안내한다', () => {
    for (const status of [401, 403]) {
      expect(apiErrorMessage(axiosError(status), FALLBACK)).toContain('로그인');
    }
  });

  it('서버가 준 메시지를 그대로 쓴다', () => {
    const message = '촬영 세션을 찾을 수 없습니다.';
    expect(apiErrorMessage(axiosError(404, { message }), FALLBACK)).toBe(message);
  });

  it('메시지가 없으면 기본 문구로 떨어진다', () => {
    expect(apiErrorMessage(axiosError(500, {}), FALLBACK)).toBe(FALLBACK);
    expect(apiErrorMessage(axiosError(500), FALLBACK)).toBe(FALLBACK);
  });

  it('axios가 아닌 에러도 기본 문구를 준다', () => {
    expect(apiErrorMessage(new Error('boom'), FALLBACK)).toBe(FALLBACK);
    expect(apiErrorMessage('문자열', FALLBACK)).toBe(FALLBACK);
    expect(apiErrorMessage(null, FALLBACK)).toBe(FALLBACK);
  });
});
