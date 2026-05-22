const { createClient } = require('@supabase/supabase-js');

const DEFAULT_URL = Buffer.from('aHR0cHM6Ly9uYmpubXpyamx2amJlamdlb2djZS5zdXBhYmFzZS5jbw==', 'base64').toString();
const DEFAULT_KEY = Buffer.from('c2JfcHVibGlzaGFibGVfd3FSY05UOXlLSk5pMTZFSWVxcHduUV9iZmlhQV92dg==', 'base64').toString();

const supabase = createClient(DEFAULT_URL, DEFAULT_KEY);

async function run() {
  const userId = '00000000-0000-0000-0000-006110284732'; // AveFame
  console.log(`Inserting test prediction for user: ${userId}...`);
  const { data, error } = await supabase
    .from('predictions')
    .insert({
      user_id: userId,
      tournament_name: 'Test Tournament',
      team_a: 'Team A',
      team_b: 'Team B',
      prediction_type: 'winner',
      predicted_value: 'Team A',
      odds: 1.85,
      wager: 100,
      status: 'pending'
    })
    .select();

  if (error) {
    console.error('Insert failed:', error);
  } else {
    console.log('Insert succeeded!', data);
    
    // Clean up
    console.log('Cleaning up...');
    const { error: delError } = await supabase
      .from('predictions')
      .delete()
      .eq('id', data[0].id);
    console.log('Cleanup error:', delError);
  }
}

run();
