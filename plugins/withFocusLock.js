const {
  withAndroidManifest,
  withDangerousMod,
  withMainApplication,
  withStringsXml,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const SOURCE_ROOT = path.join('native', 'focus-lock', 'android');
const KOTLIN_FILES = [
  'FocusLockModule.kt',
  'FocusLockAccessibilityService.kt',
  'FocusLockBlockingActivity.kt',
  'FocusLockAlarm.kt',
  'FocusLockBootReceiver.kt',
  'FocusLockPackage.kt',
];

function addUnique(items, item, name) {
  if (!items.some((candidate) => candidate.$?.['android:name'] === name)) items.push(item);
}

function withFocusLockSources(config) {
  return withDangerousMod(config, ['android', async (modConfig) => {
    const sourceRoot = path.join(modConfig.modRequest.projectRoot, SOURCE_ROOT);
    const packageName = modConfig.android?.package || 'com.anonymous.agonpreview';
    const packagePath = packageName.split('.').join(path.sep);
    const destinationRoot = path.join(modConfig.modRequest.platformProjectRoot, 'app', 'src', 'main');
    const kotlinDestination = path.join(destinationRoot, 'java', packagePath);

    fs.mkdirSync(kotlinDestination, { recursive: true });
    for (const fileName of KOTLIN_FILES) {
      fs.copyFileSync(path.join(sourceRoot, 'java', 'com', 'anonymous', 'agonpreview', fileName), path.join(kotlinDestination, fileName));
    }

    const resourceDestination = path.join(destinationRoot, 'res', 'xml');
    fs.mkdirSync(resourceDestination, { recursive: true });
    fs.copyFileSync(path.join(sourceRoot, 'res', 'xml', 'focus_lock_service.xml'), path.join(resourceDestination, 'focus_lock_service.xml'));
    return modConfig;
  }]);
}

function withFocusLockRegistration(config) {
  return withMainApplication(config, (mod) => {
    const contents = mod.modResults.contents;
    if (contents.includes('add(FocusLockPackage())')) return mod;
    const marker = 'PackageList(this).packages.apply {';
    if (!contents.includes(marker)) {
      throw new Error('Focus Lock could not register: the generated MainApplication package list was not found.');
    }
    mod.modResults.contents = contents.replace(marker, `${marker}\n          add(FocusLockPackage())`);
    return mod;
  });
}

/** Keeps the AccessibilityService contract present when Expo regenerates Android files. */
module.exports = function withFocusLock(config) {
  config = withFocusLockSources(config);
  config = withFocusLockRegistration(config);
  config = withStringsXml(config, (mod) => {
    const resources = mod.modResults.resources && typeof mod.modResults.resources === 'object'
      ? mod.modResults.resources
      : {};
    const strings = Array.isArray(resources.string) ? resources.string : [];
    if (!strings.some((item) => item.$?.name === 'focus_lock_accessibility_description')) {
      strings.push({
        $: { name: 'focus_lock_accessibility_description' },
        _: 'Study Sakha uses foreground app changes to show a focus reminder for the apps you selected. It does not read or store screen content.',
      });
    }
    mod.modResults.resources = { ...resources, string: strings };
    return mod;
  });
  return withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults;
    const permissions = manifest.manifest['uses-permission'] ?? [];
    if (!permissions.some((item) => item.$?.['android:name'] === 'android.permission.PACKAGE_USAGE_STATS')) {
      permissions.push({ $: { 'android:name': 'android.permission.PACKAGE_USAGE_STATS', 'tools:ignore': 'ProtectedPermissions' } });
    }
    if (!permissions.some((item) => item.$?.['android:name'] === 'android.permission.RECEIVE_BOOT_COMPLETED')) {
      permissions.push({ $: { 'android:name': 'android.permission.RECEIVE_BOOT_COMPLETED' } });
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
    addUnique(application.service, {
        $: { 'android:name': '.FocusLockAccessibilityService', 'android:exported': 'true', 'android:permission': 'android.permission.BIND_ACCESSIBILITY_SERVICE' },
        'intent-filter': [{ action: [{ $: { 'android:name': 'android.accessibilityservice.AccessibilityService' } }] }],
        'meta-data': [{ $: { 'android:name': 'android.accessibilityservice', 'android:resource': '@xml/focus_lock_service' } }],
      }, '.FocusLockAccessibilityService');
    addUnique(application.activity ??= [], {
      $: { 'android:name': '.FocusLockBlockingActivity', 'android:exported': 'false', 'android:excludeFromRecents': 'true', 'android:launchMode': 'singleTop' },
    }, '.FocusLockBlockingActivity');
    addUnique(application.receiver ??= [], {
      $: { 'android:name': '.FocusLockAlarm$Receiver', 'android:exported': 'false' },
    }, '.FocusLockAlarm$Receiver');
    const receivers = application.receiver ?? [];
    addUnique(receivers, {
        $: { 'android:name': '.FocusLockBootReceiver', 'android:enabled': 'true', 'android:exported': 'true' },
        'intent-filter': [{ action: [
          { $: { 'android:name': 'android.intent.action.BOOT_COMPLETED' } },
          { $: { 'android:name': 'android.intent.action.MY_PACKAGE_REPLACED' } },
        ] }],
      }, '.FocusLockBootReceiver');
    application.receiver = receivers;
    return mod;
  });
};
