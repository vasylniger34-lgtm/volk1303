const { createClient } = require('@supabase/supabase-js');

const DEFAULT_URL = Buffer.from('aHR0cHM6Ly9uYmpubXpyamx2amJlamdlb2djZS5zdXBhYmFzZS5jbw==', 'base64').toString();
const DEFAULT_KEY = Buffer.from('c2JfcHVibGlzaGFibGVfd3FSY05UOXlLSk5pMTZFSWVxcHduUV9iZmlhQV92dg==', 'base64').toString();

const supabase = createClient(DEFAULT_URL, DEFAULT_KEY);

async function run() {
  try {
    const tg_id = '999999999'; // Test telegram ID
    console.log(`Calling register_telegram_user for tg_id ${tg_id}...`);
    const { data, error } = await supabase.rpc('register_telegram_user', {
      tg_id: tg_id,
      tg_username: 'test_tg_user',
      tg_first_name: 'Test Telegram User'
    });
    console.log('Result data:', data);
    console.log('Result error:', error);
  } catch (err) {
    console.error('Fatal error:', err);
  }
}

run();
