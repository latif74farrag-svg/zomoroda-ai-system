const { test } = require('node:test');
const assert = require('node:assert/strict');

test('catalog separates carton packing from sellable inventory and offers an inventory action', async t => {
    process.env.NODE_ENV = 'test';
    delete process.env.VERCEL;
    delete process.env.TURSO_DATABASE_URL;
    delete process.env.TURSO_AUTH_TOKEN;
    process.env.COMMERCE_DB_PATH = ':memory:';
    process.env.SHIPPING_FEE_MINOR = '0';
    const store = require('../store_data');
    await store.initializeStoreDatabase();
    const db = await require('../lib/storage').getDatabase();
    t.after(() => db.close());
    const saved = await store.saveProduct({ id: 'stock-example', name: 'Test roll', category: 'cleaning', price: 120, carton: 18, unit: 'roll', variants: [], is_active: true }, 'test');
    assert.equal(saved.carton, 18);
    assert.equal(saved.available_stock, 0, 'packing never creates unverified physical inventory');
    await require('../lib/commerce').adjustStock(db, saved.id, 18, 'verified count', 'test');
    assert.equal((await store.getProductById(saved.id)).available_stock, 18);
    await store.saveProduct({ ...saved, carton: 24 }, 'test');
    assert.equal((await store.getProductById(saved.id)).available_stock, 18);
    const html = require('../views/storeAdmin').getStoreAdminHtml({ cleaning: { name: 'Cleaning', icon: '' } });
    assert.ok(html.includes('id="stockDialog"'), 'catalog must provide a direct stock action, not only carton packing');
    assert.ok(html.includes('عدد القطع بالكرتونة لا يغيّر رصيد المخزون'));
});

test('catalog text repair corrects known damaged seeds and preserves staff-edited names', async t => {
    const db = await require('./helpers').fixture(); t.after(() => db.close());
    await db.execute("INSERT INTO store_products(id, name, variants) VALUES ('care-protect-20', 'رونزا حماية مزدوج�� 20 منديل', '[]')");
    await db.execute({ sql: 'INSERT INTO store_products(id, name, variants) VALUES (?, ?, ?)', args: ['baby-120', 'Staff custom title', JSON.stringify(['أ��فال ولد', 'أطفال بنت'])] });
    await db.execute('DELETE FROM schema_migrations WHERE version = 16');
    await require('../lib/migrations').migrate(db);
    const care = (await db.execute("SELECT * FROM store_products WHERE id = 'care-protect-20'")).rows[0];
    const baby = (await db.execute("SELECT * FROM store_products WHERE id = 'baby-120'")).rows[0];
    assert.equal(care.name, 'رونزا حماية مزدوجة 20 منديل');
    assert.equal(baby.name, 'Staff custom title');
    assert.deepEqual(JSON.parse(baby.variants), ['أطفال ولد', 'أطفال بنت']);
    await db.execute("UPDATE store_products SET name = 'Custom title' WHERE id = 'care-protect-20'");
    await db.execute('DELETE FROM schema_migrations WHERE version = 16');
    await require('../lib/migrations').migrate(db);
    assert.equal((await db.execute("SELECT name FROM store_products WHERE id = 'care-protect-20'")).rows[0].name, 'Custom title');
});
