const express = require('express');
const http = require('http');
const httpProxy = require('http-proxy');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const GEMINI_MODELS = require('./lib/geminiModels.json');
const { createTimeoutFetch, getTimeoutMs } = require('./server/requestTimeout');

// Load local server-side environment variables if .env exists (never exposed to client)
try {
  if (typeof process.loadEnvFile === 'function') {
    process.loadEnvFile();
  }
} catch (e) {
  // Ignore if .env is missing and variables are set via environment
}

const { handleChat } = require('./server/gemini');
const { renderGroupInviteLandingHtml } = require('./server/invitePage');

const app = express();
const PORT = process.env.PORT || 3000;
const METRO_PORT = 8081;
// The same Express app is used by the local launcher and the Vercel function.
// Only the direct launcher starts Metro or opens a listening socket.
const isDev = process.env.NODE_ENV !== 'production' && require.main === module;
const SUPABASE_AUTH_TIMEOUT_MS = getTimeoutMs(process.env.SUPABASE_AUTH_TIMEOUT_MS, 10_000);
const SUPABASE_AUTH_TIMEOUT_CODE = 'SUPABASE_AUTH_TIMEOUT';

function getSupabaseConfigDiagnostics() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
  const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? '';
  let parses = false;
  let hostnameEndsInSupabase = false;
  try {
    const parsedUrl = new URL(url);
    parses = true;
    hostnameEndsInSupabase = parsedUrl.hostname.endsWith('.supabase.co');
  } catch {
    // Keep diagnostics safe and continue with the normal configuration guard.
  }
  return {
    urlPresent: Boolean(url),
    urlParses: parses,
    urlHostnameEndsInSupabaseCo: hostnameEndsInSupabase,
    publishableKeyPresent: Boolean(key),
    publishableKeyHasExpectedPrefix: key.startsWith('sb_publishable_'),
  };
}

console.info('[Study Sakha] Supabase configuration diagnostics', getSupabaseConfigDiagnostics());

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

app.use(express.json({ limit: '128kb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Study Sakha Backend API',
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
    timestamp: Date.now(),
  });
});

app.get(['/healthz', '/api/healthz'], (req, res) => {
  res.status(200).send('OK');
});

app.get('/api/invite/:token', (req, res) => {
  const token = String(req.params.token || '').trim();
  if (!token) return res.status(400).send('Invalid invitation link.');
  const webAppUrl = `/groups/invite/${encodeURIComponent(token)}?web=1`;
  return res.status(200).type('html').send(renderGroupInviteLandingHtml({ token, webAppUrl }));
});

app.get('/groups/invite/:token', (req, res, next) => {
  const token = String(req.params.token || '').trim();
  if (!token) return next();
  if (req.query.web === '1') return next();
  const accept = String(req.headers.accept || '');
  const userAgent = String(req.headers['user-agent'] || '');
  const isMobileBrowser = /android|iphone|ipad|mobile/i.test(userAgent);
  if (isMobileBrowser && accept.includes('text/html')) {
    const webAppUrl = `/groups/invite/${encodeURIComponent(token)}?web=1`;
    return res.status(200).type('html').send(renderGroupInviteLandingHtml({ token, webAppUrl }));
  }
  return next();
});

const chatModelIds = new Set(GEMINI_MODELS.map((model) => model.id));
const chatRateWindows = new Map();
let supabaseAuthClient;

function getSupabaseAuthClient() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) return null;
  try {
    const parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol) || !parsedUrl.hostname || parsedUrl.username || parsedUrl.password) {
      return null;
    }
  } catch {
    return null;
  }
  if (!supabaseAuthClient) {
    supabaseAuthClient = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: {
        fetch: createTimeoutFetch(SUPABASE_AUTH_TIMEOUT_MS, SUPABASE_AUTH_TIMEOUT_CODE),
      },
    });
  }
  return supabaseAuthClient;
}

async function authenticateChatRequest(req, res, next) {
  const match = /^Bearer\s+([^\s]+)$/i.exec(req.get('authorization') ?? '');
  if (!match || match[1].length > 4096) {
    return res.status(401).json({ error: 'Sign in to use Sakha AI.' });
  }
  try {
    const authClient = getSupabaseAuthClient();
    if (!authClient) {
      return res.status(503).json({ error: 'Sakha AI authentication is not configured on this server.' });
    }
    const { data, error } = await authClient.auth.getUser(match[1]);
    if (error || !data.user) return res.status(401).json({ error: 'Your session is invalid or expired.' });
    req.authenticatedUser = data.user;
    return next();
  } catch (error) {
    if (error?.message?.includes(SUPABASE_AUTH_TIMEOUT_CODE)) {
      return res.status(504).json({ error: 'Session verification took too long. Please try again.' });
    }
    return res.status(503).json({ error: 'Sakha AI could not verify your session.' });
  }
}

function validateChatRequest(req, res, next) {
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ error: 'Invalid chat request.' });
  }
  if (Buffer.byteLength(JSON.stringify(body), 'utf8') > 96 * 1024) {
    return res.status(413).json({ error: 'Chat request is too large.' });
  }
  if (typeof body.message !== 'string' || !body.message.trim() || body.message.length > 4000) {
    return res.status(400).json({ error: 'Message text must be between 1 and 4000 characters.' });
  }
  if (!Array.isArray(body.history) || body.history.length > 12) {
    return res.status(400).json({ error: 'Chat history must contain no more than 12 messages.' });
  }
  if (body.history.some((item) =>
    !item ||
    typeof item !== 'object' ||
    !['user', 'sakha', 'assistant', 'model'].includes(item.role) ||
    typeof item.text !== 'string' ||
    item.text.length > 4000
  )) {
    return res.status(400).json({ error: 'Chat history contains an invalid message.' });
  }
  if (body.model !== undefined && !chatModelIds.has(body.model)) {
    return res.status(400).json({ error: 'The selected Gemini model is not supported.' });
  }
  return next();
}

function rateLimitChat(req, res, next) {
  const now = Date.now();
  const windowMs = 60_000;
  const limit = 20;
  const userId = req.authenticatedUser.id;
  let window = chatRateWindows.get(userId);
  if (!window || now - window.startedAt >= windowMs) {
    window = { startedAt: now, count: 0 };
    chatRateWindows.set(userId, window);
  }
  if (window.count >= limit) {
    return res.status(429).json({ error: 'Sakha AI request limit reached. Wait a minute and try again.' });
  }
  window.count += 1;
  if (chatRateWindows.size > 10_000) {
    for (const [id, entry] of chatRateWindows) {
      if (now - entry.startedAt >= windowMs) chatRateWindows.delete(id);
    }
  }
  return next();
}

// Gemini credentials stay on the server; chat requests require a verified account.
app.post('/api/chat', authenticateChatRequest, validateChatRequest, rateLimitChat, handleChat);

function safeStatSize(filePath, fallback) {
  if (!filePath) return fallback;
  try {
    return fs.statSync(filePath).size;
  } catch (err) {
    console.error('[Audio Catalog Stat Error]', err);
    return fallback;
  }
}

// Audio Library catalog endpoint
app.get('/api/audio-catalog', (req, res) => {
  const pDeep = getAudioFilePath('deep_positive_energy.mp3');
  const sizeDeep = safeStatSize(pDeep, 6000726);
  const pCosmic = getAudioFilePath('pure_cosmic_waves.mp3');
  const sizeCosmic = safeStatSize(pCosmic, 9852000);
  res.json([
    {
      id: 'deep_positive_energy',
      name: 'Deep Positive Energy',
      subtitle: '30-Minute deep meditation music for positive energy & inner peace (10 mins tuned)',
      filename: 'deep_positive_energy.mp3',
      sizeBytes: sizeDeep,
      durationSeconds: 600,
      downloadUrl: '/api/audio/deep_positive_energy.mp3',
    },
    {
      id: 'pure_cosmic_waves',
      name: 'Pure Cosmic Waves',
      subtitle: 'Harmonic deep cosmic meditation waves (10 mins)',
      filename: 'pure_cosmic_waves.mp3',
      sizeBytes: sizeCosmic,
      durationSeconds: 609,
      downloadUrl: '/api/audio/pure_cosmic_waves.mp3',
    },
  ]);
});

// Audio Library streaming and download endpoint with byte range support.
const audioFiles = new Set(['deep_positive_energy.mp3', 'pure_cosmic_waves.mp3']);
const audioLibraryDirectories = [
  path.join(__dirname, 'assets', 'audio_library'),
  path.join(__dirname, 'dist', 'assets', 'audio_library'),
];

function getAudioFilePath(filename) {
  for (const directory of audioLibraryDirectories) {
    const filePath = path.join(directory, filename);
    if (fs.existsSync(filePath)) return filePath;
  }
  return null;
}

app.get('/api/audio/:filename', (req, res) => {
  const filename = path.basename(req.params.filename);
  if (!audioFiles.has(filename)) {
    return res.status(404).json({ error: 'Audio file not found' });
  }
  const filePath = getAudioFilePath(filename);
  if (!filePath) {
    return res.status(404).json({ error: 'Audio file not found' });
  }

  let stat;
  try {
    stat = fs.statSync(filePath);
  } catch (err) {
    console.error('[Audio Stat Error]', err);
    return res.status(404).json({ error: 'Audio file not found' });
  }
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match || (!match[1] && !match[2])) {
      return res.status(416).set('Content-Range', `bytes */${fileSize}`).end();
    }
    const start = match[1] ? Number(match[1]) : Math.max(fileSize - Number(match[2]), 0);
    let end = match[1] && match[2] ? Number(match[2]) : fileSize - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= fileSize) {
      return res.status(416).set('Content-Range', `bytes */${fileSize}`).end();
    }
    end = Math.min(end, fileSize - 1);
    const chunksize = end - start + 1;
    const file = fs.createReadStream(filePath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': filename.endsWith('.m4a') ? 'audio/mp4' : 'audio/mpeg',
      'Access-Control-Allow-Origin': '*',
    };
    file.once('open', () => {
      if (!res.headersSent) res.writeHead(206, head);
    });
    file.on('error', (err) => {
      console.error('[Audio Stream Error]', err);
      if (!res.headersSent) res.status(500).json({ error: 'Audio stream failed.' });
      else res.destroy();
    });
    file.pipe(res);
  } else {
    const file = fs.createReadStream(filePath);
    const head = {
      'Content-Length': fileSize,
      'Content-Type': filename.endsWith('.m4a') ? 'audio/mp4' : 'audio/mpeg',
      'Accept-Ranges': 'bytes',
      'Access-Control-Allow-Origin': '*',
      'Content-Disposition': `inline; filename="${filename}"`,
    };
    file.once('open', () => {
      if (!res.headersSent) res.writeHead(200, head);
    });
    file.on('error', (err) => {
      console.error('[Audio Stream Error]', err);
      if (!res.headersSent) res.status(500).json({ error: 'Audio stream failed.' });
      else res.destroy();
    });
    file.pipe(res);
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
  if (getHasDist() && res && !res.headersSent && typeof res.sendFile === 'function') {
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

  // Use LAN host mode so Metro listens on IPv4 as well as IPv6. The proxy
  // below connects through 127.0.0.1, which is not reachable when Expo's
  // localhost mode binds only to ::1 in SDK 57.
  metroProcess = spawn('npx', ['expo', 'start', '--web', '--port', String(METRO_PORT), '--host', 'lan'], {
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

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'API endpoint not found.' });
});

app.use((err, _req, res, _next) => {
  console.error('[Server Error]', err);
  if (res.headersSent) return;
  const status = typeof err?.status === 'number' ? err.status : 500;
  res.status(status).json({ error: status === 400 ? 'Invalid request payload.' : 'Internal server error.' });
});

if (require.main === module) {
  const server = http.createServer(app);

  // Handle WebSocket upgrade for the local Metro bundler only.
  server.on('upgrade', (req, socket, head) => {
    if (isDev && !req.url.startsWith('/api/')) {
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
    if (metroProcess) metroProcess.kill('SIGTERM');
    process.exit();
  }

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

module.exports = { app };
