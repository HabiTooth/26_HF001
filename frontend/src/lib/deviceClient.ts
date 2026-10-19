import { controlHost } from './deviceAddress';

export type DeviceRoute = 'direct' | 'proxy';

// 직접 요청이 막힌 뒤 프록시가 되면 그 세션은 프록시로 고정
let directBlocked = false;
let lastRoute: DeviceRoute = 'direct';

export const lastDeviceRoute = () => lastRoute;

const withTimeout = async (url: string, timeoutMs: number) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { cache: 'no-store', signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

// 기기에 직접 요청하고 안 되면 서버 프록시로 재시도. 배포 서버는 기기 네트워크 밖이라 직접 요청이 필요
export async function deviceFetch(
  host: string,
  path: string,
  proxy: string,
  timeoutMs: number,
): Promise<Response> {
  let triedDirect = false;
  if (!directBlocked) {
    triedDirect = true;
    try {
      const res = await withTimeout(`http://${controlHost(host)}${path}`, timeoutMs);
      lastRoute = 'direct';
      return res;
    } catch {}
  }
  const res = await withTimeout(proxy, timeoutMs + 2000);
  lastRoute = 'proxy';
  if (triedDirect && res.ok) directBlocked = true;
  return res;
}

export const devicePending = (host: string) =>
  deviceFetch(host, '/pending', `/api/camera/pending?ip=${encodeURIComponent(host)}`, 1500);

export const devicePend = (host: string, i: 0 | 1) =>
  deviceFetch(
    host,
    `/pend?t=${Date.now()}&i=${i}`,
    `/api/camera/pending?ip=${encodeURIComponent(host)}&i=${i}`,
    10000,
  );

export const deviceSnap = (host: string, view: string, light: 'white' | 'uv') =>
  deviceFetch(
    host,
    `/snap?${new URLSearchParams({ light, view, t: String(Date.now()) })}`,
    `/api/camera/capture?ip=${encodeURIComponent(host)}&view=${view}&light=${light}`,
    15000,
  );
