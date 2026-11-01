const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');

test('HTTP checkout, staff RBAC, CSRF, recovery and protected assets', async t => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'zmr-http-'));
    process.env.NODE_ENV = 'test'; delete process.env.VERCEL;
    process.env.LOG_HTTP = 'false';
    delete process.env.TURSO_DATABASE_URL; delete process.env.TURSO_AUTH_TOKEN;
    process.env.COMMERCE_DB_PATH = ':memory:';
    process.env.LEGACY_DB_PATH = path.join(directory, 'legacy.db');
    process.env.STORE_ADMIN_SESSION_SECRET = crypto.randomBytes(32).toString('hex');
    process.env.STAFF_MFA_KEY = crypto.randomBytes(32).toString('hex');
    process.env.SHIPPING_FEE_MINOR = '2500';
    const app = require('../server');
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    const base = 'http://127.0.0.1:' + server.address().port;
    process.env.BASE_URL = base;
    t.after(async () => { await new Promise(resolve => server.close(resolve)); await (await require('../lib/storage').getDatabase()).close(); });
    async function request(url, { method = 'GET', body, headers = {} } = {}) {
        const response = await fetch(base + url, { method, headers: { Origin: base, 'Content-Type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
        return { response, data: await response.json().catch(() => null) };
    }
    assert.equal((await request('/health/ready')).response.status, 200);
    const store = require('../store_data');
    const products = await store.getProducts();
    assert.ok(products.length > 0);
    assert.equal(products[0].available_stock, 0);
    const db = await require('../lib/storage').getDatabase();
    const product = products.find(product => product.price > 0);
    await require('../lib/commerce').adjustStock(db, product.id, 10, 'test stock', 'test');
    for (const url of ['/zomoroda_system.db', '/package-lock.json', '/test_run.xlsx', '/.env.production', '/config.json', '/.git/config']) assert.ok((await fetch(base + url)).status >= 400, url);
    assert.equal((await request('/api/campaign/start', { method: 'POST', body: {} })).response.status, 410);
    assert.equal((await request('/api/store/admin/orders')).response.status, 401);
    assert.equal((await request('/api/v1/products')).response.status, 200);
    const body = { customer_name: 'HTTP test', customer_phone: '01012345678', customer_address: 'Cairo test address', items: [{ id: product.id, qty: 1, variant: product.variants[0] || '' }] };
    assert.equal((await request('/api/store/orders', { method: 'POST', body })).response.status, 400);
    const key = crypto.randomUUID();
    const first = await request('/api/v1/orders', { method: 'POST', body, headers: { 'Idempotency-Key': key } });
    assert.equal(first.response.status, 201);
    assert.equal(first.data.total, product.price + 25);
    const replay = await request('/api/store/orders', { method: 'POST', body, headers: { 'Idempotency-Key': key } });
    assert.equal(replay.data.orderNumber, first.data.orderNumber);
    assert.equal(replay.response.status, 200);
    const track = await request('/api/store/orders/track', { method: 'POST', body: { phone: body.customer_phone, order_number: first.data.orderNumber } });
    assert.equal(track.response.status, 200); assert.equal(track.data.order.customer_address, undefined);
    assert.equal((await request('/api/store/orders/track', { method: 'POST', body: { phone: '01112345678', order_number: first.data.orderNumber } })).response.status, 404);
    const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
    const staff = require('../lib/staff');
    for (const role of ['admin', 'support', 'operations']) {
        await staff.createStaff(db, { email: role + '@example.test', name: role, role, password: 'a-long-staff-password', totpSecret: secret });
        const login = await request('/api/store/admin/login', { method: 'POST', body: { email: role + '@example.test', password: 'a-long-staff-password', code: staff.totp(secret, Math.floor(Date.now() / 30000)) } });
        assert.equal(login.response.status, 200);
        const cookie = login.response.headers.get('set-cookie').split(';')[0];
        const headers = { Cookie: cookie, 'X-CSRF-Token': login.data.csrf };
        assert.equal((await request('/api/store/admin/session', { headers })).data.authenticated, true);
        assert.equal((await request('/api/store/admin/products', { headers })).response.status, role === 'admin' ? 200 : 403);
        if (role === 'admin') {
            const channelStatus = await request('/api/v1/admin/channels', { headers });
            assert.equal(channelStatus.response.status, 200);
            assert.ok(Array.isArray(channelStatus.data.channels));
            assert.equal(typeof channelStatus.data.supportAi.enabled, 'boolean');
            assert.equal((await request('/api/v1/admin/agents/global', { method: 'PATCH', body: { paused: false }, headers: { Cookie: cookie } })).response.status, 403);
            assert.equal((await request('/api/v1/admin/agents/global', { method: 'PATCH', body: { paused: false }, headers })).response.status, 200);
            const adjustment = { delta: 2, reason: 'verified recount' };
            const inventoryHeaders = { ...headers, 'Idempotency-Key': crypto.randomUUID() };
            for (let i = 0; i < 2; i++) assert.equal((await request('/api/v1/admin/inventory/' + product.id + '/adjustments', { method: 'POST', body: adjustment, headers: inventoryHeaders })).response.status, 200);
            assert.equal((await db.execute({ sql: 'SELECT on_hand FROM inventory WHERE product_id = ?', args: [product.id] })).rows[0].on_hand, 12);
            assert.equal((await request('/api/v1/admin/agents/global', { method: 'PATCH', body: { paused: true }, headers: { ...headers, Origin: 'https://evil.example' } })).response.status, 403);
        }
        assert.equal((await request('/api/store/admin/logout', { method: 'POST', headers })).response.status, 200);
        assert.equal((await request('/api/store/admin/session', { headers })).data.authenticated, false);
    }
    for (const url of ['/store', '/store/checkout', '/store/account', '/store/admin', '/store/manager', '/store/channels', '/store/operations', '/store/track', '/store/product/' + product.id]) {
        const response = await fetch(base + url); assert.equal(response.status, 200, url);
        assert.equal(response.headers.get('cache-control'), 'no-store');
        const html = await response.text();
        for (const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) if (match[1].trim()) new vm.Script(match[1], { filename: url });
    }
});
