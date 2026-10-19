import { afterEach, describe, expect, it, vi } from 'vitest';

const load = async () => {
  vi.resetModules();
  return import('./deviceClient');
};

describe('deviceFetch', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('기기 직접 요청이 되면 프록시를 부르지 않음', async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ seq: 1 }));
    vi.stubGlobal('fetch', fetcher);
    const { devicePending, lastDeviceRoute } = await load();
    await devicePending('scanner.local');
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(String(fetcher.mock.calls[0][0])).toBe('http://scanner.local/pending');
    expect(lastDeviceRoute()).toBe('direct');
  });

  it('직접 요청이 막히면 프록시로 가고 그 뒤로는 프록시만 씀', async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('blocked'))
      .mockResolvedValue(Response.json({ seq: 1 }));
    vi.stubGlobal('fetch', fetcher);
    const { devicePending, lastDeviceRoute } = await load();
    await devicePending('scanner.local');
    expect(String(fetcher.mock.calls[1][0])).toBe('/api/camera/pending?ip=scanner.local');
    expect(lastDeviceRoute()).toBe('proxy');
    await devicePending('scanner.local');
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(String(fetcher.mock.calls[2][0])).toBe('/api/camera/pending?ip=scanner.local');
  });

  it('프록시도 실패하면 다음에 다시 직접 요청부터 시도', async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('blocked'))
      .mockResolvedValueOnce(new Response(null, { status: 502 }))
      .mockResolvedValue(Response.json({ seq: 1 }));
    vi.stubGlobal('fetch', fetcher);
    const { devicePending } = await load();
    await devicePending('scanner.local');
    await devicePending('scanner.local');
    expect(String(fetcher.mock.calls[2][0])).toBe('http://scanner.local/pending');
  });
});
