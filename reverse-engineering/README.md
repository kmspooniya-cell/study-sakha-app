# Reverse-engineering workspace

This folder is for authorized Android APK and installed-app investigations with
REA. Setup only has been completed: no APK was opened and no Android device or
app was queried.

## Installed tools

The tools are installed in the Codespace user's home directory, not in the
Study Sakha app or its dependency tree:

- REA 6.10.1, installed with npm
- Codex CLI 0.171.0, installed using OpenAI's official installer
- Node.js 24.22.2 and npm 11.19.1
- OpenJDK 25 with `javac`
- JADX CLI 1.5.7 and the REA-required `jadx-headless-mcp` 0.8.0 bridge
- Apktool 3.0.3
- Google Android Platform-Tools / ADB 37.0.3

REA is registered in the user-level `~/.codex/config.toml` by `rea setup`.
Android provider paths are set in that REA server entry:

- `JAVA_HOME`
- `REA_JADX_MCP_JAR`
- `REA_APKTOOL_COMMAND`
- `REA_ADB_PATH`

JDK 25 is a full JDK and meets REA's documented JDK 17+ requirement. REA's
current Android bridge verification notes include JDK 21, not JDK 25.

`codex mcp list` confirms the REA server is enabled. The Codex CLI is not
currently signed in; run `codex login` yourself before starting a model-backed
session. The REA MCP server and its tool catalog were checked independently,
but a tool call through an authenticated Codex session has not yet been tested.

## Static APK analysis

Put only an APK you are authorized to inspect under the ignored `inputs/`
directory, then run a static inspection such as:

```sh
rea inspect-android-package "$PWD/reverse-engineering/inputs/<authorized-app>.apk"
rea search-android-classes "$PWD/reverse-engineering/inputs/<authorized-app>.apk" <class-name>
```

These are examples for later use; they were not run during setup. More commands
are available with `rea --help` and in the
[REA Android analysis guide](https://github.com/morluto/rea/blob/main/docs/guides/android/android-analysis.md).

## Installed-app inspection

No device connection or app inspection was performed during setup. Only after
you explicitly authorize use of a test device, connect it yourself and begin
with:

```sh
rea inspect-adb-client
rea list-adb-devices
rea list-adb-packages <device-serial> --scope third_party
rea inspect-adb-package <device-serial> <package-id>
```

`inspect-adb-client` checks the local ADB executable and does not contact the
ADB server. Device operations can start the local ADB server and query the
connected device; do not run them until the device and inspection are
authorized. See the [REA ADB guide](https://github.com/morluto/rea/blob/main/docs/guides/android/adb-device-analysis.md).

## Data handling

`inputs/`, `outputs/`, and common Android package and bytecode files are ignored
by Git. Keep APKs and extracted data local, and do not commit them. REA processes
targets locally, but tool results are passed to the configured model provider;
check that provider's data policy before analyzing sensitive apps.

The npm install reported that its optional `frida` install script was not
approved. Frida is not needed for the static APK and ADB client checks above;
dynamic instrumentation is not configured.
