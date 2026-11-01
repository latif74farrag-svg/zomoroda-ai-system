const storage = require('./lib/storage');
const { migrate } = require('./lib/migrations');
const { STORE_PRODUCTS } = require('./products_config');

let initialization;

function isStoreDatabaseConfigured() {
    return storage.configured();
}

const getClient = storage.getDatabase;

async function initializeStoreDatabase() {
    if (!initialization) {
        initialization = (async () => {
            const db = await getClient();
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
                    customer_id TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                )`,
                `CREATE TABLE IF NOT EXISTS store_customers (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    phone TEXT NOT NULL UNIQUE,
                    password_salt TEXT NOT NULL,
                    password_hash TEXT NOT NULL,
                    session_version INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                )`
            ], 'write');

            await storage.transaction(db, async tx => {
            const orderColumns = await tx.execute('PRAGMA table_info(store_orders)');
            if (!orderColumns.rows.some(column => column.name === 'customer_id')) {
                await tx.execute('ALTER TABLE store_orders ADD COLUMN customer_id TEXT');
            }
            const customerColumns = await tx.execute('PRAGMA table_info(store_customers)');
            if (!customerColumns.rows.some(column => column.name === 'session_version')) {
                await tx.execute('ALTER TABLE store_customers ADD COLUMN session_version INTEGER NOT NULL DEFAULT 0');
            }
            });

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
            await migrate(db);
            await db.batch(seedStatements, 'write');
            await db.execute('INSERT OR IGNORE INTO inventory(product_id) SELECT id FROM store_products');
        })();
        initialization.catch(() => { initialization = undefined; });
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
        price: require('./lib/commerce').minor(row.price) / 100,
        unit: row.unit,
        carton: row.carton,
        variants,
        desc: row.description,
        image_url: row.image_url,
        is_active: Boolean(row.is_active),
        price_minor: require('./lib/commerce').minor(row.price),
        available_stock: Number(row.available_stock || 0)
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
    const result = await (await getClient()).execute({
        sql: `SELECT store_products.*, COALESCE(inventory.on_hand - inventory.reserved, 0) AS available_stock FROM store_products LEFT JOIN inventory ON inventory.product_id = store_products.id ${where} ORDER BY name COLLATE NOCASE`,
        args
    });
    return result.rows.map(mapProduct);
}

async function getProductById(id, { includeInactive = false } = {}) {
    await initializeStoreDatabase();
    const result = await (await getClient()).execute({
        sql: `SELECT store_products.*, COALESCE(inventory.on_hand - inventory.reserved, 0) AS available_stock FROM store_products LEFT JOIN inventory ON inventory.product_id = store_products.id WHERE store_products.id = ? ${includeInactive ? '' : 'AND is_active = 1'}`,
        args: [id]
    });
    return result.rows[0] ? mapProduct(result.rows[0]) : null;
}

async function saveProduct(product, actor = 'system:catalog') {
    await initializeStoreDatabase();
    await storage.transaction(await getClient(), async tx => {
    await tx.execute({
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
            require('./lib/commerce').minor(product.price) / 100,
            product.unit || null,
            product.carton,
            JSON.stringify(product.variants),
            product.description || null,
            product.image_url || null,
            product.is_active ? 1 : 0
        ]
    });
    await tx.execute({ sql: 'INSERT OR IGNORE INTO inventory(product_id) VALUES (?)', args: [product.id] });
    await require('./lib/commerce').audit(tx, actor, 'catalog.saved', product.id, { price_minor: require('./lib/commerce').minor(product.price), active: product.is_active });
    });
    return getProductById(product.id, { includeInactive: true });
}

async function setProductActive(id, active, actor = 'system:catalog') {
    await initializeStoreDatabase();
    return storage.transaction(await getClient(), async tx => {
    const result = await tx.execute({
        sql: 'UPDATE store_products SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        args: [active ? 1 : 0, id]
    });
    if (Number(result.rowsAffected)) await require('./lib/commerce').audit(tx, actor, 'catalog.visibility', id, { active });
    return Number(result.rowsAffected) > 0;
    });
}

async function createCustomer({ id, name, phone, passwordSalt, passwordHash }) {
    await initializeStoreDatabase();
    await (await getClient()).execute({
        sql: `INSERT INTO store_customers (id, name, phone, password_salt, password_hash, session_version)
            VALUES (?, ?, ?, ?, ?, 0)`,
        args: [id, name, phone, passwordSalt, passwordHash]
    });
    return getCustomerById(id);
}

async function getCustomerByPhone(phone) {
    await initializeStoreDatabase();
    const result = await (await getClient()).execute({
        sql: 'SELECT id, name, phone, password_salt, password_hash, session_version FROM store_customers WHERE phone = ?',
        args: [phone]
    });
    return result.rows[0] || null;
}

async function getCustomerById(id) {
    await initializeStoreDatabase();
    const result = await (await getClient()).execute({
        sql: 'SELECT id, name, phone, session_version, created_at FROM store_customers WHERE id = ?',
        args: [id]
    });
    return result.rows[0] || null;
}

async function invalidateCustomerSessions(id) {
    await initializeStoreDatabase();
    await (await getClient()).execute({
        sql: 'UPDATE store_customers SET session_version = session_version + 1 WHERE id = ?',
        args: [id]
    });
}

async function getCustomerOrders(customerId) {
    await initializeStoreDatabase();
    const result = await (await getClient()).execute({
        sql: `SELECT order_number, status, total, created_at, items
            FROM store_orders WHERE customer_id = ? ORDER BY created_at DESC LIMIT 100`,
        args: [customerId]
    });
    return result.rows.map(row => ({ ...row, items: JSON.parse(row.items) }));
}

async function getOrderForTracking(phone, orderNumber) {
    await initializeStoreDatabase();
    const result = await (await getClient()).execute({
        sql: `SELECT order_number, status, total, created_at, items
            FROM store_orders WHERE customer_phone = ? AND order_number = ?`,
        args: [phone, orderNumber]
    });
    if (!result.rows[0]) return null;
    return { ...result.rows[0], items: JSON.parse(result.rows[0].items) };
}

async function getOrders({ status = 'all', limit = 100 } = {}) {
    await initializeStoreDatabase();
    const validStatuses = Object.keys(require('./lib/commerce').transitions);
    const statusFilter = validStatuses.includes(status) ? status : 'all';
    const result = await (await getClient()).execute({
        sql: `SELECT * FROM store_orders ${statusFilter === 'all' ? '' : 'WHERE status = ?'}
            ORDER BY created_at DESC LIMIT ?`,
        args: statusFilter === 'all' ? [limit] : [statusFilter, limit]
    });
    return result.rows.map(row => ({ ...row, items: JSON.parse(row.items) }));
}

async function updateOrderStatus(orderNumber, status, actor) {
    await initializeStoreDatabase();
    return require('./lib/commerce').updateStatus(await getClient(), orderNumber, status, actor);
}

module.exports = {
    createCustomer,
    getCustomerById,
    getCustomerByPhone,
    getCustomerOrders,
    invalidateCustomerSessions,
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
