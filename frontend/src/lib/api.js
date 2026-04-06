import { supabase } from './supabase';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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
async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Sessão expirada. Faça login novamente.');
  }
  return {
    'Authorization': `Bearer ${session.access_token}`
  };
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
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/songs`, { headers });
    return handleResponse(res);
  },

  async searchSongs(query) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/songs/search?q=${encodeURIComponent(query)}`, { headers });
    return handleResponse(res);
  },

  async uploadSong({ title, artist, isPublic, audioFile, coverFile }) {
    const headers = await getAuthHeaders();
    
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

  // ── Playlists ──────────────────────────────
  async getPlaylists() {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/playlists`, { headers });
    return handleResponse(res);
  },

  async getPlaylist(id) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/playlists/${id}`, { headers });
    return handleResponse(res);
  },

  async createPlaylist(name) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/playlists`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    return handleResponse(res);
  },

  async updatePlaylist(playlistId, fields) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/playlists/${playlistId}`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(fields)
    });
    return handleResponse(res);
  },

  async updatePlaylistCover(playlistId, imageFile) {
    const headers = await getAuthHeaders();
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
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/playlists/${id}`, {
      method: 'DELETE',
      headers
    });
    return handleResponse(res);
  },

  async addSongToPlaylist(playlistId, songId) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/playlists/${playlistId}/songs`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ song_id: songId })
    });
    return handleResponse(res);
  },

  async removeSongFromPlaylist(playlistId, songEntryId) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/playlists/${playlistId}/songs/${songEntryId}`, {
      method: 'DELETE',
      headers
    });
    return handleResponse(res);
  },

  // ── Likes ──────────────────────────────────
  async getLikedSongs() {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/likes`, { headers });
    return handleResponse(res);
  },

  async likeSong(songId) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/likes/${songId}`, {
      method: 'POST',
      headers
    });
    return handleResponse(res);
  },

  async unlikeSong(songId) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/likes/${songId}`, {
      method: 'DELETE',
      headers
    });
    return handleResponse(res);
  },

  // ── Admin ──────────────────────────────────
  async getPendingSongs() {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/admin/pending-songs`, { headers });
    return handleResponse(res);
  },

  async updateSongStatus(songId, status) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/admin/songs/${songId}`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    return handleResponse(res);
  },

  async getAdminStats() {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/admin/stats`, { headers });
    return handleResponse(res);
  },

  // ── User ───────────────────────────────────
  async deleteAccount() {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/users/me`, {
      method: 'DELETE',
      headers
    });
    return handleResponse(res);
  }
};
