const { createClient } = require('@supabase/supabase-js');

const url1 = "https://nbjnmzrjlvjbegeogcce.supabase.co"; // double c
const url2 = "https://nbjnmzrjlvjbejgeogce.supabase.co"; // single c
const anonKey = "sb_publishable_wqRcNT9yKJNi16EIeqpwnQ_bfiaA_vv";

async function testUrl(name, url) {
  console.log(`Testing ${name}: ${url}`);
  try {
    const supabase = createClient(url, anonKey);
    const start = Date.now();
    const { data, error } = await supabase.from('tournaments').select('id').limit(1);
    const duration = Date.now() - start;
    if (error) {
      console.log(`[${name}] Error after ${duration}ms:`, error.message);
    } else {
      console.log(`[${name}] Success after ${duration}ms, data:`, data);
    }
  } catch (err) {
    console.log(`[${name}] Fatal error:`, err.message);
  }
}

async function run() {
  await testUrl("URL1 (double c)", url1);
  await testUrl("URL2 (single c)", url2);
}

run();
