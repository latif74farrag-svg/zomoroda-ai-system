const { localDatabase } = require('../lib/storage');
const { migrate } = require('../lib/migrations');
async function fixture() {
    const db = await localDatabase(':memory:');
    await db.batch([
        `CREATE TABLE store_products (id TEXT PRIMARY KEY, name TEXT, price REAL, unit TEXT, variants TEXT, is_active INTEGER DEFAULT 1)`,
        `CREATE TABLE store_orders (order_number TEXT PRIMARY KEY, customer_name TEXT, customer_phone TEXT, customer_address TEXT, notes TEXT, items TEXT, total REAL, payment_method TEXT, status TEXT, customer_id TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
        `CREATE TABLE store_customers (id TEXT PRIMARY KEY, phone TEXT, password_salt TEXT, password_hash TEXT, session_version INTEGER DEFAULT 0)`
    ]);
    await migrate(db);
    await db.execute("INSERT INTO store_products(id, name, price, variants) VALUES ('p1', 'Retail product', 10.15, '[\"rose\"]')");
    await db.execute("INSERT INTO inventory(product_id, on_hand) VALUES ('p1', 10)");
    return db;
}
function order(quantity = 1) {
    return { customer_name: 'Test Customer', customer_phone: '01012345678', customer_address: 'Cairo test address', notes: '', payment_method: 'cash', items: [{ id: 'p1', qty: quantity, variant: 'rose' }] };
}
module.exports = { fixture, order };
