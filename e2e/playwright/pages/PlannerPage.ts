import { expect, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class PlannerPage extends BasePage {
  get heading(): Locator {
    return this.page.getByText('Study Planner', { exact: true }).last();
  }

  get calendarSwitch(): Locator {
    return this.page.getByText('Calendar', { exact: true });
  }

  get listSwitch(): Locator {
    return this.page.getByText('List', { exact: true });
  }

  get addPlanButton(): Locator {
    return this.page.getByText('Add Plan', { exact: true }).first();
  }

  get taskTitleInput(): Locator {
    return this.page.locator('input[placeholder="Task Title"]');
  }

  get durationInput(): Locator {
    return this.page.getByRole('textbox', { name: 'Planned duration minutes' });
  }

  get saveButton(): Locator {
    return this.page.getByText(/^Save \(|^Update Task$/).first();
  }

  get cancelButton(): Locator {
    return this.page.getByText('Cancel', { exact: true }).last();
  }

  async waitForLoaded(): Promise<void> {
    await expect(this.page.getByText('Plan tasks, classes, exams and activities', { exact: true })).toBeVisible();
  }

  async switchToList(): Promise<void> {
    await this.listSwitch.click();
  }

  async switchToCalendar(): Promise<void> {
    await this.calendarSwitch.click();
  }
}
