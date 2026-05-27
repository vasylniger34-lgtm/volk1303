
const BOT_TOKEN = '8873845823:AAErjQiXP7InePLKku-MOhbqNPe-bMvt3LU';
const CHAT_ID = '5128173085';

async function run() {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const body = {
    chat_id: CHAT_ID,
    text: '🔔 <b>Тест сповіщення!</b>\n\nПривіт! Це перевірка відправки повідомлення на ваш Telegram ID.',
    parse_mode: 'HTML'
  };

  console.log('Sending message to chat_id:', CHAT_ID);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    const result = await response.json();
    console.log('Telegram API response:', result);
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

run();
