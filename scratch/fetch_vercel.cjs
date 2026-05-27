
async function run() {
  try {
    const res = await fetch('https://volk1303-nine.vercel.app/');
    const text = await res.text();
    console.log('--- INDEX.HTML FROM VERCEL ---');
    console.log(text);
  } catch (err) {
    console.error('Error fetching Vercel index:', err);
  }
}

run();
