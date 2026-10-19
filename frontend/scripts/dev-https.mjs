// 폰 카메라는 보안 컨텍스트 필요.
// next --experimental-https는 인증서 실패 시 경고 없이 평문 HTTP로 폴백함
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import path from 'node:path';
import { X509Certificate } from 'node:crypto';

const CERT_DIR = 'certificates';
const CERT = path.join(CERT_DIR, 'localhost.pem');
const KEY = path.join(CERT_DIR, 'localhost-key.pem');

// 가상 어댑터 주소는 폰에서 안 닿음
const VIRTUAL = /vmware|virtualbox|vethernet|hyper-v|loopback|bluetooth|docker|wsl/i;

function lanAddresses() {
  return Object.entries(networkInterfaces())
    .filter(([name]) => !VIRTUAL.test(name))
    .flatMap(([, addrs]) => addrs ?? [])
    .filter((a) => a.family === 'IPv4' && !a.internal && !a.address.startsWith('169.254.'))
    .map((a) => a.address);
}

function findMkcert() {
  const local = path.join(process.env.LOCALAPPDATA ?? '', 'mkcert');
  if (existsSync(local)) {
    const exe = readdirSync(local).find((f) => /^mkcert.*\.exe$/i.test(f));
    if (exe) return path.join(local, exe);
  }
  try {
    execFileSync('mkcert', ['-CAROOT'], { stdio: 'ignore' });
    return 'mkcert';
  } catch {
    return null;
  }
}

function certCovers(ips) {
  if (!existsSync(CERT) || !existsSync(KEY)) return false;
  try {
    const cert = new X509Certificate(readFileSync(CERT));
    if (new Date(cert.validTo) < new Date()) return false;
    const names = (cert.subjectAltName ?? '')
      .split(',')
      .map((s) => s.trim().replace(/^(DNS|IP Address):/, ''));
    return ips.every((ip) => names.includes(ip));
  } catch {
    return false;
  }
}

const ips = lanAddresses();

if (certCovers(ips)) {
  console.log('기존 인증서가 현재 IP를 모두 포함해요.');
} else {
  const mkcert = findMkcert();
  if (!mkcert) {
    console.error(
      'mkcert를 찾지 못했어요.\n' +
        'npx next dev --experimental-https 를 한 번 실행하면 자동으로 내려받아요.',
    );
    process.exit(1);
  }

  mkdirSync(CERT_DIR, { recursive: true });
  const names = ['localhost', '127.0.0.1', '::1', ...ips];
  console.log(`인증서를 새로 만들어요: ${names.join(', ')}`);
  execFileSync(mkcert, ['-cert-file', CERT, '-key-file', KEY, ...names], { stdio: 'inherit' });

  if (!certCovers(ips)) {
    console.error('인증서 생성에 실패했어요. 위 mkcert 출력을 확인해 주세요.');
    process.exit(1);
  }
}

const port = process.env.PORT ?? '3000';

console.log('\n폰에서 접속할 주소:');
for (const ip of ips) console.log(`  https://${ip}:${port}`);
console.log('  인증서 경고가 뜨면 고급 → 안전하지 않음(계속)\n');

// Node 22는 .cmd 실행 차단
const nextBin = path.join('node_modules', 'next', 'dist', 'bin', 'next');

spawn(
  process.execPath,
  [
    nextBin,
    'dev',
    '-H',
    '0.0.0.0',
    '-p',
    port,
    '--experimental-https',
    '--experimental-https-key',
    KEY,
    '--experimental-https-cert',
    CERT,
  ],
  { stdio: 'inherit' },
).on('exit', (code) => process.exit(code ?? 0));
