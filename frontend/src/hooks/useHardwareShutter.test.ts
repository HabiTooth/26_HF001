import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useHardwareShutter } from './useHardwareShutter';

describe('hardware shutter transfer', () => {
  let root: Root;
  let container: HTMLDivElement;
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    container = document.createElement('div');
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
  async function mount(fetcher: ReturnType<typeof vi.fn>, onError = vi.fn()) {
    vi.stubGlobal('fetch', fetcher);
    const onCapture = vi.fn();
    function Probe() {
      useHardwareShutter({ host: 'scanner.test', enabled: true, onCapture, onError });
      return null;
    }
    await act(async () => root.render(createElement(Probe)));
    return onCapture;
  }
  const json = (seq: number) => Response.json({ seq });
  const image = () => new Response('jpeg', { headers: { 'Content-Type': 'image/jpeg' } });
  async function poll(ms = 3000) {
    await act(async () => { await vi.advanceTimersByTimeAsync(ms); });
  }

  it('does not show a connection warning for idle status polling failures', async () => {
    const onError = vi.fn();
    const fetcher = vi.fn()
      .mockResolvedValueOnce(json(0))
      .mockRejectedValueOnce(new Error('status timeout'))
      .mockResolvedValue(json(0));
    const onCapture = await mount(fetcher, onError);
    await poll();
    await poll(6000);
    await poll();
    expect(onCapture).not.toHaveBeenCalled();
    expect(onError.mock.calls.every(([message]) => message === null)).toBe(true);
  });

  it('shows a transfer notice only after repeated photo download failures', async () => {
    const onError = vi.fn();
    const fetcher = vi.fn()
      .mockResolvedValueOnce(json(0))
      .mockResolvedValueOnce(json(1))
      .mockResolvedValueOnce(new Response(null, { status: 502 }))
      .mockResolvedValueOnce(json(1))
      .mockResolvedValueOnce(new Response(null, { status: 502 }));
    await mount(fetcher, onError);
    await poll();
    expect(onError.mock.calls.every(([message]) => message === null)).toBe(true);
    await poll(6000);
    expect(onError).toHaveBeenLastCalledWith('촬영한 사진을 다시 받고 있어요. 잠시만 기다려 주세요.');
  });

  it('retries a failed white frame instead of losing that shutter sequence', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(json(10))
      .mockResolvedValueOnce(json(11))
      .mockResolvedValueOnce(new Response(null, { status: 502 }))
      .mockResolvedValueOnce(json(11))
      .mockResolvedValueOnce(image())
      .mockResolvedValueOnce(image())
      .mockResolvedValue(json(11));
    const onCapture = await mount(fetcher);
    await poll();
    expect(onCapture).not.toHaveBeenCalled();
    await poll(6000);
    expect(onCapture).toHaveBeenCalledTimes(1);
    await poll();
    expect(onCapture).toHaveBeenCalledTimes(1);
  });

  it('retains white while retrying UV so a consumed white frame is not requested twice', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(json(0))
      .mockResolvedValueOnce(json(1))
      .mockResolvedValueOnce(image())
      .mockRejectedValueOnce(new Error('UV timeout'))
      .mockResolvedValueOnce(json(1))
      .mockResolvedValueOnce(image());
    const onCapture = await mount(fetcher);
    await poll();
    expect(onCapture).not.toHaveBeenCalled();
    await poll(6000);
    expect(onCapture).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls.filter(([url]) => /[?&]i=0(&|$)/.test(String(url)))).toHaveLength(1);
    expect(fetcher.mock.calls.filter(([url]) => /[?&]i=1(&|$)/.test(String(url)))).toHaveLength(2);
  });

  it('accepts new shutter sequences after the scanner counter resets on reboot', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(json(50))
      .mockResolvedValueOnce(json(0))
      .mockResolvedValueOnce(json(1))
      .mockResolvedValueOnce(image())
      .mockResolvedValueOnce(image());
    const onCapture = await mount(fetcher);
    await poll();
    await poll();
    expect(onCapture).toHaveBeenCalledTimes(1);
  });
});
