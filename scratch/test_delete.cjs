const { createClient } = require('@supabase/supabase-js');

const DEFAULT_URL = Buffer.from('aHR0cHM6Ly9uYmpubXpyamx2amJlamdlb2djZS5zdXBhYmFzZS5jbw==', 'base64').toString();
const DEFAULT_KEY = Buffer.from('c2JfcHVibGlzaGFibGVfd3FSY05UOXlLSk5pMTZFSWVxcHduUV9iZmlhQV92dg==', 'base64').toString();

const supabase = createClient(DEFAULT_URL, DEFAULT_KEY);

async function run() {
  const tournamentId = '352716be-e077-4db1-a32b-0a8faaf5a701';
  console.log('Testing deletion of tournament:', tournamentId);
  
  const { data: tourneyObj } = await supabase.from('tournaments').select('*').eq('id', tournamentId).single();
  console.log('Tournament object:', tourneyObj);
  
  const { data: matchesData } = await supabase.from('matches').select('id').eq('tournament_id', tournamentId);
  const matchIds = (matchesData || []).map(m => m.id);
  console.log('Matches:', matchIds);

  const { data: teamsData } = await supabase.from('teams').select('id').eq('tournament_id', tournamentId);
  const teamIds = (teamsData || []).map(t => t.id);
  console.log('Teams:', teamIds);

  // Attempt deleting predictions
  if (matchIds.length > 0) {
    const { error } = await supabase.from('predictions').delete().in('match_id', matchIds);
    console.log('Predictions (match_id) delete error:', error);
  }
  if (tourneyObj) {
    const { error } = await supabase.from('predictions').delete().eq('tournament_name', tourneyObj.name);
    console.log('Predictions (tournament_name) delete error:', error);
  }

  // Attempt deleting team invites
  if (teamIds.length > 0) {
    const { error } = await supabase.from('team_invites').delete().in('team_id', teamIds);
    console.log('Team invites delete error:', error);
  }

  // Attempt deleting matches
  const { error: matchesError } = await supabase.from('matches').delete().eq('tournament_id', tournamentId);
  console.log('Matches delete error:', matchesError);

  // Attempt deleting teams
  const { error: teamsError } = await supabase.from('teams').delete().eq('tournament_id', tournamentId);
  console.log('Teams delete error:', teamsError);

  // Attempt deleting tournament
  const { error: tourneyError } = await supabase.from('tournaments').delete().eq('id', tournamentId);
  console.log('Tournament delete error:', tourneyError);
}

run();
