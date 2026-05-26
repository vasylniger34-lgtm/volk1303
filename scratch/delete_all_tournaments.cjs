// scratch/delete_all_tournaments.cjs - Test deleting all tournaments via Supabase client
const { createClient } = require('@supabase/supabase-js');

const DEFAULT_URL = Buffer.from('aHR0cHM6Ly9uYmpubXpyamx2amJlamdlb2djZS5zdXBhYmFzZS5jbw==', 'base64').toString();
const DEFAULT_KEY = Buffer.from('c2JfcHVibGlzaGFibGVfd3FSY05UOXlLSk5pMTZFSWVxcHduUV9iZmlhQV92dg==', 'base64').toString();

const supabase = createClient(DEFAULT_URL, DEFAULT_KEY);

async function run() {
  console.log('Fetching tournaments from DB first...');
  const { data: tourneys, error: fetchErr } = await supabase.from('tournaments').select('id, name');
  if (fetchErr) {
    console.error('Fetch error:', fetchErr);
    return;
  }
  
  console.log(`Found ${tourneys.length} tournaments. Attempting to delete them...`);
  
  for (const t of tourneys) {
    console.log(`Deleting tournament: ${t.name} (${t.id})...`);
    
    // Attempt deleting associated rows first to see if foreign key blocks it
    const { error: matchesErr } = await supabase.from('matches').delete().eq('tournament_id', t.id);
    if (matchesErr) console.error('Matches delete error:', matchesErr);
    
    const { error: teamsErr } = await supabase.from('teams').delete().eq('tournament_id', t.id);
    if (teamsErr) console.error('Teams delete error:', teamsErr);
    
    const { error: deleteErr } = await supabase.from('tournaments').delete().eq('id', t.id);
    if (deleteErr) {
      console.error(`❌ Failed to delete tournament ${t.name}:`, deleteErr);
    } else {
      console.log(`✅ Successfully deleted tournament ${t.name} from DB!`);
    }
  }
}

run();
