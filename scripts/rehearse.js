// Isolated local rehearsal: never reads credentials, sends messages or writes real commerce data.
const { spawn } = require('node:child_process');
const { performance } = require('node:perf_hooks');
async function main() {
    process.env.NODE_ENV = 'test'; process.env.LOG_HTTP = 'false';
    process.env.COMMERCE_DB_PATH = ':memory:'; process.env.SHIPPING_FEE_MINOR = '0';
    delete process.env.VERCEL; delete process.env.TURSO_DATABASE_URL; delete process.env.TURSO_AUTH_TOKEN;
    const app = require('../server');
    const db = await require('../lib/storage').getDatabase();
    const store = require('../store_data');
    await store.initializeStoreDatabase();
    const product = (await store.getProducts()).find(row => row.price > 0);
    await require('../lib/commerce').adjustStock(db, product.id, 100, 'load rehearsal', 'test');
    const results = await Promise.all(Array.from({ length: 100 }, async (_, index) => {
        const began = performance.now();
        const result = await require('../lib/commerce').createOrder(db, { customer_name: 'Synthetic shopper', customer_phone: '01012345678', customer_address: 'Synthetic Cairo address', items: [{ id: product.id, qty: 1, variant: product.variants[0] || '' }] }, `rehearsal-order-${String(index).padStart(8, '0')}`);
        return { duration: performance.now() - began, number: result.orderNumber };
    }));
    if (new Set(results.map(row => row.number)).size !== 100) throw new Error('Duplicate synthetic orders');
    const durations = results.map(row => row.duration).sort((a, b) => a - b);
    const checkoutP95 = Math.round(durations[94]);
    const inventory = (await db.execute({ sql: 'SELECT reserved FROM inventory WHERE product_id = ?', args: [product.id] })).rows[0];
    if (inventory.reserved !== 100 || checkoutP95 >= 2000) throw new Error('Local checkout rehearsal failed');
    console.log(JSON.stringify({ event: 'local_checkout_rehearsal', concurrentShoppers: 100, acceptedOrders: results.length, reservedUnits: inventory.reserved, p95Ms: checkoutP95, scope: 'service layer with in-memory sql.js; not production HTTP checkout' }));
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    try {
        const child = spawn(process.execPath, ['scripts/load-test.js'], { stdio: 'inherit', env: { ...process.env, LOAD_TEST_URL: 'http://127.0.0.1:' + server.address().port } });
        const code = await new Promise((resolve, reject) => { child.once('exit', resolve); child.once('error', reject); });
        if (code !== 0) process.exitCode = 1;
    } finally { await new Promise(resolve => server.close(resolve)); await db.close(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
