const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fixture } = require('./helpers');
const purchasing = require('../lib/purchasing');

async function setup(t) {
    const db = await fixture(); t.after(() => db.close());
    const supplier = await purchasing.addSupplier(db, { name: 'Test supplier', contact: 'test contact' }, 'admin', 'supplier-key');
    const input = { supplier_id: supplier.id, lines: [{ product_id: 'p1', quantity: 3, unit_minor: 725 }] };
    return { db, supplier, input };
}

test('purchase approval and receipt add stock once, preserve retail prices and retain audit evidence', async t => {
    const { db, input } = await setup(t);
    const order = await purchasing.createOrder(db, input, 'admin', 'purchase-key');
    assert.deepEqual(await purchasing.createOrder(db, input, 'admin', 'purchase-key'), order);
    await assert.rejects(purchasing.createOrder(db, { ...input, notes: 'changed' }, 'admin', 'purchase-key'), { status: 409 });
    await assert.rejects(purchasing.receive(db, order.id, { reference: 'GR-01' }, 'admin', 'receipt-key'), { status: 409 });
    await purchasing.changeStatus(db, order.id, 'approved', 'admin');
    const receipt = await purchasing.receive(db, order.id, { reference: 'GR-01' }, 'admin', 'receipt-key');
    assert.deepEqual(await purchasing.receive(db, order.id, { reference: 'GR-01' }, 'admin', 'receipt-key'), receipt);
    assert.deepEqual(await purchasing.receive(db, order.id, { reference: 'GR-01' }, 'admin', 'another-key'), receipt);
    const stock = (await db.execute("SELECT on_hand FROM inventory WHERE product_id = 'p1'")).rows[0];
    assert.equal(stock.on_hand, 13);
    assert.equal((await db.execute("SELECT price FROM store_products WHERE id = 'p1'")).rows[0].price, 10.15);
    assert.equal((await db.execute("SELECT COUNT(*) AS n FROM audit_log WHERE action = 'purchase.received'")).rows[0].n, 1);
    const overview = await purchasing.overview(db);
    assert.equal(overview.orders[0].total_minor, 2175);
    assert.equal(overview.orders[0].status, 'received');
    await assert.rejects(purchasing.changeStatus(db, order.id, 'cancelled', 'admin'), { status: 409 });
});

test('invalid purchase lines roll back and cancelled orders cannot receive goods', async t => {
    const { db, input } = await setup(t);
    await assert.rejects(purchasing.createOrder(db, { ...input, lines: [...input.lines, { product_id: 'missing', quantity: 1, unit_minor: 100 }] }, 'admin', 'invalid-key'), { status: 400 });
    assert.equal((await db.execute('SELECT COUNT(*) AS n FROM purchase_orders')).rows[0].n, 0);
    await assert.rejects(purchasing.createOrder(db, { ...input, lines: [...input.lines, ...input.lines] }, 'admin', 'duplicate-key'), { status: 400 });
    const order = await purchasing.createOrder(db, input, 'admin', 'purchase-key');
    await purchasing.changeStatus(db, order.id, 'cancelled', 'admin');
    await assert.rejects(purchasing.receive(db, order.id, { reference: 'GR-02' }, 'admin', 'receipt-key'), { status: 409 });
});

test('failure while recording a receipt rolls back inventory and status together', async t => {
    const { db, input } = await setup(t);
    const order = await purchasing.createOrder(db, input, 'admin', 'purchase-key');
    await purchasing.changeStatus(db, order.id, 'approved', 'admin');
    await db.execute("CREATE TRIGGER reject_receipt BEFORE INSERT ON goods_receipts BEGIN SELECT RAISE(ABORT, 'test failure'); END");
    await assert.rejects(purchasing.receive(db, order.id, { reference: 'GR-03' }, 'admin', 'receipt-key'));
    assert.equal((await db.execute("SELECT on_hand FROM inventory WHERE product_id = 'p1'")).rows[0].on_hand, 10);
    assert.equal((await db.execute('SELECT status FROM purchase_orders')).rows[0].status, 'approved');
    assert.equal((await db.execute('SELECT COUNT(*) AS n FROM inventory_history')).rows[0].n, 0);
});
