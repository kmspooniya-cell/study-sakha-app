import { expect, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class NotificationsPage extends BasePage {
  get heading(): Locator {
    return this.page.getByText('Notifications', { exact: true }).first();
  }

  get markAllReadButton(): Locator {
    return this.page.getByRole('button', { name: /Mark all (as )?read/i }).first();
  }

  get allCaughtUpText(): Locator {
    return this.page.getByText('You are all caught up', { exact: true });
  }

  async waitForLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible();
  }
}
