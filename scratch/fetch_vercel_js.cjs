async function run() {
  try {
    const res = await fetch('https://volk1303.vercel.app/assets/index-EWpkGkwC.js');
    const text = await res.text();
    console.log('Includes isPlaceholder:', text.includes('isPlaceholder'));
    console.log('Includes v=1.0.1:', text.includes('v=1.0.1'));
    console.log('Includes TESTING:', text.includes('TESTING'));
  } catch (err) {
    console.error('Error fetching Vercel JS:', err);
  }
}

run();
