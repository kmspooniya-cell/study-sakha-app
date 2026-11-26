# Study Sakha Testing Infrastructure

This guide covers the complete end-to-end testing and agent-automation setup for **Study Sakha**:

1. **[Playwright Test (`PLAYWRIGHT.md`)](./PLAYWRIGHT.md)** — Automated browser testing against the Expo Web bundle (`e2e/playwright/`).
2. **[Official Playwright MCP (`PLAYWRIGHT_MCP.md`)](./PLAYWRIGHT_MCP.md)** — Model Context Protocol browser tools (`@playwright/mcp`) for Antigravity.
3. **[Maestro CLI & Maestro MCP (`MAESTRO.md`)](./MAESTRO.md)** — Native Android E2E testing (`e2e/maestro/` and `.maestro/`) plus built-in `maestro mcp`.
4. **[Troubleshooting (`TROUBLESHOOTING.md`)](./TROUBLESHOOTING.md)** — Codespaces limitations, font/static asset quirks, ADB forwarding, and common failures.

## Repository Test Layout

```text
e2e/
├── .env.example                     # Non-secret E2E environment variable template
├── playwright/
│   ├── playwright.config.ts         # Chromium desktop & mobile-web projects, HTML report, traces
│   ├── serve-web.cjs                # Serves dist/ (dotfiles: 'allow') + server.js /api/* routes
│   ├── fixtures/
│   │   └── test-fixtures.ts         # Page objects, console/pageerror guards, live/mock auth helper
│   ├── pages/                       # Page Object Models (SignIn, Dashboard, Planner, Focus, etc.)
│   └── tests/                       # Playwright *.spec.ts suites
└── maestro/
    ├── config.yaml                  # Maestro flow discovery & execution order
    └── flows/                       # Real Android E2E flows (auth, dashboard, planner, focus, ...)
        ├── auth/
        ├── dashboard/
        ├── planner/
        ├── focus/
        ├── notifications/
        ├── groups/
        ├── settings/
        └── regression/
```

Existing unit/integration tests remain in `test/` (Jest + RNTL), and existing quick smoke flows remain in `.maestro/`.

## Quick Start (Fresh Environment)

```bash
# 1. Install JS dependencies (uses repo's pnpm@12.16.1 + pnpm-lock.yaml)
pnpm install --frozen-lockfile

# 2. Install Playwright Chromium + Ubuntu system libraries
pnpm exec playwright install chromium
pnpm exec playwright install-deps chromium

# 3. Install Maestro CLI (requires Java 17+)
curl -fsSL "https://get.maestro.mobile.dev" | bash
export PATH="$PATH:$HOME/.maestro/bin"

# 4. Copy E2E env template (keep .env.test out of Git)
cp e2e/.env.example .env.test

# 5. Run unit tests + TypeScript check + Playwright Web E2E
pnpm run lint
pnpm run test:ci
pnpm run test:e2e:web
```

## Available Test Scripts

| Script | Purpose |
|---|---|
| `pnpm run lint` | TypeScript check (`tsc --noEmit`) across app and `e2e/playwright/` |
| `pnpm run test` / `test:ci` | Jest + React Native Testing Library unit/component suites |
| `pnpm run test:e2e:web` | Run all Playwright Chromium tests (desktop + mobile-web viewport) |
| `pnpm run test:e2e:web:ui` | Launch Playwright interactive UI mode (requires display/port forwarding) |
| `pnpm run test:e2e:web:report` | Serve the latest Playwright HTML report (`playwright-report/`) |
| `pnpm run test:e2e:mobile` | Run full Android Maestro suite (`e2e/maestro/flows`) via `scripts/run-maestro.cjs` |
| `pnpm run test:e2e:mobile:auth` | Run Maestro authentication flows |
| `pnpm run test:e2e:mobile:dashboard` | Run Maestro dashboard & navigation flows |
| `pnpm run test:e2e:mobile:planner` | Run Maestro Study Planner flows |
| `pnpm run test:e2e:mobile:focus` | Run Maestro Focus Centre flows |
| `pnpm run test:e2e:mobile:notifications` | Run Maestro Notifications flows |
| `pnpm run test:e2e:mobile:groups` | Run Maestro Groups flows |
| `pnpm run test:e2e:mobile:settings` | Run Maestro Settings & 10x drawer stress flow |
| `pnpm run test:e2e:mobile:regression` | Run Maestro UI layout, keyboard & theme regression flows |
| `pnpm run test:e2e:mobile:smoke` | Run legacy quick smoke flows in `.maestro/` |
| `pnpm run test:e2e:all` | Run Web E2E followed by Android Maestro E2E |

## Boundaries Between Web and Native Testing

- **Playwright (`chromium-mobile-web`) tests Expo Web**, not native Android runtime behavior.
- Native features (`StudySakhaFocusLock` AccessibilityService, native `BackHandler`, exact `AlarmManager`, Android 13+ notification permissions, APK cold start) are **only** verified on a real Android device or emulator using **Maestro** (`e2e/maestro/`).
