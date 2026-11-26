import { test, expect } from '../fixtures/test-fixtures';

test.describe('Focus Centre Web UI (Expo Web)', () => {
  test('validates custom duration, starts timer, pauses/resumes, cancels stop, minimizes and returns via Back to Focus', async ({
    authenticate,
    dashboardPage,
    focusPage,
    nav,
    page,
    errorTracker,
  }) => {
    await authenticate();
    await dashboardPage.openFocusSetup();

    // Custom duration validation
    await focusPage.customDurationButton.click();
    await focusPage.customDurationInput.fill('0');
    await expect(focusPage.continueButton).toBeDisabled();

    await focusPage.customDurationInput.fill('25');
    await expect(focusPage.continueButton).toBeEnabled();

    await focusPage.startDefaultSession();

    // Pause and resume
    await focusPage.pauseButton.click();
    await expect(focusPage.resumeButton).toBeVisible();
    await focusPage.resumeButton.click();
    await expect(focusPage.pauseButton).toBeVisible();

    // Stop confirmation -> Cancel
    await focusPage.stopFocusButton.click();
    await expect(focusPage.endSessionHeading).toBeVisible();
    await focusPage.continueFocusButton.click();
    await expect(focusPage.endSessionHeading).toBeHidden();

    // Minimize Focus Centre and verify FloatingFocusBar "Back to Focus"
    await focusPage.minimizeButton.click();
    await dashboardPage.waitForLoaded();
    await expect(focusPage.backToFocusButton).toBeVisible();

    await nav.openGroups();
    await expect(focusPage.backToFocusButton).toBeVisible();

    await focusPage.backToFocusButton.click();
    await expect(focusPage.stopFocusButton).toBeVisible();

    // Clean up session
    await focusPage.stopFocusButton.click();
    await focusPage.deleteSessionButton.click();
    await dashboardPage.waitForLoaded();
    expect(errorTracker.unexpectedConsoleErrors).toEqual([]);
  });
});
