import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://nbjnmzrjlvjbejgeogce.supabase.co";
const SUPABASE_KEY = "sb_publishable_wqRcNT9yKJNi16EIeqpwnQ_bfiaA_vv";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function test() {
  const tgId = "test_user_" + Math.floor(Math.random() * 1000000);
  const email = `${tgId}@telegram.volki.app`;
  const password = `volki_tg_${tgId}_secure`;

  console.log(`Attempting to sign up for ${email}...`);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username: tgId,
        telegram_id: tgId,
        telegram_username: tgId
      }
    }
  });

  if (error) {
    console.error("Sign up failed:", error.message, error);
  } else {
    console.log("Sign up successful!", data);
  }
}

test();
