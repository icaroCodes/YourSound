const { supabase } = require('../config/supabase');

/**
 * Verifies the JWT from the Authorization header against Supabase Auth.
 * Attaches req.user (auth user) and req.userRole (from public.users).
 * 
 * The token is the user's Supabase access_token, sent as "Bearer <token>".
 * We validate it server-side using supabase.auth.getUser() — this hits Supabase
 * and is NOT spoofable from the frontend.
 */
const verifyAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticação ausente.' });
    }

    const token = authHeader.split(' ')[1];
    if (!token || token.length < 10) {
      return res.status(401).json({ error: 'Token inválido.' });
    }

    // Validate the token against Supabase Auth — this is the ONLY trustworthy source
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Sessão expirada ou inválida.' });
    }

    // Fetch role from our controlled public.users table.
    // If the row is missing (e.g. trigger not yet configured), we upsert it now
    // so the user is never permanently locked out.
    let { data: profile } = await supabase
      .from('users')
      .select('id, role, email')
      .eq('id', user.id)
      .single();

    if (!profile) {
      const { data: inserted } = await supabase
        .from('users')
        .upsert({ id: user.id, email: user.email, role: 'user' }, { onConflict: 'id' })
        .select('id, role, email')
        .single();
      profile = inserted;
    }

    // Attach validated data to the request — these are SERVER-verified, not from the client
    req.user = user;
    req.userId = user.id;
    req.userRole = profile?.role || 'user';
    
    next();
  } catch (err) {
    console.error('[AUTH MIDDLEWARE ERROR]', err.message);
    return res.status(500).json({ error: 'Erro interno de autenticação.' });
  }
};

module.exports = { verifyAuth };
