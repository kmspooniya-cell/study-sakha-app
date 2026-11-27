const { withAndroidManifest, withDangerousMod, withMainApplication } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const SOURCE_ROOT = path.join('native', 'alarm', 'android');
const KOTLIN_FILES = [
  'AlarmEngineScheduler.kt',
  'AlarmEngineModule.kt',
  'AlarmEnginePackage.kt',
  'AlarmEngineReceiver.kt',
  'AlarmEngineBootReceiver.kt',
  'AlarmPlaybackService.kt',
];

function addPermission(permissions, name) {
  if (!permissions.some((item) => item.$?.['android:name'] === name)) permissions.push({ $: { 'android:name': name } });
}

function addComponent(items, name, component) {
  if (!items.some((item) => item.$?.['android:name'] === name)) items.push(component);
}

function withAlarmSources(config) {
  return withDangerousMod(config, ['android', async (modConfig) => {
    const packageName = modConfig.android?.package || 'com.anonymous.agonpreview';
    const sourceRoot = path.join(modConfig.modRequest.projectRoot, SOURCE_ROOT, 'java', 'com', 'anonymous', 'agonpreview');
    const packagePath = packageName.split('.').join(path.sep);
    const destinationRoot = path.join(modConfig.modRequest.platformProjectRoot, 'app', 'src', 'main');
    const destination = path.join(destinationRoot, 'java', packagePath);
    fs.mkdirSync(destination, { recursive: true });
    for (const fileName of KOTLIN_FILES) {
      const source = fs.readFileSync(path.join(sourceRoot, fileName), 'utf8');
      const rendered = packageName === 'com.anonymous.agonpreview'
        ? source
        : source.replace(/^package com\.anonymous\.agonpreview/m, `package ${packageName}`);
      fs.writeFileSync(path.join(destination, fileName), rendered, 'utf8');
    }
    return modConfig;
  }]);
}

function withAlarmRegistration(config) {
  return withMainApplication(config, (mod) => {
    const contents = mod.modResults.contents;
    if (contents.includes('add(AlarmEnginePackage())')) return mod;
    const marker = 'PackageList(this).packages.apply {';
    if (!contents.includes(marker)) throw new Error('Study Sakha Alarm Engine could not register: package list marker not found.');
    mod.modResults.contents = contents.replace(marker, `${marker}\n          add(AlarmEnginePackage())`);
    return mod;
  });
}

module.exports = function withAlarmEngine(config) {
  config = withAlarmSources(config);
  config = withAlarmRegistration(config);
  return withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults.manifest;
    const permissions = manifest['uses-permission'] ?? [];
    ['android.permission.SCHEDULE_EXACT_ALARM', 'android.permission.RECEIVE_BOOT_COMPLETED', 'android.permission.POST_NOTIFICATIONS', 'android.permission.USE_FULL_SCREEN_INTENT', 'android.permission.VIBRATE', 'android.permission.WAKE_LOCK'].forEach((name) => addPermission(permissions, name));
    manifest['uses-permission'] = permissions;
    const application = manifest.application?.[0];
    if (!application) return mod;
    application.receiver = application.receiver ?? [];
    addComponent(application.receiver, '.AlarmEngineReceiver', {
      $: { 'android:name': '.AlarmEngineReceiver', 'android:enabled': 'true', 'android:exported': 'false' },
    });
    addComponent(application.receiver, '.AlarmEngineBootReceiver', {
      $: { 'android:name': '.AlarmEngineBootReceiver', 'android:enabled': 'true', 'android:exported': 'true' },
      'intent-filter': [{ action: [{ $: { 'android:name': 'android.intent.action.BOOT_COMPLETED' } }, { $: { 'android:name': 'android.intent.action.MY_PACKAGE_REPLACED' } }, { $: { 'android:name': 'android.intent.action.TIME_SET' } }, { $: { 'android:name': 'android.intent.action.TIMEZONE_CHANGED' } }] }],
    });
    application.service = application.service ?? [];
    addComponent(application.service, '.AlarmPlaybackService', {
      $: { 'android:name': '.AlarmPlaybackService', 'android:enabled': 'true', 'android:exported': 'false', 'android:foregroundServiceType': 'mediaPlayback' },
    });
    return mod;
  });
};
