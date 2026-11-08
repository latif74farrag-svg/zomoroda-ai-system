const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fixture } = require('./helpers');
const integrations = require('../lib/integration-settings');

test('integration secrets are encrypted, masked, validated and used by delivery', async t => {
    const db = await fixture(); t.after(() => db.close());
    const old = process.env.STAFF_MFA_KEY;
    process.env.STAFF_MFA_KEY = 'test-integration-master-key-'.repeat(3);
    t.after(() => { if (old === undefined) delete process.env.STAFF_MFA_KEY; else process.env.STAFF_MFA_KEY = old; });
    const secrets = { TELEGRAM_BOT_TOKEN: '12345:secret-token', TELEGRAM_WEBHOOK_SECRET: 'webhook-secret-123' };
    const description = await integrations.save(db, secrets, [], 'admin');
    assert.ok(!JSON.stringify(description).includes(secrets.TELEGRAM_BOT_TOKEN));
    assert.ok(description.fields.find(field => field.key === 'TELEGRAM_BOT_TOKEN').configured);
    const stored = (await db.execute('SELECT * FROM integration_secrets')).rows;
    assert.ok(!JSON.stringify(stored).includes('secret-token'));
    assert.ok(!JSON.stringify((await db.execute('SELECT details FROM audit_log')).rows).includes('secret-token'));
    assert.equal((await integrations.environment(db, {})).TELEGRAM_BOT_TOKEN, secrets.TELEGRAM_BOT_TOKEN);
    await integrations.save(db, { TELEGRAM_BOT_TOKEN: '' }, [], 'admin');
    assert.equal((await integrations.environment(db, {})).TELEGRAM_BOT_TOKEN, secrets.TELEGRAM_BOT_TOKEN);
    await assert.rejects(integrations.save(db, { RANDOM_SECRET: 'x' }, [], 'admin'), { status: 400 });
    await assert.rejects(integrations.save(db, { TELEGRAM_WEBHOOK_SECRET: 'invalid value' }, [], 'admin'), { status: 400 });
    await db.execute("UPDATE agent_controls SET paused = 0");
    await require('../lib/outbox').enqueue(db, { channel: 'telegram', recipient: '42', body: 'رد معتمد', kind: 'reply', agent: 'social', taskId: 'task', now: Date.now() });
    const calls = [];
    const delivered = await require('../lib/channels/delivery').deliverSocial(db, Date.now(), { http: async (url, headers, body) => { calls.push({ url, body }); } });
    assert.equal(delivered.status, 'sent');
    assert.ok(calls[0].url.includes(secrets.TELEGRAM_BOT_TOKEN));
    process.env.STAFF_MFA_KEY = 'different-key-'.repeat(4);
    await assert.rejects(integrations.environment(db, {}), { status: 503 });
    process.env.STAFF_MFA_KEY = 'test-integration-master-key-'.repeat(3);
    await integrations.save(db, {}, ['TELEGRAM_BOT_TOKEN'], 'admin');
    assert.equal((await integrations.environment(db, { TELEGRAM_BOT_TOKEN: 'env-token' })).TELEGRAM_BOT_TOKEN, 'env-token');
});

test('Telegram registration uses the configured canonical HTTPS origin and masks errors', async t => {
    const db = await fixture(); t.after(() => db.close());
    const old = Object.fromEntries(['STAFF_MFA_KEY', 'BASE_URL'].map(key => [key, process.env[key]]));
    Object.assign(process.env, { STAFF_MFA_KEY: 'test-key-'.repeat(5), BASE_URL: 'https://shop.example.test' });
    t.after(() => { for (const [key, value] of Object.entries(old)) if (value === undefined) delete process.env[key]; else process.env[key] = value; });
    await integrations.save(db, { TELEGRAM_BOT_TOKEN: '123:secret', TELEGRAM_WEBHOOK_SECRET: 'random_secret' }, [], 'admin');
    const result = await integrations.registerTelegram(db, 'admin', async (url, options) => {
        assert.equal(url, 'https://api.telegram.org/bot123:secret/setWebhook');
        const body = JSON.parse(options.body);
        assert.equal(body.url, 'https://shop.example.test/webhooks/telegram');
        assert.equal(body.secret_token, 'random_secret');
        assert.equal(body.drop_pending_updates, false);
        return { ok: true, json: async () => ({ ok: true, result: true }) };
    });
    assert.equal(result.success, true);
    await assert.rejects(integrations.registerTelegram(db, 'admin', async () => { throw new Error('123:secret'); }), error => error.status === 503 && !error.message.includes('123:secret'));
});
