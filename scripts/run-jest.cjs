const { spawnSync } = require('node:child_process');

// pnpm test -- <args> forwards the separator as an argument in this workspace.
// Jest treats that literal separator as a test pattern, so remove only it.
const args = process.argv.slice(2).filter((argument) => argument !== '--');
const jestBin = process.platform === 'win32' ? 'jest.cmd' : 'jest';
const result = spawnSync(jestBin, args, { stdio: 'inherit', shell: false });

if (result.error) throw result.error;
process.exit(result.status ?? 1);
