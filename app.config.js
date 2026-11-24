const appJson = require('./app.json');

function assertAbsoluteHttpsUrl(value) {
  let parsed;
  try {
    parsed = new URL(value.trim());
  } catch {
    throw new Error('EXPO_PUBLIC_API_BASE_URL must be an absolute HTTPS URL for Android builds.');
  }

  if (parsed.protocol !== 'https:' || !parsed.hostname || parsed.username || parsed.password) {
    throw new Error('EXPO_PUBLIC_API_BASE_URL must be an absolute HTTPS URL for Android builds.');
  }
}

module.exports = ({ config }) => {
  // EAS also sets EAS_BUILD/EAS_BUILD_PLATFORM while resolving config for
  // metadata commands such as env:list and env:pull. Only a build ID proves
  // that the build job has started and its environment is available.
  const hasEasBuildExecutionContext = Boolean(process.env.EAS_BUILD_ID);
  const isAndroidEasBuild =
    process.env.EAS_BUILD === 'true' &&
    process.env.EAS_BUILD_PLATFORM === 'android' &&
    hasEasBuildExecutionContext;
  if (isAndroidEasBuild) {
    const requiredVariables = [
      'EXPO_PUBLIC_SUPABASE_URL',
      'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
      'EXPO_PUBLIC_API_BASE_URL',
    ];
    const missing = requiredVariables.filter((name) => !process.env[name]?.trim());
    if (missing.length > 0) {
      throw new Error(`Missing required Android build environment variable(s): ${missing.join(', ')}`);
    }
    assertAbsoluteHttpsUrl(process.env.EXPO_PUBLIC_API_BASE_URL);
  }

  return {
    ...config,
    android: {
      ...config.android,
      allowBackup: false,
      blockedPermissions: ['android.permission.SYSTEM_ALERT_WINDOW'],
    },
  };
};

// Keep app.json as the source of the static Expo configuration when this file is
// evaluated directly by Node-based validation tools.
if (!appJson?.expo) {
  throw new Error('app.json must contain an expo configuration object.');
}
