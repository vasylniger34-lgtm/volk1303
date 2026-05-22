const { createClient } = require('@supabase/supabase-js');

const DEFAULT_URL = Buffer.from('aHR0cHM6Ly9uYmpubXpyamx2amJlamdlb2djZS5zdXBhYmFzZS5jbw==', 'base64').toString();
const DEFAULT_KEY = Buffer.from('c2JfcHVibGlzaGFibGVfd3FSY05UOXlLSk5pMTZFSWVxcHduUV9iZmlhQV92dg==', 'base64').toString();

const supabase = createClient(DEFAULT_URL, DEFAULT_KEY);

async function run() {
  try {
    const { data: profiles, error: pError } = await supabase
      .from('profiles')
      .select('*');

    if (pError) {
      console.error('Error fetching profiles:', pError);
      return;
    }

    console.log('--- PROFILES ---');
    console.log(profiles.map(p => ({ id: p.id, username: p.username, reg_num: p.reg_num, balance: p.balance })));
  } catch (err) {
    console.error('Fatal error:', err);
  }
}

run();
