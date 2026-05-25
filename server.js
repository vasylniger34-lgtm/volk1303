import express from 'express';
import { exec } from 'child_process';

const app = express();
app.use(express.json());

// CORS headers
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const BOT_TOKEN = process.env.BOT_TOKEN || '8873845823:AAErjQiXP7InePLKku-MOhbqNPe-bMvt3LU';
const SUPABASE_URL = 'https://nbjnmzrjlvjbejgeogce.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_wqRcNT9yKJNi16EIeqpwnQ_bfiaA_vv';
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL || '@volki1303';
const WEBAPP_URL = 'https://volk1303.online';

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'volk-api', time: new Date().toISOString() });
});

app.post('/api/github-deploy', (req, res) => {
  const ref = req.body?.ref;
  if (ref !== 'refs/heads/main') {
    return res.status(200).json({ ok: true, message: 'Not main branch push, skipping.' });
  }

  console.log('[DEPLOY] Git push webhook received. Deploying...');
  res.status(202).json({ ok: true, message: 'Deploy started' });

  // Reset local repo to match origin/main, pull latest code, build, and restart bot
  exec('cd /var/www/volk1303 && git reset --hard origin/main && git pull origin main && npm run build && systemctl restart volki-bot', (error, stdout, stderr) => {
    if (error) {
      console.error('[DEPLOY] Deploy failed:', error);
      return;
    }
    console.log('[DEPLOY] Deploy successful!\nStdout:', stdout, '\nStderr:', stderr);
    
    // Restart volk-api itself asynchronously
    setTimeout(() => {
      exec('systemctl restart volk-api');
    }, 1000);
  });
});


app.post('/api/broadcast', async (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ ok: false, error: 'Missing text' });
  }

  let chatIds = [];
  try {
    const subResp = await fetch(
      SUPABASE_URL + '/rest/v1/bot_subscribers?is_active=eq.true&select=chat_id',
      { headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY } }
    );
    const subs = await subResp.json();
    chatIds = subs.map((s) => Number(s.chat_id)).filter(Boolean);
  } catch (e) {
    console.error('Failed to fetch subscribers:', e);
  }

  try {
    const profResp = await fetch(
      SUPABASE_URL + '/rest/v1/profiles?telegram_id=not.is.null&select=telegram_id',
      { headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY } }
    );
    const profiles = await profResp.json();
    for (const p of profiles) {
      const tgId = Number(p.telegram_id);
      if (tgId && !chatIds.includes(tgId)) {
        chatIds.push(tgId);
      }
    }
  } catch (_) {}

  const replyMarkup = JSON.stringify({
    inline_keyboard: [[{ text: '🎮 Відкрити VOLK 13:03', web_app: { url: WEBAPP_URL } }]],
  });

  let sent = 0;
  let failed = 0;
  const blockedIds = [];

  for (const chatId of chatIds) {
    try {
      const r = await fetch('https://api.telegram.org/bot' + BOT_TOKEN + '/sendMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
          reply_markup: replyMarkup,
        }),
      });
      const result = await r.json();
      if (result.ok) {
        sent++;
      } else {
        failed++;
        const desc = result.description || '';
        if (desc.toLowerCase().includes('blocked') || result.error_code === 403) {
          blockedIds.push(chatId);
        }
      }
    } catch (err) {
      failed++;
    }
    await new Promise((resolve) => setTimeout(resolve, 60));
  }

  for (const blockedId of blockedIds) {
    try {
      await fetch(SUPABASE_URL + '/rest/v1/bot_subscribers?chat_id=eq.' + blockedId, {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: 'Bearer ' + SUPABASE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: false }),
      });
    } catch (_) {}
  }

  let channelOk = false;
  try {
    const chanResp = await fetch('https://api.telegram.org/bot' + BOT_TOKEN + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHANNEL_ID,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        reply_markup: replyMarkup,
      }),
    });
    channelOk = (await chanResp.json()).ok;
  } catch (_) {}

  return res.status(200).json({
    ok: true,
    sent,
    failed,
    total: chatIds.length,
    channel: channelOk,
    blocked_marked: blockedIds.length,
  });
});

const PORT = 3001;
app.listen(PORT, '127.0.0.1', () => {
  console.log('VOLK API server running on http://127.0.0.1:' + PORT);
});
