# Maestro CLI & Maestro MCP Setup (`e2e/maestro/`)

Maestro provides real native Android UI automation against built APKs (`com.anonymous.agonpreview`).

## 1. Prerequisites & Installation

1. **Java 17+:** Verified in Codespace with OpenJDK `25.0.5.0.2`.
2. **Maestro CLI:**
   ```bash
   curl -fsSL "https://get.maestro.mobile.dev" | bash
   ```
   Ensure `$HOME/.maestro/bin` is exported in both `~/.bashrc` and `~/.profile` so new interactive and login shells find `maestro`.
3. **Android SDK Platform-Tools (`adb`) & Connected Device/Emulator:**
   ```bash
   java -version
   maestro --version
   adb version
   adb devices
   ```
   A connected emulator or physical Android device (`<serial>\tdevice` in `adb devices`) with the Study Sakha APK installed is required to execute Maestro flows.

## 2. Maestro MCP Configuration (`maestro mcp`)

Maestro CLI (`2.12.1`) includes a native built-in STDIO MCP server (`maestro mcp`). It is configured in `~/.gemini/config/mcp_config.json`:

```json
{
  "mcpServers": {
    "maestro": {
      "command": "/home/codespace/.maestro/bin/maestro",
      "args": [
        "mcp",
        "--no-viewer",
        "--working-dir",
        "/workspaces/study-sakha-app"
      ]
    }
  }
}
```

Built-in MCP tools exposed by `maestro mcp`:
`list_devices`, `take_screenshot`, `run`, `inspect_screen`, `cheat_sheet`, `open_maestro_viewer`, `list_cloud_devices`, `run_on_cloud`, `get_cloud_run_status`, `describe_cloud_run`.

## 3. Flow Structure (`e2e/maestro/`)

- `e2e/maestro/config.yaml`: Declares flow directories and deterministic execution order.
- `e2e/maestro/flows/auth/`: App launch, login, logout, session persistence.
- `e2e/maestro/flows/dashboard/`: Dashboard rendering, drawer open/close, bottom navigation, profile navigation.
- `e2e/maestro/flows/planner/`: Task create/edit/delete, duration validation, empty month behavior, restart persistence.
- `e2e/maestro/flows/focus/`: Start timer, pause/resume, stop confirmation + cancel, minimize + `Back to Focus`, restart persistence.
- `e2e/maestro/flows/notifications/`: Open notifications, mark as read, open destination.
- `e2e/maestro/flows/groups/`: Open Groups, enter Silent Focus Hall, navigate back cleanly.
- `e2e/maestro/flows/settings/`: Open sub-screens, return & reopen Settings 10 times, verify drawer remains responsive.
- `e2e/maestro/flows/regression/`: Bottom nav overlap, last item visibility, dialog dismissal, keyboard layout, light/dark themes.

## 4. Running Maestro Tests

Export non-production test credentials and run via `pnpm`:

```bash
export MAESTRO_APP_ID=com.anonymous.agonpreview
export MAESTRO_TEST_EMAIL=your-nonprod-test@example.com
export MAESTRO_TEST_PASSWORD=your-nonprod-password
export MAESTRO_RUN_ID=$(date +%s)

pnpm run test:e2e:mobile
# Or run a focused suite:
pnpm run test:e2e:mobile:focus
pnpm run test:e2e:mobile:planner
pnpm run test:e2e:mobile:settings
```

Reports and screenshots are written to `e2e/maestro/artifacts/` (gitignored).

## 5. Adding New Maestro Flows

1. Inspect the real React Native component in `screens/*.tsx` or `components/*.tsx` for exact `accessibilityLabel`, `testID`, `placeholder`, or visible `Text` strings. Never guess selectors.
2. Add a `*.yaml` flow under the matching `e2e/maestro/flows/<area>/` directory and add its base name to `executionOrder.flowsOrder` in `e2e/maestro/config.yaml`.
3. Verify on an Android device/emulator via `pnpm run test:e2e:mobile -- ...` or `maestro test`.
