const { createClient } = require('@supabase/supabase-js');

const DEFAULT_URL = Buffer.from('aHR0cHM6Ly9uYmpubXpyamx2amJlamdlb2djZS5zdXBhYmFzZS5jbw==', 'base64').toString();
const DEFAULT_KEY = Buffer.from('c2JfcHVibGlzaGFibGVfd3FSY05UOXlLSk5pMTZFSWVxcHduUV9iZmlhQV92dg==', 'base64').toString();

const supabase = createClient(DEFAULT_URL, DEFAULT_KEY);

async function run() {
  const telegramId = '5128173085';
  console.log('Querying profile with telegram_id:', telegramId);
  
  const { data: profile, error: selectError } = await supabase
    .from('profiles')
    .select('*')
    .eq('telegram_id', telegramId)
    .single();

  if (selectError) {
    console.error('Select error:', selectError);
    return;
  }
  
  console.log('Current profile:', profile);
  
  if (profile.role !== 'admin') {
    console.log('Promoting to admin...');
    const { data: updated, error: updateError } = await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('telegram_id', telegramId)
      .select();
      
    console.log('Update result:', updated);
    console.log('Update error:', updateError);
  } else {
    console.log('Profile is already admin!');
  }
}

run();
