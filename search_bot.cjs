const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\avefa\\CASH FLOW\\volk new\\volk1303\\bot\\volki_bot.py', 'utf8');

const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('postgres') || line.includes('supabase') || line.includes('://') || line.includes('password') || line.includes('key')) {
    console.log(`L${idx+1}: ${line.trim()}`);
  }
});
