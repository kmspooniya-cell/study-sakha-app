import { test, expect } from '../fixtures/test-fixtures';

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
];

test.describe('Responsive Layouts, Health API & Console Hygiene (Expo Web)', () => {
  for (const vp of VIEWPORTS) {
    test(`renders SignIn cleanly without horizontal overflow at ${vp.name} (${vp.width}x${vp.height})`, async ({
      page,
      signInPage,
      errorTracker,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await signInPage.goto();
      await expect(signInPage.signInButton).toBeVisible();
      await expect(signInPage.createAccountLink).toBeVisible();
      await signInPage.assertNoHorizontalOverflow();
      expect(errorTracker.unexpectedConsoleErrors).toEqual([]);
    });
  }

  test('serves backend /api/health and /api/audio-catalog endpoints cleanly', async ({ request }) => {
    const healthRes = await request.get('/api/health');
    expect(healthRes.ok()).toBeTruthy();
    const health = await healthRes.json();
    expect(health.status).toBe('ok');

    const audioRes = await request.get('/api/audio-catalog');
    expect(audioRes.ok()).toBeTruthy();
    const catalog = await audioRes.json();
    expect(Array.isArray(catalog)).toBeTruthy();
    expect(catalog.length).toBeGreaterThanOrEqual(2);
  });
});
