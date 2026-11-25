const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

// pnpm test -- <args> forwards the separator as an argument in this workspace.
// Jest treats that literal separator as a test pattern, so remove only it.
const args = process.argv.slice(2).filter((argument) => argument !== '--');
const jestBin = process.platform === 'win32' ? 'jest.cmd' : 'jest';
const localJest = path.join(__dirname, '..', 'node_modules', '.bin', jestBin);
const resolvedJest = fs.existsSync(localJest) ? localJest : jestBin;
const result = spawnSync(resolvedJest, args, { stdio: 'inherit', shell: false });

if (result.error) throw result.error;
process.exit(result.status ?? 1);
