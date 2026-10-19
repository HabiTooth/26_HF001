import { test, expect } from '@playwright/test';
import { mockApi, signIn } from './fixtures';
import { SCAN_ZONES } from '../src/constants/scanZones';

test.use({ channel: 'msedge', viewport: { width: 390, height: 844 } });

const ok = (result: unknown) => ({ success: true, code: 'COMMON200', message: '성공', result });
const score = {
  total: 87,
  prevTotal: 57,
  delta: 30,
  calculusDeduction: 13,
  plaqueDeduction: 0,
  totalDeduction: 13,
  recoverableByBrushing: 0,
  ceilingByBrushing: 87,
  ceilingAfterScaling: 100,
  calculusToothCount: 2,
  plaqueToothCount: 0,
  detectedToothCount: 16,
  capturedZoneCount: 2,
  totalZoneCount: 13,
  primaryReason: 'NEW_CALCULUS',
  flags: ['LOW_COVERAGE', 'IMPROVING'],
  formulaText: '촬영한 치아 점수의 평균이며 치태 감점은 60% 반영돼요.',
  zones: [],
  scoreMismatch: null,
};

test('new report shows server scores, authenticated photos, overlay fallback and manual switching', async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  await signIn(page);
  await mockApi(page);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('**/api/reports/scan-sessions/42/llm-report', (route) =>
    route.fulfill({
      json: ok({
        sessionId: 42,
        management: [{ title: '구형 관리 추천', detail: '새 UI에는 표시하지 않아요.' }],
        disclaimer: '테스트용 참고 정보',
        score,
        interpretation: [
          '감점 13점은 모두 치석에서 왔어요.',
          '해석 두 번째',
          '해석 세 번째',
          '해석 네 번째',
        ],
        actions: [
          {
            code: 'SCALING',
            title: '치과 스케일링 예약',
            detail: '발견된 치석을 치과에서 확인해 보세요.',
            tag: '+13점',
            points: 13,
          },
          {
            code: 'FLOSS',
            title: '치실 사용',
            detail: '치아 사이 관리',
            tag: '재발 방지',
            points: 0,
          },
          {
            code: 'RECAPTURE',
            title: '다음 촬영',
            detail: '더 많은 구역 촬영',
            tag: '2 → 13구역',
            points: 0,
          },
          {
            code: 'MAINTAIN',
            title: '네 번째 행동',
            detail: '표시하지 않아요',
            tag: '유지',
            points: 0,
          },
        ],
      }),
    }),
  );
  await page.route('**/api/reports/scan-sessions/42/zones', (route) =>
    route.fulfill({
      json: ok({
        sessionId: 42,
        sessionScore: 80,
        capturedZoneCount: 2,
        totalZoneCount: 13,
        zones: SCAN_ZONES.map((z) => ({
          viewType: z.viewType,
          surfaceType: z.group === 'OUTER' ? 'OUTER' : 'INNER',
          captured: z.viewType === 'LOWER_FRONT' || z.viewType === 'OUTER_CENTER',
          zoneScore: z.viewType === 'LOWER_FRONT' ? 74 : z.viewType === 'OUTER_CENTER' ? 100 : null,
          whiteScanImageId: z.viewType === 'LOWER_FRONT' ? 301 : null,
          uvScanImageId: z.viewType === 'LOWER_FRONT' ? 302 : null,
          calculusZoneScore: 74,
          plaqueZoneScore: 100,
          detectedToothCount: 4,
          expectedToothCount: 4,
        })),
      }),
    }),
  );
  await page.route('**/api/reports/scan-images/*', (route) =>
    route.fulfill({
      json: ok({
        scanImageId: Number(route.request().url().split('/').pop()),
        teeth: [31, 32, 41, 42].map((toothNumber) => ({
          toothNumber,
          areaRatio: toothNumber === 41 ? 8.5 : 0,
          toothScore: toothNumber === 41 ? 74 : 100,
          riskLevel: toothNumber === 41 ? 'HIGH' : 'VERY_LOW',
        })),
      }),
    }),
  );
  await page.route('**/api/history/zones/**', (route) => route.fulfill({ json: ok([]) }));
  await page.route('**/api/history/teeth/**', (route) => route.fulfill({ json: ok([]) }));
  const fileRequests: string[] = [];
  await page.route('**/api/scan-images/**', (route) => {
    fileRequests.push(route.request().url());
    expect(route.request().headers().authorization).toMatch(/^Bearer /);
    if (route.request().url().endsWith('/301/overlay'))
      return route.fulfill({ status: 404, json: { code: 'AI4006' } });
    return route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#e2efff"/><text x="240" y="300" fill="#4a86d9" font-size="32">TEST PHOTO</text></svg>',
    });
  });
  await page.goto('/report/42');
  await expect(page.getByRole('heading', { name: '87점은 이렇게 나왔어요' })).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByText('감점 13점은 모두 치석에서 왔어요.')).toBeVisible();
  await expect(page.getByText(score.formulaText, { exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '위험 부위 분석', exact: true })).toHaveCount(0);
  await expect(page.getByText('스케일링으로만 회복', { exact: true })).toHaveCount(0);
  await expect(page.getByText('지난 스캔보다 30점 올랐어요', { exact: false })).toBeVisible();
  await expect(page.getByText('해석 네 번째', { exact: true })).toHaveCount(0);
  await expect(page.getByText('네 번째 행동', { exact: true })).toHaveCount(0);
  await expect(page.getByText('구형 관리 추천', { exact: true })).toHaveCount(0);
  const legend = page.getByRole('list', { name: '점수 막대 범례' });
  await expect(legend.getByRole('listitem')).toHaveCount(3);
  await expect(legend.getByText('치태 감점', { exact: true })).toBeVisible();
  const scoreBar = page.getByRole('img', {
    name: '종합 점수 87점, 치석 감점 13점, 치태 감점 0점',
    exact: true,
  });
  expect(
    await scoreBar
      .locator(':scope > span')
      .evaluateAll((segments) =>
        segments.every((segment) => getComputedStyle(segment).backgroundImage === 'none'),
      ),
  ).toBe(true);
  await expect(page.getByText('시간에 따른 변화', { exact: true })).toHaveCount(0);
  await expect(page.getByText('2/13구역', { exact: true })).toHaveCount(1);
  await expect(page.getByText('재발 방지', { exact: true })).toHaveClass(/bg-\[#E3F0EA\]/);
  await expect(page.getByText('2\/13구역', { exact: true })).toHaveClass(/bg-\[#E3EBF7\]/);
  await expect(page.getByRole('link', { name: '치과 스케일링 예약' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '관련 아티클 읽기' })).toBeVisible();
  await expect(page.locator('a[href="/products?session=42"]')).toHaveCount(1);
  await expect(page.getByRole('link', { name: '근처 치과 찾기', exact: true })).toHaveAttribute(
    'href',
    '/clinics',
  );
  await expect(page.getByRole('link', { name: '다음 스캔하기', exact: true })).toHaveAttribute(
    'href',
    '/scan',
  );
  await expect(page.getByRole('link', { name: '관리 용품 추천', exact: true })).toHaveAttribute(
    'href',
    '/products?session=42',
  );
  await expect(page.locator('main a[href^="/articles/"]')).toHaveCount(2);
  await page.getByRole('button', { name: '아랫니 앞니 74점', exact: true }).click();
  await expect(page.getByRole('button', { name: '구역 상세 닫기', exact: true })).toBeVisible();
  await expect(page.getByAltText('백색광 · 치석 촬영 원본')).toBeVisible();
  await expect(page.getByText('검출 표시가 없어 원본 사진을 보여드려요.')).toHaveCount(1);
  await page.getByRole('button', { name: '검출 표시 켜짐' }).first().click();
  await expect(page.getByRole('button', { name: '원본 보기' })).toBeVisible();
  await page.getByRole('button', { name: 'UV · 치태', exact: true }).click();
  await expect(page.getByAltText('UV · 치태 검출 영역 표시 사진')).toBeVisible();
  await expect(page.getByAltText('백색광 · 치석 촬영 원본')).toHaveCount(0);
  await page.getByRole('button', { name: '아랫니 오른쪽 가운데 앞니 · 주의', exact: true }).click();
  await expect(
    page.getByRole('group', { name: '아랫니 치아별 상태', exact: true }),
  ).not.toContainText('41');
  await expect(page.getByRole('button', { name: '3D에서 보기', exact: true })).toBeVisible();
  await expect(page.getByText('8.5%', { exact: true })).toHaveCount(2);
  await expect(page.getByText('FDI 41', { exact: true })).toHaveCount(0);
  await expect(page.locator('img[src="/images/dashboard/tooth-background.webp"]')).toHaveCount(0);
  await expect(page.getByRole('img', { name: /^구강 점수 변화:/ })).toBeVisible();
  await page.getByRole('img', { name: /^구강 점수 변화:/ }).scrollIntoViewIfNeeded();
  await expect(
    page.getByRole('img', { name: /^구강 점수 변화:/ }).locator('path.recharts-area-area'),
  ).toBeVisible();
  expect(
    await page
      .getByText('테스트용 참고 정보', { exact: true })
      .evaluate((node) => node === node.parentElement?.lastElementChild),
  ).toBe(true);
  expect(fileRequests.some((url) => url.endsWith('/301/file'))).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('report-v2-content.png'), fullPage: true });
  await page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: '87점은 이렇게 나왔어요' }) })
    .screenshot({ path: testInfo.outputPath('score-explanation.png') });
  await page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: '지금 할 일', exact: true }) })
    .screenshot({ path: testInfo.outputPath('actions.png') });
  await page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: '점수 변화 추이', exact: true }) })
    .screenshot({ path: testInfo.outputPath('trend.png') });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: '구역 상세 닫기', exact: true }).click();
  await expect(page.locator('#zone-detail-42')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('old reports keep existing guide when optional v2 data is absent', async ({ page }) => {
  test.setTimeout(120_000);
  await signIn(page);
  await mockApi(page);
  await page.route('**/api/reports/scan-sessions/42/llm-report', (route) =>
    route.fulfill({
      json: ok({
        sessionId: 42,
        score: null,
        interpretation: null,
        actions: null,
        notice: null,
        riskDetail: [],
        management: [{ title: '구형 관리 추천', detail: '기존 기록 관리법' }],
        disclaimer: '',
      }),
    }),
  );
  await page.route('**/api/reports/scan-sessions/*/zones', (route) =>
    route.fulfill({ status: 404 }),
  );
  await page.goto('/report/42');
  await expect(page.getByRole('heading', { name: 'AI 가이드', exact: true })).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByRole('heading', { name: /점은 이렇게 나왔어요/ })).toHaveCount(0);
  await expect(page.getByText('구형 관리 추천', { exact: true })).toBeVisible();
});
