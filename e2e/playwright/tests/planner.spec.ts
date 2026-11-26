import { test, expect } from '../fixtures/test-fixtures';

test.describe('Study Planner (Expo Web)', () => {
  test('creates, edits, validates, and deletes a planner task and checks empty month state', async ({
    authenticate,
    nav,
    plannerPage,
    page,
    errorTracker,
  }) => {
    await authenticate();
    await nav.openStudyPlanner();
    await plannerPage.waitForLoaded();

    // Verify Calendar and List switcher
    await plannerPage.switchToList();
    await expect(page.getByText('Completed', { exact: true }).first()).toBeVisible();
    await plannerPage.switchToCalendar();

    // Open Add Plan form (or select today if mobile)
    const addPlanVisible = await plannerPage.addPlanButton.isVisible().catch(() => false);
    if (addPlanVisible) {
      await plannerPage.addPlanButton.click();
    } else {
      await page.getByText('Tap any date to view or add plans', { exact: true }).scrollIntoViewIfNeeded();
      await page.locator('[aria-label$="plans"]').first().click();
      const addForDay = page.getByText('+ Add a plan for this day', { exact: true });
      if (await addForDay.isVisible().catch(() => false)) {
        await addForDay.click();
      }
    }

    // Empty title validation
    await expect(plannerPage.taskTitleInput).toBeVisible();
    await plannerPage.saveButton.click();
    await expect(page.getByText('Please enter a title before saving.', { exact: true })).toBeVisible();

    // Duration validation (0 minutes)
    const taskTitle = `Playwright Task ${Date.now()}`;
    await plannerPage.taskTitleInput.fill(taskTitle);
    await plannerPage.durationInput.fill('0');
    await plannerPage.saveButton.click();
    await expect(page.getByText(/duration/i).first()).toBeVisible();

    // Valid task creation
    await plannerPage.durationInput.fill('45');
    await plannerPage.saveButton.click();

    await plannerPage.switchToList();
    await page.getByText('Upcoming', { exact: true }).first().click();
    await expect(page.getByText(taskTitle, { exact: true })).toBeVisible();

    // Edit task
    await page.getByText(taskTitle, { exact: true }).click();
    await page.getByText('Edit Plan', { exact: true }).click();
    const updatedTitle = `${taskTitle} Updated`;
    await plannerPage.taskTitleInput.fill(updatedTitle);
    await plannerPage.saveButton.click();
    await expect(page.getByText(updatedTitle, { exact: true })).toBeVisible();

    // Delete task
    await page.getByText(updatedTitle, { exact: true }).click();
    await page.getByText('Delete', { exact: true }).first().click();
    await expect(page.getByText('Delete this plan?', { exact: true })).toBeVisible();
    await page.getByText('Delete', { exact: true }).last().click();
    await expect(page.getByText(updatedTitle, { exact: true })).toBeHidden();

    // Navigate forward 12 months to verify empty month behavior
    const nextMonthBtn = page.getByRole('button', { name: 'Next month' });
    for (let i = 0; i < 12; i += 1) {
      await nextMonthBtn.click();
    }
    await expect(page.getByText(/No plans in /)).toBeVisible();
    expect(errorTracker.unexpectedConsoleErrors).toEqual([]);
  });
});
