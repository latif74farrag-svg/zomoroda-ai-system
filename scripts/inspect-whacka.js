const https = require('https');
const fs = require('fs');

function postJson(url, data) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const postData = JSON.stringify(data);
        const req = https.request({
            hostname: u.hostname,
            path: u.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    resolve(body);
                }
            });
        });
        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

async function run() {
    const products = await postJson('https://zomrda-cosmetics-sv5f.whacka.app/api/app/b2edf064-7f05-4f5c-8361-30ad097d16c5/data', {
        action: 'selectShared',
        collection: 'products'
    });
    fs.writeFileSync('scripts/whacka_products.json', JSON.stringify(products, null, 2), 'utf8');
    console.log('Saved', products.length, 'products to scripts/whacka_products.json');
}

run();
