// scratch/check_subscribers.cjs - Check subscribers in Supabase
const { createClient } = require('@supabase/supabase-js');

const DEFAULT_URL = Buffer.from('aHR0cHM6Ly9uYmpubXpyamx2amJlamdlb2djZS5zdXBhYmFzZS5jbw==', 'base64').toString();
const DEFAULT_KEY = Buffer.from('c2JfcHVibGlzaGFibGVfd3FSY05UOXlLSk5pMTZFSWVxcHduUV9iZmlhQV92dg==', 'base64').toString();

const supabase = createClient(DEFAULT_URL, DEFAULT_KEY);

async function run() {
  try {
    const { data: subs, error } = await supabase
      .from('bot_subscribers')
      .select('*');

    if (error) {
      console.error('Error fetching subscribers:', error);
      return;
    }

    console.log('--- SUBSCRIBERS IN DB ---');
    console.log(subs);
  } catch (err) {
    console.error('Fatal error:', err);
  }
}

run();
