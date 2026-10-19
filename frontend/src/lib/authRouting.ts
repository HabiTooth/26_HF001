import { deviceApi } from './api/device';

// 로그인 후 분기. 기기 있으면 홈, 없으면 페어링
export async function destinationAfterLogin(): Promise<string> {
  try {
    const res = await deviceApi.getStatus();
    return res.data.result.length > 0 ? '/dashboard' : '/pairing';
  } catch {
    // 조회 실패 시 홈. 401은 인터셉터 처리
    return '/dashboard';
  }
}
