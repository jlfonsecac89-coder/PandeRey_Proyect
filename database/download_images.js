const fs = require('fs');
const path = require('path');
const https = require('https');

const outputDir = path.join(__dirname, 'downloaded_images');

const imageList = [
  { sku: 'PAS-001', url: 'https://pedidosya.dhmedia.io/image/pedidosya/products/1d41d70d-76e0-4396-88ed-786e2581262b.jpeg?quality=90&height=800&width=800' },
  { sku: 'PAS-002', url: 'https://pedidosya.dhmedia.io/image/pedidosya/products/67896507-39eb-4f71-b969-eab7ccf1dfd1.jpeg?quality=90&height=800&width=800' },
  { sku: 'PAS-003', url: 'https://pedidosya.dhmedia.io/image/pedidosya/products/71b5bc01-6c1a-47a7-b30f-9e2c29f37c5d.jpeg?quality=90&height=800&width=800' },
  { sku: 'PAS-004', url: 'https://pedidosya.dhmedia.io/image/pedidosya/products/73d201d6-249e-4f4c-9b90-c0a31ac232e8.jpeg?quality=90&height=800&width=800' },
  { sku: 'PAS-005-A', url: 'https://pedidosya.dhmedia.io/image/pedidosya/products/a11e34a5-ff20-45d9-9d6f-0f091f8b493c.jpeg?quality=90&height=800&width=800' },
  { sku: 'PAS-005-B', url: 'https://pedidosya.dhmedia.io/image/pedidosya/products/a11e34a5-ff20-45d9-9d6f-0f091f8b493c.jpeg?quality=90&height=800&width=800' },
  { sku: 'PAS-006', url: 'https://pedidosya.dhmedia.io/image/pedidosya/products/f6b0af5c-e2d0-4193-b26e-13bc97b3f189.jpeg?quality=90&height=800&width=800' },
  { sku: 'PAS-007', url: 'https://pedidosya.dhmedia.io/image/pedidosya/products/c67f09ee-09f3-482e-93b9-3df278007c8c.jpeg?quality=90&height=800&width=800' },
  { sku: 'PAS-008', url: 'https://pedidosya.dhmedia.io/image/pedidosya/products/7fa845b0-0be7-4043-9397-9233708c210d.jpeg?quality=90&height=800&width=800' },
  { sku: 'PAS-009', url: 'https://pedidosya.dhmedia.io/image/pedidosya/products/1d14114c-3727-4aad-920d-2ef74044a221.jpeg?quality=90&height=800&width=800' },
  { sku: 'PAS-010', url: 'https://pedidosya.dhmedia.io/image/pedidosya/products/620c0335-986b-4980-9fe8-416f85920b01.jpeg?quality=90&height=800&width=800' },
  { sku: 'PAS-011', url: 'https://pedidosya.dhmedia.io/image/pedidosya/products/6c1e612c-d35f-46ea-be8f-d8f14553c09a.jpeg?quality=90&height=800&width=800' },
  { sku: 'PAS-012', url: 'https://pedidosya.dhmedia.io/image/pedidosya/products/ae5018b7-cba4-4483-a62b-60ed27e2ef86.jpeg?quality=90&height=800&width=800' },
  { sku: 'PAS-013', url: 'https://pedidosya.dhmedia.io/image/pedidosya/products/7938a7d4-31c0-4733-b127-5d6270640081.jpeg?quality=90&height=800&width=800' },
  { sku: 'PAS-014', url: 'https://pedidosya.dhmedia.io/image/pedidosya/products/19f1637e-b92d-49f4-8eb0-a25f47fa0a4b.jpeg?quality=90&height=800&width=800' },
  
  { sku: 'DES-001', url: 'https://pedidosya.dhmedia.io/image/pedidosya/products/d54a575b-4824-45f3-ae5f-a12346b2fb29.jpeg?quality=90&height=800&width=800' },
  { sku: 'DES-002', url: 'https://pedidosya.dhmedia.io/image/pedidosya/products/cf4e565c-0845-44b6-b769-7bcfb7aca577.jpeg?quality=90&height=800&width=800' },
  { sku: 'DES-003', url: 'https://pedidosya.dhmedia.io/image/pedidosya/products/560da7ff-b740-4630-9087-d4d7559d1269.jpeg?quality=90&height=800&width=800' },
  { sku: 'DES-004', url: 'https://pedidosya.dhmedia.io/image/pedidosya/products/4a05901c-7d56-4873-babe-7e0781078048.jpeg?quality=90&height=800&width=800' },
  { sku: 'DES-005', url: 'https://pedidosya.dhmedia.io/image/pedidosya/products/d73cb59e-39e0-406f-be4c-c7fe4a911d22.jpeg?quality=90&height=800&width=800' },
  
  { sku: 'PAN-001', url: 'https://pedidosya.dhmedia.io/image/pedidosya/products/4ec0bf9b-6e8c-4f1d-997d-a3c3bc36a175.jpeg?quality=90&height=800&width=800' },
  { sku: 'PAN-002', url: 'https://pedidosya.dhmedia.io/image/pedidosya/products/d8e0a76b-b2c9-44f5-8885-587faddb4607.jpeg?quality=90&height=800&width=800' },
  
  { sku: 'HOJ-001', url: 'https://pedidosya.dhmedia.io/image/pedidosya/products/251df1a3-dad6-4a17-b7f8-ebc6062d33a8.jpeg?quality=90&height=800&width=800' },
  { sku: 'HOJ-002', url: 'https://pedidosya.dhmedia.io/image/pedidosya/products/bf99ff6a-976a-4f8d-94c8-1221e8a7f8f0.jpeg?quality=90&height=800&width=800' },
  { sku: 'HOJ-003', url: 'https://pedidosya.dhmedia.io/image/pedidosya/products/1466cf13-df00-4580-a91c-c747442359ae.jpeg?quality=90&height=800&width=800' },
  { sku: 'HOJ-004', url: 'https://pedidosya.dhmedia.io/image/pedidosya/products/1002c647-4ea3-4cae-8fd6-06a215a89bec.jpeg?quality=90&height=800&width=800' }
];

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function downloadImage(sku, url) {
  return new Promise((resolve, reject) => {
    const filename = `${sku}-1.jpg`;
    const filepath = path.join(outputDir, filename);
    const file = fs.createWriteStream(filepath);
    
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to download ${sku}: Status ${res.statusCode}`));
        return;
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`✅ Descargada y renombrada: ${filename}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {}); // delete partial file
      reject(err);
    });
  });
}

async function run() {
  console.log(`🚀 Iniciando descarga de ${imageList.length} imágenes...`);
  let downloaded = 0;
  let failed = 0;
  
  for (const item of imageList) {
    try {
      await downloadImage(item.sku, item.url);
      downloaded++;
      // Esperar 150ms entre descargas para no sobrecargar el servidor
      await new Promise(r => setTimeout(r, 150));
    } catch (e) {
      console.error(`❌ Error con SKU ${item.sku}:`, e.message);
      failed++;
    }
  }
  
  console.log(`\n🎉 Descargas finalizadas. Éxitos: ${downloaded}, Fallidos: ${failed}`);
}

run();
