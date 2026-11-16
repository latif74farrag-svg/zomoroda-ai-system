const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fixture } = require('./helpers');
const staff = require('../lib/staff');
const roster = require('../lib/agent-roster');

test('password-only login: email + password works, wrong or short passwords fail, no code needed', async t => {
    process.env.STAFF_MFA_KEY = 'test-staff-mfa-key-'.repeat(3);
    const db = await fixture(); t.after(() => db.close());
    const created = await staff.savePasswordStaff(db, { email: 'Owner@Example.com', name: 'المدير', password: 'simple-pass-1' });
    assert.equal(created.created, true);
    const session = await staff.login(db, { email: 'owner@example.com', password: 'simple-pass-1' });
    assert.match(session.token, /^[a-f0-9]{64}$/);
    await assert.rejects(staff.login(db, { email: 'owner@example.com', password: 'wrong-password' }), { status: 401 });
    await assert.rejects(staff.login(db, { email: 'nobody@example.com', password: 'simple-pass-1' }), { status: 401 });
    await assert.rejects(staff.savePasswordStaff(db, { email: 'x@example.com', name: 'س', password: 'short' }), { status: 400 });
});

test('setting a password again resets it, converts old accounts and ends their sessions', async t => {
    process.env.STAFF_MFA_KEY = 'test-staff-mfa-key-'.repeat(3);
    const db = await fixture(); t.after(() => db.close());
    const id = await staff.createEmailStaff(db, { email: 'old@example.com', name: 'قديم', role: 'admin' });
    await assert.rejects(staff.login(db, { email: 'old@example.com', password: 'brand-new-pass' }), { status: 401 }, 'email-code accounts have no usable password yet');
    const first = await staff.savePasswordStaff(db, { email: 'old@example.com', password: 'brand-new-pass' });
    assert.deepEqual([first.id, first.created], [id, false]);
    const session = await staff.login(db, { email: 'old@example.com', password: 'brand-new-pass' });
    await staff.resetPassword(db, id, 'another-new-pass', 'admin-1');
    assert.equal(await staff.session(db, session.token), null, 'old sessions are revoked');
    await assert.rejects(staff.login(db, { email: 'old@example.com', password: 'brand-new-pass' }), { status: 401 });
    await staff.login(db, { email: 'old@example.com', password: 'another-new-pass' });
});

test('admin can add a password user and sees the login method', async t => {
    process.env.STAFF_MFA_KEY = 'test-staff-mfa-key-'.repeat(3);
    const db = await fixture(); t.after(() => db.close());
    const admin = (await staff.savePasswordStaff(db, { email: 'a@example.com', name: 'المدير', password: 'admin-pass-123' })).id;
    await staff.addStaff(db, { email: 'b@example.com', name: 'موظفة', role: 'support', password: 'helper-pass-1' }, admin);
    await assert.rejects(staff.addStaff(db, { email: 'B@example.com', name: 'مكرر', role: 'support', password: 'helper-pass-2' }, admin), { status: 409 });
    assert.deepEqual((await staff.listStaff(db)).map(user => user.loginMode), ['password', 'password']);
    await staff.login(db, { email: 'b@example.com', password: 'helper-pass-1' });
});

test('agent overview exposes a 24-hour pulse and recent results for every agent', async t => {
    const db = await fixture(); t.after(() => db.close());
    await db.execute("UPDATE agent_controls SET paused = 0 WHERE agent = 'global'");
    await roster.runNow(db, 'manager', 'staff-1', 'instant');
    const data = await roster.overview(db);
    for (const agent of data.agents) { assert.equal(agent.hourly.length, 24); assert.ok(Array.isArray(agent.recent)); }
    const manager = data.agents.find(agent => agent.key === 'manager');
    assert.equal(manager.recent.length, 1);
    assert.equal(manager.recent[0].status, 'proposed');
    assert.ok(manager.hourly[23] > 0, 'activity lands in the current hour');
});

test('inline worker runs a pass, survives failures, and can be disabled', async t => {
    const { start } = require('../lib/inline-worker');
    const calls = [];
    const quiet = { log() {}, error() {} };
    const worker = start({ getDatabase: async () => 'db', initialize: async () => {}, run: async db => { calls.push(db); if (calls.length === 1) throw new Error('boom'); }, interval: 10, log: quiet });
    await new Promise(resolve => setTimeout(resolve, 80));
    worker.stop();
    assert.ok(calls.length >= 2, 'keeps running after a failed pass');
    process.env.INLINE_WORKER = '0';
    t.after(() => { delete process.env.INLINE_WORKER; });
    const before = calls.length;
    start({ getDatabase: async () => 'db', initialize: async () => {}, run: async () => calls.push('x'), interval: 10, log: quiet });
    await new Promise(resolve => setTimeout(resolve, 40));
    assert.equal(calls.length, before);
});

test('run-now reports what it produced, and run-all never sends messages', async t => {
    const db = await fixture(); t.after(() => db.close());
    await db.execute("UPDATE agent_controls SET paused = 0 WHERE agent = 'global'");
    const first = await roster.runNow(db, 'manager', 'staff-1', 'instant');
    assert.equal(first.created, 1);
    assert.match(first.message, /1 مقترح جديد/);
    const idle = await roster.runNow(db, 'support', 'staff-1');
    assert.equal(idle.created, 0);
    assert.match(idle.message, /لا مقترحات جديدة/);
    const delivery = await roster.runNow(db, 'email', 'staff-1');
    assert.match(delivery.message, /لا توجد رسائل معتمدة/);
    const all = await roster.runAllNow(db, 'staff-1');
    assert.ok(!all.results.some(item => ['email', 'social'].includes(item.agent)));
});

test('owner recovery from environment variables creates or resets an admin password', async t => {
    process.env.STAFF_MFA_KEY = 'test-staff-mfa-key-'.repeat(3);
    const db = await fixture(); t.after(() => db.close());
    const fresh = require('node:module'); // the guard is per process, so load an isolated copy
    delete require.cache[require.resolve('../lib/staff')];
    const isolated = require('../lib/staff');
    assert.equal(await isolated.bootstrapFromEnv(db, {}), false);
    assert.equal(await isolated.bootstrapFromEnv(db, { ADMIN_RESET_EMAIL: 'owner@example.com', ADMIN_RESET_PASSWORD: 'recovery-pass-1' }), true);
    await isolated.login(db, { email: 'owner@example.com', password: 'recovery-pass-1' });
    assert.equal((await isolated.listStaff(db))[0].role, 'admin');
    assert.ok(fresh);
});
