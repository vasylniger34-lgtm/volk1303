// scratch/check_profiles.cjs - Check profiles table with reg_num in Supabase
const { createClient } = require('@supabase/supabase-js');

const DEFAULT_URL = Buffer.from('aHR0cHM6Ly9uYmpubXpyamx2amJlamdlb2djZS5zdXBhYmFzZS5jbw==', 'base64').toString();
const DEFAULT_KEY = Buffer.from('c2JfcHVibGlzaGFibGVfd3FSY05UOXlLSk5pMTZFSWVxcHduUV9iZmlhQV92dg==', 'base64').toString();

const supabase = createClient(DEFAULT_URL, DEFAULT_KEY);

async function run() {
  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, username, balance, role, reg_num')
      .limit(5);

    if (error) {
      console.error('Error fetching profiles:', error);
      return;
    }

    console.log('--- PROFILES IN DB ---');
    console.log(profiles);
  } catch (err) {
    console.error('Fatal error:', err);
  }
}

run();
