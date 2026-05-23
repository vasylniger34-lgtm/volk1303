const fs = require('fs');
const path = require('path');

const files = [
  'c:\\Users\\avefa\\CASH FLOW\\volk new\\volk1303\\src\\components\\ManagerPanel.tsx',
  'c:\\Users\\avefa\\CASH FLOW\\volk new\\volk1303\\src\\components\\AdminPanel.tsx',
  'c:\\Users\\avefa\\CASH FLOW\\volk new\\volk1303\\src\\context\\AppContext.tsx'
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  const content = fs.readFileSync(file, 'utf8');
  
  // Find Cyrillic 'Х' (capital U+0425) or 'х' (small U+0445)
  // especially when adjacent to numbers (e.g. 4х4, 2х2, 4Х4, 2Х2)
  const regex = /([0-9])([Хх])([0-9])/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    console.log(`Found Cyrillic X in ${path.basename(file)}: "${match[0]}" at index ${match.index}`);
    // print surrounding lines
    const lineNum = content.substring(0, match.index).split('\n').length;
    const lines = content.split('\n');
    console.log(`  Line ${lineNum}: ${lines[lineNum - 1].trim()}`);
  }
});
