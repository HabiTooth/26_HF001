import { NextRequest, NextResponse } from 'next/server';

// 기기 셔터 컷 프록시. CORS 우회용
// wand 펌웨어는 백색·UV 두 장을 /pend로 전달

// 기기 응답 없으면 다음 폴에서 재시도
const PENDING_TIMEOUT = 1500;
const IMAGE_TIMEOUT = 10000;

const get = async (url: string, timeoutMs: number) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { cache: 'no-store', signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const ip = params.get('ip');
  if (!ip) return NextResponse.json({ error: 'ip required' }, { status: 400 });

  const index = params.get('i');

  try {
    if (index === null) {
      const res = await get(`http://${ip}/pending`, PENDING_TIMEOUT);
      if (!res.ok) throw new Error(`device responded ${res.status}`);
      return NextResponse.json(await res.json());
    }

    const i = index === '1' ? 1 : 0;
    const res = await get(`http://${ip}/pend?i=${i}&t=${Date.now()}`, IMAGE_TIMEOUT);
    if (!res.ok) throw new Error(`device responded ${res.status}`);

    const buffer = await res.arrayBuffer();
    if (buffer.byteLength === 0) throw new Error('empty image');

    return new NextResponse(buffer, { headers: { 'Content-Type': 'image/jpeg' } });
  } catch (e) {
    const isTimeout = e instanceof Error && e.name === 'AbortError';
    return NextResponse.json(
      { error: isTimeout ? 'pending timeout' : (e as Error).message },
      { status: 502 },
    );
  }
}
