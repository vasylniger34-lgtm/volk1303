const { createClient } = require('@supabase/supabase-js');

const DEFAULT_URL = Buffer.from('aHR0cHM6Ly9uYmpubXpyamx2amJlamdlb2djZS5zdXBhYmFzZS5jbw==', 'base64').toString();
const DEFAULT_KEY = Buffer.from('c2JfcHVibGlzaGFibGVfd3FSY05UOXlLSk5pMTZFSWVxcHduUV9iZmlhQV92dg==', 'base64').toString();

const supabase = createClient(DEFAULT_URL, DEFAULT_KEY);

async function run() {
  try {
    const { data: allProfiles, error: err1 } = await supabase
      .from('profiles')
      .select('id, username, reg_num, created_at');

    if (err1) {
      console.error('Error fetching all profiles:', err1);
      return;
    }

    const nullProfiles = allProfiles.filter(p => p.reg_num === null);

    console.log(`Total profiles in DB: ${allProfiles.length}`);
    console.log(`Profiles with NULL reg_num: ${nullProfiles.length}`);
    if (nullProfiles.length > 0) {
      console.log('Profiles missing hashtag numbers:');
      console.log(nullProfiles);
    } else {
      console.log('All profiles have a reg_num!');
    }
  } catch (err) {
    console.error('Fatal error:', err);
  }
}

run();
