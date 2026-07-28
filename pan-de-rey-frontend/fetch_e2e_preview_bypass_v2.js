const https = require('https');
const fs = require('fs');
const path = require('path');

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

const domain = 'pande-rey-proyect-ozgbjioln-prueba-sitios.vercel.app';
const url = `https://${domain}/api/test-e2e/?secret=L8nhPn1v*21`;

function requestUrl(targetUrl, headers = {}) {
  return new Promise((resolve, reject) => {
    https.get(targetUrl, { headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    }).on('error', reject);
  });
}

async function run() {
  try {
    console.log(`📡 [Paso 1] Enviando petición GET inicial con ambos bypass headers...`);
    const res1 = await requestUrl(url, {
      'x-vercel-protection-bypass': bypassToken,
      'x-vercel-set-bypass-cookie': 'true'
    });
    
    console.log(`Status 1: ${res1.statusCode}`);
    console.log('Headers 1:', res1.headers);
    
    if (res1.statusCode === 302 || res1.statusCode === 307 || res1.statusCode === 308) {
      const redirectLocation = res1.headers.location;
      const setCookie = res1.headers['set-cookie'];
      
      console.log(`📡 [Paso 2] Redirección detectada hacia: ${redirectLocation}`);
      
      const headers2 = {};
      if (setCookie) {
        headers2['Cookie'] = setCookie.map(c => c.split(';')[0]).join('; ');
      }
      
      let nextUrl = redirectLocation;
      if (redirectLocation.startsWith('/')) {
        nextUrl = `https://${domain}` + redirectLocation;
      }
      
      const res2 = await requestUrl(nextUrl, headers2);
      console.log(`Status 2: ${res2.statusCode}`);
      console.log('\n--- RESPONSE BODY ---');
      console.log(res2.body);
      console.log('--------------------');
    } else {
      console.log('\n--- RESPONSE BODY ---');
      console.log(res1.body);
      console.log('--------------------');
    }
  } catch (e) {
    console.error("❌ Error running request:", e.message);
  }
}

run();
