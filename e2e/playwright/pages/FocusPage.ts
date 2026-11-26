import { expect, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class FocusPage extends BasePage {
  get setupTitle(): Locator {
    return this.page.getByText('Focus Session Setup', { exact: true });
  }

  get continueButton(): Locator {
    return this.page.getByRole('button', { name: 'Continue to Full Focus' });
  }

  get customDurationButton(): Locator {
    return this.page.getByRole('button', { name: 'Custom duration' });
  }

  get customDurationInput(): Locator {
    return this.page.getByRole('textbox', { name: 'Custom duration minutes' });
  }

  get pauseButton(): Locator {
    return this.page.getByText('Pause', { exact: true });
  }

  get resumeButton(): Locator {
    return this.page.getByText('Resume', { exact: true });
  }

  get stopFocusButton(): Locator {
    return this.page.getByText('Stop Focus', { exact: true });
  }

  get endSessionHeading(): Locator {
    return this.page.getByText('End Focus Session?', { exact: true });
  }

  get continueFocusButton(): Locator {
    return this.page.getByRole('button', { name: 'Cancel and continue focus' });
  }

  get deleteSessionButton(): Locator {
    return this.page.getByText('Delete Session', { exact: true });
  }

  get minimizeButton(): Locator {
    return this.page.getByRole('button', { name: 'Minimize Focus Centre' });
  }

  get backToFocusButton(): Locator {
    return this.page.getByRole('button', { name: 'Back to Focus' });
  }

  async startDefaultSession(): Promise<void> {
    await expect(this.setupTitle).toBeVisible();
    await this.continueButton.click();
    await expect(this.stopFocusButton).toBeVisible({ timeout: 10_000 });
  }
}
