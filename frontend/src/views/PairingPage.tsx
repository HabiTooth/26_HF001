'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Headphones, CheckCircle2, AlertCircle, Loader2, Wifi } from 'lucide-react';
import PageShell from '@/components/organisms/PageShell';
import SignalBars from '@/components/atoms/SignalBars';
import ListItem from '@/components/molecules/ListItem';
import type { SignalLevel } from '@/components/atoms/SignalBars';
import { useAuthStore } from '@/stores/authStore';
import { deviceApi, DEVICE_MODEL } from '@/lib/api/device';
import { CONFIGURED_HOST, controlHost, withStreamPort } from '@/lib/deviceAddress';

interface FoundDevice {
  ip: string;
  latencyMs: number;
}

const latencyToSignal = (ms: number): SignalLevel =>
  ms < 150 ? 'strong' : ms < 400 ? 'medium' : 'weak';

// IP일 때만 끝자리
const deviceNameFor = (host: string) => {
  const last = /^\d+\.\d+\.\d+\.(\d+)$/.exec(host)?.[1];
  return last ? `${DEVICE_MODEL} (${last})` : DEVICE_MODEL;
};

const ToothThumb = () => (
  <svg width="28" height="28" viewBox="75 45 255 258" fill="none">
    <defs>
      <linearGradient id="thumbGrad" x1="75" y1="0" x2="330" y2="0" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#4A86D9" />
        <stop offset="1" stopColor="#6BA4E8" />
      </linearGradient>
    </defs>
    <path
      d="M 194 79 C 171 59 138 58 116 76 C 95 94 91 122 100 151 C 106 171 115 194 126 219 L 147 268 C 152 281 160 286 174 283 L 174 221 C 174 202 185 190 200 190 C 215 190 226 202 226 221 L 226 283 C 240 286 248 281 253 268 L 274 219 C 285 194 294 171 300 151 C 309 122 305 94 284 76 C 267 62 245 58 225 64"
      stroke="url(#thumbGrad)"
      strokeWidth="15.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M 194 79 L 194 143"
      stroke="url(#thumbGrad)"
      strokeWidth="15.5"
      strokeLinecap="round"
    />
    <circle cx="194" cy="143" r="16.5" fill="url(#thumbGrad)" />
    <circle cx="222" cy="70" r="16.5" fill="url(#thumbGrad)" />
  </svg>
);

function withConfigured(devices: FoundDevice[]): FoundDevice[] {
  if (!CONFIGURED_HOST) return devices;
  const ip = controlHost(CONFIGURED_HOST);
  if (devices.some((d) => d.ip === ip)) return devices;
  return [...devices, { ip, latencyMs: 0 }];
}

const HELP_STEPS = [
  '기기 전원 스위치가 켜져 있고 표시등이 들어와 있는지 확인해요.',
  '휴대폰과 기기가 같은 WiFi에 붙어 있어야 해요. 5GHz 말고 2.4GHz로 연결해 주세요.',
  '기기를 껐다 켠 뒤 30초쯤 기다렸다가 다시 검색해요.',
  '그래도 안 잡히면 공유기를 재시작하거나 다른 WiFi에서 시도해 보세요.',
];

export default function PairingPage() {
  const router = useRouter();
  const { setDevice } = useAuthStore();
  const [scanState, setScanState] = useState<'scanning' | 'done'>('scanning');
  const [foundDevices, setFoundDevices] = useState<FoundDevice[]>([]);
  const [connectingIp, setConnectingIp] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const runDiscovery = useCallback(async () => {
    setScanState('scanning');
    try {
      const r = await fetch('/api/camera/discover');
      const { devices } = await r.json();
      setFoundDevices(withConfigured(Array.isArray(devices) ? devices : []));
    } catch {
      setFoundDevices(withConfigured([]));
    }
    setScanState('done');
  }, []);

  useEffect(() => {
    runDiscovery();
  }, [runDiscovery]);

  const handleWiFiConnect = async (targetIp: string) => {
    setConnectingIp(targetIp);
    try {
      const res = await deviceApi.register();
      setDevice(res.data.result.deviceId, targetIp);
    } catch {
      // DEVICE_ALREADY_REGISTERED면 기존 deviceId 재사용
      try {
        const status = await deviceApi.getStatus();
        const existing = status.data.result[0];
        setDevice(existing?.deviceId ?? 1, targetIp);
      } catch {
        setDevice(1, targetIp);
      }
    }
    setTimeout(() => router.push('/dashboard'), 1500);
  };

  const [recommended, ...others] = foundDevices;

  return (
    <PageShell className="overflow-x-hidden">
      <div className="px-5 pt-[56px]">
        <div className="flex items-center mb-4 relative z-10">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center p-1 bg-transparent border-none cursor-pointer text-content"
          >
            <ChevronLeft size={24} />
          </button>
          <h2 className="absolute left-1/2 -translate-x-1/2 m-0 text-[18px] font-bold text-content">
            디바이스 연결
          </h2>
        </div>

        <div className="bg-white/90 backdrop-blur-sm rounded-[16px] shadow-card px-4 py-3 mb-5 relative z-10">
          <p className="m-0 text-[12px] text-muted leading-relaxed">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mr-1.5 mb-0.5 align-middle" />
            기기의 전원을 켜 주세요.
          </p>
          <p className="m-0 text-[12px] text-muted leading-relaxed mt-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mr-1.5 mb-0.5 align-middle" />
            휴대폰과 기기가 같은 WiFi에 연결되어 있어야 해요.
          </p>
        </div>

        <div className="flex flex-col items-center mb-6 relative z-10">
          <div className="relative w-[200px] h-[200px] flex items-center justify-center mb-3">
            {(scanState === 'scanning' || !!connectingIp) && (
              <>
                <div className="scan-ring" style={{ animationDelay: '0s' }} />
                <div className="scan-ring" style={{ animationDelay: '0.8s' }} />
                <div className="scan-ring" style={{ animationDelay: '1.6s' }} />
              </>
            )}
            <div
              className={`w-[110px] h-[110px] rounded-full shadow-card flex items-center justify-center relative z-10 transition-colors duration-300 ${
                connectingIp ? 'bg-success/10' : 'bg-white'
              }`}
            >
              {connectingIp ? (
                <CheckCircle2 size={44} className="text-success" />
              ) : (
                <Wifi size={44} color="#4A86D9" strokeWidth={1.5} />
              )}
            </div>
          </div>

          {connectingIp ? (
            <p className="text-success font-semibold text-[15px] m-0 mb-2.5">연결 중이에요!</p>
          ) : scanState === 'scanning' ? (
            <p className="text-primary font-medium text-[14px] m-0 mb-2.5">
              주변 기기를 검색하고 있어요...
            </p>
          ) : foundDevices.length > 0 ? (
            <p className="text-muted text-[14px] m-0 mb-3">
              기기 {foundDevices.length}대를 찾았어요.
            </p>
          ) : (
            <p className="text-muted text-[14px] m-0 mb-3">검색된 기기가 없어요.</p>
          )}

          {scanState === 'scanning' && (
            <div className="flex gap-2">
              <div className="scan-dot" style={{ animationDelay: '0s' }} />
              <div className="scan-dot" style={{ animationDelay: '0.3s' }} />
              <div className="scan-dot" style={{ animationDelay: '0.6s' }} />
            </div>
          )}
        </div>

        <div className="relative z-10 mb-4">
          <p className="text-[13px] font-semibold text-content mb-2">발견된 기기</p>

          {scanState === 'scanning' && (
            <div className="bg-white rounded-[16px] shadow-card p-4 flex items-center gap-3">
              <Loader2 size={18} className="text-primary animate-spin flex-shrink-0" />
              <span className="text-[13px] text-muted">주변에서 기기를 검색하고 있어요...</span>
            </div>
          )}

          {scanState === 'done' && !recommended && (
            <div className="bg-white rounded-[16px] shadow-card p-4 flex items-center gap-3">
              <AlertCircle size={18} className="text-muted flex-shrink-0" />
              <span className="flex-1 text-[13px] text-muted">
                기기를 찾지 못했어요. 기기 전원과 WiFi 연결을 확인해 주세요.
              </span>
              <button
                type="button"
                onClick={runDiscovery}
                className="px-3 h-8 border border-primary/40 text-primary text-[12px] font-medium rounded-[8px] cursor-pointer bg-transparent whitespace-nowrap"
              >
                다시 검색
              </button>
            </div>
          )}

          {scanState === 'done' && recommended && (
            <div className="bg-white rounded-[16px] border-[1.5px] border-primary/30 shadow-card p-4 flex items-center gap-3">
              <div className="w-[46px] h-[46px] bg-[#EAF2FC] rounded-[12px] flex items-center justify-center flex-shrink-0">
                <ToothThumb />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[13px] font-semibold text-content truncate">
                    {deviceNameFor(recommended.ip)}
                  </span>
                  <span className="text-[10px] font-bold text-white bg-primary rounded-[4px] px-1.5 py-[2px] flex-shrink-0">
                    추천
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[12px] text-muted truncate">
                    {recommended.ip} · {recommended.latencyMs}ms
                  </span>
                  <SignalBars level={latencyToSignal(recommended.latencyMs)} />
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleWiFiConnect(withStreamPort(recommended.ip))}
                disabled={!!connectingIp}
                className="px-3.5 h-9 bg-primary text-white text-[13px] font-semibold rounded-[10px] flex-shrink-0 cursor-pointer disabled:opacity-60 whitespace-nowrap"
              >
                {connectingIp === withStreamPort(recommended.ip) ? '연결 중...' : '연결하기'}
              </button>
            </div>
          )}
        </div>

        {scanState === 'done' && others.length > 0 && (
          <div className="relative z-10 mb-4">
            <p className="text-[13px] font-semibold text-content mb-2">다른 기기</p>
            <div className="flex flex-col gap-2">
              {others.map((device) => (
                <ListItem
                  key={device.ip}
                  left={
                    <div className="w-9 h-9 bg-hairline rounded-[10px] flex items-center justify-center">
                      <Wifi size={16} color="#8A94A6" />
                    </div>
                  }
                  title={deviceNameFor(device.ip)}
                  subtitle={
                    <>
                      <span className="text-[12px] text-muted truncate">
                        {device.ip} · {device.latencyMs}ms
                      </span>
                      <SignalBars level={latencyToSignal(device.latencyMs)} />
                    </>
                  }
                  right={
                    <button
                      type="button"
                      onClick={() => handleWiFiConnect(withStreamPort(device.ip))}
                      disabled={!!connectingIp}
                      className="px-3 h-8 border border-hairline text-content text-[12px] font-medium rounded-[8px] cursor-pointer bg-transparent disabled:opacity-60 whitespace-nowrap"
                    >
                      {connectingIp === withStreamPort(device.ip) ? '연결 중...' : '연결'}
                    </button>
                  }
                />
              ))}
            </div>
          </div>
        )}

        <div className="relative z-10 mb-4 space-y-2.5">
          {scanState === 'done' && !connectingIp && (
            <button
              type="button"
              onClick={runDiscovery}
              className="w-full h-[54px] rounded-[14px] bg-primary-gradient text-white text-[15px] font-semibold shadow-button flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <Wifi size={18} />
              다시 검색하기
            </button>
          )}
        </div>

        <div className="relative z-10 bg-[#D6E6F8] rounded-[14px] px-4 py-3.5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/50 flex items-center justify-center flex-shrink-0">
              <Headphones size={17} color="#4A86D9" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="m-0 text-[13px] font-semibold text-content">
                연결에 문제가 있으신가요?
              </p>
              <p className="m-0 text-[12px] text-muted mt-0.5">아래 순서대로 확인해 보세요.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowHelp((v) => !v)}
              className="px-3 h-8 border border-primary/30 rounded-[8px] text-[12px] font-medium text-primary flex-shrink-0 cursor-pointer bg-white/70 whitespace-nowrap"
            >
              {showHelp ? '접기' : '도움말 보기'}
            </button>
          </div>

          {showHelp && (
            <ol className="m-0 mt-3 pt-3 border-t border-white/70 pl-4 flex flex-col gap-1.5">
              {HELP_STEPS.map((step) => (
                <li key={step} className="text-[12px] text-content leading-[1.5]">
                  {step}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </PageShell>
  );
}
