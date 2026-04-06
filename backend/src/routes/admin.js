const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { verifyAuth } = require('../middleware/auth');
const { adminOnly } = require('../middleware/adminOnly');
const { isValidUUID } = require('../middleware/validate');

/**
 * ALL routes in this file are protected by verifyAuth + adminOnly.
 * The admin check is done server-side against the database role,
 * NOT from any client-provided data.
 */

/**
 * GET /api/admin/pending-songs
 * Returns all songs with status 'pending' for admin review.
 */
router.get('/pending-songs', verifyAuth, adminOnly, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('songs')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('[GET /admin/pending-songs]', err.message);
    res.status(500).json({ error: 'Erro ao buscar músicas pendentes.' });
  }
});

/**
 * PATCH /api/admin/songs/:id
 * Updates a song's status (approve/reject).
 * SECURITY: Only 'approved' and 'rejected' are allowed — enforced server-side.
 */
router.patch('/songs/:id', verifyAuth, adminOnly, async (req, res) => {
  try {
    const songId = req.params.id;
    const { status } = req.body;

    if (!isValidUUID(songId)) {
      return res.status(400).json({ error: 'ID de música inválido.' });
    }

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido. Use "approved" ou "rejected".' });
    }

    // Verify the song exists and is actually pending
    const { data: existing, error: fetchErr } = await supabase
      .from('songs')
      .select('id, status')
      .eq('id', songId)
      .single();

    if (fetchErr || !existing) {
      return res.status(404).json({ error: 'Música não encontrada.' });
    }

    if (existing.status !== 'pending') {
      return res.status(400).json({ error: 'Esta música já foi processada.' });
    }

    const { data, error } = await supabase
      .from('songs')
      .update({ status })
      .eq('id', songId)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, song: data });
  } catch (err) {
    console.error('[PATCH /admin/songs/:id]', err.message);
    res.status(500).json({ error: 'Erro ao atualizar status.' });
  }
});

/**
 * GET /api/admin/stats
 * Basic admin dashboard statistics.
 */
router.get('/stats', verifyAuth, adminOnly, async (req, res) => {
  try {
    const [
      { count: totalSongs },
      { count: pendingSongs },
      { count: totalUsers },
      { count: totalPlaylists }
    ] = await Promise.all([
      supabase.from('songs').select('*', { count: 'exact', head: true }),
      supabase.from('songs').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('playlists').select('*', { count: 'exact', head: true }),
    ]);

    res.json({
      totalSongs: totalSongs || 0,
      pendingSongs: pendingSongs || 0,
      totalUsers: totalUsers || 0,
      totalPlaylists: totalPlaylists || 0
    });
  } catch (err) {
    console.error('[GET /admin/stats]', err.message);
    res.status(500).json({ error: 'Erro ao buscar estatísticas.' });
  }
});

module.exports = router;
