import { expect, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class SignInPage extends BasePage {
  get heading(): Locator {
    return this.page.getByText('Welcome back', { exact: true });
  }

  get emailInput(): Locator {
    return this.page.locator('input[placeholder="you@example.in"]');
  }

  get passwordInput(): Locator {
    return this.page.locator('input[placeholder="Your password"]');
  }

  get signInButton(): Locator {
    return this.page.getByRole('button', { name: 'Sign in' });
  }

  get createAccountLink(): Locator {
    return this.page.getByText('Create an account', { exact: true });
  }

  get signUpHeading(): Locator {
    return this.page.getByText('Create your account', { exact: true });
  }

  get fullNameInput(): Locator {
    return this.page.locator('input[placeholder="Ananya Deshmukh"]');
  }

  get signUpPasswordInput(): Locator {
    return this.page.locator('input[placeholder="Minimum 6 characters"]');
  }

  get createAccountButton(): Locator {
    return this.page.getByRole('button', { name: 'Create account' });
  }

  get backToSignInLink(): Locator {
    return this.page.getByText('Sign in', { exact: true }).last();
  }

  async goto(): Promise<void> {
    await this.gotoPath('/');
    await expect(this.heading).toBeVisible();
  }

  async signIn(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.signInButton.click();
  }
}
