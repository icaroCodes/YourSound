// MUST be first — loads .env before ANY other require reads process.env
require('dotenv').config();

const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { initSocket } = require('./src/sockets');

const app = express();

// ──────────────────────────────────────────────
// SECURITY: Helmet — sets secure HTTP headers
// Protects against XSS, clickjacking, MIME sniffing, etc.
// ──────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// ──────────────────────────────────────────────
// SECURITY: CORS — restrict to known origins ONLY
// Never use cors() with no arguments in production.
// ──────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'http://localhost:5173',   // Vite dev
  'http://127.0.0.1:5173',
  process.env.FRONTEND_URL   // Production URL (set in .env)
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, curl, Postman in dev)
    if (!origin) return callback(null, true);
    // Allow Vercel preview environments dynamically
    if (origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    if (ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Bloqueado pela política CORS.'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ──────────────────────────────────────────────
// SECURITY: Rate Limiting — prevent brute force & abuse
// ──────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 200,                   // 200 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Tente novamente em alguns minutos.' }
});

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,                    // 10 uploads per 15 minutes
  message: { error: 'Limite de uploads atingido. Aguarde 15 minutos.' }
});

app.use(globalLimiter);

// ──────────────────────────────────────────────
// Body parsing — with size limits
// IMPORTANT: These parsers only handle JSON and url-encoded bodies.
// Multipart/form-data (file uploads) is handled exclusively by Multer
// inside the songs route. We must NOT let these parsers interfere
// with multipart requests, so we skip them for the upload path.
// ──────────────────────────────────────────────
const skipUploadPaths = (middleware) => (req, res, next) => {
  // Let multer handle multipart requests — don't parse them here
  if (req.headers['content-type']?.includes('multipart/form-data')) {
    return next();
  }
  return middleware(req, res, next);
};

app.use(skipUploadPaths(express.json({ limit: '1mb' })));
app.use(skipUploadPaths(express.urlencoded({ extended: false, limit: '1mb' })));

// ──────────────────────────────────────────────
// Health check — no auth required
// ──────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'YourSound API', version: '2.0.0' });
});

// ──────────────────────────────────────────────
// Routes — each file handles its own auth middleware
// ──────────────────────────────────────────────
const songsRoutes = require('./src/routes/songs');
const playlistsRoutes = require('./src/routes/playlists');
const likesRoutes = require('./src/routes/likes');
const adminRoutes = require('./src/routes/admin');
const usersRoutes = require('./src/routes/users');

// Upload rate limiter must come BEFORE the songs route to apply correctly
app.use('/api/songs/upload', uploadLimiter);
app.use('/api/songs', songsRoutes);
app.use('/api/playlists', playlistsRoutes);
app.use('/api/likes', likesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', usersRoutes);

// ──────────────────────────────────────────────
// Global error handler — never leak stack traces
// ──────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[UNHANDLED ERROR]', err.message);
  
  // Multer file size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'Arquivo muito grande.' });
  }
  
  // CORS error
  if (err.message?.includes('CORS')) {
    return res.status(403).json({ error: 'Origem não autorizada.' });
  }

  res.status(500).json({ error: 'Erro interno do servidor.' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada.' });
});

// ──────────────────────────────────────────────
// Start — Vercel vs Railway/local
// ──────────────────────────────────────────────
if (process.env.VERCEL === '1') {
  // Vercel serverless: no listen(), no Socket.io (WebSockets not supported).
  // Vercel imports the Express app directly.
  module.exports = app;
} else {
  // Railway / local: real HTTP server + Socket.io
  const server = http.createServer(app);
  const io = initSocket(server);
  app.set('io', io);

  const PORT = process.env.PORT || 3001;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[YourSound API] Rodando na porta ${PORT}`);
    console.log(`[YourSound API] CORS permitido para: ${ALLOWED_ORIGINS.join(', ')}`);
  });

  module.exports = { app, server, io };
}
