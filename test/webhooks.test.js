const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

test('public channel endpoints: webhooks verify signatures, unsubscribe link works end to end', async t => {
    process.env.NODE_ENV = 'test'; delete process.env.VERCEL;
    process.env.LOG_HTTP = 'false';
    delete process.env.TURSO_DATABASE_URL; delete process.env.TURSO_AUTH_TOKEN;
    process.env.COMMERCE_DB_PATH = ':memory:';
    process.env.STORE_ADMIN_SESSION_SECRET = crypto.randomBytes(32).toString('hex');
    process.env.STAFF_MFA_KEY = crypto.randomBytes(32).toString('hex');
    Object.assign(process.env, { META_APP_SECRET: 'app-secret', META_VERIFY_TOKEN: 'verify-me', META_PAGE_ACCESS_TOKEN: 'tok', TELEGRAM_BOT_TOKEN: '1:abc', TELEGRAM_WEBHOOK_SECRET: 'tg-secret' });
    const app = require('../server');
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    const base = 'http://127.0.0.1:' + server.address().port;
    process.env.BASE_URL = base;
    t.after(async () => { await new Promise(resolve => server.close(resolve)); await (await require('../lib/storage').getDatabase()).close(); });
    await require('../store_data').initializeStoreDatabase();
    const db = await require('../lib/storage').getDatabase();
    const post = (url, body, headers = {}) => fetch(base + url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });

    // Meta handshake
    assert.equal((await fetch(`${base}/webhooks/meta?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=12345`)).status, 200);
    assert.equal(await (await fetch(`${base}/webhooks/meta?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=12345`)).text(), '12345');
    assert.equal((await fetch(`${base}/webhooks/meta?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=1`)).status, 403);

    // Meta events: unsigned and wrongly signed are refused, signed is stored once
    const payload = JSON.stringify({ object: 'page', entry: [{ messaging: [{ sender: { id: '42' }, timestamp: Date.now(), message: { mid: 'mid-http-1', text: 'سلام' } }] }] });
    const sign = secret => 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex');
    assert.equal((await post('/webhooks/meta', payload)).status, 403);
    assert.equal((await post('/webhooks/meta', payload, { 'X-Hub-Signature-256': sign('wrong') })).status, 403);
    assert.equal((await post('/webhooks/meta', payload, { 'X-Hub-Signature-256': sign('app-secret') })).status, 200);
    assert.equal((await post('/webhooks/meta', payload, { 'X-Hub-Signature-256': sign('app-secret') })).status, 200); // Meta retry
    assert.equal((await db.execute('SELECT COUNT(*) AS n FROM inbound_messages')).rows[0].n, 1);

    // Telegram
    const update = { update_id: 77, message: { message_id: 1, date: Math.floor(Date.now() / 1000), chat: { id: 9, type: 'private' }, text: 'مرحبا' } };
    assert.equal((await post('/webhooks/telegram', update)).status, 403);
    assert.equal((await post('/webhooks/telegram', update, { 'X-Telegram-Bot-Api-Secret-Token': 'tg-secret' })).status, 200);
    assert.equal((await db.execute("SELECT COUNT(*) AS n FROM inbound_messages WHERE channel = 'telegram'")).rows[0].n, 1);

    // Unsubscribe: GET shows a confirmation (no side effect), POST applies it; bad tokens are refused
    const { upsertLeads } = require('../lib/leads');
    await require('../lib/storage').transaction(db, tx => upsertLeads(tx, [{ contact: 'owner@hotel.com', sector: 'hotels' }]));
    const link = require('../lib/unsubscribe').linkFor('owner@hotel.com', base);
    const page = await fetch(link);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /تأكيد إيقاف الرسائل/);
    assert.equal((await db.execute("SELECT opted_out FROM leads WHERE contact_key = 'owner@hotel.com'")).rows[0].opted_out, 0); // link previews must not unsubscribe anyone
    assert.equal((await fetch(base + '/unsubscribe?t=bad.token')).status, 400);
    const token = new URL(link).searchParams.get('t');
    const done = await fetch(base + '/unsubscribe', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: base }, body: 't=' + encodeURIComponent(token) });
    assert.equal(done.status, 200);
    assert.equal((await db.execute("SELECT opted_out FROM leads WHERE contact_key = 'owner@hotel.com'")).rows[0].opted_out, 1);
    // Mail clients' one-click POST carries the token in the query string
    assert.equal((await fetch(link, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'List-Unsubscribe=One-Click' })).status, 200);
});
