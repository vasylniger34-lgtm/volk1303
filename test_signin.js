import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://nbjnmzrjlvjbejgeogce.supabase.co";
const SUPABASE_KEY = "sb_publishable_wqRcNT9yKJNi16EIeqpwnQ_bfiaA_vv";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function test() {
  const tgId = "8472692319";
  const email = `${tgId}@telegram.volki.app`;
  const password = `volki_tg_${tgId}_secure`;

  console.log(`Attempting to sign in for ${email}...`);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error("Sign in failed:", error.message, error);
  } else {
    console.log("Sign in successful!", data);
  }
}

test();
