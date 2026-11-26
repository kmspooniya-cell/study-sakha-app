import { expect, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class DashboardPage extends BasePage {
  get heroHeading(): Locator {
    return this.page.getByText('Make today count.', { exact: true }).last();
  }

  get missionBadge(): Locator {
    return this.page.getByText("TODAY'S MISSION", { exact: true }).last();
  }

  get resumeLearningButton(): Locator {
    return this.page.getByRole('button', { name: 'Resume learning' }).last();
  }

  get focusTimerAction(): Locator {
    return this.page.getByRole('button', { name: /Focus Timer/ }).last();
  }

  get addTaskAction(): Locator {
    return this.page.getByRole('button', { name: /Add Task/ }).last();
  }

  get focusLockAction(): Locator {
    return this.page.getByRole('button', { name: /Focus Lock/ }).last();
  }

  async waitForLoaded(): Promise<void> {
    await expect(this.heroHeading).toBeVisible({ timeout: 15_000 });
    await expect(this.missionBadge).toBeVisible();
  }

  async openFocusSetup(): Promise<void> {
    await this.focusTimerAction.click();
    await expect(this.page.getByText('Focus Session Setup', { exact: true })).toBeVisible();
  }
}
