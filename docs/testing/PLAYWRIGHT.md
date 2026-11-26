# Playwright Web E2E Setup (`e2e/playwright/`)

## 1. Expo Web Target & Serving Architecture

Study Sakha configures `"web"` in `app.json` (`platforms: ["ios", "android", "web"]`) and exports static web assets to `dist/` via `pnpm run build:web` (`expo export --platform web`).

> [!IMPORTANT]
> `server.js` calls `express.static(distDir)` without `dotfiles: 'allow'`. Because `pnpm` stores font assets under `dist/assets/node_modules/.pnpm/.../*.ttf`, Express's default `dotfiles: 'ignore'` drops those requests to `index.html`, causing `useFonts()` in `App.tsx` to fail and leaving `#root` blank.
> To avoid altering application server code during test setup, `e2e/playwright/serve-web.cjs` mounts `express.static(distDir, { dotfiles: 'allow' })` before `server.js`'s `app`, giving Playwright full access to both Expo Web assets and `/api/*` endpoints (`/api/health`, `/api/audio-catalog`, `/api/chat`).

## 2. Installation

```bash
pnpm add -D @playwright/test
pnpm exec playwright install chromium
pnpm exec playwright install-deps chromium
```

## 3. Configuration (`e2e/playwright/playwright.config.ts`)

- **TypeScript:** Checked by `pnpm run lint` (`tsc --noEmit`).
- **Headless Mode:** Enabled by default (`PLAYWRIGHT_HEADLESS !== 'false'`) for Codespaces and CI; passes `--no-sandbox` when `CI` or `CODESPACES` is set.
- **Base URL:** `http://127.0.0.1:4173` (override with `PLAYWRIGHT_BASE_URL` to test a deployed URL or live Metro dev server).
- **Retries & Artifacts:**
  - `retries: 2` on CI (`0` locally)
  - `screenshot: 'only-on-failure'`
  - `video: 'retain-on-failure'`
  - `trace: 'on-first-retry'`
  - HTML report generated at `playwright-report/`
- **Projects:**
  - `chromium-desktop` (`1280x800`)
  - `chromium-mobile-web` (`Pixel 5` mobile web responsive viewport — **not** a native Android test substitute)

## 4. Authentication Modes in Web Tests

Unauthenticated tests (SignIn rendering, credential validation, SignUp navigation, responsive layout checks, `/api/health`, `/api/audio-catalog`, and console/pageerror hygiene) run without any credentials.

Authenticated suites (`dashboard`, `navigation`, `planner`, `focus`, `notifications-groups`, `settings`) check:

1. **Live Supabase Test Account (Recommended for Staging/Pre-Release):**
   ```bash
   PLAYWRIGHT_TEST_EMAIL=your-nonprod-test@example.com \
   PLAYWRIGHT_TEST_PASSWORD=... \
   pnpm run test:e2e:web
   ```
   Never use production learner accounts or commit credentials.
2. **Offline/Mocked Auth UI Mode (UI Smoke Only):**
   ```bash
   PLAYWRIGHT_MOCK_AUTH=1 pnpm run test:e2e:web
   ```
   Intercepts Supabase Auth/REST requests in browser context so UI screens can be exercised offline. Mocked runs verify UI rendering/state only, never live Supabase security or RLS.
3. **Unconfigured:** Authenticated specs cleanly skip (`test.skip`) with an explicit reason instead of failing or faking passes.

## 5. Running Tests & Viewing Reports

```bash
# Run full Playwright suite
pnpm run test:e2e:web

# Run a single file or project
pnpm run test:e2e:web -- e2e/playwright/tests/auth.spec.ts --project=chromium-desktop

# View HTML report
pnpm run test:e2e:web:report
```

## 6. Adding New Playwright Tests

1. Add or extend a Page Object under `e2e/playwright/pages/` using real `placeholder`, `aria-label` (`accessibilityLabel`), or visible text locators verified from `screens/*.tsx` / `components/*.tsx`.
2. Import `{ test, expect }` from `../fixtures/test-fixtures` so `errorTracker` automatically asserts zero uncaught `pageerror` exceptions.
3. Add a `*.spec.ts` file under `e2e/playwright/tests/` and run `pnpm run lint && pnpm run test:e2e:web`.
