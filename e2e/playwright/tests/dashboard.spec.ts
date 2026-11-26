import { test, expect } from '../fixtures/test-fixtures';

test.describe('Dashboard (Expo Web)', () => {
  test('renders hero card, daily goal progress, and opens Focus Session Setup modal', async ({
    authenticate,
    dashboardPage,
    focusPage,
    page,
    errorTracker,
  }) => {
    await authenticate();
    await dashboardPage.waitForLoaded();

    await expect(dashboardPage.missionBadge).toBeVisible();
    await expect(dashboardPage.resumeLearningButton).toBeVisible();
    await expect(dashboardPage.addTaskAction).toBeVisible();
    await expect(dashboardPage.focusLockAction).toBeVisible();
    await expect(dashboardPage.focusTimerAction).toBeVisible();

    await dashboardPage.openFocusSetup();
    await expect(focusPage.continueButton).toBeVisible();

    await page.getByRole('button', { name: 'Close focus session setup' }).click();
    await expect(focusPage.setupTitle).toBeHidden();
    expect(errorTracker.unexpectedConsoleErrors).toEqual([]);
  });
});
