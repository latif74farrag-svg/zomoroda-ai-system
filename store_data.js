const { createClient } = require('@libsql/client');
const { STORE_PRODUCTS } = require('./products_config');

let client;
let initialization;

function isStoreDatabaseConfigured() {
    return Boolean(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN);
}

function getClient() {
    if (!isStoreDatabaseConfigured()) {
        throw new Error('إعداد قاعدة بيانات المتجر الدائمة غير مكتمل.');
    }
    if (!client) {
        client = createClient({
            url: process.env.TURSO_DATABASE_URL,
            authToken: process.env.TURSO_AUTH_TOKEN
        });
    }
    return client;
}

async function initializeStoreDatabase() {
    if (!initialization) {
        initialization = (async () => {
            const db = getClient();
            await db.batch([
                `CREATE TABLE IF NOT EXISTS store_products (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    brand TEXT,
                    category TEXT NOT NULL,
                    price REAL NOT NULL,
                    unit TEXT,
                    carton INTEGER,
                    variants TEXT,
                    description TEXT,
                    image_url TEXT,
                    is_active INTEGER NOT NULL DEFAULT 1,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                )`,
                `CREATE TABLE IF NOT EXISTS store_orders (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    order_number TEXT NOT NULL UNIQUE,
                    customer_name TEXT NOT NULL,
                    customer_phone TEXT NOT NULL,
                    customer_address TEXT NOT NULL,
                    notes TEXT,
                    items TEXT NOT NULL,
                    total REAL NOT NULL,
                    payment_method TEXT NOT NULL DEFAULT 'cash',
                    status TEXT NOT NULL DEFAULT 'pending',
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                )`
            ], 'write');

            const count = await db.execute('SELECT COUNT(*) AS count FROM store_products');
            if (Number(count.rows[0].count) === 0) {
                const seedStatements = STORE_PRODUCTS.map(product => ({
                    sql: `INSERT OR IGNORE INTO store_products
                        (id, name, brand, category, price, unit, carton, variants, description, image_url, is_active)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
                    args: [
                        product.id,
                        product.name,
                        product.brand || null,
                        product.category || 'offers',
                        Number(product.price),
                        product.unit || null,
                        product.carton || null,
                        JSON.stringify(product.variants || []),
                        product.desc || product.description || null,
                        product.image_url || null
                    ]
                }));
                await db.batch(seedStatements, 'write');
            }
        })();
    }
    await initialization;
}

function mapProduct(row) {
    let variants = [];
    try {
        variants = row.variants ? JSON.parse(row.variants) : [];
    } catch (error) {
        console.error(`تعذر قراءة تنويعات المنتج ${row.id}:`, error.message);
    }
    return {
        id: row.id,
        name: row.name,
        brand: row.brand,
        category: row.category,
        price: Number(row.price),
        unit: row.unit,
        carton: row.carton,
        variants,
        desc: row.description,
        image_url: row.image_url,
        is_active: Boolean(row.is_active)
    };
}

async function getProducts({ category, includeInactive = false } = {}) {
    await initializeStoreDatabase();
    const conditions = [];
    const args = [];
    if (!includeInactive) conditions.push('is_active = 1');
    if (category && category !== 'all') {
        conditions.push('category = ?');
        args.push(category);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await getClient().execute({
        sql: `SELECT * FROM store_products ${where} ORDER BY name COLLATE NOCASE`,
        args
    });
    return result.rows.map(mapProduct);
}

async function getProductById(id, { includeInactive = false } = {}) {
    await initializeStoreDatabase();
    const result = await getClient().execute({
        sql: `SELECT * FROM store_products WHERE id = ? ${includeInactive ? '' : 'AND is_active = 1'}`,
        args: [id]
    });
    return result.rows[0] ? mapProduct(result.rows[0]) : null;
}

async function saveProduct(product) {
    await initializeStoreDatabase();
    await getClient().execute({
        sql: `INSERT INTO store_products
            (id, name, brand, category, price, unit, carton, variants, description, image_url, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                brand = excluded.brand,
                category = excluded.category,
                price = excluded.price,
                unit = excluded.unit,
                carton = excluded.carton,
                variants = excluded.variants,
                description = excluded.description,
                image_url = excluded.image_url,
                is_active = excluded.is_active,
                updated_at = CURRENT_TIMESTAMP`,
        args: [
            product.id,
            product.name,
            product.brand || null,
            product.category,
            product.price,
            product.unit || null,
            product.carton,
            JSON.stringify(product.variants),
            product.description || null,
            product.image_url || null,
            product.is_active ? 1 : 0
        ]
    });
    return getProductById(product.id, { includeInactive: true });
}

async function setProductActive(id, active) {
    await initializeStoreDatabase();
    const result = await getClient().execute({
        sql: 'UPDATE store_products SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        args: [active ? 1 : 0, id]
    });
    return Number(result.rowsAffected) > 0;
}

async function createOrder({ orderNumber, customerName, customerPhone, customerAddress, notes, items, total }) {
    await initializeStoreDatabase();
    await getClient().execute({
        sql: `INSERT INTO store_orders
            (order_number, customer_name, customer_phone, customer_address, notes, items, total, payment_method, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'cash', 'pending')`,
        args: [orderNumber, customerName, customerPhone, customerAddress, notes, JSON.stringify(items), total]
    });
}

async function getOrderForTracking(phone, orderNumber) {
    await initializeStoreDatabase();
    const result = await getClient().execute({
        sql: `SELECT order_number, status, total, created_at, items
            FROM store_orders WHERE customer_phone = ? AND order_number = ?`,
        args: [phone, orderNumber]
    });
    if (!result.rows[0]) return null;
    return { ...result.rows[0], items: JSON.parse(result.rows[0].items) };
}

async function getOrders({ status = 'all', limit = 100 } = {}) {
    await initializeStoreDatabase();
    const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
    const statusFilter = validStatuses.includes(status) ? status : 'all';
    const result = await getClient().execute({
        sql: `SELECT * FROM store_orders ${statusFilter === 'all' ? '' : 'WHERE status = ?'}
            ORDER BY created_at DESC LIMIT ?`,
        args: statusFilter === 'all' ? [limit] : [statusFilter, limit]
    });
    return result.rows.map(row => ({ ...row, items: JSON.parse(row.items) }));
}

async function updateOrderStatus(orderNumber, status) {
    await initializeStoreDatabase();
    const result = await getClient().execute({
        sql: 'UPDATE store_orders SET status = ? WHERE order_number = ?',
        args: [status, orderNumber]
    });
    return Number(result.rowsAffected) > 0;
}

module.exports = {
    createOrder,
    getOrderForTracking,
    getOrders,
    getProductById,
    getProducts,
    initializeStoreDatabase,
    isStoreDatabaseConfigured,
    saveProduct,
    setProductActive,
    updateOrderStatus
};
