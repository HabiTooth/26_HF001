import { test, expect, type ConsoleMessage } from '@playwright/test';
import { mkdir } from 'fs/promises';
import { SCREEN_CHECKS } from '../src/lib/qa/screens';
import { freezeMotion, mockApi, signIn } from './fixtures';

const SHOT_DIR = 'e2e/screenshots';

const IGNORED = [
  'Download the React DevTools',
  'ResizeObserver loop',
  'Failed to load resource',
  '[카카오맵]',
];

const isNoise = (text: string) => IGNORED.some((pattern) => text.includes(pattern));

const openPath = (path: string) => (path === '/report/1' ? '/report/42' : path);

test.beforeAll(async () => {
  await mkdir(SHOT_DIR, { recursive: true });
});

for (const screen of SCREEN_CHECKS) {
  test(`${screen.group} · ${screen.label} (${screen.path})`, async ({ page }, testInfo) => {
    const errors: string[] = [];

    page.on('console', (msg: ConsoleMessage) => {
      if (msg.type() === 'error' && !isNoise(msg.text())) errors.push(msg.text());
    });
    page.on('pageerror', (e) => errors.push(e.message));

    await signIn(page);
    await mockApi(page);

    const response = await page.goto(openPath(screen.path), { waitUntil: 'domcontentloaded' });
    expect(response?.status(), '페이지가 열림').toBeLessThan(400);

    await page.waitForLoadState('networkidle').catch(() => {});
    await freezeMotion(page);

    await expect(page.locator('body')).toBeVisible();

    for (const text of screen.expectText ?? []) {
      await expect(
        page.getByText(text, { exact: false }).first(),
        `"${text}" 가 화면에 있어야 함`,
      ).toBeVisible();
    }

    const shot = `${SHOT_DIR}/${screen.id}.png`;
    await page.screenshot({ path: shot, fullPage: true });
    await testInfo.attach(screen.label, { path: shot, contentType: 'image/png' });

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `가로 스크롤 없음 (넘친 폭 ${overflow}px)`).toBeLessThanOrEqual(1);

    expect(errors, `콘솔 에러 없음${errors.length ? `\n${errors.join('\n')}` : ''}`).toHaveLength(0);
  });
}
