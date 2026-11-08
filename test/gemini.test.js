const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fixture } = require('./helpers');
const { supportDraft } = require('../lib/model');

test('Gemini drafts with withheld customer text and falls back on quota, invalid output or outage', async t => {
    const db = await fixture(); t.after(() => db.close());
    const names = ['AI_ENABLED', 'AI_PROVIDER', 'GEMINI_API_KEY', 'GEMINI_MODEL', 'AI_DAILY_CALL_LIMIT', 'AI_ALLOW_CUSTOMER_TEXT'];
    const old = Object.fromEntries(names.map(name => [name, process.env[name]]));
    t.after(() => { for (const name of names) if (old[name] === undefined) delete process.env[name]; else process.env[name] = old[name]; });
    Object.assign(process.env, { AI_ENABLED: 'true', AI_PROVIDER: 'gemini', GEMINI_API_KEY: 'test', GEMINI_MODEL: 'gemini-2.5-flash-lite', AI_DAILY_CALL_LIMIT: '4', AI_ALLOW_CUSTOMER_TEXT: 'false' });
    const ticket = { id: 'test-ticket', message: 'private@example.com 01012345678' };
    const fetcher = async (url, options) => {
        assert.match(url, /models\/gemini-2.5-flash-lite:generateContent$/);
        assert.equal(options.headers['x-goog-api-key'], 'test');
        assert.ok(!options.body.includes('private@example.com'));
        return { ok: true, json: async () => ({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({ draft: 'سيراجع الفريق طلبك.', category: 'other', escalate: true }) }] } }] }) };
    };
    assert.equal((await supportDraft(db, ticket, fetcher)).version, 'gemini:gemini-2.5-flash-lite:support-v1');
    assert.equal((await supportDraft(db, ticket, async () => ({ ok: false }))).version, 'rules-v1');
    assert.equal((await supportDraft(db, ticket, async () => { throw new Error('timeout'); })).version, 'rules-v1');
    assert.equal((await supportDraft(db, ticket, async () => ({ ok: true, json: async () => ({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{"tool":"refund"}' }] } }] }) }))).version, 'rules-v1');
    assert.equal((await supportDraft(db, ticket, () => { throw new Error('budget must stop HTTP'); })).version, 'rules-v1');
});
