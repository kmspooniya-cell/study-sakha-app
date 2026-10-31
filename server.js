const express = require('express');
const http = require('http');
const httpProxy = require('http-proxy');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Load local server-side environment variables if .env exists (never exposed to client)
try {
  if (typeof process.loadEnvFile === 'function') {
    process.loadEnvFile();
  }
} catch (e) {
  // Ignore if .env is missing and variables are set via environment
}

const { handleChat } = require('./server/gemini');

const app = express();
const PORT = process.env.PORT || 3000;
const METRO_PORT = 8081;
const isDev = process.env.NODE_ENV !== 'production';

// Global CORS & preflight middleware
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Study Sakha Backend API',
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
    timestamp: Date.now(),
  });
});

app.get('/healthz', (req, res) => {
  res.status(200).send('OK');
});

// Gemini Chat API endpoint (server-side only)
app.post('/api/chat', handleChat);

// Audio Library catalog endpoint
app.get('/api/audio-catalog', (req, res) => {
  const p = path.join(__dirname, 'assets', 'audio_library', 'pure_cosmic_waves.mp3');
  const size = fs.existsSync(p) ? fs.statSync(p).size : 9852000;
  res.json([
    {
      id: 'pure_cosmic_waves',
      name: 'Pure Cosmic Waves',
      subtitle: 'Harmonic deep cosmic meditation waves (10 mins)',
      filename: 'pure_cosmic_waves.mp3',
      sizeBytes: size,
      durationSeconds: 609,
      downloadUrl: '/api/audio/pure_cosmic_waves.mp3',
    },
  ]);
});

// Audio Library streaming and download endpoint with byte range support
app.get('/api/audio/:filename', (req, res) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(__dirname, 'assets', 'audio_library', filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Audio file not found' });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = end - start + 1;
    const file = fs.createReadStream(filePath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': filename.endsWith('.m4a') ? 'audio/mp4' : 'audio/mpeg',
      'Access-Control-Allow-Origin': '*',
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': filename.endsWith('.m4a') ? 'audio/mp4' : 'audio/mpeg',
      'Accept-Ranges': 'bytes',
      'Access-Control-Allow-Origin': '*',
      'Content-Disposition': `inline; filename="${filename}"`,
    };
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
});

const distDir = path.join(__dirname, 'dist');
const getHasDist = () => fs.existsSync(distDir) && fs.existsSync(path.join(distDir, 'index.html'));

let metroProcess = null;
let metroReady = false;

// Create proxy for forwarding non-API requests to Metro in dev
const proxy = httpProxy.createProxyServer({
  target: `http://127.0.0.1:${METRO_PORT}`,
  ws: true,
  changeOrigin: true,
});

// Intercept proxy requests to sanitize Origin and Host headers
// Expo's CorsMiddleware throws 500 'Unauthorized request from <origin>' if Origin is not localhost/same-origin.
// Stripping the forwarded Origin header prevents Metro from blocking cloud preview domains.
proxy.on('proxyReq', (proxyReq, req, res, options) => {
  proxyReq.removeHeader('origin');
  proxyReq.setHeader('host', `127.0.0.1:${METRO_PORT}`);
});

proxy.on('proxyReqWs', (proxyReq, req, socket, options, head) => {
  proxyReq.removeHeader('origin');
  proxyReq.setHeader('host', `127.0.0.1:${METRO_PORT}`);
});

// Ensure outgoing proxy responses have permissive CORS headers
proxy.on('proxyRes', (proxyRes, req, res) => {
  proxyRes.headers['access-control-allow-origin'] = '*';
  proxyRes.headers['access-control-allow-methods'] = 'GET, HEAD, POST, PUT, DELETE, OPTIONS';
  proxyRes.headers['access-control-allow-headers'] = '*';
});

proxy.on('error', (err, req, res) => {
  // If Metro is not ready yet or errors, serve from dist if available
  if (getHasDist() && res && !res.headersSent) {
    if (req.url && (req.url === '/' || !path.extname(req.url))) {
      res.sendFile(path.join(distDir, 'index.html'));
      return;
    }
  }
  if (res && !res.headersSent && typeof res.writeHead === 'function') {
    res.writeHead(502, { 'Content-Type': 'text/html' });
    res.end('<h1>Study Sakha is starting up... Please refresh in a moment.</h1>');
  }
});

if (isDev) {
  console.log('[Server] Starting Expo web bundler on internal port', METRO_PORT);
  
  // Pass headless and CI flags to disable React Native desktop DevTools
  // (which fails on headless Linux containers due to missing libgtk-3.so.0)
  const metroEnv = {
    ...process.env,
    CI: '1',
    EXPO_UNSTABLE_HEADLESS: '1',
    EXPO_NO_REACT_NATIVE_DEVTOOLS: '1',
    REACT_NATIVE_DEVTOOLS_ENABLED: '0',
    RCT_METRO_PORT: String(METRO_PORT),
  };

  metroProcess = spawn('npx', ['expo', 'start', '--web', '--port', String(METRO_PORT), '--localhost'], {
    stdio: 'inherit',
    env: metroEnv,
  });

  metroProcess.on('error', (err) => {
    console.error('[Metro Process Error]', err);
  });

  metroProcess.on('exit', (code) => {
    console.log('[Metro Process Exit]', code);
  });

  // Wait a short time to mark metro ready
  setTimeout(() => {
    metroReady = true;
  }, 4000);
}

// Serve dist static files if built
if (getHasDist()) {
  app.use(express.static(distDir));
}

// For dev, proxy any remaining requests to Metro
app.use((req, res, next) => {
  if (req.url.startsWith('/api/')) {
    return next();
  }

  // Sanitize origin on incoming request object
  if (req.headers.origin && !req.headers.origin.includes('127.0.0.1')) {
    delete req.headers.origin;
  }
  req.headers.host = `127.0.0.1:${METRO_PORT}`;

  if (isDev) {
    proxy.web(req, res, { target: `http://127.0.0.1:${METRO_PORT}` }, (err) => {
      if (getHasDist() && !res.headersSent) {
        res.sendFile(path.join(distDir, 'index.html'));
      } else {
        next(err);
      }
    });
  } else if (getHasDist()) {
    res.sendFile(path.join(distDir, 'index.html'));
  } else {
    res.status(404).send('Not Found');
  }
});

const server = http.createServer(app);

// Handle WebSocket upgrade for Metro bundler
server.on('upgrade', (req, socket, head) => {
  if (isDev && !req.url.startsWith('/api/')) {
    // Sanitize origin for websocket requests
    delete req.headers.origin;
    req.headers.host = `127.0.0.1:${METRO_PORT}`;
    proxy.ws(req, socket, head, { target: `http://127.0.0.1:${METRO_PORT}` });
  } else {
    socket.destroy();
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Study Sakha Server] Running on http://0.0.0.0:${PORT} (Gemini Chat ready)`);
});

function cleanup() {
  if (metroProcess) {
    metroProcess.kill('SIGTERM');
  }
  process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
