require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  try {
    const { data, error } = await supabase.from('songs').select('count', { count: 'exact', head: true });
    if (error) throw error;
    console.log('Supabase is working! Song count:', data);
  } catch (err) {
    console.error('Supabase error:', err.message);
  }
}
check();
