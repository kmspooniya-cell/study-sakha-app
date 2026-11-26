import { test as base, expect, type Page } from '@playwright/test';
import { SignInPage } from '../pages/SignInPage';
import { NavigationHelper } from '../pages/NavigationHelper';
import { DashboardPage } from '../pages/DashboardPage';
import { PlannerPage } from '../pages/PlannerPage';
import { FocusPage } from '../pages/FocusPage';
import { NotificationsPage } from '../pages/NotificationsPage';
import { GroupsPage } from '../pages/GroupsPage';
import { SettingsPage } from '../pages/SettingsPage';

export type AuthMode = 'live' | 'mock' | 'none';

export interface PageErrorTracker {
  pageErrors: string[];
  unexpectedConsoleErrors: string[];
  knownWebEnvErrors: string[];
}

const KNOWN_WEB_ENV_ERROR_PATTERNS = [
  /ExpoNotifications\.getLastNotificationResponse is not available on web/i,
  /net::ERR_INTERNET_DISCONNECTED/i,
  /Failed to load resource: net::ERR_NAME_NOT_RESOLVED/i,
];

export function resolveAuthMode(): AuthMode {
  if (process.env.PLAYWRIGHT_TEST_EMAIL?.trim() && process.env.PLAYWRIGHT_TEST_PASSWORD?.trim()) {
    return 'live';
  }
  if (process.env.PLAYWRIGHT_MOCK_AUTH === '1') {
    return 'mock';
  }
  return 'none';
}

export async function installMockSupabaseAuth(page: Page): Promise<void> {
  const testUser = {
    id: 'e2e-mock-user-0001',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'e2e-aspirant@studysakha.local',
    created_at: '2026-01-01T00:00:00.000Z',
    user_metadata: {
      display_name: 'E2E Aspirant',
      exam_id: 'upsc',
    },
  };

  const mockSession = {
    access_token: 'mock-access-token-e2e',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: 'mock-refresh-token-e2e',
    user: testUser,
  };

  await page.route('**/auth/v1/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/token')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockSession),
      });
    }
    if (url.includes('/user')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(testUser),
      });
    }
    if (url.includes('/logout')) {
      return route.fulfill({ status: 204, body: '' });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    });
  });

  await page.route('**/rest/v1/**', async (route) => {
    const url = route.request().url();
    if (url.includes('profiles')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: testUser.id,
          display_name: 'E2E Aspirant',
          exam_id: 'upsc',
          joined_at: '2026-01-01',
        }),
      });
    }
    if (url.includes('rpc/is_admin')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: 'false',
      });
    }
    if (url.includes('rpc/push_account_sync_document')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ version: 1, updated_at: new Date().toISOString() }]),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });
}

type StudySakhaFixtures = {
  errorTracker: PageErrorTracker;
  signInPage: SignInPage;
  nav: NavigationHelper;
  dashboardPage: DashboardPage;
  plannerPage: PlannerPage;
  focusPage: FocusPage;
  notificationsPage: NotificationsPage;
  groupsPage: GroupsPage;
  settingsPage: SettingsPage;
  authMode: AuthMode;
  authenticate: () => Promise<void>;
};

export const test = base.extend<StudySakhaFixtures>({
  errorTracker: async ({ page }, use) => {
    const tracker: PageErrorTracker = {
      pageErrors: [],
      unexpectedConsoleErrors: [],
      knownWebEnvErrors: [],
    };
    page.on('pageerror', (err) => {
      tracker.pageErrors.push(err.message || String(err));
    });
    page.on('console', (msg) => {
      if (msg.type() !== 'error') return;
      const text = msg.text();
      if (KNOWN_WEB_ENV_ERROR_PATTERNS.some((pattern) => pattern.test(text))) {
        tracker.knownWebEnvErrors.push(text);
      } else {
        tracker.unexpectedConsoleErrors.push(text);
      }
    });
    await use(tracker);
    expect(tracker.pageErrors, `Uncaught page errors: ${tracker.pageErrors.join(' | ')}`).toEqual([]);
  },
  authMode: async ({}, use) => {
    await use(resolveAuthMode());
  },
  signInPage: async ({ page }, use) => {
    await use(new SignInPage(page));
  },
  nav: async ({ page }, use) => {
    await use(new NavigationHelper(page));
  },
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },
  plannerPage: async ({ page }, use) => {
    await use(new PlannerPage(page));
  },
  focusPage: async ({ page }, use) => {
    await use(new FocusPage(page));
  },
  notificationsPage: async ({ page }, use) => {
    await use(new NotificationsPage(page));
  },
  groupsPage: async ({ page }, use) => {
    await use(new GroupsPage(page));
  },
  settingsPage: async ({ page }, use) => {
    await use(new SettingsPage(page));
  },
  authenticate: async ({ page, signInPage, dashboardPage, authMode }, use) => {
    await use(async () => {
      if (authMode === 'none') {
        test.skip(
          true,
          'Authenticated web E2E requires PLAYWRIGHT_TEST_EMAIL & PLAYWRIGHT_TEST_PASSWORD or PLAYWRIGHT_MOCK_AUTH=1.'
        );
        return;
      }

      if (authMode === 'mock') {
        await installMockSupabaseAuth(page);
        await signInPage.goto();
        await signInPage.signIn('e2e-aspirant@studysakha.local', 'MockPass123!');
        await dashboardPage.waitForLoaded();
        return;
      }

      await signInPage.goto();
      await signInPage.signIn(
        process.env.PLAYWRIGHT_TEST_EMAIL!.trim(),
        process.env.PLAYWRIGHT_TEST_PASSWORD!.trim()
      );
      await dashboardPage.waitForLoaded();
    });
  },
});

export { expect };
