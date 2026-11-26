import { test, expect } from '../fixtures/test-fixtures';

test.describe('Authentication (Expo Web)', () => {
  test('renders SignIn screen and validates empty credentials', async ({ signInPage, errorTracker }) => {
    await signInPage.goto();

    await expect(signInPage.emailInput).toBeVisible();
    await expect(signInPage.passwordInput).toBeVisible();
    await expect(signInPage.signInButton).toBeVisible();

    await signInPage.signInButton.click();
    await expect(
      signInPage.heading.page().getByText('Enter both your email and password.', { exact: true })
    ).toBeVisible();
    expect(errorTracker.unexpectedConsoleErrors).toEqual([]);
  });

  test('navigates between SignIn and SignUp screens', async ({ signInPage, page, errorTracker }) => {
    await signInPage.goto();

    await signInPage.createAccountLink.click();
    await expect(signInPage.signUpHeading).toBeVisible();
    await expect(signInPage.fullNameInput).toBeVisible();
    await expect(signInPage.signUpPasswordInput).toBeVisible();
    await expect(page.getByText('Target exam', { exact: true })).toBeVisible();

    await signInPage.backToSignInLink.click();
    await expect(signInPage.heading.last()).toBeVisible();
    expect(errorTracker.unexpectedConsoleErrors).toEqual([]);
  });

  test('signs in and loads Dashboard when test credentials or mock mode are enabled', async ({
    authenticate,
    dashboardPage,
    errorTracker,
  }) => {
    await authenticate();
    await dashboardPage.waitForLoaded();
    expect(errorTracker.unexpectedConsoleErrors).toEqual([]);
  });
});
