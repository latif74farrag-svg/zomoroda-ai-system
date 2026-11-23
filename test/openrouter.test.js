const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fixture } = require('./helpers');
const { supportDraft } = require('../lib/model');
const { getChannelStatus } = require('../lib/channels');

function configure(t, overrides = {}) {
    const values = { AI_ENABLED: 'true', AI_PROVIDER: 'openrouter', AI_PROVIDER_ORDER: '', OPENROUTER_API_KEY: 'test-secret', OPENROUTER_MODEL: 'openrouter/free', OPENROUTER_DAILY_CALL_LIMIT: '1', AI_DAILY_CALL_LIMIT: '5', AI_ALLOW_CUSTOMER_TEXT: 'false', ...overrides };
    const old = Object.fromEntries(Object.keys(values).map(key => [key, process.env[key]]));
    Object.assign(process.env, values);
    t.after(() => { for (const key of Object.keys(values)) if (old[key] === undefined) delete process.env[key]; else process.env[key] = old[key]; });
}
const success = () => ({ ok: true, json: async () => ({ model: 'example/model:free', choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ draft: 'Staff will review your request.', category: 'other', escalate: true }) } }] }) });

test('optional OpenRouter withholds customer text, requests structured output and caps usage', async t => {
    configure(t);
    const db = await fixture(); t.after(() => db.close());
    assert.equal(getChannelStatus(process.env).supportAi.enabled, true);
    let calls = 0;
    const fetcher = async (url, options) => {
        calls++;
        assert.equal(url, 'https://openrouter.ai/api/v1/chat/completions');
        assert.equal(options.headers.Authorization, 'Bearer test-secret');
        const body = JSON.parse(options.body);
        assert.equal(body.model, 'openrouter/free');
        assert.equal(body.provider.require_parameters, true);
        assert.equal(body.response_format.type, 'json_schema');
        assert.ok(!options.body.includes('private@example.com'));
        assert.equal(body.tools, undefined);
        return success();
    };
    const ticket = { id: 'test', message: 'private@example.com' };
    assert.match((await supportDraft(db, ticket, fetcher)).version, /^openrouter:/);
    assert.equal((await supportDraft(db, ticket, fetcher)).version, 'rules-v1');
    assert.equal(calls, 1);
    const logs = JSON.stringify((await db.execute('SELECT * FROM audit_log')).rows);
    assert.ok(logs.includes('example/model:free'));
    assert.ok(!logs.includes('test-secret'));
    assert.ok(!logs.includes('private@example.com'));
});

test('OpenRouter rejects paid IDs and makes no calls when disabled or missing its key', async t => {
    configure(t);
    const db = await fixture(); t.after(() => db.close());
    const fetcher = async () => { assert.fail('must not call any provider'); };
    for (const model of ['openai/gpt-4o', 'openrouter/auto', 'vendor/model:free,openai/gpt-4o']) {
        process.env.OPENROUTER_MODEL = model;
        assert.equal(getChannelStatus(process.env).supportAi.enabled, false);
        assert.equal((await supportDraft(db, { id: 'test' }, fetcher)).version, 'rules-v1');
    }
    process.env.OPENROUTER_MODEL = 'example/model:free';
    assert.equal(getChannelStatus(process.env).supportAi.enabled, true);
    process.env.AI_ENABLED = 'false';
    assert.equal((await supportDraft(db, { id: 'test' }, fetcher)).version, 'rules-v1');
    process.env.AI_ENABLED = 'true';
    delete process.env.OPENROUTER_API_KEY;
    assert.equal((await supportDraft(db, { id: 'test' }, fetcher)).version, 'rules-v1');
});

test('explicit OpenRouter chain fails over on quota errors but stops on refusals', async t => {
    configure(t, { AI_PROVIDER_ORDER: 'openrouter,groq', GROQ_API_KEY: 'groq-test' });
    const db = await fixture(); t.after(() => db.close());
    const urls = [];
    assert.match((await supportDraft(db, { id: 'test' }, async url => {
        urls.push(url);
        return url.includes('openrouter.ai') ? { ok: false, status: 429 } : success();
    })).version, /^groq:/);
    assert.equal(urls.length, 2);
    await db.execute("DELETE FROM system_state WHERE key = 'ai_cooldown:openrouter'");
    process.env.OPENROUTER_DAILY_CALL_LIMIT = '5';
    let calls = 0;
    assert.equal((await supportDraft(db, { id: 'test' }, async () => {
        calls++;
        return { ok: true, json: async () => ({ choices: [{ finish_reason: 'stop', message: { refusal: 'refused' } }] }) };
    })).version, 'rules-v1');
    assert.equal(calls, 1);
});
