import axios from 'axios';

export function apiErrorMessage(e: unknown, fallback: string): string {
  if (!axios.isAxiosError(e)) return fallback;

  const status = e.response?.status;
  if (status === undefined) return '서버에 연결할 수 없어요.';
  if (status === 401 || status === 403) return '로그인이 만료됐어요. 다시 로그인해 주세요.';

  const body = e.response?.data as { message?: string } | undefined;
  return body?.message ?? fallback;
}
