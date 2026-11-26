import { test, expect } from '../fixtures/test-fixtures';

test.describe('Settings & Repeated Drawer Navigation (Expo Web)', () => {
  test('navigates Settings categories/back and reopens Settings 10 times cleanly', async ({
    authenticate,
    nav,
    settingsPage,
    dashboardPage,
    page,
    errorTracker,
  }) => {
    await authenticate();

    for (let cycle = 1; cycle <= 10; cycle += 1) {
      await nav.openSettings();
      await settingsPage.waitForLoaded();

      if (cycle === 1) {
        await settingsPage.openCategory('Appearance & Personalization');
        await expect(page.getByText('App Appearance (Primary Owner)', { exact: true })).toBeVisible();
        await settingsPage.backButton.click();
        await settingsPage.waitForLoaded();
      }

      await nav.openDashboard();
      await dashboardPage.waitForLoaded();
    }

    expect(errorTracker.unexpectedConsoleErrors).toEqual([]);
  });
});
