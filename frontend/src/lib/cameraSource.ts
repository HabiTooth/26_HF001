export const WEBCAM_KEY = 'dev.useWebcam';

export function readWebcamPreference(hasDevice: boolean): boolean {
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem(WEBCAM_KEY);
  return stored !== null ? stored === 'true' : !hasDevice;
}

export function writeWebcamPreference(on: boolean) {
  try {
    localStorage.setItem(WEBCAM_KEY, String(on));
  } catch {
    // 저장 실패해도 이번 스캔엔 반영
  }
}

export function clearWebcamPreference() {
  try {
    localStorage.removeItem(WEBCAM_KEY);
  } catch {
  }
}
