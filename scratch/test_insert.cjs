const { createClient } = require('@supabase/supabase-js');

const DEFAULT_URL = Buffer.from('aHR0cHM6Ly9uYmpubXpyamx2amJlamdlb2djZS5zdXBhYmFzZS5jbw==', 'base64').toString();
const DEFAULT_KEY = Buffer.from('c2JfcHVibGlzaGFibGVfd3FSY05UOXlLSk5pMTZFSWVxcHduUV9iZmlhQV92dg==', 'base64').toString();

const supabase = createClient(DEFAULT_URL, DEFAULT_KEY);

async function run() {
  const insertData = {
    name: 'TESTING RECREATION',
    type: '2X2',
    date: 'Завтра 18:00',
    prize_pool: '50 000 🪙',
    participants_count: 0,
    max_participants: 16,
    status: 'active',
    map: 'de_mirage',
    system: 'Single Elimination',
    rules: []
  };

  console.log('Attempting to insert tournament into Supabase...');
  const { data, error } = await supabase.from('tournaments').insert(insertData).select();
  console.log('Result data:', data);
  console.log('Result error:', error);
}

run();
