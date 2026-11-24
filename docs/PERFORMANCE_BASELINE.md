# Study Sakha Performance Baseline

**Status:** BLOCKED — no Android device or emulator was connected.

Flashlight was installed from the official installer and reports version `0.21.0`. The required Android target is unavailable: `adb` is not installed, no device is listed, and the Android SDK variables are unset. An attempted `flashlight measure` opened the local web UI but could not collect a measurement in the non-interactive Codespace shell.

No FPS, frame-drop, CPU, RAM, launch, scroll or responsiveness score is reported. Inventing values would make the baseline unusable.

## Planned measurements

Run from a machine with the preview APK installed and `adb devices` showing the dedicated tablet:

```bash
flashlight measure
flashlight test --help
```

Measure repeated runs for:

- cold launch;
- dashboard render;
- Library scroll;
- Study Planner navigation;
- Focus Centre render;
- Statistics charts;
- Groups navigation;
- Sakha AI screen.

Record the raw Flashlight output and average repeated runs. Store reports under `artifacts/performance/` and update this document with device model, Android version, APK version, iteration count and observed metrics.

