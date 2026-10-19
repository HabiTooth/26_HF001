export const CONFIGURED_HOST = (process.env.NEXT_PUBLIC_ESP32_HOST ?? '').trim();

/** 스트림 81, 제어·촬영 80 */
export const withStreamPort = (host: string) => (host.includes(':') ? host : `${host}:81`);

export const controlHost = (address: string) => address.split(':')[0];

export function deviceAddress(storedIp: string | null | undefined): string | null {
  if (CONFIGURED_HOST) return withStreamPort(CONFIGURED_HOST);
  return storedIp ? withStreamPort(storedIp) : null;
}

export const streamUrl = (address: string) => `http://${address}/stream`;
