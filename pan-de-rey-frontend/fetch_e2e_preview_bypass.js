const https = require('https');
const fs = require('fs');
const path = require('path');

// Load .env.local variables manually
function loadEnv() {
  const envPath = path.join(__dirname, '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const match = line.trim().match(/^([^#=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^"|"$/g, '');
        process.env[key] = value;
      }
    });
  }
}

loadEnv();

const bypassToken = process.env.VERCEL_BYPASS_TOKEN;
if (!bypassToken) {
  console.error("❌ Error: No se encontró la variable VERCEL_BYPASS_TOKEN en .env.local.");
  process.exit(1);
}

const url = 'https://pande-rey-proyect-c6bf1rg3m-prueba-sitios.vercel.app/api/test-e2e/?secret=L8nhPn1v*21';

const options = {
  headers: {
    'x-vercel-protection-bypass': bypassToken
  }
};

console.log(`📡 Enviando petición GET a ${url} utilizando bypass token desde variables locales...`);

https.get(url, options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('\n--- RESPONSE BODY ---');
    console.log(data);
    console.log('--------------------');
  });
}).on('error', (err) => {
  console.error('Error fetching E2E results:', err.message);
});
