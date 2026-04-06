const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { verifyAuth } = require('../middleware/auth');
const { isValidUUID } = require('../middleware/validate');

/**
 * GET /api/likes
 * Returns all liked song IDs for the authenticated user.
 */
router.get('/', verifyAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('liked_songs')
      .select('song_id, songs(*)')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false });

    if (error) {
      // Table might not exist yet — return empty
      if (error.code === '42P01') return res.json([]);
      throw error;
    }

    const songs = (data || [])
      .filter(row => row.songs != null)
      .map(row => ({ ...row.songs, liked_at: row.created_at }));

    res.json(songs);
  } catch (err) {
    console.error('[GET /likes]', err.message);
    res.status(500).json({ error: 'Erro ao buscar músicas curtidas.' });
  }
});

/**
 * POST /api/likes/:songId
 * Like a song.
 */
router.post('/:songId', verifyAuth, async (req, res) => {
  try {
    const { songId } = req.params;
    if (!isValidUUID(songId)) {
      return res.status(400).json({ error: 'ID inválido.' });
    }

    // Check if already liked
    const { data: existing } = await supabase
      .from('liked_songs')
      .select('id')
      .eq('user_id', req.userId)
      .eq('song_id', songId)
      .maybeSingle();

    if (existing) {
      return res.json({ message: 'Já curtida.' });
    }

    const { error } = await supabase
      .from('liked_songs')
      .insert({ user_id: req.userId, song_id: songId });

    if (error) throw error;
    res.status(201).json({ message: 'Música curtida!' });
  } catch (err) {
    console.error('[POST /likes]', err.message);
    res.status(500).json({ error: 'Erro ao curtir música.' });
  }
});

/**
 * DELETE /api/likes/:songId
 * Unlike a song.
 */
router.delete('/:songId', verifyAuth, async (req, res) => {
  try {
    const { songId } = req.params;
    if (!isValidUUID(songId)) {
      return res.status(400).json({ error: 'ID inválido.' });
    }

    const { error } = await supabase
      .from('liked_songs')
      .delete()
      .eq('user_id', req.userId)
      .eq('song_id', songId);

    if (error) throw error;
    res.json({ message: 'Curtida removida.' });
  } catch (err) {
    console.error('[DELETE /likes]', err.message);
    res.status(500).json({ error: 'Erro ao descurtir.' });
  }
});

module.exports = router;
