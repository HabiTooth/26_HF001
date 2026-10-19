'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, Monitor, RefreshCw, Smartphone, Trash2, Wifi, XCircle } from 'lucide-react';
import PageShell from '@/components/organisms/PageShell';
import { useAuthStore } from '@/stores/authStore';
import { userApi } from '@/lib/api/user';
import type { DeviceStatusResponse } from '@/lib/api/device';
import {
  clearWebcamPreference,
  readWebcamPreference,
  writeWebcamPreference,
} from '@/lib/cameraSource';
import { CONFIGURED_HOST, controlHost, deviceAddress, streamUrl } from '@/lib/deviceAddress';
import { devicePending, lastDeviceRoute } from '@/lib/deviceClient';
import PageHeader from '@/components/molecules/PageHeader';

type Probe = { state: 'idle' | 'running' | 'ok' | 'fail'; reason?: string };

// 미리보기는 브라우저가 기기에 직접 붙음
const probeStream = (address: string) =>
  new Promise<Probe>((resolve) => {
    const img = new Image();
    const done = (result: Probe) => {
      clearTimeout(timer);
      img.onload = null;
      img.onerror = null;
      img.src = '';
      resolve(result);
    };
    const timer = setTimeout(() => done({ state: 'fail', reason: '6초 안에 응답 없음' }), 6000);
    img.onload = () => done({ state: 'ok' });
    img.onerror = () => done({ state: 'fail', reason: '연결 실패' });
    img.src = `${streamUrl(address)}?t=${Date.now()}`;
  });

// 촬영은 기기 직접 요청 후 안 되면 서버 프록시
const probeCapture = async (address: string): Promise<Probe> => {
  try {
    const res = await devicePending(controlHost(address));
    if (res.ok) {
      return {
        state: 'ok',
        reason: lastDeviceRoute() === 'direct' ? '기기에 직접 연결' : '서버를 거쳐 연결',
      };
    }
    const body = await res.json().catch(() => null);
    return { state: 'fail', reason: body?.error ?? `HTTP ${res.status}` };
  } catch {
    return { state: 'fail', reason: '기기 직접 요청과 서버 경유 모두 실패' };
  }
};

function ProbeRow({ label, probe, hint }: { label: string; probe: Probe; hint: string }) {
  return (
    <div className="flex items-start gap-2.5 py-2">
      <span className="mt-0.5 flex-shrink-0">
        {probe.state === 'running' && <Loader2 size={16} className="animate-spin text-primary" />}
        {probe.state === 'ok' && <CheckCircle2 size={16} className="text-success" />}
        {probe.state === 'fail' && <XCircle size={16} className="text-danger" />}
        {probe.state === 'idle' && <span className="block w-4 h-4 rounded-full bg-hairline" />}
      </span>
      <div className="flex-1 min-w-0">
        <p className="m-0 text-[13px] font-semibold text-content">{label}</p>
        <p className="m-0 text-[11px] text-muted">{probe.reason ?? hint}</p>
      </div>
    </div>
  );
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${
        on ? 'bg-primary' : 'bg-hairline'
      }`}
    >
      <div
        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          on ? 'translate-x-[22px]' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

export default function DeviceSettingsPage() {
  const router = useRouter();
  const { deviceId, deviceIp, clearDevice } = useAuthStore();
  const [stream, setStream] = useState<Probe>({ state: 'idle' });
  const [capture, setCapture] = useState<Probe>({ state: 'idle' });
  const [device, setDevice] = useState<DeviceStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [useWebcam, setUseWebcam] = useState(false);

  useEffect(() => {
    setUseWebcam(readWebcamPreference(Boolean(deviceIp)));

    userApi
      .getDeviceStatus()
      .then((res) => setDevice(res.data.result?.[0] ?? null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [deviceIp]);

  const toggleWebcam = () => {
    const next = !useWebcam;
    setUseWebcam(next);
    writeWebcamPreference(next);
  };

  // 등록 해제 API 없음. 로컬 연결만 끊음
  const registered = deviceId !== null || Boolean(deviceIp) || device !== null;
  const address = deviceAddress(deviceIp);

  const runCheck = async () => {
    if (!address) return;
    setStream({ state: 'running' });
    setCapture({ state: 'running' });
    const [s, c] = await Promise.all([probeStream(address), probeCapture(address)]);
    setStream(s);
    setCapture(c);
  };

  const disconnect = () => {
    clearDevice();
    clearWebcamPreference();
    router.push('/pairing');
  };

  return (
    <PageShell>
      <PageHeader title="디바이스 설정" />

      <div className="px-5 pt-4 flex flex-col gap-4">
        <div className="bg-white/90 backdrop-blur-sm rounded-[20px] shadow-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center flex-shrink-0">
              <Smartphone size={18} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="m-0 text-[14px] font-semibold text-content">
                {loading ? '불러오는 중...' : (device?.modelName ?? '연결된 스캐너 없음')}
              </p>
              <p className="m-0 text-[11px] text-muted">
                {address ? `주소 ${address}` : '페어링하면 여기에 표시돼요'}
              </p>
              {CONFIGURED_HOST && (
                <p className="m-0 text-[10px] text-muted">
                  .env의 NEXT_PUBLIC_ESP32_HOST를 쓰는 중
                </p>
              )}
            </div>
            {loading && <Loader2 size={16} className="animate-spin text-primary" />}
          </div>

          {device !== null && (
            <div className="flex flex-col gap-0.5 pt-3 border-t border-dashed border-hairline">
              <p className="m-0 text-[11px] text-muted">일련번호 {device.serialNumber}</p>
              <p className="m-0 text-[11px] text-muted">펌웨어 {device.firmwareVersion}</p>
              <p className="m-0 text-[11px] text-muted">
                {device.connected ? '연결됨' : '연결 끊김'}
              </p>
            </div>
          )}
        </div>

        {address && (
          <div className="bg-white/90 backdrop-blur-sm rounded-[20px] shadow-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center flex-shrink-0">
                <Wifi size={18} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="m-0 text-[13px] font-semibold text-content">스캐너 연결 확인</p>
                <p className="m-0 text-[11px] text-muted">미리보기와 촬영 경로를 각각 확인해요</p>
              </div>
              <button
                type="button"
                onClick={runCheck}
                disabled={stream.state === 'running'}
                className="px-3 py-1.5 rounded-full bg-primary text-white text-[12px] font-semibold disabled:opacity-50"
              >
                확인
              </button>
            </div>
            {stream.state !== 'idle' && (
              <div className="mt-3 pt-2 border-t border-dashed border-hairline">
                <ProbeRow label="미리보기" probe={stream} hint="이 브라우저에서 기기 영상으로 직접 연결" />
                <ProbeRow label="촬영" probe={capture} hint="서버가 기기에 촬영 요청" />
                {capture.state === 'fail' && stream.state === 'ok' && (
                  <p className="m-0 mt-1 text-[11px] text-muted leading-relaxed">
                    영상은 되는데 촬영이 안 되면 서버가 기기와 같은 네트워크에 없는 거예요.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="bg-white/90 backdrop-blur-sm rounded-[20px] shadow-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center flex-shrink-0">
              <Monitor size={18} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="m-0 text-[13px] font-semibold text-content">웹캠으로 촬영</p>
              <p className="m-0 text-[11px] text-muted">
                스캐너 대신 이 기기 카메라로 찍어요
              </p>
            </div>
            <Toggle on={useWebcam} onToggle={toggleWebcam} />
          </div>

          {useWebcam && deviceIp && (
            <p className="m-0 mt-3 pt-3 border-t border-dashed border-hairline text-[11px] text-muted leading-relaxed">
              스캐너가 연결돼 있는데도 웹캠을 쓰고 있어요. 스캐너로 찍으려면 이 설정을 꺼 주세요.
            </p>
          )}
        </div>

        {!loading &&
          (registered ? (
            <button
              type="button"
              onClick={disconnect}
              className="w-full py-4 rounded-[14px] bg-white/90 backdrop-blur-sm shadow-card border border-hairline flex items-center justify-center gap-2 text-[13px] font-semibold text-danger"
            >
              <Trash2 size={15} />
              연결 해제하고 다시 등록
            </button>
          ) : (
            <button
              type="button"
              onClick={() => router.push('/pairing')}
              className="w-full py-4 rounded-[14px] bg-primary-gradient text-white text-[15px] font-semibold shadow-button flex items-center justify-center gap-2"
            >
              <RefreshCw size={16} />
              스캐너 등록하기
            </button>
          ))}

        <p className="m-0 px-1 text-[10px] text-muted leading-relaxed">
          연결을 해제하면 이 기기에 저장된 스캐너 정보와 촬영 설정이 지워지고 등록 화면으로
          넘어가요. 계정과 스캔 기록은 그대로예요.
        </p>
      </div>
    </PageShell>
  );
}
