const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { verifyAuth } = require('../middleware/auth');
const { sanitizeString } = require('../middleware/validate');

/**
 * PATCH /me/profile
 * Atualiza display_name e avatar_url do usuário autenticado.
 * SECURITY: display_name is sanitized, avatar_url is validated against Supabase domain.
 */
router.patch('/me/profile', verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const updates = {};

    if (req.body.display_name !== undefined) {
      updates.display_name = sanitizeString(req.body.display_name, 50) || null;
    }

    if (req.body.avatar_url !== undefined) {
      const avatarUrl = req.body.avatar_url;
      if (avatarUrl) {
        // Only accept URLs from our own Supabase Storage to prevent tracking/malicious URLs
        const supabaseUrl = process.env.SUPABASE_URL;
        if (!supabaseUrl || !avatarUrl.startsWith(supabaseUrl + '/storage/')) {
          return res.status(400).json({ error: 'URL de avatar inválida. Use o upload da plataforma.' });
        }
      }
      updates.avatar_url = avatarUrl || null;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar.' });
    }

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select('id, email, role, display_name, avatar_url')
      .single();

    if (error) {
      console.error('[UPDATE PROFILE ERROR]', error.message);
      return res.status(500).json({ error: 'Erro ao atualizar perfil.' });
    }

    res.json(data);
  } catch (err) {
    console.error('[UPDATE PROFILE ERROR]', err.message);
    res.status(500).json({ error: 'Erro interno ao atualizar perfil.' });
  }
});

/**
 * DELETE /me
 * Authenticated users can delete their own account.
 * This removes them from Supabase Auth and our public.users table (via cascade if set up, or explicitly here).
 */
router.delete('/me', verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;

    // Delete from Supabase Auth — this is the canonical source of truth for auth
    // Requires service role client which we have in config/supabase.js
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);

    if (authError) {
      console.error('[DELETE ACCOUNT ERROR - AUTH]', authError.message);
      return res.status(500).json({ error: 'Erro ao remover credenciais de acesso.' });
    }

    // Explicitly delete from public.users as well just in case cascade is not set up correctly
    const { error: profileError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (profileError) {
      console.warn('[DELETE ACCOUNT WARN - PROFILE]', profileError.message);
      // Profile deletion failure might happen if it's already gone via cascade, we can ignore this.
    }

    res.json({ message: 'Conta excluída com sucesso.' });
  } catch (err) {
    console.error('[DELETE ACCOUNT ERROR]', err.message);
    res.status(500).json({ error: 'Erro interno ao excluir conta.' });
  }
});

module.exports = router;
