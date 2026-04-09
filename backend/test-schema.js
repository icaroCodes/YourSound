const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://anhmdlveesegdnxxciko.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuaG1kbHZlZXNlZ2RueHhjaWtvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQxMDk5MiwiZXhwIjoyMDkwOTg2OTkyfQ.sChWREsgeirbTEvv3krZ01gZq5I3gEuZM0Bl_35DBTA';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function test() {
  const { data, error } = await supabase.from('playlists').select('*').limit(1);
  console.log('Playlists:', data, error);
  if (data && data.length > 0) {
    const p = data[0];
    const { data: updated, error: updError } = await supabase.from('playlists').update({ is_public: !p.is_public }).eq('id', p.id).select();
    console.log('Update result:', updated, updError);
  }
}

test();
