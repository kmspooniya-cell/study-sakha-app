# Testing Troubleshooting & Codespaces Limitations

## 1. GitHub Codespaces Limitations

| Capability | Status in Codespaces | Workaround / Resolution |
|---|---|---|
| **Display Server (`DISPLAY`)** | Unset (headless Linux container) | Always run Playwright and `@playwright/mcp` with `--headless` and `--no-sandbox`. |
| **Android SDK / `adb`** | Not installed (`ANDROID_HOME` unset) | Build Android APKs via EAS (`npx eas-cli build --platform android --profile preview`) or run Maestro locally / via `workflow_dispatch` GitHub Actions macOS emulator runner (`.github/workflows/maestro-e2e.yml`). |
| **Connected Android Device** | None in container | Connect via local workstation USB/emulator or remote ADB port forwarding (`adb connect`), or use Maestro Cloud (`run_on_cloud`). |
| **Sandbox Network Isolation** | Terminal sandbox blocks DNS/internet | Commands that download packages/browsers (`pnpm add`, `playwright install`, `curl`) or test remote Supabase must run outside the network sandbox or with pre-cached local assets. |

## 2. Common Playwright Issues

### Blank Page (`#root` empty) when Serving `dist/`
- **Cause:** `server.js` uses `express.static(distDir)` with Express's default `dotfiles: 'ignore'`, returning `index.html` instead of `.ttf` fonts located under `dist/assets/node_modules/.pnpm/...`. `App.tsx` waits on `useFonts()` and returns `null` when font decoding fails.
- **Fix:** Always run Playwright against `e2e/playwright/serve-web.cjs` (configured automatically in `e2e/playwright/playwright.config.ts`) or `pnpm run expo:web`.

### `libatk-1.0.so.0: cannot open shared object file`
- **Cause:** Chromium OS shared libraries are missing in a fresh Linux container.
- **Fix:** Run `pnpm exec playwright install-deps chromium` (requires root/sudo outside `no-new-privileges` sandbox).

### `ExpoNotifications.getLastNotificationResponse is not available on web`
- **Cause:** `App.tsx` logs a console error on Web because `expo-notifications` does not implement `getLastNotificationResponseAsync` in browsers.
- **Handling:** `e2e/playwright/fixtures/test-fixtures.ts` records this in `knownWebEnvErrors` while still failing tests on uncaught `pageerror` exceptions or unexpected `console.error` logs.

### Authenticated Tests Show as `skipped`
- **Cause:** Neither `PLAYWRIGHT_TEST_EMAIL`/`PLAYWRIGHT_TEST_PASSWORD` nor `PLAYWRIGHT_MOCK_AUTH=1` is set.
- **Fix:** Provide non-production test credentials via `.env.test`/environment variables or run `PLAYWRIGHT_MOCK_AUTH=1 pnpm run test:e2e:web` for offline UI smoke coverage.

## 3. Common Maestro & MCP Issues

### `maestro: command not found` in New Terminal / Login Shell
- **Cause:** `get.maestro.mobile.dev` only appends `PATH` to `~/.bashrc`, not `~/.profile`.
- **Fix:** Ensure `~/.profile` contains:
  ```bash
  export PATH="$PATH:$HOME/.maestro/bin"
  ```
  And configure `~/.gemini/config/mcp_config.json` with the full binary path `/home/codespace/.maestro/bin/maestro`.

### MCP Tools Not Visible After Editing `mcp_config.json`
- **Cause:** Antigravity loads MCP server configurations on client startup/reload.
- **Fix:** Restart the Antigravity CLI/IDE session and inspect **Additional Options (...) > MCP Servers**.
