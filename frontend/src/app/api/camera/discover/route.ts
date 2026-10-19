import { NextResponse } from 'next/server';
import dns from 'dns/promises';
import os from 'os';

// 서브넷 스캔으로 스캐너 탐색 기능
// 데모·로컬 환경용

export type FirmwareKind = 'wand' | 'cam';

// wand 펌웨어 /pending, 구 펌웨어 /status
const IDENTIFY: Array<{ kind: FirmwareKind; path: string; field: string }> = [
  { kind: 'wand', path: '/pending', field: 'seq' },
  { kind: 'cam', path: '/status', field: 'framesize' },
];

const probe = async (
  host: string,
  timeoutMs: number,
): Promise<{ kind: FirmwareKind; latencyMs: number } | null> => {
  for (const { kind, path, field } of IDENTIFY) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    const start = Date.now();
    try {
      const res = await fetch(`http://${host}${path}`, {
        cache: 'no-store',
        signal: controller.signal,
      });
      if (!res.ok) continue;
      const json = await res.json().catch(() => null);
      if (!!json && typeof json === 'object' && field in json) {
        return { kind, latencyMs: Date.now() - start };
      }
    } catch {
    } finally {
      clearTimeout(t);
    }
  }
  return null;
};

// mDNS 이름은 IP 스윕에 안 잡힘. 타임아웃 별도
const configuredHost = (process.env.NEXT_PUBLIC_ESP32_HOST ?? '').split(':')[0].trim();
const MDNS_TIMEOUT = 4000;
const PROBE_TIMEOUT = 700;

export async function GET() {
  const found: { ip: string; latencyMs: number; kind: FirmwareKind }[] = [];

  // 이름으로 찾은 기기는 IP 스윕 중복 제거
  let namedIp: string | null = null;

  if (configuredHost) {
    const hit = await probe(configuredHost, MDNS_TIMEOUT);
    if (hit) {
      // 첫 응답은 이름 해석 시간 포함
      const warm = await probe(configuredHost, MDNS_TIMEOUT);
      found.push({ ip: configuredHost, ...(warm ?? hit) });
      namedIp = await dns
        .lookup(configuredHost, { family: 4 })
        .then((r) => r.address)
        .catch(() => null);
    }
  }

  const bases = new Set<string>();
  for (const list of Object.values(os.networkInterfaces())) {
    for (const ni of list ?? []) {
      if (ni.family === 'IPv4' && !ni.internal) {
        bases.add(ni.address.split('.').slice(0, 3).join('.'));
      }
    }
  }

  const candidates: string[] = [];
  for (const base of bases) {
    for (let i = 1; i <= 254; i++) candidates.push(`${base}.${i}`);
  }

  const CONCURRENCY = 50;
  for (let i = 0; i < candidates.length; i += CONCURRENCY) {
    const batch = candidates.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (ip) => {
        if (ip === namedIp) return null;
        const hit = await probe(ip, PROBE_TIMEOUT);
        return hit === null ? null : { ip, ...hit };
      }),
    );
    for (const r of results) if (r) found.push(r);
  }

  // 이름으로 찾은 기기는 응답 속도와 무관하게 맨 앞
  const named = found.filter((d) => d.ip === configuredHost);
  const rest = found
    .filter((d) => d.ip !== configuredHost)
    .sort((a, b) => a.latencyMs - b.latencyMs);

  return NextResponse.json({ devices: [...named, ...rest] });
}
