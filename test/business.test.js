const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fixture } = require('./helpers');
const leads = require('../lib/leads');
const sales = require('../lib/sales');
const affiliates = require('../lib/affiliates');
const templates = require('../lib/templates');
const priceLists = require('../lib/price-lists');
const manager = require('../lib/manager-agent');
const { review } = require('../lib/agents');

const DAY = 86400000;

test('contacts normalise to one key per person and reject unusable values', () => {
    assert.equal(leads.normalizeContact('01010997511').key, '201010997511');
    assert.equal(leads.normalizeContact('201010997511@c.us').key, '201010997511');
    assert.equal(leads.normalizeContact('+966 53 145 4328').key, '966531454328');
    assert.equal(leads.normalizeContact('Info@Hotel.com').key, 'info@hotel.com');
    assert.equal(leads.normalizeContact('246110232789187@lid'), null);
    assert.equal(leads.normalizeContact('3464001'), null);
});

test('lead import merges duplicates, keeps the latest contact date and enforces the 30-day window', async t => {
    const db = await fixture(); t.after(() => db.close());
    const now = Date.now();
    const rows = [
        { contact: '01010997511', name: 'صيدلية النور', sector: 'pharmacies', lastContactAt: now - 10 * DAY },
        { contact: '201010997511@c.us', stage: 'welcomed', lastContactAt: now - 40 * DAY },
        { contact: '01022222222', name: 'فندق الجزيرة', sector: 'hotels' },
        { contact: 'bad' }
    ];
    assert.deepEqual(await leads.importLeads(null, rows, 'test', { apply: false }), { mode: 'preview', rows: 4, unique: 2, alreadyStored: 0, rejected: 1 });
    const first = await leads.importLeads(db, rows, 'test', { apply: true });
    assert.deepEqual([first.added, first.merged, first.rejected], [2, 1, 1]);
    const again = await leads.importLeads(db, rows, 'test', { apply: true });
    assert.deepEqual([again.added, again.merged], [0, 3]);
    const summary = await leads.leadSummary(db, now);
    assert.equal(summary.total, 2);
    assert.equal(summary.sectors.find(row => row.sector === 'pharmacies').blocked, 1);
    assert.equal(summary.sectors.find(row => row.sector === 'hotels').available, 1);
    const stored = (await db.execute("SELECT last_contact_at, stage FROM leads WHERE contact_key = '201010997511'")).rows[0];
    assert.equal(Number(stored.last_contact_at), now - 10 * DAY);
    assert.equal(stored.stage, 'welcomed');
    assert.ok(!JSON.stringify(await leads.listLeads(db)).includes('201010997511'));
});

test('sales assistant classifies, stays inside sector catalogs and honours opt-out', async t => {
    const db = await fixture(); t.after(() => db.close());
    await priceLists.replaceList(db, 'pharmacies', '2026-11', [{ itemKey: '1', name: 'رونزا مناديل مبللة 120 ولد', brand: 'Ronza', units_per_carton: 12, unit_minor: 3500, carton_minor: 42000 }], 'test');
    const first = await sales.handleMessage(db, { senderId: '01011111111', message: 'احنا صيدلية في الدقي' }, 'staff');
    assert.equal(first.sector, 'pharmacies');
    assert.equal(first.stage, 'catalog_sent');
    assert.match(first.attachments[0].file, /الصيدليات/);
    const order = await sales.handleMessage(db, { senderId: '01011111111', message: 'محتاجين 50 رونزا و 10 معطر' }, 'staff');
    assert.equal(order.invoice.total_minor, 50 * 3500);
    assert.deepEqual(order.invoice.rejected, ['معطر']);
    assert.match(first.attachments[0].file, /نوفمبر_2026/);
    await priceLists.replaceList(db, 'pharmacies', '2026-11', [{ itemKey: '2', name: 'رونزا مزيل مكياج', brand: 'Ronza', unit_minor: 1500 }], 'test');
    assert.equal((await db.execute('SELECT COUNT(*) AS n FROM price_list_items')).rows[0].n, 1, 'replacing a list leaves no old rows');
    const unknown = await sales.handleMessage(db, { senderId: '01033333333', message: 'السلام عليكم' }, 'staff');
    assert.equal(unknown.stage, 'awaiting_category');
    const stop = await sales.handleMessage(db, { senderId: '01033333333', message: 'ايقاف' }, 'staff');
    assert.equal(stop.stage, 'opted_out');
    assert.equal((await db.execute("SELECT opted_out FROM leads WHERE contact_key = '201033333333'")).rows[0].opted_out, 1);
});

test('affiliate tree promotes a supervisor at five representatives and pays integer commissions', async t => {
    const db = await fixture(); t.after(() => db.close());
    await affiliates.registerAffiliate(db, { phone: '01000000001', name: 'مشرفة' }, 'staff');
    let promoted = false;
    for (let i = 2; i <= 6; i++) promoted = (await affiliates.registerAffiliate(db, { phone: `0100000000${i}`, name: `مندوبة ${i}`, supervisorPhone: '01000000001' }, 'staff')).promotedSupervisor;
    assert.equal(promoted, true);
    assert.equal((await db.execute("SELECT role FROM affiliates WHERE phone = '201000000001'")).rows[0].role, 'team_leader');
    await assert.rejects(affiliates.registerAffiliate(db, { phone: '01000000002', name: 'مكررة' }, 'staff'), { status: 409 });
    await assert.rejects(affiliates.registerAffiliate(db, { phone: '01000000009', name: 'بلا مشرفة معروفة', supervisorPhone: '01099999999' }, 'staff'), { status: 404 });
    const sale = await affiliates.recordSale(db, { repPhone: '01000000002', amountMinor: 10033 }, 'staff', { AFFILIATE_DIRECT_PCT: '5', AFFILIATE_OVERRIDE_PCT: '2' });
    assert.deepEqual(sale, { directMinor: 502, overrideMinor: 201 });
    assert.equal((await db.execute("SELECT commission_minor FROM affiliates WHERE phone = '201000000001'")).rows[0].commission_minor, 201);
    await assert.rejects(affiliates.recordSale(db, { repPhone: '01000000002', amountMinor: 1.5 }, 'staff'), { status: 400 });
});

test('legacy message scripts are cleaned and stored once per sector', async t => {
    const db = await fixture(); t.after(() => db.close());
    const legacy = { pharmacy: ['دكتورنا. سيبلنا اسم الصيدلية'], wholesalers: ['بأسعار جملة الجملة'] };
    assert.deepEqual(await templates.seedTemplates(db, legacy), { added: 3 });
    assert.deepEqual(await templates.seedTemplates(db, legacy), { added: 0 });
    assert.match((await templates.listTemplates(db, 'pharmacies'))[0].body, /أرسل لنا/);
    assert.match((await templates.listTemplates(db, 'distribution'))[0].body, /بأسعار الجملة/);
});

test('manager and ads agents propose once per period and approval creates a draft or acknowledges a reminder', async t => {
    const db = await fixture(); t.after(() => db.close());
    const dec21 = Date.parse('2026-12-21T19:30:00Z');
    assert.deepEqual(manager.duePlans(dec21).map(plan => plan.sourceId), ['reminder:newyear:2026', 'post:2026-12-21:evening']);
    assert.deepEqual(await manager.tick(db, dec21), { proposed: 2, skipped: 0 });
    await manager.tick(db, dec21);
    assert.equal((await db.execute('SELECT COUNT(*) AS n FROM agent_tasks')).rows[0].n, 2);
    const tasks = (await db.execute('SELECT id, agent FROM agent_tasks')).rows;
    for (const task of tasks) await review(db, task.id, 'approved', 'staff');
    const draft = (await db.execute('SELECT sector, channel, status FROM marketing_campaigns')).rows[0];
    assert.deepEqual({ ...draft }, { sector: 'social', channel: 'social', status: 'draft' });
    assert.equal((await db.execute("SELECT status FROM agent_tasks WHERE agent = 'manager'")).rows[0].status, 'executed');
    await db.execute("UPDATE agent_controls SET paused = 1 WHERE agent = 'ads'");
    assert.deepEqual(await manager.tick(db, Date.parse('2026-12-22T19:30:00Z')), { proposed: 0, skipped: 1 });
});

test('email-code staff login: one-time code, expiry, attempt limit, no password path', async t => {
    process.env.STAFF_MFA_KEY = 'test-staff-mfa-key-'.repeat(3);
    const staff = require('../lib/staff');
    const db = await fixture(); t.after(() => db.close());
    await staff.createEmailStaff(db, { email: 'Owner@Example.com', name: 'المدير', role: 'admin' });
    const sent = [];
    const send = async message => sent.push(message);
    const t0 = Date.now();
    assert.deepEqual(await staff.requestEmailCode(db, 'nobody@example.com', send, t0), { sent: true });
    assert.equal(sent.length, 0, 'unknown addresses get the same answer and no mail');
    await staff.requestEmailCode(db, 'owner@example.com', send, t0);
    assert.equal(sent.length, 1);
    await assert.rejects(staff.requestEmailCode(db, 'owner@example.com', send, t0 + 1000), { status: 429 });
    const code = sent[0].text.match(/\d{6}/)[0];
    await assert.rejects(staff.verifyEmailCode(db, { email: 'owner@example.com', code: code === '000000' ? '111111' : '000000' }, t0 + 2000), { status: 401 });
    await assert.rejects(staff.verifyEmailCode(db, { email: 'owner@example.com', code }, t0 + 11 * 60000), { status: 401 });
    await staff.requestEmailCode(db, 'owner@example.com', send, t0 + 12 * 60000);
    const fresh = sent[1].text.match(/\d{6}/)[0];
    const session = await staff.verifyEmailCode(db, { email: 'owner@example.com', code: fresh }, t0 + 12 * 60000 + 5000);
    assert.match(session.token, /^[a-f0-9]{64}$/);
    await assert.rejects(staff.verifyEmailCode(db, { email: 'owner@example.com', code: fresh }, t0 + 12 * 60000 + 6000), { status: 401 });
    await staff.requestEmailCode(db, 'owner@example.com', send, t0 + 30 * 60000);
    for (let i = 0; i < 5; i++) await assert.rejects(staff.verifyEmailCode(db, { email: 'owner@example.com', code: '999999' }, t0 + 30 * 60000 + 1000), { status: 401 });
    await assert.rejects(staff.verifyEmailCode(db, { email: 'owner@example.com', code: sent[2].text.match(/\d{6}/)[0] }, t0 + 30 * 60000 + 2000), { status: 401 }, 'locked after five wrong tries');
    await assert.rejects(staff.login(db, { email: 'owner@example.com', password: 'anything-long-enough-1', code: '123456' }), { status: 401 });
});

test('user management: add, change role, disable, and never lock out the last admin or yourself', async t => {
    process.env.STAFF_MFA_KEY = 'test-staff-mfa-key-'.repeat(3);
    const staff = require('../lib/staff');
    const db = await fixture(); t.after(() => db.close());
    const admin = await staff.createEmailStaff(db, { email: 'a@example.com', name: 'المدير الأول', role: 'admin' });
    const { id: helper } = await staff.addStaff(db, { email: 'b@example.com', name: 'موظفة', role: 'support' }, admin);
    await assert.rejects(staff.addStaff(db, { email: 'B@example.com', name: 'مكرر', role: 'support' }, admin), { status: 409 });
    assert.equal((await staff.listStaff(db)).length, 2);
    await staff.updateStaff(db, helper, { role: 'operations' }, admin);
    assert.equal((await staff.listStaff(db)).find(user => user.id === helper).role, 'operations');
    await assert.rejects(staff.updateStaff(db, admin, { disabled: true }, admin), { status: 400 });
    await assert.rejects(staff.updateStaff(db, helper, { role: 'owner' }, admin), { status: 400 });
    const { id: second } = await staff.addStaff(db, { email: 'c@example.com', name: 'مدير ثان', role: 'admin' }, admin);
    await staff.updateStaff(db, second, { disabled: true }, admin);
    await assert.rejects(staff.updateStaff(db, admin, { role: 'support' }, second), { status: 409 }, 'a disabled admin cannot act and the last active admin is protected');
    await db.execute({ sql: 'INSERT INTO staff_sessions VALUES (?, ?, ?, ?)', args: ['hash', helper, 'csrf', Date.now() + 100000] });
    await staff.updateStaff(db, helper, { disabled: true }, admin);
    assert.equal((await db.execute('SELECT COUNT(*) AS n FROM staff_sessions WHERE staff_id = ?', [helper])).rows[0].n, 0, 'sessions end when an account is disabled');
});
