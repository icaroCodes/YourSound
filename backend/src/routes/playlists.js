const express = require('express');
const multer = require('multer');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { verifyAuth } = require('../middleware/auth');
const { sanitizeString, isValidUUID, ALLOWED_IMAGE_MIMES, MAX_IMAGE_SIZE } = require('../middleware/validate');

const coverUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_SIZE }
});

/**
 * GET /api/playlists
 * Returns the authenticated user's playlists ONLY.
 * user_id is taken from the verified token — cannot be spoofed.
 */
router.get('/', verifyAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('playlists')
      .select('*')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('[GET /playlists]', err.message);
    res.status(500).json({ error: 'Erro ao buscar playlists.' });
  }
});

/**
 * GET /api/playlists/:id
 * Returns a single playlist with its songs.
 * SECURITY: Validates ownership — a user can only view their own playlists.
 */
router.get('/:id', verifyAuth, async (req, res) => {
  try {
    const playlistId = req.params.id;
    if (!isValidUUID(playlistId)) {
      return res.status(400).json({ error: 'ID de playlist inválido.' });
    }

    // Fetch playlist
    const { data: playlist, error: plErr } = await supabase
      .from('playlists')
      .select('*')
      .eq('id', playlistId)
      .single();

    if (plErr || !playlist) {
      return res.status(404).json({ error: 'Playlist não encontrada.' });
    }

    // Ownership check
    if (playlist.user_id !== req.userId) {
      return res.status(403).json({ error: 'Acesso negado a esta playlist.' });
    }

    // Fetch playlist_songs entries (manual join — no FK dependency)
    const { data: psEntries, error: psErr } = await supabase
      .from('playlist_songs')
      .select('id, song_id, created_at')
      .eq('playlist_id', playlistId)
      .order('id', { ascending: false });

    if (psErr) throw psErr;

    const songIds = (psEntries || []).map(ps => ps.song_id).filter(Boolean);
    let songs = [];

    if (songIds.length > 0) {
      const { data: songsData, error: songsErr } = await supabase
        .from('songs')
        .select('*')
        .in('id', songIds);

      if (songsErr) throw songsErr;

      const songsMap = {};
      (songsData || []).forEach(s => { songsMap[s.id] = s; });

      songs = psEntries
        .filter(ps => songsMap[ps.song_id])
        .map(ps => ({
          ...songsMap[ps.song_id],
          playlist_song_id: ps.id,
          added_at: ps.created_at
        }));
    }

    res.json({ playlist, songs });
  } catch (err) {
    console.error('[GET /playlists/:id]', err.message);
    res.status(500).json({ error: `Erro ao carregar playlist: ${err.message}` });
  }
});

/**
 * POST /api/playlists
 * Creates a new playlist for the authenticated user.
 * SECURITY: user_id is forced from token — client cannot set it.
 */
router.post('/', verifyAuth, async (req, res) => {
  try {
    const name = sanitizeString(req.body.name, 50);

    if (!name) {
      return res.status(400).json({ error: 'Nome da playlist é obrigatório.' });
    }

    const { data, error } = await supabase
      .from('playlists')
      .insert({ name, user_id: req.userId, is_public: false })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('[POST /playlists]', err.message);
    res.status(500).json({ error: 'Erro ao criar playlist.' });
  }
});

/**
 * PATCH /api/playlists/:id
 * Updates playlist name and/or description.
 * SECURITY: Validates ownership before update.
 */
router.patch('/:id', verifyAuth, async (req, res) => {
  try {
    const playlistId = req.params.id;
    if (!isValidUUID(playlistId)) {
      return res.status(400).json({ error: 'ID inválido.' });
    }

    const { data: existing, error: fetchErr } = await supabase
      .from('playlists')
      .select('user_id')
      .eq('id', playlistId)
      .single();

    if (fetchErr || !existing) {
      return res.status(404).json({ error: 'Playlist não encontrada.' });
    }

    if (existing.user_id !== req.userId) {
      return res.status(403).json({ error: 'Acesso negado.' });
    }

    const updates = {};
    if (req.body.name !== undefined) {
      const name = sanitizeString(req.body.name, 50);
      if (!name) return res.status(400).json({ error: 'Nome não pode ser vazio.' });
      updates.name = name;
    }
    if (req.body.description !== undefined) {
      updates.description = sanitizeString(req.body.description, 200);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar.' });
    }

    const { data, error } = await supabase
      .from('playlists')
      .update(updates)
      .eq('id', playlistId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('[PATCH /playlists/:id]', err.message);
    res.status(500).json({ error: 'Erro ao atualizar playlist.' });
  }
});

/**
 * DELETE /api/playlists/:id
 * Deletes a playlist.
 * SECURITY: Validates ownership before deletion — cannot delete others' playlists.
 */
router.delete('/:id', verifyAuth, async (req, res) => {
  try {
    const playlistId = req.params.id;
    if (!isValidUUID(playlistId)) {
      return res.status(400).json({ error: 'ID inválido.' });
    }

    // Verify ownership BEFORE deleting
    const { data: existing, error: fetchErr } = await supabase
      .from('playlists')
      .select('user_id')
      .eq('id', playlistId)
      .single();

    if (fetchErr || !existing) {
      return res.status(404).json({ error: 'Playlist não encontrada.' });
    }

    if (existing.user_id !== req.userId) {
      return res.status(403).json({ error: 'Você não pode excluir playlists de outros usuários.' });
    }

    // Delete related playlist_songs first
    await supabase.from('playlist_songs').delete().eq('playlist_id', playlistId);
    
    // Then delete the playlist
    const { error } = await supabase.from('playlists').delete().eq('id', playlistId);
    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    console.error('[DELETE /playlists/:id]', err.message);
    res.status(500).json({ error: 'Erro ao excluir playlist.' });
  }
});

/**
 * POST /api/playlists/:id/songs
 * Adds a song to a playlist.
 * SECURITY: Validates playlist ownership AND song existence.
 */
router.post('/:id/songs', verifyAuth, async (req, res) => {
  try {
    const playlistId = req.params.id;
    const songId = req.body.song_id;

    if (!isValidUUID(playlistId) || !isValidUUID(songId)) {
      return res.status(400).json({ error: 'IDs inválidos.' });
    }

    // Verify playlist ownership
    const { data: playlist, error: plErr } = await supabase
      .from('playlists')
      .select('user_id')
      .eq('id', playlistId)
      .single();

    if (plErr || !playlist) {
      return res.status(404).json({ error: 'Playlist não encontrada.' });
    }

    if (playlist.user_id !== req.userId) {
      return res.status(403).json({ error: 'Acesso negado.' });
    }

    // Verify song exists and user has access to it
    const { data: song, error: songErr } = await supabase
      .from('songs')
      .select('id, user_id, is_public, status')
      .eq('id', songId)
      .single();

    if (songErr || !song) {
      return res.status(404).json({ error: 'Música não encontrada.' });
    }

    // Only allow approved public songs OR user's own songs
    const canAccess = (song.is_public && song.status === 'approved') || song.user_id === req.userId;
    if (!canAccess) {
      return res.status(403).json({ error: 'Você não tem acesso a esta música.' });
    }

    // Check for duplicates
    const { data: existing } = await supabase
      .from('playlist_songs')
      .select('id')
      .eq('playlist_id', playlistId)
      .eq('song_id', songId)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: 'Esta música já está na playlist.' });
    }

    const { data, error } = await supabase
      .from('playlist_songs')
      .insert({ playlist_id: playlistId, song_id: songId })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('[POST /playlists/:id/songs]', err.message);
    res.status(500).json({ error: 'Erro ao adicionar música.' });
  }
});

/**
 * DELETE /api/playlists/:id/songs/:songEntryId
 * Removes a song from a playlist.
 * SECURITY: Validates playlist ownership before removal.
 */
router.delete('/:id/songs/:songEntryId', verifyAuth, async (req, res) => {
  try {
    const { id: playlistId, songEntryId } = req.params;

    if (!isValidUUID(playlistId) || !isValidUUID(songEntryId)) {
      return res.status(400).json({ error: 'IDs inválidos.' });
    }

    // Verify playlist ownership
    const { data: playlist, error: plErr } = await supabase
      .from('playlists')
      .select('user_id')
      .eq('id', playlistId)
      .single();

    if (plErr || !playlist || playlist.user_id !== req.userId) {
      return res.status(403).json({ error: 'Acesso negado.' });
    }

    const { error } = await supabase
      .from('playlist_songs')
      .delete()
      .eq('id', songEntryId)
      .eq('playlist_id', playlistId); // double-check it belongs to this playlist

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('[DELETE /playlists/:id/songs/:id]', err.message);
    res.status(500).json({ error: 'Erro ao remover música.' });
  }
});

/**
 * PATCH /api/playlists/:id/cover
 * Upload or replace a playlist's cover image.
 * SECURITY: Validates ownership, file type, and file size.
 */
router.patch(
  '/:id/cover',
  verifyAuth,
  coverUpload.single('cover'),
  async (req, res) => {
    try {
      const playlistId = req.params.id;
      if (!isValidUUID(playlistId)) {
        return res.status(400).json({ error: 'ID de playlist inválido.' });
      }

      const { data: playlist, error: plErr } = await supabase
        .from('playlists')
        .select('user_id')
        .eq('id', playlistId)
        .single();

      if (plErr || !playlist) {
        return res.status(404).json({ error: 'Playlist não encontrada.' });
      }

      if (playlist.user_id !== req.userId) {
        return res.status(403).json({ error: 'Acesso negado.' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'Imagem de capa é obrigatória.' });
      }

      const coverFile = req.file;

      if (!ALLOWED_IMAGE_MIMES.includes(coverFile.mimetype)) {
        return res.status(400).json({ error: 'Tipo de imagem não permitido. Envie JPG, PNG, WebP ou GIF.' });
      }

      const cleanName = coverFile.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '');
      const coverPath = `${req.userId}/${playlistId}_${Date.now()}_${cleanName}`;

      const { error: uploadError } = await supabase.storage
        .from('playlist-covers')
        .upload(coverPath, coverFile.buffer, {
          contentType: coverFile.mimetype,
          upsert: true
        });

      if (uploadError) throw new Error(uploadError.message);

      const { data: { publicUrl } } = supabase.storage
        .from('playlist-covers')
        .getPublicUrl(coverPath);

      const { data: updated, error: updateError } = await supabase
        .from('playlists')
        .update({ cover_url: publicUrl })
        .eq('id', playlistId)
        .select()
        .single();

      if (updateError) throw updateError;

      res.json({ cover_url: publicUrl, playlist: updated });
    } catch (err) {
      console.error('[PATCH /playlists/:id/cover]', err.message);
      res.status(500).json({ error: 'Erro ao atualizar capa.' });
    }
  }
);

module.exports = router;
