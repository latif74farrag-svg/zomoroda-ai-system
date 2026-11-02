const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fixture, order } = require('./helpers');
const { createOrder, updateStatus, expireReservations, adjustStock } = require('../lib/commerce');
const { migrate } = require('../lib/migrations');
const key = 'checkout-key-00000001';

test('checkout reprices from database, snapshots money, reserves stock and commits an outbox event', async t => {
    const db = await fixture(); t.after(() => db.close());
    const body = { ...order(3), total: 0, items: [{ id: 'p1', qty: 3, price: 0, variant: 'rose' }] };
    const result = await createOrder(db, body, key);
    assert.equal(result.total, 30.45);
    const row = (await db.execute('SELECT * FROM store_orders')).rows[0];
    assert.equal(row.total_minor, 3045);
    assert.equal(JSON.parse(row.items)[0].price_minor, 1015);
    assert.equal((await db.execute('SELECT reserved FROM inventory')).rows[0].reserved, 3);
    assert.equal((await db.execute("SELECT COUNT(*) AS n FROM jobs WHERE type = 'order.created'")).rows[0].n, 1);
});
test('concurrent retries create exactly one order and conflicting reuse is rejected', async t => {
    const db = await fixture(); t.after(() => db.close());
    const results = await Promise.all(Array.from({ length: 10 }, () => createOrder(db, order(), key)));
    assert.equal(new Set(results.map(result => result.orderNumber)).size, 1);
    assert.equal(results.filter(result => !result.replayed).length, 1);
    assert.equal((await db.execute('SELECT reserved FROM inventory')).rows[0].reserved, 1);
    await assert.rejects(createOrder(db, order(2), key), { status: 409 });
});
test('only one simultaneous buyer obtains the final item', async t => {
    const db = await fixture(); t.after(() => db.close());
    await db.execute('UPDATE inventory SET on_hand = 1');
    const results = await Promise.allSettled([createOrder(db, order(), key), createOrder(db, order(), key + '2')]);
    assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal((await db.execute('SELECT COUNT(*) AS n FROM store_orders')).rows[0].n, 1);
});
test('unavailable later line rolls back earlier reservation and event', async t => {
    const db = await fixture(); t.after(() => db.close());
    const body = order(); body.items.push({ id: 'z-missing', qty: 1 });
    await assert.rejects(createOrder(db, body, key), { status: 409 });
    assert.equal((await db.execute('SELECT reserved FROM inventory')).rows[0].reserved, 0);
    assert.equal((await db.execute('SELECT COUNT(*) AS n FROM jobs')).rows[0].n, 0);
});
test('validation rejects missing keys, unknown variants, fractional counts, and non-cash payments', async t => {
    const db = await fixture(); t.after(() => db.close());
    await assert.rejects(createOrder(db, order(), ''), { status: 400 });
    for (const body of [{ ...order(), items: [{ id: 'p1', qty: 1, variant: 'unknown' }] }, order(1.2), { ...order(), payment_method: 'card' }]) await assert.rejects(createOrder(db, body, key), { status: 400 });
});
test('order lifecycle consumes and restores stock once and blocks invalid transitions', async t => {
    const db = await fixture(); t.after(() => db.close());
    const { orderNumber } = await createOrder(db, order(2), key);
    await assert.rejects(updateStatus(db, orderNumber, 'delivered', 'staff'), { status: 409 });
    for (const status of ['confirmed', 'shipped', 'delivered', 'returned', 'returned']) await updateStatus(db, orderNumber, status, 'staff');
    const stock = (await db.execute('SELECT * FROM inventory')).rows[0];
    assert.equal(stock.on_hand, 10); assert.equal(stock.reserved, 0);
    assert.equal((await db.execute('SELECT COUNT(*) AS n FROM inventory_history')).rows[0].n, 2);
});
test('expired pending orders release stock while confirmed orders retain it', async t => {
    const db = await fixture(); t.after(() => db.close());
    const now = Date.now();
    const a = await createOrder(db, order(), key, null, now);
    const b = await createOrder(db, order(), key + 'b', null, now);
    await updateStatus(db, b.orderNumber, 'confirmed', 'staff');
    assert.equal(await expireReservations(db, now + 86400001), 1);
    const orders = (await db.execute('SELECT order_number, status FROM store_orders')).rows;
    assert.equal(orders.find(row => row.order_number === a.orderNumber).status, 'cancelled');
    assert.equal((await db.execute('SELECT reserved FROM inventory')).rows[0].reserved, 1);
    assert.equal(await expireReservations(db, now + 86400001), 0);
});
test('adjustments cannot remove reserved stock and migrations are repeatable', async t => {
    const db = await fixture(); t.after(() => db.close());
    await createOrder(db, order(3), key);
    await assert.rejects(adjustStock(db, 'p1', -8, 'recount', 'staff'), { status: 409 });
    await adjustStock(db, 'p1', 5, 'received', 'staff');
    assert.equal((await db.execute('SELECT on_hand FROM inventory')).rows[0].on_hand, 15);
    await migrate(db);
    assert.equal((await db.execute('SELECT COUNT(*) AS n FROM schema_migrations')).rows[0].n, require('../lib/migrations').migrations.length);
});
test('stale quoted totals reject checkout without reserving inventory', async t => {
    const db = await fixture(); t.after(() => db.close());
    await assert.rejects(createOrder(db, { ...order(), expected_total_minor: 1 }, key), { status: 409 });
    assert.equal((await db.execute('SELECT reserved FROM inventory')).rows[0].reserved, 0);
});
test('a lost checkout response can be replayed after the price changes without duplicating the order', async t => {
    const db = await fixture(); t.after(() => db.close());
    const original = await createOrder(db, { ...order(), expected_total_minor: 1015 }, key);
    await db.execute('UPDATE store_products SET price = 20');
    const replay = await createOrder(db, { ...order(), expected_total_minor: 2000 }, key);
    assert.equal(replay.orderNumber, original.orderNumber); assert.equal(replay.total, 10.15);
    assert.equal((await db.execute('SELECT COUNT(*) AS n FROM store_orders')).rows[0].n, 1);
});
