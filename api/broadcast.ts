declare const process: { env: Record<string, string | undefined> };

const BOT_TOKEN = process.env.BOT_TOKEN || '8873845823:AAErjQiXP7InePLKku-MOhbqNPe-bMvt3LU';
const SUPABASE_URL = 'https://nbjnmzrjlvjbejgeogce.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_wqRcNT9yKJNi16EIeqpwnQ_bfiaA_vv';
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL || '@volk1303';

export default async function handler(req: any, res: any) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { text } = req.body as { text?: string };

  if (!text || !text.trim()) {
    return res.status(400).json({ ok: false, error: 'Missing text' });
  }

  // 1. Fetch all active subscribers from Supabase
  let chatIds: number[] = [];
  try {
    const subResp = await fetch(
      `${SUPABASE_URL}/rest/v1/bot_subscribers?is_active=eq.true&select=chat_id`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );
    const subs = await subResp.json();
    chatIds = (subs as any[]).map((s) => Number(s.chat_id)).filter(Boolean);
  } catch (e) {
    console.error('Failed to fetch subscribers:', e);
  }

  // 2. Fallback: also get profiles with telegram_id
  try {
    const profResp = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?telegram_id=not.is.null&select=telegram_id`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );
    const profiles = await profResp.json();
    for (const p of profiles as any[]) {
      const tgId = Number(p.telegram_id);
      if (tgId && !chatIds.includes(tgId)) {
        chatIds.push(tgId);
      }
    }
  } catch (_) {}

  // 3. Inline button linking to webapp
  const replyMarkup = JSON.stringify({
    inline_keyboard: [[{ text: '🎮 Відкрити VOLKI 13:03', web_app: { url: 'https://volk1303-nine.vercel.app/?v=1.0.1' } }]],
  });

  // 4. Send to all subscribers in batches of 10 to avoid timeouts and rate limits
  let sent = 0;
  let failed = 0;
  const blockedIds: number[] = [];

  const batchSize = 10;
  for (let i = 0; i < chatIds.length; i += batchSize) {
    const batch = chatIds.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (chatId) => {
        try {
          const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
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
            const desc: string = result.description || '';
            if (desc.toLowerCase().includes('blocked') || result.error_code === 403) {
              blockedIds.push(chatId);
            }
          }
        } catch {
          failed++;
        }
      })
    );
    // 350ms delay between batches of 10 to stay safely below 30 messages/sec limit
    await new Promise((resolve) => setTimeout(resolve, 350));
  }

  // 5. Mark blocked users as inactive in Supabase
  for (const blockedId of blockedIds) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/bot_subscribers?chat_id=eq.${blockedId}`, {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: false }),
      });
    } catch (_) {}
  }

  // 6. Also post to channel
  let channelOk = false;
  try {
    const chanResp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
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
    const chanResult = await chanResp.json();
    channelOk = chanResult.ok;
  } catch (_) {}

  return res.status(200).json({
    ok: true,
    sent,
    failed,
    total: chatIds.length,
    channel: channelOk,
    blocked_marked: blockedIds.length,
  });
}
