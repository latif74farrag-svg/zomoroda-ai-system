const crypto = require('node:crypto');
const { transaction } = require('./storage');
const { fail, audit, adjustStockInTransaction } = require('./commerce');

function text(value, max, required = false) {
    if (typeof value !== 'string' || value.trim().length > max || (required && !value.trim())) fail(400, 'راجع النصوص المطلوبة وحدود طولها.');
    return value.trim();
}
async function once(database, key, input, action) {
    if (typeof key !== 'string' || !/^[A-Za-z0-9_-]{8,120}$/.test(key)) fail(400, 'مفتاح العملية مطلوب؛ حدّث الصفحة ثم أعد المحاولة.');
    const fingerprint = crypto.createHash('sha256').update(JSON.stringify(input)).digest('hex');
    return transaction(database, async tx => {
        const prior = (await tx.execute({ sql: 'SELECT * FROM purchasing_requests WHERE key = ?', args: [key] })).rows[0];
        if (prior) {
            if (prior.fingerprint !== fingerprint) fail(409, 'استُخدم مفتاح العملية لبيانات مختلفة.');
            return JSON.parse(prior.result);
        }
        const result = await action(tx);
        await tx.execute({ sql: 'INSERT INTO purchasing_requests VALUES (?,?,?)', args: [key, fingerprint, JSON.stringify(result)] });
        return result;
    });
}
async function addSupplier(database, body, actor, key) {
    const name = text(body.name, 180, true), contact = text(body.contact ?? '', 180);
    return once(database, key, ['supplier', actor, name, contact], async tx => {
        const id = crypto.randomUUID();
        await tx.execute({ sql: 'INSERT INTO suppliers VALUES (?,?,?,?)', args: [id, name, contact, Date.now()] });
        await audit(tx, actor, 'supplier.created', id, { name });
        return { id };
    });
}
async function createOrder(database, body, actor, key) {
    const supplierId = text(body.supplier_id, 80, true), notes = text(body.notes ?? '', 500);
    if (!Array.isArray(body.lines) || !body.lines.length || body.lines.length > 50) fail(400, 'أضف من 1 إلى 50 صنفاً.');
    const seen = new Set();
    const lines = body.lines.map(line => {
        const productId = text(line.product_id, 80, true);
        if (seen.has(productId)) fail(400, 'اجمع كمية الصنف في سطر واحد.');
        seen.add(productId);
        if (!Number.isSafeInteger(line.quantity) || line.quantity < 1 || line.quantity > 1000000 || !Number.isSafeInteger(line.unit_minor) || line.unit_minor < 0 || line.unit_minor > 1000000000) fail(400, 'أدخل كمية صحيحة وتكلفة صالحة بالقروش.');
        return { productId, quantity: line.quantity, unitMinor: line.unit_minor };
    });
    const total = lines.reduce((sum, line) => sum + line.quantity * line.unitMinor, 0);
    if (!Number.isSafeInteger(total) || total > 100000000000) fail(400, 'إجمالي أمر الشراء يتجاوز الحد المسموح.');
    return once(database, key, ['order', actor, supplierId, notes, lines], async tx => {
        if (!(await tx.execute({ sql: 'SELECT id FROM suppliers WHERE id = ?', args: [supplierId] })).rows.length) fail(400, 'اختر مورداً مسجلاً.');
        const id = crypto.randomUUID(), now = Date.now();
        await tx.execute({ sql: 'INSERT INTO purchase_orders(id,supplier_id,total_minor,notes,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?)', args: [id,supplierId,total,notes,actor,now,now] });
        for (const line of lines) {
            const product = (await tx.execute({ sql: 'SELECT name FROM store_products WHERE id = ? AND is_active = 1', args: [line.productId] })).rows[0];
            if (!product) fail(400, 'أحد الأصناف غير موجود أو غير نشط.');
            await tx.execute({ sql: 'INSERT INTO purchase_order_lines VALUES (?,?,?,?,?)', args: [id,line.productId,product.name,line.quantity,line.unitMinor] });
        }
        await audit(tx, actor, 'purchase.created', id, { total_minor: total });
        return { id };
    });
}
async function changeStatus(database, id, status, actor) {
    if (!['approved','cancelled'].includes(status)) fail(400, 'حالة غير صالحة.');
    return transaction(database, async tx => {
        const order = (await tx.execute({ sql: 'SELECT * FROM purchase_orders WHERE id = ?', args: [id] })).rows[0];
        if (!order) fail(404, 'أمر الشراء غير موجود.');
        if (order.status === status) return { id, status };
        if (!['draft','approved'].includes(order.status) || (status === 'approved' && order.status !== 'draft')) fail(409, 'لا يمكن تغيير حالة هذا الأمر.');
        await tx.execute({ sql: 'UPDATE purchase_orders SET status = ?, approved_by = CASE WHEN ? = \'approved\' THEN ? ELSE approved_by END, updated_at = ? WHERE id = ?', args: [status,status,actor,Date.now(),id] });
        await audit(tx, actor, 'purchase.' + status, id);
        return { id, status };
    });
}
async function receive(database, id, body, actor, key) {
    const reference = text(body.reference, 120, true);
    return once(database, key, ['receipt', actor, id, reference], async tx => {
        const order = (await tx.execute({ sql: 'SELECT * FROM purchase_orders WHERE id = ?', args: [id] })).rows[0];
        if (!order) fail(404, 'أمر الشراء غير موجود.');
        const existing = (await tx.execute({ sql: 'SELECT * FROM goods_receipts WHERE order_id = ? OR reference = ?', args: [id,reference] })).rows[0];
        if (existing) { if (existing.order_id === id && existing.reference === reference) return { id: existing.id, orderId: id }; fail(409, 'الاستلام مسجّل بالفعل أو مرجعه مستخدم.'); }
        if (order.status !== 'approved') fail(409, 'اعتمد أمر الشراء قبل تسجيل الاستلام.');
        const lines = (await tx.execute({ sql: 'SELECT * FROM purchase_order_lines WHERE order_id = ?', args: [id] })).rows;
        for (const line of lines) await adjustStockInTransaction(tx, line.product_id, Number(line.quantity), 'استلام أمر شراء ' + id, actor);
        const receiptId = crypto.randomUUID();
        await tx.execute({ sql: 'INSERT INTO goods_receipts VALUES (?,?,?,?,?)', args: [receiptId,id,reference,actor,Date.now()] });
        await tx.execute({ sql: "UPDATE purchase_orders SET status = 'received', received_by = ?, updated_at = ? WHERE id = ?", args: [actor,Date.now(),id] });
        await audit(tx, actor, 'purchase.received', id, { receiptId, reference });
        return { id: receiptId, orderId: id };
    });
}
async function overview(database) {
    const suppliers = (await database.execute('SELECT * FROM suppliers ORDER BY name')).rows;
    const products = (await database.execute('SELECT id, name FROM store_products WHERE is_active = 1 ORDER BY name')).rows;
    const orders = (await database.execute('SELECT p.*, s.name AS supplier_name, r.reference AS receipt_reference FROM purchase_orders p JOIN suppliers s ON s.id = p.supplier_id LEFT JOIN goods_receipts r ON r.order_id = p.id ORDER BY p.created_at DESC LIMIT 100')).rows;
    const lines = orders.length ? (await database.execute({ sql: `SELECT * FROM purchase_order_lines WHERE order_id IN (${orders.map(() => '?').join(',')})`, args: orders.map(order => order.id) })).rows : [];
    return { suppliers, products, orders: orders.map(order => ({ ...order, lines: lines.filter(line => line.order_id === order.id) })) };
}
module.exports = { addSupplier, createOrder, changeStatus, receive, overview };
