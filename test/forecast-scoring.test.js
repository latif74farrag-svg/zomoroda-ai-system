const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fixture } = require('./helpers');
const { forecast, proposeReplenishment } = require('../lib/inventory-forecast');
const { scoreLead, scoreAll } = require('../lib/lead-scoring');
const { transaction } = require('../lib/storage');
const { upsertLeads } = require('../lib/leads');

const NOW = Date.parse('2026-11-28T12:00:00Z');
const stamp = days => new Date(NOW - days * 86400000).toISOString().slice(0, 19).replace('T', ' ');
async function sell(db, number, productId, quantity, daysAgo, status = 'confirmed', phone = '01012345678') {
    await db.execute({ sql: 'INSERT INTO store_orders(order_number, customer_phone, items, status, created_at) VALUES (?, ?, ?, ?, ?)', args: [number, phone, JSON.stringify([{ id: productId, quantity }]), status, stamp(daysAgo)] });
}

test('forecast flags products that will run out before the supplier lead time, ignores cancelled orders and counts incoming stock', async t => {
    const db = await fixture(); t.after(() => db.close());
    await sell(db, 'A1', 'p1', 30, 5);               // 30 units in 30 days = 1/day, 10 on hand -> 10 days cover < 14 lead time
    await sell(db, 'A2', 'p1', 500, 3, 'cancelled'); // cancelled demand is ignored
    await sell(db, 'A3', 'p1', 500, 90);             // outside the window
    const risks = await forecast(db, NOW);
    assert.equal(risks.length, 1);
    assert.equal(risks[0].product_id, 'p1');
    assert.equal(risks[0].per_day, 1);
    assert.equal(risks[0].days_of_cover, 10);
    assert.equal(risks[0].suggested_quantity, 34);   // 1/day * (14 + 30) - 10 available

    // stock already on order covers the gap: no new suggestion
    await db.execute("INSERT INTO suppliers VALUES ('s1', 'Supplier', '', 1)");
    await db.execute("INSERT INTO purchase_orders(id, supplier_id, total_minor, notes, created_by, created_at, updated_at) VALUES ('po1', 's1', 0, '', 'x', 1, 1)");
    await db.execute("INSERT INTO purchase_order_lines VALUES ('po1', 'p1', 'Retail product', 100, 1)");
    assert.equal((await forecast(db, NOW)).length, 0);
});

test('forecast proposals are created once per product per week and need staff review', async t => {
    const db = await fixture(); t.after(() => db.close());
    await db.execute("UPDATE agent_controls SET paused = 0");
    await sell(db, 'A1', 'p1', 30, 5);
    assert.deepEqual(await proposeReplenishment(db, NOW), { at_risk: 1, created: 1 });
    assert.deepEqual(await proposeReplenishment(db, NOW), { at_risk: 1, created: 0 });
    const task = (await db.execute("SELECT status, proposal FROM agent_tasks WHERE agent = 'inventory'")).rows;
    assert.equal(task.length, 1);
    assert.equal(task[0].status, 'proposed');
    assert.equal(JSON.parse(task[0].proposal).suggested_quantity, 34);
});

test('lead scoring is explainable, routes by priority and never scores an opted-out lead', () => {
    const cold = scoreLead({ stage: 'new', sector: 'unknown', consent: 0, opted_out: 0, name: '' });
    assert.deepEqual([cold.score, cold.priority, cold.route], [0, 'cold', 'nurture']);
    const warm = scoreLead({ stage: 'catalog_sent', sector: 'hotels', consent: 1, opted_out: 0, name: 'Hotel' });
    assert.equal(warm.priority, 'warm');
    assert.equal(warm.route, 'outreach');
    const hot = scoreLead({ stage: 'order_inquired', sector: 'hotels', consent: 1, opted_out: 0, name: 'Hotel' }, { orders: 2, openOpportunities: 1 });
    assert.equal(hot.priority, 'hot');
    assert.equal(hot.route, 'sales');
    assert.ok(hot.score <= 100 && hot.reasons.includes('repeat_buyer'));
    assert.deepEqual(scoreLead({ stage: 'ordered', sector: 'hotels', consent: 1, opted_out: 1 }), { score: 0, priority: 'none', route: 'none', reasons: ['opted_out'] });
});

test('scoreAll stores scores, uses order history by phone, and is stable on a second run', async t => {
    const db = await fixture(); t.after(() => db.close());
    await transaction(db, tx => upsertLeads(tx, [{ contact: '01012345678', name: 'Buyer', sector: 'pharmacies', stage: 'prices_sent' }, { contact: '01099999999', name: '', sector: 'unknown' }]));
    await db.execute("UPDATE leads SET consent = 1 WHERE contact_key = '201012345678'");
    await sell(db, 'B1', 'p1', 1, 2);
    const first = await scoreAll(db, NOW);
    assert.equal(first.scored, 2);
    const buyer = (await db.execute("SELECT score, priority, route FROM leads WHERE contact_key = '201012345678'")).rows[0];
    assert.equal(buyer.score, 30 + 10 + 5 + 10 + 5 + 15); // stage + sector + valuable + consent + name + has_orders
    assert.equal(buyer.priority, 'hot');
    assert.equal((await scoreAll(db, NOW + 1)).changed, 0);
});
