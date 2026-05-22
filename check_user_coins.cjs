const { createClient } = require('@supabase/supabase-js');

const DEFAULT_URL = Buffer.from('aHR0cHM6Ly9uYmpubXpyamx2amJlamdlb2djZS5zdXBhYmFzZS5jbw==', 'base64').toString();
const DEFAULT_KEY = Buffer.from('c2JfcHVibGlzaGFibGVfd3FSY05UOXlLSk5pMTZFSWVxcHduUV9iZmlhQV92dg==', 'base64').toString();

const supabase = createClient(DEFAULT_URL, DEFAULT_KEY);

async function run() {
  try {
    console.log('Querying user_coins table...');
    const { data, error } = await supabase
      .from('user_coins')
      .select('*');

    if (error) {
      console.error('Error fetching user_coins:', error);
      return;
    }

    console.log('--- USER_COINS ---');
    console.log(data);
  } catch (err) {
    console.error('Fatal error:', err);
  }
}

run();
