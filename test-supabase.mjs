import { createClient } from '@supabase/supabase-js';

const DEFAULT_URL = atob('aHR0cHM6Ly9uYmpubXpyamx2amJlamdlb2djZS5zdXBhYmFzZS5jbw==');
const DEFAULT_KEY = atob('c2JfcHVibGlzaGFibGVfd3FSY05UOXlLSk5pMTZFSWVxcHduUV9iZmlhQV92dg==');

const supabase = createClient(DEFAULT_URL, DEFAULT_KEY);

async function test() {
  console.log("Starting query...");
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, telegram_username, reg_num')
      .eq('reg_num', 123);
    
    console.log("Data:", data);
    console.log("Error:", error);
  } catch (e) {
    console.log("Exception:", e);
  }
}

test();
