// scratch/test_broadcast_api.cjs - Test the Vercel broadcast endpoint
async function run() {
  const url = 'https://volk1303.vercel.app/api/broadcast';
  const body = {
    text: '🧪 Тестове повідомлення від системи!'
  };

  console.log(`Sending POST request to ${url}...`);

  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    console.log(`Response status: ${r.status}`);
    const data = await r.json();
    console.log('Response data:', data);
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

run();
