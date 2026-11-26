const express = require('express');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '../..');
const distDir = path.join(rootDir, 'dist');
const port = Number(process.env.PLAYWRIGHT_PORT || 4173);
const host = process.env.PLAYWRIGHT_HOST || '127.0.0.1';

if (!fs.existsSync(path.join(distDir, 'index.html'))) {
  console.log('[Playwright WebServer] dist/index.html not found, exporting Expo web bundle...');
  execSync('pnpm run build:web', { cwd: rootDir, stdio: 'inherit' });
}

// Mount static dist with dotfiles: 'allow' BEFORE server.js app so pnpm-nested
// font assets (/assets/node_modules/.pnpm/**/*.ttf) are served directly instead
// of falling through Express's default dotfiles: 'ignore' into index.html.
const wrapper = express();
wrapper.use(express.static(distDir, { dotfiles: 'allow' }));

const { app: backendApp } = require(path.join(rootDir, 'server.js'));
wrapper.use(backendApp);

wrapper.use((req, res, next) => {
  if (req.url.startsWith('/api/')) return next();
  return res.sendFile(path.join(distDir, 'index.html'));
});

const server = http.createServer(wrapper);
server.listen(port, host, () => {
  console.log(`[Playwright WebServer] Listening on http://${host}:${port}`);
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
