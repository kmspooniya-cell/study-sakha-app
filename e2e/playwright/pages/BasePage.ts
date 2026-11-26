import { expect, type Locator, type Page } from '@playwright/test';

export class BasePage {
  constructor(protected readonly page: Page) {}

  async gotoPath(path = '/'): Promise<void> {
    await this.page.goto(path, { waitUntil: 'domcontentloaded' });
    await this.waitForAppShell();
  }

  async waitForAppShell(): Promise<void> {
    // App.tsx shows Splash until hydrated + authReady, then BrandIntro for 1500ms.
    await this.page.waitForFunction(
      () => {
        const root = document.getElementById('root');
        if (!root) return false;
        const text = (document.body.innerText || '').trim();
        return (
          text.includes('Welcome back') ||
          text.includes('Make today count.') ||
          text.includes('Create your account') ||
          text.includes('Study Planner') ||
          text.includes('Settings')
        );
      },
      undefined,
      { timeout: 15_000 }
    );
  }

  async isMobileViewport(): Promise<boolean> {
    const viewport = this.page.viewportSize();
    return Boolean(viewport && viewport.width < 768);
  }

  /**
   * React Navigation Drawer keeps off-screen drawer items mounted at x < 0, and
   * stack navigators keep inactive screens in the DOM. This helper picks the
   * match that is currently inside the visible viewport.
   */
  async findVisibleInViewport(locator: Locator): Promise<Locator> {
    const count = await locator.count();
    for (let i = 0; i < count; i += 1) {
      const candidate = locator.nth(i);
      if (!(await candidate.isVisible().catch(() => false))) continue;
      const box = await candidate.boundingBox();
      if (box && box.x >= 0 && box.y >= 0 && box.width > 0 && box.height > 0) {
        return candidate;
      }
    }
    return locator.last();
  }

  async clickVisibleText(text: string): Promise<void> {
    const locator = this.page.getByText(text, { exact: true });
    await expect(locator.first()).toBeAttached();
    const visible = await this.findVisibleInViewport(locator);
    await visible.click();
  }

  async dismissLegacyImportBannerIfPresent(): Promise<void> {
    const keepSeparate = this.page.getByRole('button', { name: 'Keep separate' });
    if (await keepSeparate.isVisible().catch(() => false)) {
      await keepSeparate.click();
    }
  }

  async assertNoHorizontalOverflow(): Promise<void> {
    const metrics = await this.page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(
      metrics.scrollWidth,
      `Horizontal overflow detected: scrollWidth=${metrics.scrollWidth} > clientWidth=${metrics.clientWidth}`
    ).toBeLessThanOrEqual(metrics.clientWidth + 2);
  }
}
