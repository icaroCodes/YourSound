// ══════════════════════════════════════════════════════════════════════
// YourSound API — Production-ready Express server
// ══════════════════════════════════════════════════════════════════════

// ── 1. Load .env FIRST — explicit path for monorepo compatibility ───
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// ── 2. Global crash handlers — prevent silent deaths on Railway ─────
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err.message);
  console.error(err.stack);
  // Do NOT process.exit() — Railway will lose the container and return 502.
  // The server should keep running so it can serve other requests.
});

process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled Rejection:', reason);
});

// ── 3. Validate critical environment variables ──────────────────────
const REQUIRED_ENV = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missingEnv = REQUIRED_ENV.filter((key) => !process.env[key]);

if (missingEnv.length > 0) {
  console.error(`[STARTUP] ⚠️  Missing env vars: ${missingEnv.join(', ')}`);
  console.error('[STARTUP] The server will start but Supabase routes will fail.');
  console.error('[STARTUP] Set these variables in Railway → Variables tab.');
  // NOTE: We do NOT process.exit(1) here. The server MUST start so
  // Railway can reach the healthcheck. Routes will return 503 if Supabase is down.
}

// Log environment state for Railway debugging
console.log('[STARTUP] Environment check:');
console.log(`  PORT              = ${process.env.PORT || '(not set, will use 3001)'}`);
console.log(`  NODE_ENV          = ${process.env.NODE_ENV || '(not set)'}`);
console.log(`  FRONTEND_URL      = ${process.env.FRONTEND_URL || '(not set)'}`);
console.log(`  SUPABASE_URL      = ${process.env.SUPABASE_URL ? '✅ set' : '❌ missing'}`);
console.log(`  SUPABASE_SRK      = ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ set' : '❌ missing'}`);

// ══════════════════════════════════════════════════════════════════════
// Express App
// ══════════════════════════════════════════════════════════════════════
const app = express();

// ── Trust proxy — Railway runs behind a reverse proxy ────────────────
app.set('trust proxy', 1);

// ── SECURITY: Helmet ─────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// ── SECURITY: CORS ───────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://your-sound.vercel.app',
  process.env.FRONTEND_URL,
].filter(Boolean);

// Remove duplicates
const uniqueOrigins = [...new Set(ALLOWED_ORIGINS)];

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server requests (no origin) — curl, Postman, healthchecks
    if (!origin) return callback(null, true);

    // Allow all Vercel preview deployments
    if (origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }

    // Allow explicitly listed origins
    if (uniqueOrigins.includes(origin)) {
      return callback(null, true);
    }

    // In production, allow localhost for debugging if needed
    if (origin.startsWith('http://localhost:')) {
      return callback(null, true);
    }

    console.warn(`[CORS] Blocked origin: ${origin}`);
    return callback(new Error(`Bloqueado pela política CORS: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── SECURITY: Rate Limiting ──────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Tente novamente em alguns minutos.' },
});

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { error: 'Limite de uploads atingido. Aguarde 15 minutos.' },
});

app.use(globalLimiter);

// ── Body parsing ─────────────────────────────────────────────────────
const skipUploadPaths = (middleware) => (req, res, next) => {
  if (req.headers['content-type']?.includes('multipart/form-data')) {
    return next();
  }
  return middleware(req, res, next);
};

app.use(skipUploadPaths(express.json({ limit: '1mb' })));
app.use(skipUploadPaths(express.urlencoded({ extended: false, limit: '1mb' })));

// ══════════════════════════════════════════════════════════════════════
// Health check — MUST be BEFORE route loading
// This ensures Railway healthcheck ALWAYS gets a response,
// even if route/supabase initialization fails.
// ══════════════════════════════════════════════════════════════════════
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'YourSound API',
    version: '2.1.0',
    message: 'API rodando',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()) + 's',
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    supabase: process.env.SUPABASE_URL ? 'configured' : 'missing',
    uptime: Math.floor(process.uptime()) + 's',
  });
});

// ══════════════════════════════════════════════════════════════════════
// Routes — wrapped in try/catch to prevent startup crash
// ══════════════════════════════════════════════════════════════════════
try {
  const songsRoutes = require('./src/routes/songs');
  const playlistsRoutes = require('./src/routes/playlists');
  const likesRoutes = require('./src/routes/likes');
  const adminRoutes = require('./src/routes/admin');
  const usersRoutes = require('./src/routes/users');

  app.use('/api/songs/upload', uploadLimiter);
  app.use('/api/songs', songsRoutes);
  app.use('/api/playlists', playlistsRoutes);
  app.use('/api/likes', likesRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/users', usersRoutes);

  console.log('[STARTUP] ✅ All routes loaded successfully.');
} catch (err) {
  console.error('[STARTUP] ❌ Failed to load routes:', err.message);
  console.error(err.stack);

  // Register a fallback that returns 503 for any /api/* route
  app.use('/api', (req, res) => {
    res.status(503).json({
      error: 'Serviço temporariamente indisponível. Rotas não carregaram.',
      detail: err.message,
    });
  });
}

// ══════════════════════════════════════════════════════════════════════
// Error handlers
// ══════════════════════════════════════════════════════════════════════

// Express error handler (4 args required)
app.use((err, req, res, next) => {
  console.error('[UNHANDLED ERROR]', err.message);

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'Arquivo muito grande.' });
  }
  if (err.message?.includes('CORS')) {
    return res.status(403).json({ error: 'Origem não autorizada.' });
  }

  res.status(500).json({ error: 'Erro interno do servidor.' });
});

// 404 fallback — MUST be last
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada.' });
});

// ══════════════════════════════════════════════════════════════════════
// Start Server
// ══════════════════════════════════════════════════════════════════════

// Railway injects PORT — MUST use it. Fallback to 3001 only for local dev.
const PORT = parseInt(process.env.PORT, 10) || 3001;

if (process.env.VERCEL === '1') {
  // Vercel serverless — export the app, don't listen
  module.exports = app;
} else {
  // Railway / local — create HTTP server with Socket.io
  const server = http.createServer(app);

  // Socket.io — wrapped in try/catch to prevent startup crash
  let io = null;
  try {
    const { initSocket } = require('./src/sockets');
    io = initSocket(server);
    app.set('io', io);
    console.log('[STARTUP] ✅ Socket.io initialized.');
  } catch (err) {
    console.error('[STARTUP] ⚠️  Socket.io init failed:', err.message);
    console.error('[STARTUP] The API will work without real-time features.');
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log('══════════════════════════════════════════════');
    console.log(`  YourSound API listening on port ${PORT}`);
    console.log(`  http://0.0.0.0:${PORT}`);
    console.log(`  CORS origins: ${uniqueOrigins.join(', ')}`);
    console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('══════════════════════════════════════════════');
  });

  server.on('error', (err) => {
    console.error('[SERVER ERROR]', err.message);
    if (err.code === 'EADDRINUSE') {
      console.error(`[SERVER ERROR] Port ${PORT} already in use.`);
    }
  });

  // Keep-alive log — helps diagnose if the process is dying silently
  setInterval(() => {
    console.log(`[HEARTBEAT] alive — uptime ${Math.floor(process.uptime())}s — ${new Date().toISOString()}`);
  }, 60000);

  module.exports = { app, server, io };
}
