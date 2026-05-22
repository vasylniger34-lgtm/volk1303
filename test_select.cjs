const { createClient } = require('@supabase/supabase-js');

const DEFAULT_URL = Buffer.from('aHR0cHM6Ly9uYmpubXpyamx2amJlamdlb2djZS5zdXBhYmFzZS5jbw==', 'base64').toString();
const DEFAULT_KEY = Buffer.from('c2JfcHVibGlzaGFibGVfd3FSY05UOXlLSk5pMTZFSWVxcHduUV9iZmlhQV92dg==', 'base64').toString();

const supabase = createClient(DEFAULT_URL, DEFAULT_KEY);

async function run() {
  try {
    const targetId = '54cd5a6c-b90b-47a9-8d56-9555b1f83f7f'; // player
    console.log('Querying profile from anonymous client...');
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', targetId)
      .single();

    console.log('Result data:', data);
    console.log('Result error:', error);
  } catch (err) {
    console.error('Fatal error:', err);
  }
}

run();
