# Focus Lock native Android engine

Focus Lock keeps its existing user-scoped AsyncStorage record and study-history crediting. On Android, the selected package IDs and the critical active-session copy are also stored in native `SharedPreferences` so the AccessibilityService can enforce the session when the JavaScript process is backgrounded or restarted.

## Android pieces

- `FocusLockModule` exposes typed discovery, permission, session, and package APIs through `NativeModules.StudySakhaFocusLock`.
- `FocusLockAccessibilityService` listens to window transition events and opens `FocusLockBlockingActivity` only for selected packages.
- `FocusLockAlarm` clears an expired native session using an exact idle-safe alarm.
- `FocusLockBlockingActivity` is a native recovery screen with a Study Sakha message and return action.
- `plugins/withFocusLock.js` keeps the service declaration present when Expo regenerates the Android manifest.

The implementation uses launcher intent queries for installed-app discovery, so it does not request `QUERY_ALL_PACKAGES`. Android package visibility and OEM restrictions can still reduce the returned list. Accessibility is the enforcement mechanism; `SYSTEM_ALERT_WINDOW` is not requested.

## Verification

TypeScript validation passes. The Gradle compile could not run in this workspace because no Android SDK is installed. A physical Android verification pass is required for Accessibility settings, repeated app switching, screen lock, reboot, package uninstall, service revocation, and emergency exit behavior.

## Device checklist

1. Install a development or release build on Android 13, 14, or 15.
2. Enable **Study Sakha** under Accessibility and return to Focus Lock; confirm the status changes only after the service is actually enabled.
3. Select two launchable apps, start a short session, and verify each selected app opens the blocking Activity while an unselected app remains available.
4. Lock and unlock the device, restart Study Sakha, revoke Accessibility, and uninstall one selected app during a session.
5. Confirm expiration clears native state and emergency exit records a stopped session without completion credit beyond elapsed focus time.
