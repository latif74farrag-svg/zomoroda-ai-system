const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { fixture } = require('./helpers');
const { runOnce } = require('../lib/queue');
const { coordinate, review } = require('../lib/agents');
const { enqueue } = require('../lib/commerce');
const { upsertLeads, normalizeContact } = require('../lib/leads');
const { transaction } = require('../lib/storage');
const outbox = require('../lib/outbox');
const social = require('../lib/channels/social');
const delivery = require('../lib/channels/delivery');
const unsubscribe = require('../lib/unsubscribe');

const NOW = Date.parse('2026-11-01T10:00:00Z'); // Sunday 12:00 in Cairo
const FRIDAY = Date.parse('2026-11-06T10:00:00Z');
const NIGHT = Date.parse('2026-11-01T20:00:00Z'); // 22:00 in Cairo
const MIN = 60000;
const drain = async db => { while (await runOnce(db, job => coordinate(db, job))) { /* run every eligible job */ } };
const unpause = db => db.execute("UPDATE agent_controls SET paused = 0 WHERE agent = 'global'");
const addLead = async (db, contact, sector = 'pharmacies', consent = 1) => {
    await transaction(db, tx => upsertLeads(tx, [{ contact, sector, name: 'عميل تجريبي' }]));
    await db.execute({ sql: 'UPDATE leads SET consent = ? WHERE contact_key = ?', args: [consent, normalizeContact(contact).key] });
    return normalizeContact(contact).key;
};
const queue = async (db, over = {}) => {
    const made = await outbox.enqueue(db, { channel: 'whatsapp', recipient: '201011111111', body: 'مرحباً', agent: 'outreach', sector: 'pharmacies', productType: 'ronza_wipes', now: NOW, ...over });
    return (await db.execute({ sql: 'SELECT * FROM outbox WHERE id = ?', args: [made.id] })).rows[0];
};
const MAIL_ENV = { SMTP_HOST: 'smtp.example.com', SMTP_USER: 'sales@example.com', SMTP_PASS: 'secret', BASE_URL: 'https://example.com' };
const META_ENV = { META_APP_SECRET: 'app-secret', META_VERIFY_TOKEN: 'verify', META_PAGE_ACCESS_TOKEN: 'page-token' };

test('outbox gate: agent switch, consent, Do-Not-Contact, hours, break and reply window', async t => {
    const db = await fixture(); t.after(() => db.close());
    const row = await queue(db);
    assert.deepEqual(await outbox.gate(db, row, NOW), { hold: 'paused' }); // the global stop ships ON
    await unpause(db);
    assert.deepEqual(await outbox.gate(db, row, NOW), { cancel: 'consent' }); // no lead on file
    await addLead(db, '01011111111');
    assert.deepEqual(await outbox.gate(db, row, NOW), { ok: true });
    assert.deepEqual(await outbox.gate(db, row, FRIDAY), { hold: 'working_hours' });
    assert.deepEqual(await outbox.gate(db, row, NIGHT), { hold: 'working_hours' });

    for (let index = 0; index < 5; index++) await db.execute({ sql: "INSERT INTO outbox(id, channel, recipient, body, kind, agent, status, available_at, sent_at, created_at) VALUES (?, 'whatsapp', ?, 'x', 'outreach', 'outreach', 'sent', 0, ?, 0)", args: [`s${index}`, `2010000000${index}`, NOW - (5 - index) * 10 * MIN + 9 * MIN] });
    assert.deepEqual(await outbox.gate(db, row, NOW), { hold: 'batch_break' }); // five messages in a row: 30-minute break
    assert.deepEqual(await outbox.gate(db, row, NOW + 31 * MIN), { ok: true });

    await db.execute("INSERT INTO do_not_contact(contact_key, reason, created_by, created_at) VALUES ('201011111111', 'manual', 's', 1)");
    assert.deepEqual(await outbox.gate(db, row, NOW + 31 * MIN), { cancel: 'do_not_contact' });

    const reply = await queue(db, { channel: 'telegram', recipient: '555', kind: 'reply', windowExpiresAt: NOW - 1 });
    assert.deepEqual(await outbox.gate(db, reply, NIGHT), { cancel: 'window_expired' });
    const fresh = await queue(db, { channel: 'telegram', recipient: '556', kind: 'reply', windowExpiresAt: NIGHT + MIN });
    assert.deepEqual(await outbox.gate(db, { ...fresh, channel: 'telegram' }, NIGHT), { ok: true }); // replies are not limited to working hours
});

test('outreach agent proposes only for eligible leads; nothing is sent until approval; approval after hours still queues', async t => {
    const db = await fixture(); t.after(() => db.close());
    await unpause(db);
    await db.execute("INSERT INTO message_templates(id, sector, body, created_at) VALUES ('t1', 'pharmacies', 'نص رسالة تجريبي للصيدليات', 1)");
    await addLead(db, '01011111111');
    await addLead(db, '01022222222');
    await addLead(db, '01033333333', 'pharmacies', 0); // no consent
    const optedOut = await addLead(db, '01044444444');
    await db.execute({ sql: 'UPDATE leads SET opted_out = 1 WHERE contact_key = ?', args: [optedOut] });

    await enqueue(db, 'outreach:test', 'outreach.plan', { channel: 'whatsapp', limit: 5 });
    await drain(db);
    const tasks = (await db.execute("SELECT * FROM agent_tasks WHERE agent = 'outreach'")).rows;
    assert.equal(tasks.length, 2);
    assert.equal((await db.execute('SELECT COUNT(*) AS n FROM outbox')).rows[0].n, 0); // proposals only
    assert.ok(tasks.every(task => JSON.parse(task.proposal).tool === 'send_whatsapp' && JSON.parse(task.proposal).text.includes('للصيدليات')));

    await review(db, tasks[0].id, 'approved', 'staff-1');
    await review(db, tasks[1].id, 'rejected', 'staff-1');
    await drain(db);
    const rows = (await db.execute('SELECT * FROM outbox')).rows;
    assert.equal(rows.length, 1);
    assert.equal(rows[0].status, 'queued');
    assert.equal(rows[0].kind, 'outreach');
    assert.equal((await db.execute({ sql: 'SELECT status FROM agent_tasks WHERE id = ?', args: [tasks[0].id] })).rows[0].status, 'executed');

    await enqueue(db, 'outreach:test2', 'outreach.plan', { channel: 'whatsapp', limit: 5 });
    await drain(db);
    assert.equal((await db.execute("SELECT COUNT(*) AS n FROM agent_tasks WHERE agent = 'outreach'")).rows[0].n, 2); // no repeat proposals in the same 30-day cycle
});

test('email delivery adds an unsubscribe link, records the contact, respects pacing; unsubscribing is permanent', async t => {
    const db = await fixture(); t.after(() => db.close());
    await unpause(db);
    await addLead(db, 'buyer@hotel.com', 'hotels');
    await addLead(db, 'second@hotel.com', 'hotels');
    const mails = [];
    const deps = { env: MAIL_ENV, transport: async mail => { mails.push(mail); } };
    const first = await queue(db, { channel: 'email', recipient: 'buyer@hotel.com', subject: 'عرض', body: 'نص العرض', sector: 'hotels', productType: 'private_label' });
    await queue(db, { channel: 'email', recipient: 'second@hotel.com', subject: 'عرض', body: 'نص العرض', sector: 'hotels', productType: 'private_label' });

    assert.equal((await delivery.deliverEmail(db, NOW, { ...deps, env: {} })).status, 'held'); // SMTP not configured: nothing is lost
    assert.equal((await delivery.deliverEmail(db, NOW, deps)).status, 'sent');
    const link = mails[0].text.match(/https:\/\/example\.com\/unsubscribe\?t=\S+/)[0];
    assert.ok(mails[0].headers['List-Unsubscribe'].includes(link));
    assert.equal((await db.execute({ sql: 'SELECT last_contact_at FROM leads WHERE contact_key = ?', args: ['buyer@hotel.com'] })).rows[0].last_contact_at, NOW);
    assert.deepEqual(await delivery.deliverEmail(db, NOW + 1000, deps), { status: 'held', reason: 'pacing' });

    const token = new URL(link).searchParams.get('t');
    assert.equal(unsubscribe.readToken(token), 'buyer@hotel.com');
    assert.equal(unsubscribe.readToken(token.replace(/.$/, c => (c === 'a' ? 'b' : 'a'))), null); // tampered
    assert.equal(unsubscribe.readToken('garbage'), null);

    await unsubscribe.optOut(db, 'second@hotel.com');
    assert.equal((await db.execute("SELECT status FROM outbox WHERE recipient = 'second@hotel.com'")).rows[0].status, 'cancelled');
    assert.equal((await db.execute("SELECT opted_out FROM leads WHERE contact_key = 'second@hotel.com'")).rows[0].opted_out, 1);
    assert.equal((await db.execute("SELECT COUNT(*) AS n FROM do_not_contact WHERE contact_key = 'second@hotel.com'")).rows[0].n, 1);
    assert.equal(first.status, 'queued');
});

test('a failing send retries, then stops after three attempts and shows up as failed', async t => {
    const db = await fixture(); t.after(() => db.close());
    await unpause(db);
    await addLead(db, 'buyer@hotel.com', 'hotels');
    await queue(db, { channel: 'email', recipient: 'buyer@hotel.com', sector: 'hotels', productType: 'private_label' });
    const deps = { env: MAIL_ENV, transport: async () => { throw new Error('smtp down'); } };
    let at = NOW;
    assert.equal((await delivery.deliverEmail(db, at, deps)).status, 'retry');
    at += 11 * MIN;
    assert.equal((await delivery.deliverEmail(db, at, deps)).status, 'retry');
    at += 16 * MIN;
    assert.equal((await delivery.deliverEmail(db, at, deps)).status, 'failed');
    const row = (await db.execute('SELECT status, attempts, last_error FROM outbox')).rows[0];
    assert.equal(row.status, 'failed');
    assert.equal(row.attempts, 3);
    assert.match(row.last_error, /smtp down/);
    assert.ok((await db.execute("SELECT COUNT(*) AS n FROM audit_log WHERE action = 'agent.email.failed'")).rows[0].n >= 3);
});

test('meta webhook: signature check, echo filtering, duplicate delivery ignored', async t => {
    const db = await fixture(); t.after(() => db.close());
    const body = { object: 'page', entry: [{ messaging: [
        { sender: { id: '111' }, timestamp: NOW, message: { mid: 'm1', text: ' عايز كتالوج ' } },
        { sender: { id: '999' }, timestamp: NOW, message: { mid: 'm2', text: 'our own message', is_echo: true } },
        { sender: { id: '222' }, timestamp: NOW, message: { mid: 'm3', attachments: [{ type: 'image' }] } }
    ] }] };
    const raw = Buffer.from(JSON.stringify(body));
    const signature = 'sha256=' + crypto.createHmac('sha256', 'app-secret').update(raw).digest('hex');
    assert.ok(social.verifyMetaSignature(raw, signature, 'app-secret'));
    assert.ok(!social.verifyMetaSignature(raw, signature, 'other-secret'));
    assert.ok(!social.verifyMetaSignature(Buffer.from(JSON.stringify({ ...body, object: 'instagram' })), signature, 'app-secret'));
    assert.ok(!social.verifyMetaSignature(raw, undefined, 'app-secret'));
    assert.ok(!social.verifyMetaSignature(raw, signature, ''));
    const parsed = social.parseMeta(body);
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].text, 'عايز كتالوج');
    assert.equal(social.parseMeta({ object: 'instagram', entry: [{ messaging: [{ sender: { id: '5' }, message: { mid: 'i1', text: 'hi' } }] }] })[0].channel, 'instagram');
    assert.deepEqual(social.parseTelegram({ update_id: 1, message: { chat: { id: 5, type: 'group' }, text: 'x' } }), []); // private chats only
    assert.equal((await social.ingest(db, parsed)).stored, 1);
    assert.equal((await social.ingest(db, parsed)).stored, 0); // Meta retried the same webhook
    assert.equal((await db.execute("SELECT COUNT(*) AS n FROM jobs WHERE type = 'inbound.message'")).rows[0].n, 1);
});

test('social: inbound message becomes a reply draft; approved reply goes out only inside the 24h window', async t => {
    const db = await fixture(); t.after(() => db.close());
    await unpause(db);
    await social.ingest(db, [{ channel: 'messenger', senderId: '111', text: 'عايز كتالوج', externalId: 'mid-1', receivedAt: Date.now() }]);
    await drain(db);
    const task = (await db.execute("SELECT * FROM agent_tasks WHERE agent = 'social'")).rows[0];
    assert.equal(task.status, 'proposed');
    const proposal = JSON.parse(task.proposal);
    assert.equal(proposal.channel, 'messenger');
    assert.ok(proposal.windowExpiresAt > Date.now());
    assert.equal((await db.execute('SELECT COUNT(*) AS n FROM outbox')).rows[0].n, 0);

    await review(db, task.id, 'approved', 'staff-1');
    await drain(db);
    const row = (await db.execute('SELECT * FROM outbox')).rows[0];
    assert.equal(row.kind, 'reply');
    assert.equal(row.recipient, '111');

    const calls = [];
    const http = async (url, headers, payload) => { calls.push({ url, headers, payload }); };
    assert.equal((await delivery.deliverSocial(db, Date.now(), { env: {}, http })).status, 'held'); // not configured: kept, not lost
    assert.equal((await delivery.deliverSocial(db, Date.now(), { env: META_ENV, http })).status, 'sent');
    assert.equal(calls[0].payload.recipient.id, '111');
    assert.equal(calls[0].payload.messaging_type, 'RESPONSE');
    assert.equal(calls[0].headers.Authorization, 'Bearer page-token');

    await queue(db, { channel: 'instagram', recipient: '777', kind: 'reply', agent: 'social', windowExpiresAt: Date.now() - 1000 });
    assert.deepEqual((await delivery.deliverSocial(db, Date.now(), { env: META_ENV, http })).reason, 'window_expired');
    assert.equal(calls.length, 1); // the stale reply was never sent
});

test('overview reports whether each channel is actually set up', async t => {
    const db = await fixture(); t.after(() => db.close());
    const data = await require('../lib/agent-roster').overview(db);
    const find = key => data.agents.find(agent => agent.key === key);
    for (const key of ['outreach', 'whatsapp', 'email', 'social']) assert.ok(find(key), key);
    assert.equal(find('whatsapp').setup.ok, false);
    assert.deepEqual(Object.keys(find('email').outbox), ['queued', 'sent_24h', 'failed']);
    await db.execute({ sql: "INSERT INTO system_state(key, value) VALUES ('whatsapp_heartbeat', ?)", args: [Date.now()] });
    assert.equal((await require('../lib/agent-roster').overview(db)).agents.find(agent => agent.key === 'whatsapp').setup.ok, true);
});
