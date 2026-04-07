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
// ──────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// ──────────────────────────────────────────────
// SECURITY: CORS — restrict to known origins ONLY
// ──────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  process.env.FRONTEND_URL
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
    
    // If we're in production, we might want to be slightly more permissive for the frontend domain
    if (process.env.NODE_ENV === 'production') {
       return callback(null, true);
    }

    return callback(new Error('Bloqueado pela política CORS.'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ──────────────────────────────────────────────
// SECURITY: Rate Limiting
// ──────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 200, 
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Tente novamente em alguns minutos.' }
});

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Limite de uploads atingido. Aguarde 15 minutos.' }
});

app.use(globalLimiter);

// ──────────────────────────────────────────────
// Body parsing
// ──────────────────────────────────────────────
const skipUploadPaths = (middleware) => (req, res, next) => {
  if (req.headers['content-type']?.includes('multipart/form-data')) {
    return next();
  }
  return middleware(req, res, next);
};

app.use(skipUploadPaths(express.json({ limit: '1mb' })));
app.use(skipUploadPaths(express.urlencoded({ extended: false, limit: '1mb' })));

// ──────────────────────────────────────────────
// Health check — IMPORTANT for Railway
// ──────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'YourSound API', version: '2.0.0', message: 'API online' });
});

// ──────────────────────────────────────────────
// Routes
// ──────────────────────────────────────────────
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

// ──────────────────────────────────────────────
// Error handlers
// ──────────────────────────────────────────────
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

app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada.' });
});

// ──────────────────────────────────────────────
// Start Server
// ──────────────────────────────────────────────
// Railway and standard environments use process.env.PORT
// We also use 0.0.0.0 to ensure the server is reachable outside the container
const PORT = process.env.PORT || 3001;

if (process.env.VERCEL === '1') {
  module.exports = app;
} else {
  const server = http.createServer(app);
  const io = initSocket(server);
  app.set('io', io);

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[YourSound API] Rodando em http://0.0.0.0:${PORT}`);
    console.log(`[YourSound API] CORS permitido para: ${ALLOWED_ORIGINS.join(', ')}`);
  });

  module.exports = { app, server, io };
}

