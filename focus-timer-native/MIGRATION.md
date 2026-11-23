# Migration Report

## Completed

- Preserved all seven source renderer classes, deterministic Mulberry32 PRNG, 1D noise helpers, and the original per-theme seeds.
- Replaced browser canvas creation with a native Skia picture recorder. The renderer algorithms continue to produce the backgrounds and animated layers at runtime; no screenshots are used.
- Rebuilt the full-screen timer, progress ring, 25/50/15/45-minute presets, pause/resume, stop/reset, 5-minute break toggle, and subject selector.
- Rebuilt all seven gallery cards, live thumbnails, active-theme state, 140 ms theme curtain, full-art Zen mode, motion/static mode, settings sheet, and timed toast notifications.
- Preserved the Obsidian default, 24:57 initial running state, initial motion-enabled setting, Inter font weights, theme palettes, and adaptive glass colors.
- Added Android-safe-area/orientation sizing, Expo SDK 57-compatible dependencies, timer boundary tests, and an EAS APK profile.

## Known Differences

- Skia's gradient interpolation, antialiasing, and blur masks are not pixel-identical to browser Canvas 2D. Canvas ellipse/arc paths are adaptively sampled into short line segments; bezier and quadratic paths remain native Skia curves.
- Android's native blur uses Expo `BlurView` over a shared `BlurTargetView`; its appearance depends on Android version/GPU and will differ slightly from CSS `backdrop-filter`.
- Animated themes and thumbnails are capped at about 30 fps for rendering cost, while the original full-screen HTML loop targeted the display refresh rate. Static themes remain static.
- A device-level screenshot comparison and local APK installation were not possible in this dev container because no Android emulator/device is attached. Source markup/styles and all feature interactions were compared during the port; Expo Doctor, TypeScript, unit tests, and Android Metro export are the available verification gates.