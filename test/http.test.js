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
    process.env.CRON_SECRET = crypto.randomBytes(32).toString('hex');
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
    assert.equal((await request('/api/cron/worker')).response.status, 401);
    assert.equal((await request('/api/cron/worker', { headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` } })).response.status, 200);
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
    assert.equal((await request('/api/v1/admin/purchasing')).response.status, 401);
    for (const url of ['/maps-scraper','/api/maps-scraper/leads','/api/maps-scraper/export','/api/v1/admin/tenders']) assert.equal((await request(url)).response.status, 401);
    assert.equal((await request('/api/maps-scraper/run', { method: 'POST', body: {} })).response.status, 401);
    assert.equal((await request('/api/v1/admin/worker/run', { method: 'POST', body: {} })).response.status, 401);
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
        assert.equal((await request('/api/v1/admin/integrations', { headers })).response.status, role === 'admin' ? 200 : 403);
        assert.equal((await request('/api/v1/admin/purchasing', { headers })).response.status, role === 'admin' ? 200 : 403);
        if (role === 'admin') {
            const supplierBody = { name: 'HTTP supplier', contact: 'office' };
            assert.equal((await request('/api/v1/admin/purchasing/suppliers', { method: 'POST', headers: { Cookie: cookie }, body: supplierBody })).response.status, 403);
            const supplier = await request('/api/v1/admin/purchasing/suppliers', { method: 'POST', headers: { ...headers, 'Idempotency-Key': 'http-supplier-key' }, body: supplierBody });
            assert.equal(supplier.response.status, 201);
            const purchase = await request('/api/v1/admin/purchasing/orders', { method: 'POST', headers: { ...headers, 'Idempotency-Key': 'http-purchase-key' }, body: { supplier_id: supplier.data.id, lines: [{ product_id: product.id, quantity: 2, unit_minor: 100 }] } });
            assert.equal(purchase.response.status, 201);
            assert.equal((await request('/api/v1/admin/purchasing/orders/' + purchase.data.id, { method: 'PATCH', headers, body: { status: 'approved' } })).response.status, 200);
            const overview = await request('/api/v1/admin/operations', { headers });
            assert.equal(overview.response.status, 200);
            assert.ok(overview.data.orders.pending >= 1 && overview.data.orders.open >= overview.data.orders.pending);
            assert.ok(overview.data.orders.last24h >= 1);
            assert.ok(overview.data.orders.valueLast24hMinor >= Math.round((product.price + 25) * 100));
        }
        const channelsPage = await fetch(base + '/store/channels', { headers: { Cookie: cookie } });
        const channelsHtml = await channelsPage.text();
        assert.equal(channelsPage.status, 200);
        if (role === 'admin') {
            assert.equal((await request('/maps-scraper', { headers })).response.status, 200);
            assert.equal((await request('/api/v1/admin/tenders', { headers })).response.status, 200);
            assert.equal((await request('/api/v1/admin/tenders', { method: 'POST', headers: { Cookie: cookie }, body: { title: 'مناقصة اختبار', issuer: 'جهة اختبار', deadline: '2026-12-31' } })).response.status, 403);
            const tender = await request('/api/v1/admin/tenders', { method: 'POST', headers, body: { title: 'مناقصة اختبار', issuer: 'جهة اختبار', deadline: '2026-12-31', requirements: 'عينات ومواصفات' } });
            assert.equal(tender.response.status, 201);
            assert.equal((await request('/api/v1/admin/tenders/' + tender.data.id, { method: 'PATCH', headers, body: { status: 'reviewing' } })).response.status, 200);
            assert.match(channelsHtml, /واتساب المباشر/);
            assert.match(channelsHtml, /مهيأ للمراجعة|غير مفعّل/);
        } else {
            assert.match(channelsHtml, /يتطلب تسجيل الدخول/);
            assert.doesNotMatch(channelsHtml, /wa\.me/);
        }
        if (role === 'admin') {
            assert.equal((await request('/api/v1/admin/integrations', { method: 'PUT', headers: { Cookie: cookie }, body: { values: {} } })).response.status, 403);
            const savedIntegration = await request('/api/v1/admin/integrations', { method: 'PUT', headers, body: { values: { META_VERIFY_TOKEN: 'test-private-verify-token' } } });
            assert.equal(savedIntegration.response.status, 200);
            assert.ok(!JSON.stringify(savedIntegration.data).includes('test-private-verify-token'));
            const verifyWebhook = await fetch(base + '/webhooks/meta?hub.mode=subscribe&hub.verify_token=test-private-verify-token&hub.challenge=test-challenge');
            assert.equal(verifyWebhook.status, 200);
            assert.equal(await verifyWebhook.text(), 'test-challenge');
            const channelStatus = await request('/api/v1/admin/channels', { headers });
            assert.equal(channelStatus.response.status, 200);
            assert.ok(Array.isArray(channelStatus.data.channels));
            assert.equal(typeof channelStatus.data.supportAi.enabled, 'boolean');
            const campaignLibrary = await request('/api/v1/admin/marketing/campaigns', { headers });
            assert.equal(campaignLibrary.response.status, 200);
            assert.ok(Array.isArray(campaignLibrary.data.campaigns));
            const emptyCampaignLibrary = campaignLibrary.data.campaigns;
            assert.equal(emptyCampaignLibrary.length, 0);
            const createdCampaign = await request('/api/v1/admin/marketing/campaigns', {
                method: 'POST',
                headers,
                body: { title: 'HTTP test campaign', sector: 'pharmacies', product_type: 'ronzawipes', channel: 'whatsapp', message: 'A reviewed test draft.' }
            });
            assert.equal(createdCampaign.response.status, 201);
            const savedCampaigns = await request('/api/v1/admin/marketing/campaigns', { headers });
            assert.equal(savedCampaigns.data.campaigns.length, 1);
            assert.equal(savedCampaigns.data.campaigns[0].title, 'HTTP test campaign');
            const agentStatus = await request('/api/v1/admin/agents', { headers });
            assert.equal(agentStatus.response.status, 200);
            assert.ok(Array.isArray(agentStatus.data.controls));
            assert.ok(Array.isArray(agentStatus.data.tasks));
            const auditLog = await request('/api/v1/admin/audit', { headers });
            assert.equal(auditLog.response.status, 200);
            assert.ok(Array.isArray(auditLog.data.entries));
            const queuedJobs = await request('/api/v1/admin/jobs', { headers });
            assert.equal(queuedJobs.response.status, 200);
            assert.ok(Array.isArray(queuedJobs.data.jobs));
            assert.equal((await request('/api/v1/admin/agents/global', { method: 'PATCH', body: { paused: false }, headers: { Cookie: cookie } })).response.status, 403);
            assert.equal((await request('/api/v1/admin/agents/global', { method: 'PATCH', body: { paused: false }, headers })).response.status, 200);
            const adjustment = { delta: 2, reason: 'verified recount' };
            const inventoryHeaders = { ...headers, 'Idempotency-Key': crypto.randomUUID() };
            // Warm the storefront cache, then verify a staff adjustment refreshes it immediately.
            await request('/api/v1/products');
            assert.equal((await request('/api/v1/admin/inventory/' + product.id + '/adjustments', { method: 'POST', body: adjustment, headers: { Cookie: cookie, 'Idempotency-Key': crypto.randomUUID() } })).response.status, 403);
            for (let i = 0; i < 2; i++) assert.equal((await request('/api/v1/admin/inventory/' + product.id + '/adjustments', { method: 'POST', body: adjustment, headers: inventoryHeaders })).response.status, 200);
            assert.equal((await db.execute({ sql: 'SELECT on_hand FROM inventory WHERE product_id = ?', args: [product.id] })).rows[0].on_hand, 12);
            const publicProduct = (await request('/api/v1/products')).data.products.find(item => item.id === product.id);
            assert.equal(publicProduct.available_stock, 11, 'reserved units are excluded and old catalog cache is invalidated');
            assert.equal(publicProduct.stock_on_hand, undefined, 'internal stock details stay private');
            const adminProduct = (await request('/api/store/admin/products', { headers })).data.products.find(item => item.id === product.id);
            assert.equal(adminProduct.stock_on_hand, 12);
            assert.equal(adminProduct.stock_reserved, 1);
            assert.equal(adminProduct.available_stock, 11);
            assert.equal((await request('/api/v1/admin/agents/global', { method: 'PATCH', body: { paused: true }, headers: { ...headers, Origin: 'https://evil.example' } })).response.status, 403);
            assert.equal((await request('/api/v1/admin/worker/run', { method: 'POST', body: {}, headers: { Cookie: cookie } })).response.status, 403);
            assert.equal((await request('/api/v1/admin/worker/run', { method: 'POST', body: {}, headers })).response.status, 200);
            assert.equal((await request('/api/v1/admin/worker/run', { method: 'POST', body: {}, headers })).response.status, 429);
        } else {
            assert.equal((await request('/api/v1/admin/worker/run', { method: 'POST', body: {}, headers })).response.status, 403);
        }
        assert.equal((await request('/api/store/admin/logout', { method: 'POST', headers })).response.status, 200);
        assert.equal((await request('/api/store/admin/session', { headers })).data.authenticated, false);
    }
    for (const url of ['/store', '/store/checkout', '/store/account', '/store/admin', '/store/manager', '/store/agents', '/store/channels', '/store/campaigns', '/store/campaign-history', '/store/leads', '/store/tenders', '/store/purchasing', '/store/affiliates', '/store/users', '/store/marketing', '/store/operations', '/store/track', '/store/product/' + product.id]) {
        const response = await fetch(base + url); assert.equal(response.status, 200, url);
        assert.equal(response.headers.get('cache-control'), 'no-store');
        const html = await response.text();
        if (url === '/store/campaigns') assert.match(html, /مكتبة الحملات/);
        if (url === '/store/campaign-history') assert.match(html, /استرجاع الحملات القديمة/);
        for (const match of html.matchAll(/<script(?![^>]*type="application\/ld\+json")(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) if (match[1].trim()) { try { new vm.Script(match[1], { filename: url }); } catch (error) { assert.fail(url + ': ' + error.message); } }
        for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) JSON.parse(match[1]);
        if (url === '/store' || url.startsWith('/store/product/')) {
            assert.match(html, /<link rel="canonical" href="https?:\/\/[^"]+"/, url);
            assert.match(html, /property="og:title"/, url);
            assert.match(html, /application\/ld\+json/, url);
        }
        if (url === '/store/product/' + product.id) assert.match(html, /"@type":"Product"/);
        if (url === '/store/admin') assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow');
    }
    const robots = await fetch(base + '/robots.txt');
    assert.equal(robots.status, 200);
    const robotsText = await robots.text();
    assert.match(robotsText, /Disallow: \/store\/admin/);
    assert.match(robotsText, /Sitemap: https?:\/\/[^\s]+\/sitemap\.xml/);
    const sitemap = await fetch(base + '/sitemap.xml');
    assert.equal(sitemap.status, 200);
    assert.match(sitemap.headers.get('content-type'), /xml/);
    assert.ok((await sitemap.text()).includes('/store/product/' + encodeURIComponent(product.id)));
});
