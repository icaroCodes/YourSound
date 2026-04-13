const { Server } = require('socket.io');
const { supabase } = require('../config/supabase');

const ALLOWED_ORIGINS = [
  'https://your-sound.vercel.app',
  process.env.FRONTEND_URL,
].filter(Boolean);

// Allow localhost only in development
if (process.env.NODE_ENV !== 'production') {
  ALLOWED_ORIGINS.push('http://localhost:5173', 'http://127.0.0.1:5173');
}

function isAllowedOrigin(origin) {
  if (!origin) return true;
  return ALLOWED_ORIGINS.includes(origin);
}

/**
 * Initializes Socket.io on the given HTTP server.
 *
 * Authentication: every client must pass a valid Supabase access_token
 * in the handshake auth object: socket = io(URL, { auth: { token } })
 *
 * Returns the io instance so routes can emit targeted events via:
 *   req.app.get('io').to(`user:${userId}`).emit('event', data)
 */
function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: isAllowedOrigin,
      credentials: true,
      methods: ['GET', 'POST'],
    },
    // Keep connections alive; client should reconnect automatically
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // ── Auth middleware ─────────────────────────────────────────────────
  // Runs before every connection. Validates the Supabase JWT.
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('TOKEN_REQUIRED'));
    }

    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) return next(new Error('TOKEN_INVALID'));

      socket.userId = user.id;
      socket.userEmail = user.email;
      next();
    } catch {
      next(new Error('AUTH_FAILED'));
    }
  });

  // ── Connection handler ──────────────────────────────────────────────
  io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.userId} (${socket.id})`);

    // Personal room — lets server push to a specific user:
    //   io.to(`user:${userId}`).emit('event', data)
    socket.join(`user:${socket.userId}`);

    // Notify other connected clients this user is online
    socket.broadcast.emit('presence:online', { userId: socket.userId });

    // ── Client events ─────────────────────────────────────────────────

    // Health check
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    // Clean up on disconnect
    socket.on('disconnect', (reason) => {
      console.log(`[Socket] Disconnected: ${socket.userId} — ${reason}`);
      // Let remaining clients know
      io.emit('presence:offline', { userId: socket.userId });
    });

    socket.on('error', (err) => {
      console.error(`[Socket] Error (${socket.userId}):`, err.message);
    });
  });

  return io;
}

module.exports = { initSocket };
