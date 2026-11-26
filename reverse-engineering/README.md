# Reverse-engineering workspace

This folder is designated for authorized Android APK and installed-app investigations.

## Verification Status (Audited 2026-11-26)

A functional verification was conducted across all components described in previous setup notes:

| Component | Status | Verified Details |
|---|---|---|
| **OpenJDK / Java** | **PASS** | OpenJDK 25.0.5.0.2 LTS (`/usr/local/sdkman/candidates/java/current/bin/java`) is installed and functional. |
| **Node.js & npm** | **PASS** | Node.js v24.22.2 and npm 11.19.1 are present and functional. |
| **Codex CLI** | **PASS (CLI) / UNCONFIGURED** | Codex CLI v0.171.0 is installed (`/usr/local/share/nvm/versions/node/v24.22.2/bin/codex`). Not logged in. |
| **REA CLI (`rea`)** | **FAIL (Missing)** | Binary not found on `PATH` or filesystem. |
| **Codex MCP Registration** | **FAIL (Unregistered)** | `codex mcp list` confirms: `No MCP servers configured yet.` |
| **REA MCP Tools** | **FAIL (Unavailable)** | Cannot enumerate tools due to missing REA CLI and MCP configuration. |
| **JADX CLI & MCP JAR** | **FAIL (Missing)** | Neither `jadx` binary nor `jadx-headless-mcp.jar` exist in the container. |
| **Apktool** | **FAIL (Missing)** | `apktool` binary not found on `PATH` or filesystem. |
| **ADB (Android Platform-Tools)**| **FAIL (Missing)** | `adb` binary not found on `PATH` or filesystem. |

> [!WARNING]
> While Java 25, Node.js 24, and the Codex CLI exist in the environment, the Android reverse-engineering binaries (`rea`, `jadx`, `apktool`, `adb`) and REA Codex MCP server configuration are not present in this container image.

---

## Required Setup to Restore REA & Android Tools

The following steps are required in the container/host environment when restoring this toolchain:

### 1. Install REA and Register with Codex
```bash
npm install -g rea
# Or register REA MCP directly with Codex once installed:
rea setup
# Alternatively, manual Codex MCP registration:
codex mcp add rea -- rea mcp
```

### 2. Install Android Binary Analysis Tools
- **JADX & jadx-headless-mcp JAR**:
  Download JADX distribution and place `jadx` in `PATH` (e.g. `/usr/local/bin/jadx` or `~/.local/bin/jadx`), and download `jadx-headless-mcp.jar`.
- **Apktool**:
  Install `apktool` wrapper script and jar to `/usr/local/bin/apktool`.
- **Android Platform-Tools (ADB)**:
  Download platform-tools zip and add `adb` to `PATH`.

### 3. Configure Provider Paths in Codex Config (`~/.codex/config.toml`)
```toml
[mcp_servers.rea]
command = "rea"
args = ["mcp"]
env = { JAVA_HOME = "/usr/local/sdkman/candidates/java/current", REA_JADX_MCP_JAR = "/path/to/jadx-headless-mcp.jar", REA_APKTOOL_COMMAND = "apktool", REA_ADB_PATH = "adb" }
```

### 4. Authenticate Codex CLI
```bash
codex login
codex mcp list
```

---

## Static APK Analysis (Once Restored)

Put only an authorized APK under the ignored `inputs/` directory:

```sh
mkdir -p "$PWD/reverse-engineering/inputs"
# Inspect package metadata
rea inspect-android-package "$PWD/reverse-engineering/inputs/<authorized-app>.apk"

# Search classes
rea search-android-classes "$PWD/reverse-engineering/inputs/<authorized-app>.apk" <class-name>

# Direct JADX decompile
jadx -d "$PWD/reverse-engineering/outputs/decompiled" "$PWD/reverse-engineering/inputs/<authorized-app>.apk"

# Direct Apktool resource decode
apktool d "$PWD/reverse-engineering/inputs/<authorized-app>.apk" -o "$PWD/reverse-engineering/outputs/resources"
```

## Installed-App / ADB Inspection (Once Restored)

When a physical device or emulator is connected over ADB:

```sh
rea inspect-adb-client
rea list-adb-devices
rea list-adb-packages <device-serial> --scope third_party
rea inspect-adb-package <device-serial> <package-id>
```

## Data Handling

`inputs/`, `outputs/`, and common Android package and bytecode files are ignored by Git. Keep APKs and extracted data local, and do not commit them.
