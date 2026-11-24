const fs = require('node:fs');
const path = require('node:path');

const profile = process.argv.slice(2).find((argument) => argument !== '--') || 'production';
const allowedProfiles = new Set(['preview', 'production', 'arm64-apk']);

if (!allowedProfiles.has(profile)) {
  console.error(`Unknown release profile: ${profile}`);
  process.exit(1);
}

const requiredVariables = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'EXPO_PUBLIC_API_BASE_URL',
];
const missing = requiredVariables.filter((name) => !process.env[name]?.trim());

if (missing.length > 0) {
  console.error(`Missing required ${profile} build environment variable(s): ${missing.join(', ')}`);
  process.exit(1);
}

let apiUrl;
try {
  apiUrl = new URL(process.env.EXPO_PUBLIC_API_BASE_URL.trim());
} catch {
  console.error('EXPO_PUBLIC_API_BASE_URL must be an absolute HTTPS URL.');
  process.exit(1);
}

if (apiUrl.protocol !== 'https:' || !apiUrl.hostname || apiUrl.username || apiUrl.password) {
  console.error('EXPO_PUBLIC_API_BASE_URL must be an absolute HTTPS URL without embedded credentials.');
  process.exit(1);
}

const appConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'app.json'), 'utf8')).expo;
if (appConfig.android?.allowBackup !== false) {
  console.error('Android backup must be disabled in app.json for release builds.');
  process.exit(1);
}

console.log(`Release configuration validated for ${profile}: required public variables are present, API origin is HTTPS, and Android backup is disabled.`);
