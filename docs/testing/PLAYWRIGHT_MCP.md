# Official Microsoft Playwright MCP (`@playwright/mcp`)

Study Sakha integrates the official **`@playwright/mcp`** server so Antigravity can launch headless Chromium, inspect accessibility snapshots, click, type, and capture screenshots.

## 1. Antigravity MCP Configuration Location

Per Antigravity's customization specification, machine-local global MCP servers live at:

```text
~/.gemini/config/mcp_config.json
```

Configured entry in `/home/codespace/.gemini/config/mcp_config.json` (preserving any existing servers):

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "-y",
        "@playwright/mcp@latest",
        "--headless",
        "--browser",
        "chromium",
        "--isolated",
        "--no-sandbox"
      ]
    }
  }
}
```

### Why These Flags Are Used in Codespaces

- `--headless`: Codespaces has `DISPLAY=unset`; `@playwright/mcp` defaults to headed mode without this flag.
- `--browser chromium`: `@playwright/mcp` defaults to `--browser chrome` (`/opt/google/chrome/chrome`), whereas `playwright install chromium` installs Playwright's Chromium build.
- `--isolated`: Keeps browser profiles and session cookies strictly in memory so authentication data is never written to the workspace or Git.
- `--no-sandbox`: Required for Chromium launch inside container environments without user namespaces.

## 2. Verifying MCP Server Startup

Test that `npx` resolves `@playwright/mcp@latest` and completes an MCP JSON-RPC `initialize` + `tools/list` handshake:

```bash
npx -y @playwright/mcp@latest --version
```

When restarted/loaded by the Antigravity client, `@playwright/mcp` exposes 25 browser tools including `browser_navigate`, `browser_snapshot`, `browser_click`, `browser_type`, `browser_fill_form`, `browser_take_screenshot`, `browser_console_messages`, and `browser_resize`.

> [!NOTE]
> Editing `~/.gemini/config/mcp_config.json` takes effect when the Antigravity client/session reloads MCP servers. Verify active servers in the Antigravity UI via **Additional Options (...) > MCP Servers**.
