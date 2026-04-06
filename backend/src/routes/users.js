const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { verifyAuth } = require('../middleware/auth');

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
