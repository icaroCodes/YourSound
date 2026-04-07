const { createClient } = require('@supabase/supabase-js');

// ──────────────────────────────────────────────────────────────────────
// Supabase Client — Service Role (bypasses RLS)
// NEVER expose this client or the key to the frontend.
// ──────────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// IMPORTANT: Do NOT call process.exit() here.
// If the env vars are missing, the server must still boot so Railway's
// healthcheck gets a response. Routes will return 503 errors instead.
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('══════════════════════════════════════════════');
  console.error('  ⚠️  SUPABASE CONFIG MISSING');
  console.error('  SUPABASE_URL:', SUPABASE_URL ? '✅' : '❌ not set');
  console.error('  SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? '✅' : '❌ not set');
  console.error('  → Set these in Railway → Variables tab.');
  console.error('  → API will start but database routes will fail (503).');
  console.error('══════════════════════════════════════════════');
}

// Create client even if vars are missing — it will fail gracefully on actual calls
// This prevents the require() chain from throwing during server startup
const supabase = (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

module.exports = { supabase };
