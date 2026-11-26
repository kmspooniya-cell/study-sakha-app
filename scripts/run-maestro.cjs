const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const targetPath = process.argv[2] || 'e2e/maestro/flows';
const extraArgs = process.argv.slice(3);

function resolveMaestroBinary() {
  const candidates = [
    path.join(os.homedir(), '.maestro', 'bin', 'maestro'),
    'maestro',
  ];
  for (const candidate of candidates) {
    if (candidate.includes(path.sep) && !fs.existsSync(candidate)) continue;
    const probe = spawnSync(candidate, ['--version'], { encoding: 'utf8' });
    if (probe.status === 0) {
      return candidate;
    }
  }
  return null;
}

const maestroBin = resolveMaestroBinary();
if (!maestroBin) {
  console.error(
    '[Maestro Runner] Maestro CLI was not found. Install it with:\n' +
      '  curl -fsSL "https://get.maestro.mobile.dev" | bash\n' +
      'and ensure "$HOME/.maestro/bin" is in PATH.'
  );
  process.exit(1);
}

const adbCheck = spawnSync('adb', ['devices'], { encoding: 'utf8' });
if (adbCheck.error) {
  console.error(
    '[Maestro Runner] Android ADB (`adb`) is not installed or not in PATH.\n' +
      'Connect an Android device/emulator with Android SDK Platform-Tools installed before running mobile E2E tests.'
  );
  process.exit(1);
}

const connectedDevices = adbCheck.stdout
  .split(/\r?\n/)
  .slice(1)
  .map((line) => line.trim())
  .filter((line) => line && /\tdevice$/.test(line));

if (connectedDevices.length === 0) {
  console.error(
    '[Maestro Runner] No connected Android devices or emulators detected by `adb devices`.\n' +
      'Start an Android emulator or connect a physical device with USB debugging enabled.'
  );
  process.exit(1);
}

const appId = process.env.MAESTRO_APP_ID || 'com.anonymous.agonpreview';
const runId = process.env.MAESTRO_RUN_ID || String(Date.now());
const outputDir = path.join(rootDir, 'e2e', 'maestro', 'artifacts');
fs.mkdirSync(outputDir, { recursive: true });

const args = [
  'test',
  '--config',
  path.join(rootDir, 'e2e', 'maestro', 'config.yaml'),
  '-p',
  'android',
  '--format',
  'HTML-DETAILED',
  '--test-output-dir',
  outputDir,
  '-e',
  `MAESTRO_APP_ID=${appId}`,
  '-e',
  `MAESTRO_RUN_ID=${runId}`,
];

if (process.env.MAESTRO_TEST_EMAIL) {
  args.push('-e', `MAESTRO_TEST_EMAIL=${process.env.MAESTRO_TEST_EMAIL}`);
}
if (process.env.MAESTRO_TEST_PASSWORD) {
  args.push('-e', `MAESTRO_TEST_PASSWORD=${process.env.MAESTRO_TEST_PASSWORD}`);
}

args.push(path.resolve(rootDir, targetPath), ...extraArgs);

try {
  execFileSync(maestroBin, args, { stdio: 'inherit', cwd: rootDir });
} catch (error) {
  process.exit(typeof error?.status === 'number' ? error.status : 1);
}
