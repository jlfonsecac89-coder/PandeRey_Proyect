const https = require('https');

const bypassToken = process.argv[2];
if (!bypassToken) {
  console.error("❌ Error: Debes pasar el token de bypass como argumento: node fetch_e2e_preview_bypass.js [token]");
  process.exit(1);
}

const url = 'https://pande-rey-proyect-c6bf1rg3m-prueba-sitios.vercel.app/api/test-e2e/?secret=L8nhPn1v*21';

const options = {
  headers: {
    'x-vercel-protection-bypass': bypassToken
  }
};

console.log(`📡 Enviando petición GET a ${url} con bypass token...`);

https.get(url, options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log('Headers:', res.headers);
  
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
