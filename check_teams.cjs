const { createClient } = require('@supabase/supabase-js');

const DEFAULT_URL = Buffer.from('aHR0cHM6Ly9uYmpubXpyamx2amJlamdlb2djZS5zdXBhYmFzZS5jbw==', 'base64').toString();
const DEFAULT_KEY = Buffer.from('c2JfcHVibGlzaGFibGVfd3FSY05UOXlLSk5pMTZFSWVxcHduUV9iZmlhQV92dg==', 'base64').toString();

const supabase = createClient(DEFAULT_URL, DEFAULT_KEY);

async function run() {
  try {
    const { data, error } = await supabase.from('teams').select('*');
    if (error) {
      console.error('Error fetching teams:', error);
      return;
    }
    console.log(`Fetched ${data.length} teams.`);
    data.forEach(t => {
      console.log(`Team: ID=${t.id}, Name=${t.name}, Tag=${t.tag}, TournamentID=${t.tournament_id}`);
    });
  } catch (err) {
    console.error('Fatal error:', err);
  }
}

run();
