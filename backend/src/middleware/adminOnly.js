/**
 * Middleware: requires req.userRole === 'admin'.
 * MUST be placed AFTER verifyAuth in the middleware chain.
 * 
 * The role comes from the server-side DB lookup, NOT from the frontend.
 */
const adminOnly = (req, res, next) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Acesso restrito a administradores.' });
  }
  next();
};

module.exports = { adminOnly };
