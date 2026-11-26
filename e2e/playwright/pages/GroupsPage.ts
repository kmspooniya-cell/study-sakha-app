import { expect, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class GroupsPage extends BasePage {
  get heading(): Locator {
    return this.page.getByText('Study Groups', { exact: true });
  }

  get myGroupsTab(): Locator {
    return this.page.getByRole('tab', { name: 'My Groups' });
  }

  get recommendedTab(): Locator {
    return this.page.getByRole('tab', { name: 'Recommended' });
  }

  get searchInput(): Locator {
    return this.page.locator('input[placeholder="Search groups, exams (RAS, UPSC), subjects..."]');
  }

  get backToAllGroupsButton(): Locator {
    return this.page.getByRole('button', { name: 'Back to all groups' });
  }

  async waitForLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible();
  }
}
