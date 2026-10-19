import { test, expect } from '@playwright/test';
import { mockApi, signIn } from './fixtures';

test.use({ channel: 'msedge' });
// 치아 확대·넘기기·닫기 흐름
test('report hero focuses a tooth and steps through risky teeth', async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await signIn(page);
  await mockApi(page);
  await page.goto('/report/42', { waitUntil: 'domcontentloaded' });
  const inside = page.getByRole('button', { name: '안쪽 보기', exact: true });
  await expect(inside).toBeVisible({ timeout: 60_000 });
  const modelBox = await page.locator('canvas').first().boundingBox();
  const insideBox = await inside.boundingBox();
  expect(modelBox).not.toBeNull();
  expect(insideBox).not.toBeNull();
  // 넓은 화면은 app-frame zoom만큼 커짐
  const zoom = await page.evaluate(
    () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--app-zoom')) || 1,
  );
  expect(modelBox!.width).toBeLessThanOrEqual(480 * zoom + 1);
  expect(insideBox!.x + insideBox!.width).toBeLessThanOrEqual(modelBox!.x + modelBox!.width);
  await expect(inside).toHaveClass(/bg-\[#173A73\]\/35/);
  await expect(page.getByText(/신경 쓸 치아 \d+개/)).toBeVisible();

  await page
    .getByRole('button', { name: /^\d{2}번 (치석|치태)$/ })
    .first()
    .click();
  await expect(page.getByText(/^1 \/ \d+ 신경 쓸 치아$/)).toBeVisible();
  await expect(page.getByText(/^FDI \d{2}$/)).toBeVisible();
  await expect(inside).toBeHidden();

  await page.getByRole('button', { name: '다음 치아' }).click();
  await expect(page.getByText(/^2 \/ \d+ 신경 쓸 치아$/)).toBeVisible();

  // 16번은 보기 토글 노출
  await page.getByRole('button', { name: '전체 보기' }).click();
  await page.getByRole('button', { name: '16번 치석' }).click();
  await expect(page.getByText('FDI 16')).toBeVisible();
  const innerView = page.getByRole('button', { name: '치태 · 안쪽' });
  await expect(page.getByRole('button', { name: '치석 · 바깥쪽' })).toHaveAttribute('aria-pressed', 'true');
  await innerView.click();
  await expect(innerView).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: '전체 보기' }).click();
  await expect(inside).toBeVisible();
  expect(errors).toEqual([]);
});
