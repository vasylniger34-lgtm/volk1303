const fs = require('fs');
const path = require('path');

const rootDir = 'c:\\Users\\avefa\\CASH FLOW\\volk new';

function searchInDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        searchInDir(fullPath);
      }
    } else if (file.endsWith('.sql')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('email_exists') || content.includes('CASE WHEN')) {
        console.log(`Found in: ${fullPath}`);
        // print matching lines
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          if (line.includes('email_exists') || line.includes('CASE WHEN')) {
            console.log(`  L${idx+1}: ${line.trim()}`);
          }
        });
      }
    }
  }
}

searchInDir(rootDir);
