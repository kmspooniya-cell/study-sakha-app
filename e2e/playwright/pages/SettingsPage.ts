import { expect, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class SettingsPage extends BasePage {
  get categoriesHeading(): Locator {
    return this.page.getByText('ALL SETTINGS CATEGORIES (12)', { exact: true });
  }

  get searchInput(): Locator {
    return this.page.locator('input[placeholder*="Search settings"]');
  }

  get backButton(): Locator {
    return this.page.getByRole('button', { name: 'Back to previous Settings screen' });
  }

  async waitForLoaded(): Promise<void> {
    await expect(this.categoriesHeading).toBeVisible();
  }

  async openCategory(title: string): Promise<void> {
    await this.page.getByText(title, { exact: true }).first().click();
  }
}
