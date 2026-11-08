const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fixture } = require('./helpers');
const { runOnce } = require('../lib/queue');
const { coordinate, review: reviewTask } = require('../lib/agents');
const { enqueue } = require('../lib/commerce');
const { upsertLeads, setOptOut } = require('../lib/leads');
const { transaction } = require('../lib/storage');
const guardian = require('../lib/agentic/guardian');
const aggregator = require('../lib/agentic/order-aggregator');
const registry = require('../lib/agentic/registry');
const shopify = require('../lib/integrations/shopify');
const files = require('../lib/integrations/file-channel');

const NOW = Date.parse('2026-11-01T10:00:00Z'); // Sunday, 12:00 in Cairo
const drain = async (db, offset = 0) => { while (await runOnce(db, job => coordinate(db, job), Date.now() + offset)) { /* run every eligible job */ } };
const unpause = db => db.execute("UPDATE agent_controls SET paused = 0 WHERE agent = 'global'");
const verdictOf = (result, code) => result.reasons.find(reason => reason.code === code);

test('guardian blocks Do-Not-Contact numbers and opted-out leads', async t => {
    const db = await fixture(); t.after(() => db.close());
    await transaction(db, tx => upsertLeads(tx, [{ contact: '01011111111', sector: 'pharmacies' }, { contact: '01022222222', sector: 'pharmacies' }]));
    await db.execute("UPDATE leads SET consent = 1");
    const ask = contact => guardian.review(db, { agent: 'marketing', action: 'outreach_whatsapp', subject: contact, payload: { contact, productType: 'ronza_wipes' }, now: NOW });
    assert.equal((await ask('01011111111')).verdict, 'pass');
    await db.execute("INSERT INTO do_not_contact(contact_key, reason, created_by, created_at) VALUES ('201011111111', 'manual', 'staff', 1)");
    assert.ok(verdictOf(await ask('01011111111'), 'do_not_contact'));
    await transaction(db, tx => setOptOut(tx, '201022222222'));
    assert.ok(verdictOf(await ask('01022222222'), 'do_not_contact')); // opt-outs are copied to the permanent list
    assert.ok(verdictOf(await ask('not-a-number'), 'invalid_contact'));
});

test('guardian delegates outreach rules: hours, catalog isolation and consent', async t => {
    const db = await fixture(); t.after(() => db.close());
    await transaction(db, tx => upsertLeads(tx, [{ contact: '01033333333', sector: 'pharmacies' }]));
    const ask = (payload, now = NOW) => guardian.review(db, { agent: 'marketing', action: 'outreach_whatsapp', subject: 'x', payload: { contact: '01033333333', productType: 'ronza_wipes', ...payload }, now });
    assert.ok(verdictOf(await ask({}), 'consent')); // no consent recorded yet
    await db.execute('UPDATE leads SET consent = 1');
    assert.equal((await ask({})).verdict, 'pass');
    assert.ok(verdictOf(await ask({ productType: 'fragrance' }), 'catalog')); // pharmacies get Ronza wipes only
    assert.ok(verdictOf(await ask({}, Date.parse('2026-11-01T19:00:00Z')), 'working_hours'));
    assert.ok(verdictOf(await ask({}, Date.parse('2026-11-06T10:00:00Z')), 'working_hours')); // Friday
});

test('guardian enforces daily limits at execution, fails closed on unknown actions and on global pause', async t => {
    const db = await fixture(); t.after(() => db.close());
    await db.execute("UPDATE guardian_limits SET daily_limit = 2 WHERE agent = 'aggregator' AND action = 'import_order'");
    const execute = () => guardian.review(db, { agent: 'aggregator', action: 'import_order', subject: 'o', payload: {}, phase: 'execute', now: NOW });
    assert.ok(verdictOf(await execute(), 'global_pause')); // fixture starts with agents globally paused
    assert.equal((await db.execute('SELECT COUNT(*) AS n FROM guardian_usage')).rows[0].n, 0); // a blocked check never consumes budget
    await unpause(db);
    assert.equal((await execute()).verdict, 'pass');
    assert.equal((await execute()).verdict, 'pass');
    assert.ok(verdictOf(await execute(), 'daily_limit'));
    const next = await guardian.review(db, { agent: 'aggregator', action: 'import_order', subject: 'o', payload: {}, phase: 'execute', now: NOW + 86400000 });
    assert.equal(next.verdict, 'pass'); // new Cairo day, new budget
    assert.ok(verdictOf(await guardian.review(db, { agent: 'x', action: 'wire_money', subject: 'x' }), 'unknown_action'));
    assert.ok((await db.execute("SELECT COUNT(*) AS n FROM guardian_decisions")).rows[0].n >= 6); // every decision is logged
});

test('guardian checks price accuracy and sector catalog isolation', async t => {
    const db = await fixture(); t.after(() => db.close());
    const price = lines => guardian.review(db, { agent: 'aggregator', action: 'import_order', subject: 'o', payload: { lines } });
    assert.equal((await price([{ product_id: 'p1', unit_minor: 1015 }])).verdict, 'pass');
    const mismatch = await price([{ product_id: 'p1', unit_minor: 999 }]);
    assert.equal(mismatch.verdict, 'warn');
    assert.deepEqual(verdictOf(mismatch, 'price_mismatch').detail, { product_id: 'p1', expected_minor: 1015, actual_minor: 999 });
    assert.ok(verdictOf(await price([{ product_id: 'missing', unit_minor: 1 }]), 'unknown_product'));
    await db.execute("INSERT INTO price_list_items(list, item_key, period, name, unit_minor, source, updated_at) VALUES ('consumer', 'w1', '2026-11', 'Wipes', 500, 'test', 1)");
    const sector = (sectorName, lines) => guardian.review(db, { agent: 'sales', action: 'import_order', subject: 'o', payload: { sector: sectorName, lines } });
    assert.equal((await sector('moms', [{ item_key: 'w1', unit_minor: 500 }])).verdict, 'pass');
    assert.ok(verdictOf(await sector('moms', [{ item_key: 'w1', list: 'pharmacies', unit_minor: 400 }]), 'catalog_isolation')); // wholesale prices never go to moms
    assert.equal((await sector('moms', [{ item_key: 'w1', unit_minor: 450 }])).verdict, 'warn');
});

test('data refinement proposes fixes, applies them only after approval, and skips fields that changed', async t => {
    const db = await fixture(); t.after(() => db.close());
    await unpause(db);
    await transaction(db, tx => upsertLeads(tx, [
        { contact: '01044444444', name: 'صيدلية  الأمل ', sector: 'unknown' },
        { contact: '01055555555', name: 'مطعم النيل', sector: 'unknown' },
        { contact: '01066666666', name: '12345', sector: 'salon' },
        { contact: '01077777777', name: 'Clean Co', sector: 'supplies' }
    ]));
    await db.execute("INSERT INTO do_not_contact(contact_key, reason, created_by, created_at) VALUES ('201077777777', 'manual', 'staff', 1)");
    await enqueue(db, 'refine-1', 'leads.refine', {});
    await drain(db);
    const task = (await db.execute("SELECT * FROM agent_tasks WHERE agent = 'refinement'")).rows[0];
    assert.equal(task.status, 'proposed');
    const proposal = JSON.parse(task.proposal);
    const rules = proposal.fixes.map(fix => fix.rule).sort();
    assert.deepEqual(rules, ['classify_sector', 'classify_sector', 'clean_name', 'clean_name', 'do_not_contact']);
    assert.equal((await db.execute("SELECT sector FROM leads WHERE contact_key = '201044444444'")).rows[0].sector, 'unknown'); // nothing changed before approval
    await enqueue(db, 'refine-2', 'leads.refine', {}); await drain(db);
    assert.equal((await db.execute("SELECT COUNT(*) AS n FROM agent_tasks WHERE agent = 'refinement'")).rows[0].n, 1); // identical batch is not proposed twice
    await db.execute("UPDATE leads SET sector = 'salon' WHERE contact_key = '201055555555'"); // staff edit after the scan
    await reviewTask(db, task.id, 'approved', 'staff-id');
    await drain(db, 5000);
    assert.equal((await db.execute({ sql: 'SELECT status FROM agent_tasks WHERE id = ?', args: [task.id] })).rows[0].status, 'executed');
    const sector = key => db.execute({ sql: 'SELECT sector, name, opted_out, stage FROM leads WHERE contact_key = ?', args: [key] }).then(result => result.rows[0]);
    assert.equal((await sector('201044444444')).sector, 'pharmacies');
    assert.equal((await sector('201044444444')).name, 'صيدلية الأمل');
    assert.equal((await sector('201055555555')).sector, 'salon'); // optimistic update skipped the changed field
    assert.equal((await sector('201066666666')).name, '');
    assert.equal(Number((await sector('201077777777')).opted_out), 1);
    assert.equal((await db.execute('SELECT COUNT(*) AS n FROM leads')).rows[0].n, 4); // never deletes
});

test('order aggregator: file intake is idempotent, maps SKUs, and creates the store order only after approval', async t => {
    const db = await fixture(); t.after(() => db.close());
    await unpause(db);
    const rows = files.parseCsv('external_id,customer_name,customer_phone,customer_address,payment,sku,qty,unit_price\nNOON-1,Mona Ali,+201012345678,"12 Nile St, Cairo",cod,SKU-1,2,9.99\n');
    const first = await aggregator.ingest(db, 'noon', rows, 'staff-id');
    assert.deepEqual([first.received, first.duplicates], [1, 0]);
    assert.deepEqual([(await aggregator.ingest(db, 'noon', rows, 'staff-id')).received, (await db.execute('SELECT COUNT(*) AS n FROM channel_orders')).rows[0].n], [0, 1]);
    await drain(db);
    let channel = (await db.execute('SELECT * FROM channel_orders')).rows[0];
    assert.equal(channel.status, 'needs_mapping');
    assert.equal(channel.reason, 'unmapped_sku:SKU-1');
    assert.equal((await db.execute('SELECT COUNT(*) AS n FROM agent_tasks')).rows[0].n, 0);
    await assert.rejects(aggregator.mapSku(db, { channel: 'noon', externalSku: 'SKU-1', productId: 'p1', variant: 'bad' }, 's'), { status: 400 });
    assert.equal((await aggregator.mapSku(db, { channel: 'noon', externalSku: 'SKU-1', productId: 'p1', variant: 'rose' }, 'staff-id')).requeued, 1);
    await drain(db, 1000);
    channel = (await db.execute('SELECT * FROM channel_orders')).rows[0];
    assert.equal(channel.status, 'proposed');
    const task = (await db.execute("SELECT * FROM agent_tasks WHERE agent = 'aggregator'")).rows[0];
    const evidence = JSON.parse(task.evidence);
    assert.equal(evidence.guardian.verdict, 'warn'); // channel charged 999, store price is 1015
    assert.equal(evidence.guardian.reasons[0].code, 'price_mismatch');
    assert.equal((await db.execute('SELECT COUNT(*) AS n FROM store_orders')).rows[0].n, 0); // nothing is created before approval
    await reviewTask(db, task.id, 'approved', 'staff-id');
    await drain(db, 5000);
    const order = (await db.execute('SELECT * FROM store_orders')).rows[0];
    assert.equal(order.status, 'pending');
    assert.equal(order.total_minor, 2030); // store price x2, delivery fee 0 in tests
    assert.equal(order.customer_phone, '01012345678');
    assert.equal((await db.execute('SELECT reserved FROM inventory')).rows[0].reserved, 2);
    channel = (await db.execute('SELECT * FROM channel_orders')).rows[0];
    assert.deepEqual([channel.status, channel.order_number], ['imported', order.order_number]);
    assert.equal((await db.execute({ sql: 'SELECT status FROM agent_tasks WHERE id = ?', args: [task.id] })).rows[0].status, 'executed');
    // Replaying the execution (for example after a crash) must not create a second order or reserve more stock.
    await db.execute({ sql: "UPDATE agent_tasks SET status = 'approved' WHERE id = ?", args: [task.id] });
    await db.execute("UPDATE channel_orders SET status = 'proposed', order_number = NULL");
    await enqueue(db, 'replay', 'agent.execute', { taskId: task.id });
    await drain(db, 6000);
    assert.equal((await db.execute('SELECT COUNT(*) AS n FROM store_orders')).rows[0].n, 1);
    assert.equal((await db.execute('SELECT reserved FROM inventory')).rows[0].reserved, 2);
});

test('order aggregator keeps prepaid orders for manual handling and rejects orders that cannot be fulfilled', async t => {
    const db = await fixture(); t.after(() => db.close());
    await unpause(db);
    const base = { customer_name: 'Sara', customer_phone: '01098765432', customer_address: '5 Garden Street', lines: [{ sku: 'SKU-1', qty: 1, unit_price: '10.15' }] };
    const result = await aggregator.ingest(db, 'amazon', [{ ...base, external_id: 'A-1', payment: 'prepaid' }, { ...base, external_id: 'A-2', payment: 'cod', lines: [{ sku: 'SKU-1', qty: 50, unit_price: '10.15' }] }, { ...base, external_id: 'A-3', customer_phone: '123' }], 'staff-id');
    assert.equal(result.received, 2);
    assert.equal(result.rejected.length, 1); // invalid phone is refused at intake with a readable reason
    await aggregator.mapSku(db, { channel: 'amazon', externalSku: 'SKU-1', productId: 'p1', variant: 'rose' }, 'staff-id');
    await drain(db, 1000);
    const status = id => db.execute({ sql: 'SELECT status, reason FROM channel_orders WHERE external_id = ?', args: [id] }).then(r => r.rows[0]);
    assert.deepEqual(await status('A-1'), { status: 'manual', reason: 'prepaid_requires_manual' });
    assert.equal((await status('A-2')).status, 'proposed');
    const task = (await db.execute("SELECT * FROM agent_tasks")).rows[0];
    await reviewTask(db, task.id, 'approved', 'staff-id');
    await drain(db, 5000);
    assert.equal((await status('A-2')).status, 'rejected'); // only 10 in stock
    assert.equal((await db.execute({ sql: 'SELECT status FROM agent_tasks WHERE id = ?', args: [task.id] })).rows[0].status, 'rejected');
    assert.equal((await db.execute('SELECT COUNT(*) AS n FROM store_orders')).rows[0].n, 0);
    assert.equal((await db.execute('SELECT reserved FROM inventory')).rows[0].reserved, 0); // the failed attempt left no reservation
});

test('a paused aggregator keeps its job; the global kill switch blocks execution', async t => {
    const db = await fixture(); t.after(() => db.close());
    await aggregator.ingest(db, 'manual', [{ external_id: 'M-1', customer_name: 'Hana', customer_phone: '01112345678', customer_address: '9 Palm Road', payment: 'cod', lines: [{ sku: 'S', qty: 1, unit_minor: 100 }] }], 's');
    await drain(db); // global pause is on by default
    const job = (await db.execute("SELECT status, attempts FROM jobs WHERE type = 'channel.order'")).rows[0];
    assert.deepEqual([job.status, Number(job.attempts)], ['pending', 0]);
    assert.equal(registry.handles('channel.order'), true);
    assert.equal(registry.handles('order.created'), false);
});

test('shopify adapter normalizes orders from an injected fetch and stays off without credentials', async () => {
    assert.equal(shopify.configured({}), false);
    await assert.rejects(shopify.fetchOrders({}, 0), { status: 503 });
    const env = { SHOPIFY_STORE_DOMAIN: 'demo-shop.myshopify.com', SHOPIFY_ADMIN_TOKEN: 'token' };
    let requested;
    const fetcher = async (url, init) => { requested = { url, init }; return { ok: true, json: async () => ({ orders: [{ id: 99, created_at: '2026-11-01T08:00:00Z', payment_gateway_names: ['Cash on Delivery (COD)'], shipping_address: { name: 'Omar', phone: '+20 101 234 5678', address1: '3 Tahrir', city: 'Cairo' }, line_items: [{ sku: 'SKU-9', quantity: 3, price: '12.50' }] }] }) }; };
    const [order] = await shopify.fetchOrders(env, NOW, fetcher);
    assert.match(requested.url, /^https:\/\/demo-shop\.myshopify\.com\/admin\/api\/\d{4}-\d{2}\/orders\.json/);
    assert.equal(requested.init.headers['X-Shopify-Access-Token'], 'token');
    const valid = require('../lib/integrations/channel-adapter').validateOrder('shopify', order);
    assert.equal(valid.customer.phone, '01012345678');
    assert.deepEqual(valid.lines, [{ external_sku: 'SKU-9', qty: 3, unit_minor: 1250 }]);
    assert.equal(valid.payment, 'cod');
    await assert.rejects(shopify.fetchOrders({ ...env, SHOPIFY_STORE_DOMAIN: 'evil.example.com' }, 0), { status: 503 });
});
