const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fixture, order } = require('./helpers');
const { createOrder, enqueue } = require('../lib/commerce');
const { runOnce, claim } = require('../lib/queue');
const { coordinate, review } = require('../lib/agents');
const { rateLimit } = require('../lib/security');
const staff = require('../lib/staff');
const recovery = require('../lib/recovery');
const { outreachDecision } = require('../lib/outreach-policy');

test('agents create proposals and approved tools execute only after review', async t => {
    const db = await fixture(); t.after(() => db.close());
    await db.execute("UPDATE agent_controls SET paused = 0 WHERE agent = 'global'");
    const result = await createOrder(db, order(), 'agent-checkout-00001');
    await runOnce(db, job => coordinate(db, job));
    while (await runOnce(db, job => coordinate(db, job), Date.now() + 61000)) { /* drain eligible events */ }
    const task = (await db.execute('SELECT * FROM agent_tasks')).rows[0];
    assert.equal(task.status, 'proposed');
    assert.equal((await db.execute('SELECT status FROM store_orders')).rows[0].status, 'pending');
    await review(db, task.id, 'approved', 'admin-id');
    await assert.rejects(review(db, task.id, 'approved', 'admin-id'), { status: 409 });
    while (await runOnce(db, job => coordinate(db, job), Date.now() + 62000)) { /* drain eligible events */ }
    assert.equal((await db.execute('SELECT status FROM store_orders')).rows[0].status, 'confirmed');
    assert.equal((await db.execute('SELECT status FROM agent_tasks')).rows[0].status, 'executed');
    assert.ok(result.orderNumber);
});
test('failed jobs back off and eventually enter dead letters; abandoned leases are reclaimed', async t => {
    const db = await fixture(); t.after(() => db.close());
    await enqueue(db, 'poison', 'unknown', {}, 1000);
    const abandoned = await claim(db, 1000); assert.equal(abandoned.attempts, 1);
    for (let i = 1; i < 5; i++) await runOnce(db, async () => { throw new Error('private customer information must not be stored'); }, 1000 + i * 100000);
    const job = (await db.execute('SELECT * FROM jobs')).rows[0];
    assert.equal(job.status, 'dead'); assert.equal(job.attempts, 5);
    assert.equal(job.last_error, 'handler_failed:internal');
});
test('agent execution and completion roll back together if recording completion fails', async t => {
    const db = await fixture(); t.after(() => db.close());
    await db.execute("UPDATE agent_controls SET paused = 0 WHERE agent = 'global'");
    await createOrder(db, order(), 'atomic-agent-order-01');
    await runOnce(db, job => coordinate(db, job));
    const task = (await db.execute('SELECT * FROM agent_tasks')).rows[0];
    await runOnce(db, job => coordinate(db, job));
    await review(db, task.id, 'approved', 'staff');
    await db.execute("CREATE TRIGGER fail_completion BEFORE UPDATE ON agent_tasks WHEN NEW.status = 'executed' BEGIN SELECT RAISE(ABORT, 'simulated failure'); END");
    await runOnce(db, job => coordinate(db, job));
    assert.equal((await db.execute('SELECT status FROM store_orders')).rows[0].status, 'pending');
    assert.equal((await db.execute('SELECT status FROM agent_tasks')).rows[0].status, 'approved');
    await db.execute('DROP TRIGGER fail_completion');
    await runOnce(db, job => coordinate(db, job), Date.now() + 60000);
    assert.equal((await db.execute('SELECT status FROM store_orders')).rows[0].status, 'confirmed');
});
test('shared rate limiter counts concurrent requests and resets at the boundary', async t => {
    const db = await fixture(); t.after(() => db.close());
    const results = await Promise.all(Array.from({ length: 20 }, () => rateLimit(db, 'login', 5, 1000, 1000)));
    assert.equal(results.filter(Boolean).length, 5);
    assert.equal(await rateLimit(db, 'login', 5, 1000, 2000), true);
});
test('staff MFA matches RFC vector, protects secrets and rejects token replay', async t => {
    const db = await fixture(); t.after(() => db.close());
    process.env.STAFF_MFA_KEY = 'test-only-key-'.repeat(4);
    const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
    assert.equal(staff.totp(secret, 1), '287082');
    const id = await staff.createStaff(db, { email: 'admin@example.test', name: 'Admin', role: 'admin', password: 'a-long-test-password', totpSecret: secret });
    assert.notEqual((await db.execute('SELECT totp_secret FROM staff')).rows[0].totp_secret, secret);
    await assert.rejects(staff.login(db, { email: 'admin@example.test', password: 'wrong-password', code: '287082' }, 59000), { status: 401 });
    const login = await staff.login(db, { email: 'admin@example.test', password: 'a-long-test-password', code: '287082' }, 59000);
    assert.equal((await staff.session(db, login.token, 59000)).id, id);
    await assert.rejects(staff.login(db, { email: 'admin@example.test', password: 'a-long-test-password', code: '287082' }, 59000), { status: 401 });
    assert.equal(await staff.session(db, login.token, 59000 + 8 * 3600000), null);
    await db.execute('UPDATE staff SET disabled = 1');
    assert.equal(await staff.session(db, login.token, 59000), null);
});
test('recovery requires verification, expires, is single use and invalidates sessions', async t => {
    const db = await fixture(); t.after(() => db.close());
    await db.execute("INSERT INTO store_customers(id, phone, password_salt, password_hash) VALUES ('customer', '01012345678', 'salt', 'hash')");
    await assert.rejects(recovery.issue(db, { phone: '01012345678', verified: false, verification: 'test reference' }, 'staff'), { status: 400 });
    const token = await recovery.issue(db, { phone: '01012345678', verified: true, verification: 'test reference' }, 'staff', 1000);
    await assert.rejects(recovery.reset(db, { token, password: 'new-password-long' }, 901001), { status: 400 });
    await recovery.reset(db, { token, password: 'new-password-long' }, 2000);
    await assert.rejects(recovery.reset(db, { token, password: 'new-password-long' }, 2000), { status: 400 });
    assert.equal((await db.execute('SELECT session_version FROM store_customers')).rows[0].session_version, 1);
});
test('outreach policy isolates catalogs, consent, Cairo hours, 30-day cooldown and batch breaks', () => {
    const now = Date.parse('2026-11-01T10:00:00Z');
    const base = { sector: 'pharmacies', productType: 'ronza_wipes', channel: 'whatsapp', consent: true, now };
    assert.equal(outreachDecision(base).allowed, true);
    for (const changes of [{ consent: false }, { optedOut: true }, { productType: 'fragrance' }, { lastContactAt: now - 86400000 }, { batchCount: 5 }, { lastWhatsappAt: now - 1000 }, { now: Date.parse('2026-11-06T10:00:00Z') }, { now: Date.parse('2026-11-01T19:00:00Z') }, { sector: 'retail', retailPrice: false }]) assert.equal(outreachDecision({ ...base, ...changes }).allowed, false);
    assert.equal(outreachDecision({ ...base, lastContactAt: now - 30 * 86400000, batchCount: 5, breakStartedAt: now - 1800000 }).allowed, true);
});
