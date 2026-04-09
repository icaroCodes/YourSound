
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  console.log('Checking songs table structure...');
  const { data, error } = await supabase.from('songs').select('*').limit(1);
  if (error) {
    console.error('Error selecting from songs:', error.message);
  } else {
    console.log('Table seems fine. Sample record found:', data.length > 0 ? 'Yes' : 'No (table is empty)');
    if (data.length > 0) {
        console.log('Columns:', Object.keys(data[0]));
    } else {
        // Try to get column names via RPC or information_schema if possible, but let's assume it's fine if no select error.
    }
  }
}

check();
