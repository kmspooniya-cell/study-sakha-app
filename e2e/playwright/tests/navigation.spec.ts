import { test, expect } from '../fixtures/test-fixtures';

test.describe('Navigation (Expo Web)', () => {
  test('navigates across Dashboard, Study Planner, Groups, Notifications, Settings, and Profile', async ({
    authenticate,
    nav,
    dashboardPage,
    plannerPage,
    groupsPage,
    notificationsPage,
    settingsPage,
    page,
    errorTracker,
  }) => {
    await authenticate();
    await dashboardPage.waitForLoaded();

    await nav.openStudyPlanner();
    await plannerPage.waitForLoaded();

    await nav.openGroups();
    await groupsPage.waitForLoaded();

    await nav.openNotifications();
    await notificationsPage.waitForLoaded();

    await nav.openSettings();
    await settingsPage.waitForLoaded();

    await nav.openProfile();
    await expect(page.getByText('Sign Out', { exact: true }).or(page.getByText('Open Full Statistics'))).toBeVisible();

    await nav.openDashboard();
    await dashboardPage.waitForLoaded();
    expect(errorTracker.unexpectedConsoleErrors).toEqual([]);
  });
});
