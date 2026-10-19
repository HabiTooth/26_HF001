import { test, expect } from '@playwright/test';
import { mockApi, signIn } from './fixtures';

test.use({ channel: 'msedge', deviceScaleFactor: 1 });

test('comparison shows its studio background', async ({ page }) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page);
  await mockApi(page);
  await page.route('**/models/oral-model.glb', route => route.fulfill({ path: 'public/models/oral-model.glb', contentType: 'model/gltf-binary' }));
  await page.goto('/compare', { waitUntil: 'networkidle' });
  await expect(page.getByRole('button', { name: '안쪽 보기', exact: true })).toBeVisible({ timeout: 60000 });
  const image = page.locator('img[src*="compare-blue-studio"]');
  await expect(image).toHaveCSS('object-fit', 'cover');
  await expect.poll(() => image.evaluate(node => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await expect.poll(() => page.locator('canvas').first().evaluate(node => {
    const canvas = node as HTMLCanvasElement;
    return canvas.width / canvas.getBoundingClientRect().width;
  })).toBeGreaterThanOrEqual(1.45);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'e2e/screenshots/compare-background.png' });
});

test('report background preserves its ratio at mobile and desktop widths', async ({ page }) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page);
  await mockApi(page);
  await page.route('**/models/oral-model.glb', route => route.fulfill({ path: 'public/models/oral-model.glb', contentType: 'model/gltf-binary' }));
  await page.goto('/report/42', { waitUntil: 'networkidle' });
  await expect(page.getByRole('button', { name: '안쪽 보기', exact: true })).toBeVisible({ timeout: 60000 });
  const background = page.locator('img[src*="report-blue-studio"]');
  await expect(background).toHaveCSS('object-fit', 'cover');
  await expect.poll(() => background.evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    await page.waitForTimeout(1200);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const box = await background.boundingBox();
    expect(box!.width).toBeGreaterThan(300);
    await page.screenshot({ path: `e2e/screenshots/report-background-${width}.png` });
  }
});
