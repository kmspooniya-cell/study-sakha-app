import { test, expect } from '../fixtures/test-fixtures';

test.describe('Notifications and Groups (Expo Web)', () => {
  test('opens Notifications, filters items, and marks notifications as read', async ({
    authenticate,
    nav,
    notificationsPage,
    page,
    errorTracker,
  }) => {
    await authenticate();
    await nav.openNotifications();
    await notificationsPage.waitForLoaded();

    await page.getByRole('button', { name: /Tests/ }).first().click();
    await page.getByRole('button', { name: 'All' }).first().click();

    const markAllVisible = await notificationsPage.markAllReadButton.isVisible().catch(() => false);
    if (markAllVisible) {
      await notificationsPage.markAllReadButton.click();
      await expect(notificationsPage.allCaughtUpText).toBeVisible();
    }
    expect(errorTracker.unexpectedConsoleErrors).toEqual([]);
  });

  test('opens Groups, switches tabs, enters group detail and navigates back cleanly', async ({
    authenticate,
    nav,
    groupsPage,
    page,
    errorTracker,
  }) => {
    await authenticate();
    await nav.openGroups();
    await groupsPage.waitForLoaded();

    await groupsPage.recommendedTab.click();
    await groupsPage.myGroupsTab.click();

    const firstGroup = page
      .locator('[aria-label^="Open "]:not([aria-label="Open menu"]):not([aria-label="Open Help Menu"])')
      .first();
    if (await firstGroup.isVisible().catch(() => false)) {
      await firstGroup.click();
      await expect(groupsPage.backToAllGroupsButton).toBeVisible();
      await groupsPage.backToAllGroupsButton.click();
      await groupsPage.waitForLoaded();
    }
    expect(errorTracker.unexpectedConsoleErrors).toEqual([]);
  });
});
