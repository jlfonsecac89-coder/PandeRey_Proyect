const fs = require('fs');
const path = require('path');

const targetHeader = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';

function searchDir(dir) {
  if (dir.includes('cache') || dir.includes('node_modules')) return;
  
  let files;
  try {
    files = fs.readdirSync(dir);
  } catch (err) {
    return;
  }
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    let stat;
    try {
      stat = fs.statSync(fullPath);
    } catch (err) {
      continue;
    }
    
    if (stat.isDirectory()) {
      searchDir(fullPath);
    } else if (stat.isFile() && (file.endsWith('.json') || file.endsWith('.js') || file.endsWith('.html') || file.endsWith('.txt'))) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes(targetHeader)) {
          const idx = content.indexOf(targetHeader);
          console.log(`\n🎉 Found JWT token in: ${fullPath}`);
          console.log("Token sample:", content.substring(idx, idx + 150));
        }
      } catch (err) {
        // Skip read errors
      }
    }
  }
}

const startDir = path.join(__dirname, '..', 'pan-de-rey-frontend', '.next');
console.log(`🕵️ Scanning ${startDir} for Supabase JWT tokens...`);
searchDir(startDir);
console.log('Done scanning.');
