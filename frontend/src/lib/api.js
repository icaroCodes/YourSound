import { useAuthStore } from '../store/useAuthStore';

// Dev: '' (requests go through Vite proxy → localhost:3001, see vite.config.js)
// Prod: VITE_API_URL must be set in Vercel env vars → Railway backend URL
const API_BASE = import.meta.env.VITE_API_URL || '';

/**
 * Centralized API client.
 *
 * Every request automatically attaches the user's Supabase access_token
 * in the Authorization header. The backend validates this token server-side
 * against Supabase Auth — it cannot be spoofed.
 *
 * ALL mutations (create, update, delete, upload) MUST go through this client.
 * The frontend Supabase client should only be used for auth operations.
 */
function getAuthHeaders() {
  // 1. Try Zustand store first (fastest path, kept in sync via onAuthStateChange)
  const storeSession = useAuthStore.getState().session;
  if (storeSession?.access_token) {
    return { 'Authorization': `Bearer ${storeSession.access_token}` };
  }

  // 2. Fallback: read directly from Supabase localStorage key.
  //    Supabase JS always persists the session here, so this works even when
  //    getSession() hangs due to token-refresh lock contention.
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    const projectRef = supabaseUrl.match(/https?:\/\/([^.]+)/)?.[1];
    if (projectRef) {
      const raw = localStorage.getItem(`sb-${projectRef}-auth-token`);
      if (raw) {
        const stored = JSON.parse(raw);
        const token = stored?.access_token;
        if (token) return { 'Authorization': `Bearer ${token}` };
      }
    }
  } catch { /* ignore parse errors */ }

  throw new Error('Sessão expirada. Faça login novamente.');
}

async function handleResponse(response) {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Erro ${response.status}`);
  }
  return data;
}

export const api = {
  // ── Songs ──────────────────────────────────
  async getSongs() {
    const headers = getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/songs`, { headers });
    return handleResponse(res);
  },

  async searchSongs(query) {
    const headers = getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/songs/search?q=${encodeURIComponent(query)}`, { headers });
    return handleResponse(res);
  },

  async uploadSong({ title, artist, isPublic, audioFile, coverFile }) {
    const headers = getAuthHeaders();
    
    const formData = new FormData();
    formData.append('title', title);
    formData.append('artist', artist);
    formData.append('is_public', String(isPublic));
    formData.append('audio', audioFile);
    if (coverFile) {
      formData.append('cover', coverFile);
    }

    const res = await fetch(`${API_BASE}/api/songs/upload`, {
      method: 'POST',
      headers,       // No Content-Type — browser sets it with boundary for FormData
      body: formData
    });
    return handleResponse(res);
  },

  async uploadSongFromLink({ title, artist, isPublic, url, coverFile }) {
    const headers = getAuthHeaders();

    const formData = new FormData();
    formData.append('title', title);
    formData.append('artist', artist);
    formData.append('is_public', String(isPublic));
    formData.append('url', url);
    if (coverFile) {
      formData.append('cover', coverFile);
    }

    const res = await fetch(`${API_BASE}/api/songs/from-link`, {
      method: 'POST',
      headers,
      body: formData
    });
    return handleResponse(res);
  },

  // ── Playlists ──────────────────────────────
  async getPlaylists() {
    const headers = getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/playlists`, { headers });
    return handleResponse(res);
  },

  async getPlaylist(id) {
    const headers = getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/playlists/${id}`, { headers });
    return handleResponse(res);
  },

  async createPlaylist(name, is_public = false) {
    const headers = getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/playlists`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, is_public })
    });
    return handleResponse(res);
  },

  async updatePlaylist(playlistId, fields) {
    const headers = getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/playlists/${playlistId}`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(fields)
    });
    return handleResponse(res);
  },

  async updatePlaylistCover(playlistId, imageFile) {
    const headers = getAuthHeaders();
    const formData = new FormData();
    formData.append('cover', imageFile);
    const res = await fetch(`${API_BASE}/api/playlists/${playlistId}/cover`, {
      method: 'PATCH',
      headers,
      body: formData
    });
    return handleResponse(res);
  },

  async deletePlaylist(id) {
    const headers = getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/playlists/${id}`, {
      method: 'DELETE',
      headers
    });
    return handleResponse(res);
  },

  async addSongToPlaylist(playlistId, songId) {
    const headers = getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/playlists/${playlistId}/songs`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ song_id: songId })
    });
    return handleResponse(res);
  },

  async removeSongFromPlaylist(playlistId, songEntryId) {
    const headers = getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/playlists/${playlistId}/songs/${songEntryId}`, {
      method: 'DELETE',
      headers
    });
    return handleResponse(res);
  },

  // ── Likes ──────────────────────────────────
  async getLikedSongs() {
    const headers = getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/likes`, { headers });
    return handleResponse(res);
  },

  async likeSong(songId) {
    const headers = getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/likes/${songId}`, {
      method: 'POST',
      headers
    });
    return handleResponse(res);
  },

  async unlikeSong(songId) {
    const headers = getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/likes/${songId}`, {
      method: 'DELETE',
      headers
    });
    return handleResponse(res);
  },

  // ── Admin ──────────────────────────────────
  async getPendingSongs() {
    const headers = getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/admin/pending-songs`, { headers });
    return handleResponse(res);
  },

  async updateSongDuration(songId, duration) {
    const headers = getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/songs/${songId}/duration`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ duration })
    });
    return handleResponse(res);
  },

  async updateSongStatus(songId, status) {
    const headers = getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/admin/songs/${songId}`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    return handleResponse(res);
  },

  async getAdminStats() {
    const headers = getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/admin/stats`, { headers });
    return handleResponse(res);
  },

  async getAdminAllSongs() {
    const headers = getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/admin/all-songs`, { headers });
    return handleResponse(res);
  },

  async editAdminSong(songId, data) {
    const headers = getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/admin/songs/${songId}/edit`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async deleteAdminSong(songId) {
    const headers = getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/admin/songs/${songId}`, {
      method: 'DELETE',
      headers
    });
    return handleResponse(res);
  },

  // ── User ───────────────────────────────────
  async deleteAccount() {
    const headers = getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/users/me`, {
      method: 'DELETE',
      headers
    });
    return handleResponse(res);
  }
};
