const crypto = require('node:crypto');
const { transaction } = require('./storage');

function fail(status, message) { throw Object.assign(new Error(message), { status }); }
function minor(value) {
    const amount = Math.round(Number(value) * 100);
    if (!Number.isSafeInteger(amount) || amount < 0 || amount > 1000000000) fail(400, 'Invalid price');
    return amount;
}
async function audit(tx, actor, action, resource, details = {}) {
    await tx.execute({ sql: 'INSERT INTO audit_log(actor, action, resource, details, created_at) VALUES (?, ?, ?, ?, ?)', args: [actor, action, resource, JSON.stringify(details), Date.now()] });
}
async function enqueue(tx, id, type, payload, now = Date.now()) {
    await tx.execute({ sql: 'INSERT OR IGNORE INTO jobs(id, type, payload, available_at, created_at) VALUES (?, ?, ?, ?, ?)', args: [id, type, JSON.stringify(payload), now, now] });
}
function shippingFee() {
    const raw = process.env.SHIPPING_FEE_MINOR;
    if (raw === undefined && require('./storage').production()) fail(503, 'SHIPPING_FEE_MINOR must be configured');
    const amount = Number(raw ?? 0);
    if (!Number.isSafeInteger(amount) || amount < 0 || amount > 100000000) fail(503, 'Invalid shipping configuration');
    return amount;
}
async function quote(database, items) {
    const request = normalizeOrder({ customer_name: 'Quote', customer_phone: '01000000000', customer_address: 'Quote address', items });
    const lines = [];
    const requested = new Map();
    for (const item of request.items) {
        const product = (await database.execute({ sql: 'SELECT store_products.*, COALESCE(inventory.on_hand - inventory.reserved, 0) AS available FROM store_products LEFT JOIN inventory ON inventory.product_id = store_products.id WHERE store_products.id = ? AND is_active = 1', args: [item.id] })).rows[0];
        const quantity = (requested.get(item.id) || 0) + item.quantity;
        requested.set(item.id, quantity);
        if (!product || quantity > product.available) fail(409, 'الكمية المطلوبة غير متاحة حالياً.');
        const variants = JSON.parse(product.variants || '[]');
        if ((variants.length && !item.variant) || (item.variant && !variants.includes(item.variant))) fail(400, 'اختر تنويعاً صالحاً للمنتج.');
        const price = minor(product.price);
        lines.push({ id: product.id, variant: item.variant, quantity: item.quantity, price_minor: price, line_total_minor: price * item.quantity });
    }
    const subtotal = lines.reduce((sum, line) => sum + line.line_total_minor, 0);
    const shipping = shippingFee();
    return { items: lines, subtotal_minor: subtotal, shipping_minor: shipping, total_minor: subtotal + shipping, currency: 'EGP' };
}
function normalizeOrder(body, customer) {
    const name = String(body.customer_name || customer?.name || '').trim();
    const phone = String(customer?.phone || body.customer_phone || '').replace(/\D/g, '');
    const address = String(body.customer_address || '').trim();
    const notes = String(body.notes || '').trim();
    if (!name || name.length > 120 || !/^(010|011|012|015)\d{8}$/.test(phone) || address.length < 5 || address.length > 500 || notes.length > 500) fail(400, 'يرجى إدخال بيانات عميل وعنوان صحيحين.');
    if (body.payment_method && body.payment_method !== 'cash') fail(400, 'الدفع عند الاستلام فقط.');
    if (!Array.isArray(body.items) || !body.items.length || body.items.length > 50) fail(400, 'السلة غير صالحة.');
    const grouped = new Map();
    const quantities = new Map();
    for (const item of body.items) {
        const id = item?.id;
        const quantity = item?.qty ?? item?.quantity;
        const variant = item?.variant || '';
        if (typeof id !== 'string' || id.length > 160 || !Number.isInteger(quantity) || quantity < 1 || quantity > 99 || typeof variant !== 'string' || variant.length > 80) fail(400, 'المنتج أو الكمية غير صالحة.');
        const key = JSON.stringify([id, variant]);
        const combined = (grouped.get(key)?.quantity || 0) + quantity;
        const productQuantity = (quantities.get(id) || 0) + quantity;
        if (productQuantity > 99) fail(400, 'الكمية تتجاوز الحد المسموح.');
        quantities.set(id, productQuantity);
        grouped.set(key, { id, variant, quantity: combined });
    }
    return { name, phone, address, notes, customerId: customer?.id || null, items: [...grouped.values()].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))) };
}
// Validation only (no database access), so callers can reject bad input before opening a transaction.
function prepareOrder(body, key, customer = null) {
    if (typeof key !== 'string' || !/^[A-Za-z0-9_-]{16,128}$/.test(key)) fail(400, 'A valid Idempotency-Key header is required');
    const request = normalizeOrder(body, customer);
    const hash = crypto.createHash('sha256').update(JSON.stringify(request)).digest('hex');
    return { request, hash };
}
async function createOrder(database, body, key, customer = null, now = Date.now()) {
    const prepared = prepareOrder(body, key, customer);
    return transaction(database, tx => placeOrder(tx, prepared, body, key, now));
}
// Runs inside a caller-owned transaction (used by createOrder and by approved agent executions).
async function placeOrder(tx, { request, hash }, body, key, now = Date.now()) {
    {
        const existing = (await tx.execute({ sql: 'SELECT order_number, total_minor, request_hash FROM store_orders WHERE idempotency_key = ?', args: [key] })).rows[0];
        if (existing) {
            if (existing.request_hash !== hash) fail(409, 'This checkout key was already used for different order details');
            return { orderNumber: existing.order_number, total: existing.total_minor / 100, replayed: true };
        }
        const items = [];
        let total = 0;
        for (const item of request.items) {
            const product = (await tx.execute({ sql: 'SELECT * FROM store_products WHERE id = ? AND is_active = 1', args: [item.id] })).rows[0];
            if (!product) fail(409, 'أحد المنتجات لم يعد متاحاً.');
            const variants = JSON.parse(product.variants || '[]');
            if ((variants.length && !item.variant) || (item.variant && !variants.includes(item.variant))) fail(400, 'اختر تنويعاً صالحاً للمنتج.');
            const priceMinor = minor(product.price);
            const lineMinor = priceMinor * item.quantity;
            const stock = await tx.execute({ sql: 'UPDATE inventory SET reserved = reserved + ? WHERE product_id = ? AND on_hand - reserved >= ?', args: [item.quantity, item.id, item.quantity] });
            if (Number(stock.rowsAffected) !== 1) fail(409, 'الكمية المطلوبة غير متاحة حالياً.');
            total += lineMinor;
            items.push({ id: item.id, name: product.name, variant: item.variant, unit: product.unit, quantity: item.quantity, price_minor: priceMinor, line_total_minor: lineMinor, price: priceMinor / 100, lineTotal: lineMinor / 100 });
        }
        const subtotal = total;
        const shipping = shippingFee();
        total += shipping;
        if (body.expected_total_minor !== undefined && body.expected_total_minor !== total) fail(409, 'تغير السعر أو التوصيل. حدّث الصفحة وراجع الإجمالي قبل تأكيد الطلب.');
        if (!Number.isSafeInteger(total) || total > 1000000000) fail(400, 'Order value exceeds limit');
        const orderNumber = `ZMR-${new Date(now).toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
        await tx.execute({
            sql: `INSERT INTO store_orders(order_number, customer_name, customer_phone, customer_address, notes, items, total, total_minor, payment_method, status, customer_id, idempotency_key, request_hash, reservation_expires_at, stock_state, subtotal_minor, shipping_minor) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'cash', 'pending', ?, ?, ?, ?, 'reserved', ?, ?)`,
            args: [orderNumber, request.name, request.phone, request.address, request.notes, JSON.stringify(items), total / 100, total, request.customerId, key, hash, now + 24 * 3600000, subtotal, shipping]
        });
        await enqueue(tx, `order:${orderNumber}`, 'order.created', { orderNumber }, now);
        for (const item of items) await enqueue(tx, `order-stock:${orderNumber}:${item.id}`, 'inventory.changed', { productId: item.id }, now);
        await audit(tx, request.customerId || 'guest', 'order.created', orderNumber, { total_minor: total });
        return { orderNumber, total: total / 100, replayed: false };
    }
}

const transitions = {
    pending: ['confirmed', 'cancelled'], confirmed: ['shipped', 'cancelled'],
    shipped: ['delivered', 'delivery_failed'], delivery_failed: ['shipped', 'returned'],
    delivered: ['returned'], returned: [], cancelled: []
};
async function transitionOrder(tx, orderNumber, status, actor, now = Date.now()) {
    const order = (await tx.execute({ sql: 'SELECT * FROM store_orders WHERE order_number = ?', args: [orderNumber] })).rows[0];
    if (!order) fail(404, 'Order not found');
    if (order.status === status) return true;
    if (!transitions[order.status]?.includes(status)) fail(409, 'Invalid order status transition');
    if (status === 'confirmed' && order.reservation_expires_at && order.reservation_expires_at <= now) fail(409, 'Stock reservation expired; cancel this order');
    let stockState = order.stock_state;
    for (const item of JSON.parse(order.items)) {
        if (stockState === 'reserved' && ['shipped', 'cancelled'].includes(status)) {
            const changed = await tx.execute({ sql: 'UPDATE inventory SET reserved = reserved - ?, on_hand = on_hand - ? WHERE product_id = ? AND reserved >= ?', args: [item.quantity, status === 'shipped' ? item.quantity : 0, item.id, item.quantity] });
            if (Number(changed.rowsAffected) !== 1) fail(409, 'Inventory needs reconciliation');
        }
        if (stockState === 'consumed' && status === 'returned') {
            await tx.execute({ sql: 'UPDATE inventory SET on_hand = on_hand + ? WHERE product_id = ?', args: [item.quantity, item.id] });
        }
        if ((stockState === 'reserved' && status === 'shipped') || (stockState === 'consumed' && status === 'returned')) {
            await tx.execute({ sql: 'INSERT INTO inventory_history(product_id, delta, reason, actor, created_at) VALUES (?, ?, ?, ?, ?)', args: [item.id, status === 'returned' ? item.quantity : -item.quantity, `${status}:${orderNumber}`, actor, now] });
        }
    }
    if (stockState === 'reserved' && status === 'shipped') stockState = 'consumed';
    if (stockState === 'reserved' && status === 'cancelled') stockState = 'released';
    if (stockState === 'consumed' && status === 'returned') stockState = 'restocked';
    await tx.execute({ sql: 'UPDATE store_orders SET status = ?, stock_state = ?, reservation_expires_at = NULL WHERE order_number = ?', args: [status, stockState, orderNumber] });
    await audit(tx, actor, 'order.status', orderNumber, { from: order.status, to: status });
    await enqueue(tx, `status:${orderNumber}:${status}`, 'order.status', { orderNumber, status }, now);
    for (const item of JSON.parse(order.items)) await enqueue(tx, `status-stock:${orderNumber}:${status}:${item.id}`, 'inventory.changed', { productId: item.id }, now);
    return true;
}
async function updateStatus(database, orderNumber, status, actor) {
    return transaction(database, tx => transitionOrder(tx, orderNumber, status, actor));
}
async function expireReservations(database, now = Date.now()) {
    return transaction(database, async tx => {
        const expired = await tx.execute({ sql: "SELECT order_number FROM store_orders WHERE status = 'pending' AND stock_state = 'reserved' AND reservation_expires_at <= ? LIMIT 100", args: [now] });
        for (const row of expired.rows) await transitionOrder(tx, row.order_number, 'cancelled', 'system:expiry', now);
        return expired.rows.length;
    });
}
async function adjustStock(database, productId, delta, reason, actor) {
    return transaction(database, tx => adjustStockInTransaction(tx, productId, delta, reason, actor));
}
async function adjustStockInTransaction(tx, productId, delta, reason, actor) {
    if (!Number.isSafeInteger(delta) || Math.abs(delta) > 1000000 || typeof reason !== 'string' || reason.trim().length < 3 || reason.length > 500) fail(400, 'A valid adjustment and reason are required');
        await tx.execute({ sql: 'INSERT OR IGNORE INTO inventory(product_id) SELECT id FROM store_products WHERE id = ?', args: [productId] });
        const changed = await tx.execute({ sql: 'UPDATE inventory SET on_hand = on_hand + ? WHERE product_id = ? AND on_hand + ? >= reserved', args: [delta, productId, delta] });
        if (Number(changed.rowsAffected) !== 1) fail(409, 'Adjustment would invalidate stock or product does not exist');
        await tx.execute({ sql: 'INSERT INTO inventory_history(product_id, delta, reason, actor, created_at) VALUES (?, ?, ?, ?, ?)', args: [productId, delta, reason.trim(), actor, Date.now()] });
        await audit(tx, actor, 'inventory.adjusted', productId, { delta, reason });
        await enqueue(tx, `stock:${crypto.randomUUID()}`, 'inventory.changed', { productId });
}
module.exports = { createOrder, prepareOrder, placeOrder, normalizeOrder, minor, audit, enqueue, fail, updateStatus, transitionOrder, expireReservations, adjustStock, adjustStockInTransaction, transitions, shippingFee, quote };
