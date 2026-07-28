const http = require('http');

async function testEndpoint(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: '127.0.0.1',
            port: 3000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const startTime = Date.now();
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const duration = Date.now() - startTime;
                let parsed = data;
                try {
                    parsed = JSON.parse(data);
                } catch(e){}
                resolve({ status: res.statusCode, duration, data: parsed });
            });
        });

        req.on('error', reject);
        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function runTests() {
    console.log("=== SMOKE TEST: Pan de Rey API ===");
    
    // 1. GET /api/catalog/products
    try {
        console.log("\\nTesting GET /api/catalog/products...");
        const res1 = await testEndpoint('GET', '/api/catalog/products');
        console.log(`Status: ${res1.status} | Time: ${res1.duration}ms`);
        console.log(`Response length: ${Array.isArray(res1.data) ? res1.data.length + ' products' : JSON.stringify(res1.data).length + ' chars'}`);
        if(res1.status !== 200) console.log(res1.data);
    } catch(e) { console.error("Failed:", e.message); }

    // 2. GET /api/inventory
    try {
        console.log("\\nTesting GET /api/inventory...");
        const res2 = await testEndpoint('GET', '/api/inventory');
        console.log(`Status: ${res2.status} | Time: ${res2.duration}ms`);
        console.log(`Response summary:`, Array.isArray(res2.data) ? res2.data.slice(0, 1) : res2.data);
    } catch(e) { console.error("Failed:", e.message); }

    // 3. POST /api/catalog/products
    try {
        console.log("\\nTesting POST /api/catalog/products (Mock create)...");
        const res3 = await testEndpoint('POST', '/api/catalog/products', {
            name: "Test Product Post Refactor",
            price: 5000,
            categoryId: 1
        });
        console.log(`Status: ${res3.status} | Time: ${res3.duration}ms`);
        console.log(`Response:`, res3.data);
    } catch(e) { console.error("Failed:", e.message); }

    console.log("\\n=== SMOKE TEST FINISHED ===");
}

setTimeout(runTests, 3000); // Wait for server to be fully ready
