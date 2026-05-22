const { createClient } = require('@supabase/supabase-js');

const DEFAULT_URL = Buffer.from('aHR0cHM6Ly9uYmpubXpyamx2amJlamdlb2djZS5zdXBhYmFzZS5jbw==', 'base64').toString();
const DEFAULT_KEY = Buffer.from('c2JfcHVibGlzaGFibGVfd3FSY05UOXlLSk5pMTZFSWVxcHduUV9iZmlhQV92dg==', 'base64').toString();

const supabase = createClient(DEFAULT_URL, DEFAULT_KEY);

async function run() {
  try {
    console.log('1. Fetching tournaments...');
    const { data: tourneys, error: tErr } = await supabase.from('tournaments').select('*');
    if (tErr) console.error('Tournaments error:', tErr);
    else console.log(`Tournaments count: ${tourneys.length}`);

    console.log('2. Fetching teams...');
    const { data: teams, error: tmErr } = await supabase.from('teams').select('*');
    if (tmErr) console.error('Teams error:', tmErr);
    else console.log(`Teams count: ${teams.length}`);

    console.log('3. Fetching matches...');
    const { data: matches, error: mErr } = await supabase.from('matches').select('*');
    if (mErr) console.error('Matches error:', mErr);
    else console.log(`Matches count: ${matches.length}`);

    console.log('4. Fetching profiles...');
    const { data: profiles, error: pErr } = await supabase.from('profiles').select('*');
    if (pErr) console.error('Profiles error:', pErr);
    else console.log(`Profiles count: ${profiles.length}`);
  } catch (err) {
    console.error('Fatal:', err);
  }
}

run();
