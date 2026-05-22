const https = require('https');

https.get('https://volk1303.vercel.app/assets/index-B2f2IQDv.js', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('Includes AbortController?', data.includes('AbortController'));
    console.log('Includes "timeoutId = setTimeout"', data.includes('timeoutId=setTimeout'));
    console.log('Includes "isSupabaseConfigured"', data.includes('isSupabaseConfigured'));
  });
}).on('error', (err) => {
  console.log('Error:', err.message);
});
