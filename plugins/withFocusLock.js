const { withAndroidManifest } = require('@expo/config-plugins');

/** Keeps the AccessibilityService contract present when Expo regenerates Android files. */
module.exports = function withFocusLock(config) {
  return withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults;
    const permissions = manifest.manifest['uses-permission'] ?? [];
    if (!permissions.some((item) => item.$?.['android:name'] === 'android.permission.PACKAGE_USAGE_STATS')) {
      permissions.push({ $: { 'android:name': 'android.permission.PACKAGE_USAGE_STATS', 'tools:ignore': 'ProtectedPermissions' } });
    }
    manifest.manifest['uses-permission'] = permissions;
    manifest.manifest.queries = manifest.manifest.queries ?? [];
    const hasLauncherQuery = manifest.manifest.queries.some((query) =>
      query.intent?.some((intent) => intent.action?.some((action) => action.$?.['android:name'] === 'android.intent.action.MAIN')),
    );
    if (!hasLauncherQuery) {
      manifest.manifest.queries.push({
        intent: [{
          action: [{ $: { 'android:name': 'android.intent.action.MAIN' } }],
          category: [{ $: { 'android:name': 'android.intent.category.LAUNCHER' } }],
        }],
      });
    }
    const application = manifest.manifest.application?.[0];
    if (!application) return mod;
    application.service = application.service ?? [];
    if (!application.service.some((item) => item.$?.['android:name'] === '.FocusLockAccessibilityService')) {
      application.service.push({
        $: { 'android:name': '.FocusLockAccessibilityService', 'android:exported': 'true', 'android:permission': 'android.permission.BIND_ACCESSIBILITY_SERVICE' },
        'intent-filter': [{ action: [{ $: { 'android:name': 'android.accessibilityservice.AccessibilityService' } }] }],
        'meta-data': [{ $: { 'android:name': 'android.accessibilityservice', 'android:resource': '@xml/focus_lock_service' } }],
      });
    }
    return mod;
  });
};
