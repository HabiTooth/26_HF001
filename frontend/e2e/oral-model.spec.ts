import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { mockApi, signIn } from './fixtures';

test.use({ channel: 'msedge' });
test('report uses final model, analysis data and reversible inside view', async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  const logs: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => logs.push(message.text()));
  await signIn(page);
  await mockApi(page);
  const asset = page.waitForResponse((response) =>
    response.url().endsWith('/models/oral-model.glb'),
  );
  await page.goto('/report/42', { waitUntil: 'domcontentloaded' });
  expect((await asset).status()).toBe(200);
  const button = page.getByRole('button', { name: '안쪽 보기', exact: true });
  await expect(button).toBeVisible();
  await expect(page.getByText('점수 변화 추이', { exact: true })).toBeVisible();
  expect(logs.some((line) => line.includes('32개 FDI 인식'))).toBe(true);
  expect(logs.some((line) => line.includes('GLB에 Tooth_'))).toBe(false);
  await mkdir('e2e/screenshots', { recursive: true });
  await page.screenshot({ path: 'e2e/screenshots/report-final-model.png', fullPage: true });
  await button.click();
  const front = page.getByRole('button', { name: '정면 보기', exact: true });
  await expect(front).toHaveAttribute('aria-pressed', 'true');
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'e2e/screenshots/report-final-model-inside.png', fullPage: true });
  await front.click();
  await expect(button).toHaveAttribute('aria-pressed', 'false');
  expect(errors).toEqual([]);
});
