const { createClient } = require('@supabase/supabase-js');

const DEFAULT_URL = Buffer.from('aHR0cHM6Ly9uYmpubXpyamx2amJlamdlb2djZS5zdXBhYmFzZS5jbw==', 'base64').toString();
const DEFAULT_KEY = Buffer.from('c2JfcHVibGlzaGFibGVfd3FSY05UOXlLSk5pMTZFSWVxcHduUV9iZmlhQV92dg==', 'base64').toString();

const supabase = createClient(DEFAULT_URL, DEFAULT_KEY);

async function run() {
  const tg_id = '6110284732'; // AveFame
  const email = `${tg_id}@telegram.volki.app`;
  const password = `volki_tg_${tg_id}_secure`;

  console.log(`Attempting sign-in for ${email}...`);
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    console.error('Sign-in failed with error:', error);
  } else {
    console.log('Sign-in succeeded!', data);
  }
}

run();
