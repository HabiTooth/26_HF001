import { NextRequest, NextResponse } from 'next/server';

// 스트림은 SVGA, 스틸컷만 고해상도
const CAPTURE_FRAMESIZE = 13; // UXGA 1600x1200
const CAPTURE_QUALITY = 6;
const STREAM_FRAMESIZE = 9; // SVGA 800x600. useCameraStream과 동일
const STREAM_QUALITY = 10;

const SNAP_TIMEOUT = 15000;
const CAPTURE_TIMEOUT = 8000;

const get = async (url: string, timeoutMs: number) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { cache: 'no-store', signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

// wand 펌웨어용. /snap 하나로 조명·촬영 처리
const snapWand = async (ip: string, light: string, view: string) => {
  const query = new URLSearchParams({ light, view, t: String(Date.now()) });
  return get(`http://${ip}/snap?${query}`, SNAP_TIMEOUT);
};

// 구 CameraWebServer 펌웨어용
const setSensor = async (ip: string, framesize: number, quality: number) => {
  await get(`http://${ip}/control?var=framesize&val=${framesize}`, 3000).catch(() => {});
  await get(`http://${ip}/control?var=quality&val=${quality}`, 3000).catch(() => {});
};

const snapCam = async (ip: string) => {
  await setSensor(ip, CAPTURE_FRAMESIZE, CAPTURE_QUALITY);
  await new Promise((r) => setTimeout(r, 300)); // 센서 설정 반영 대기

  try {
    // 첫 프레임은 설정 변경 전 버퍼. 두 번째 사용
    await get(`http://${ip}/capture?_=${Date.now()}`, CAPTURE_TIMEOUT)
      .then((r) => r.arrayBuffer())
      .catch(() => {});
    return await get(`http://${ip}/capture?_=${Date.now()}`, CAPTURE_TIMEOUT);
  } finally {
    setSensor(ip, STREAM_FRAMESIZE, STREAM_QUALITY);
  }
};

// CORS 우회용 프록시
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const ip = params.get('ip');
  if (!ip) return NextResponse.json({ error: 'ip required' }, { status: 400 });

  const kind = params.get('kind') === 'cam' ? 'cam' : 'wand';
  const light = params.get('light') === 'uv' ? 'uv' : 'white';
  const view = params.get('view') ?? '';

  try {
    const res = kind === 'cam' ? await snapCam(ip) : await snapWand(ip, light, view);
    if (!res.ok) throw new Error(`device responded ${res.status}`);

    const buffer = await res.arrayBuffer();
    if (buffer.byteLength === 0) throw new Error('empty image');

    return new NextResponse(buffer, { headers: { 'Content-Type': 'image/jpeg' } });
  } catch (e) {
    // 502로만 뭉개지면 원인 구분 불가
    const isTimeout = e instanceof Error && e.name === 'AbortError';
    const reason = isTimeout ? 'capture timeout' : ((e as Error).message ?? 'capture failed');
    return NextResponse.json({ error: reason }, { status: 502 });
  }
}
