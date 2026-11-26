import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class NavigationHelper extends BasePage {
  async openDrawer(): Promise<void> {
    const openMenu = await this.findVisibleInViewport(
      this.page.getByRole('button', { name: 'Open menu' })
    );
    await expect(openMenu).toBeVisible();
    await openMenu.click();
    await expect(this.page.getByText('Offline downloads', { exact: true })).toBeVisible();
  }

  async openSettings(): Promise<void> {
    if (await this.isMobileViewport()) {
      await this.openDrawer();
      await this.page.getByText('Settings', { exact: true }).first().click();
    } else {
      await this.clickVisibleText('Settings');
    }
    await expect(this.page.getByText('ALL SETTINGS CATEGORIES (12)', { exact: true })).toBeVisible();
  }

  async openNotifications(): Promise<void> {
    const headerBell = await this.findVisibleInViewport(
      this.page.getByRole('button', { name: 'Notifications' })
    );
    if (await headerBell.isVisible().catch(() => false)) {
      await headerBell.click();
    } else {
      await this.clickVisibleText('Notifications');
    }
    await expect(this.page.getByText('Notifications', { exact: true }).last()).toBeVisible();
  }

  async openStudyPlanner(): Promise<void> {
    if (await this.isMobileViewport()) {
      await this.clickVisibleText('Home');
      await this.clickVisibleText('Add Task');
    } else {
      await this.clickVisibleText('Study Planner');
    }
    await expect(this.page.getByText('Plan tasks, classes, exams and activities', { exact: true })).toBeVisible();
  }

  async openGroups(): Promise<void> {
    await this.clickVisibleText('Groups');
    await expect(this.page.getByText('Study Groups', { exact: true })).toBeVisible();
  }

  async openProfile(): Promise<void> {
    await this.clickVisibleText('Profile');
  }

  async openDashboard(): Promise<void> {
    if (await this.isMobileViewport()) {
      await this.clickVisibleText('Home');
    } else {
      await this.clickVisibleText('Dashboard');
    }
    await expect(this.page.getByText('Make today count.', { exact: true }).last()).toBeVisible();
  }
}
