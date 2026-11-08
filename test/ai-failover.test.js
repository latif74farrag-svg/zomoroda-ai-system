const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fixture } = require('./helpers');
const { supportDraft } = require('../lib/model');

test('OpenAI is the explicitly configured third provider and respects its own budget', async t => {
    const db = await fixture(); t.after(() => db.close());
    const values = { AI_ENABLED: 'true', AI_PROVIDER_ORDER: 'gemini,groq,openai', GEMINI_API_KEY: 'gemini-test', GROQ_API_KEY: 'groq-test', OPENAI_API_KEY: 'openai-test', OPENAI_MODEL: 'test-model', OPENAI_DAILY_CALL_LIMIT: '1', AI_DAILY_CALL_LIMIT: '10', AI_ALLOW_CUSTOMER_TEXT: 'false' };
    const old = Object.fromEntries(Object.keys(values).map(key => [key, process.env[key]]));
    Object.assign(process.env, values);
    t.after(() => { for (const key of Object.keys(values)) if (old[key] === undefined) delete process.env[key]; else process.env[key] = old[key]; });
    const urls = [];
    const fetcher = async (url, options) => {
        urls.push(url);
        if (!url.includes('api.openai.com')) return { ok: false, status: 429 };
        assert.equal(options.headers.Authorization, 'Bearer openai-test');
        const body = JSON.parse(options.body);
        assert.equal(body.model, 'test-model');
        assert.equal(body.store, false);
        assert.ok(!options.body.includes('private@example.com'));
        return { ok: true, json: async () => ({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ draft: 'سيراجع الفريق طلبك.', category: 'other', escalate: true }) }] }] }) };
    };
    const ticket = { id: 'test', message: 'private@example.com' };
    assert.equal((await supportDraft(db, ticket, fetcher)).version, 'openai:test-model:support-v1');
    assert.equal(urls.length, 3);
    assert.equal((await supportDraft(db, ticket, fetcher)).version, 'rules-v1');
    assert.equal(urls.length, 3, 'provider cap blocks a second OpenAI HTTP request');
});

test('quota failover uses Groq, observes cooldown, and stops at total call budget', async t => {
    const db = await fixture(); t.after(() => db.close());
    const values = { AI_ENABLED: 'true', AI_PROVIDER_ORDER: 'gemini,groq', GEMINI_API_KEY: 'gemini-test', GROQ_API_KEY: 'groq-test', AI_DAILY_CALL_LIMIT: '3', GEMINI_DAILY_CALL_LIMIT: '10', GROQ_DAILY_CALL_LIMIT: '10', AI_ALLOW_CUSTOMER_TEXT: 'false' };
    const old = Object.fromEntries(Object.keys(values).map(key => [key, process.env[key]]));
    Object.assign(process.env, values);
    t.after(() => { for (const key of Object.keys(values)) if (old[key] === undefined) delete process.env[key]; else process.env[key] = old[key]; });
    const urls = [];
    const fetcher = async (url, options) => {
        urls.push(url);
        assert.ok(!options.body.includes('secret@example.com'));
        if (url.includes('googleapis')) return { ok: false, status: 429 };
        assert.equal(options.headers.Authorization, 'Bearer groq-test');
        assert.equal(JSON.parse(options.body).response_format.json_schema.strict, true);
        return { ok: true, json: async () => ({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ draft: 'سيقوم الفريق بمراجعة الطلب.', category: 'other', escalate: true }) } }] }) };
    };
    const ticket = { id: 'test', message: 'secret@example.com' };
    assert.match((await supportDraft(db, ticket, fetcher)).version, /^groq:/);
    assert.match((await supportDraft(db, ticket, fetcher)).version, /^groq:/);
    assert.equal(urls.filter(url => url.includes('googleapis')).length, 1);
    assert.equal((await supportDraft(db, ticket, fetcher)).version, 'rules-v1');
    assert.equal(urls.length, 3);
    assert.equal((await db.execute("SELECT COUNT(*) AS n FROM audit_log WHERE action = 'agent.provider_unavailable'")).rows[0].n, 1);
});

test('content rejection does not trigger another provider', async t => {
    const db = await fixture(); t.after(() => db.close());
    const values = { AI_ENABLED: 'true', AI_PROVIDER_ORDER: 'gemini,groq', GEMINI_API_KEY: 'test', GROQ_API_KEY: 'test', AI_DAILY_CALL_LIMIT: '10' };
    const old = Object.fromEntries(Object.keys(values).map(key => [key, process.env[key]]));
    Object.assign(process.env, values);
    t.after(() => { for (const key of Object.keys(values)) if (old[key] === undefined) delete process.env[key]; else process.env[key] = old[key]; });
    let calls = 0;
    const result = await supportDraft(db, { id: 'test', message: 'test' }, async () => {
        calls++;
        return { ok: true, json: async () => ({ candidates: [{ finishReason: 'SAFETY' }] }) };
    });
    assert.equal(result.version, 'rules-v1');
    assert.equal(calls, 1);
});
