import { io } from 'socket.io-client';

// URL do backend no Railway (configure VITE_API_URL no Vercel)
const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/** Singleton da conexão socket. Null enquanto desconectado. */
let socket = null;

/**
 * Conecta ao servidor Socket.io autenticando com o access_token do Supabase.
 * Seguro chamar múltiplas vezes — retorna a conexão existente se já ativa.
 *
 * @param {string} accessToken - Token JWT da sessão Supabase do usuário.
 * @returns {import('socket.io-client').Socket}
 */
export function connectSocket(accessToken) {
  if (socket?.connected) return socket;

  // Se havia socket desconectado, limpa antes de recriar
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
  }

  socket = io(BACKEND_URL, {
    auth: { token: accessToken },
    // Tenta WebSocket primeiro; cai para long-polling se necessário
    transports: ['websocket', 'polling'],
    // Reconexão automática com backoff exponencial
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    reconnectionAttempts: Infinity,
  });

  socket.on('connect', () => {
    console.log('[Socket] Conectado:', socket.id);
  });

  socket.on('connect_error', (err) => {
    console.warn('[Socket] Erro de conexão:', err.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Desconectado:', reason);
    // 'io server disconnect' significa que o servidor encerrou — reconecta manualmente
    if (reason === 'io server disconnect') {
      socket.connect();
    }
  });

  return socket;
}

/**
 * Desconecta e destrói o socket atual.
 * Chame ao fazer logout do usuário.
 */
export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    console.log('[Socket] Desconectado manualmente.');
  }
}

/**
 * Retorna o socket atual (ou null se não conectado).
 * Use para registrar listeners em componentes:
 *
 *   const s = getSocket();
 *   if (s) s.on('song:approved', handler);
 */
export function getSocket() {
  return socket;
}
