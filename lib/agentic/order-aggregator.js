// Agent #13: Order Aggregator. Turns orders from outside channels (Shopify, Noon/Amazon exports, manual files) into store orders.
// Intake and SKU mapping are automatic; creating the real order always needs staff approval and passes the Guardian twice.
const crypto = require('node:crypto');
const { BaseAgent } = require('./base-agent');
const { transaction } = require('../storage');
const { audit, enqueue, fail, prepareOrder, placeOrder } = require('../commerce');
const adapter = require('../integrations/channel-adapter');
const shopify = require('../integrations/shopify');

async function setStatus(db, id, status, reason = '', now = Date.now()) {
    await db.execute({ sql: 'UPDATE channel_orders SET status = ?, reason = ?, updated_at = ? WHERE id = ?', args: [status, reason, now, id] });
}
const importKey = (channel, externalId) => 'ch_' + crypto.createHash('sha256').update(`${channel}:${externalId}`).digest('hex').slice(0, 48);

// Stores validated orders; duplicates are no-ops. Orders not yet proposed are refreshed if the channel changed them.
async function ingest(database, channel, rows, actor, now = Date.now()) {
    if (!Array.isArray(rows) || !rows.length || rows.length > 100) fail(400, 'أرسل من 1 إلى 100 طلب.');
    const result = { received: 0, duplicates: 0, changed: 0, rejected: [] };
    const valid = [];
    rows.forEach((row, index) => {
        try { valid.push(adapter.validateOrder(channel, row)); }
        catch (error) { if (!error.status) throw error; result.rejected.push({ row: index + 1, reason: error.message }); }
    });
    await transaction(database, async tx => {
        for (const order of valid) {
            const hash = adapter.hashOrder(order);
            const existing = (await tx.execute({ sql: 'SELECT id, raw_hash, status FROM channel_orders WHERE channel = ? AND external_id = ?', args: [channel, order.external_id] })).rows[0];
            if (existing) {
                result.duplicates++;
                if (existing.raw_hash !== hash) {
                    result.changed++;
                    if (['received', 'needs_mapping', 'manual'].includes(existing.status)) {
                        await tx.execute({ sql: "UPDATE channel_orders SET payload = ?, raw_hash = ?, status = 'received', reason = '', updated_at = ? WHERE id = ?", args: [JSON.stringify(order), hash, now, existing.id] });
                        await enqueue(tx, `channel-order:${existing.id}:changed:${now}`, 'channel.order', { channelOrderId: existing.id }, now);
                    } else await audit(tx, `agent:aggregator`, 'channel.order.changed_after_proposal', `${channel}:${order.external_id}`, { status: existing.status });
                }
                continue;
            }
            const id = crypto.randomUUID();
            await tx.execute({ sql: 'INSERT INTO channel_orders(id, channel, external_id, status, payload, raw_hash, received_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', args: [id, channel, order.external_id, 'received', JSON.stringify(order), hash, now, now] });
            await enqueue(tx, `channel-order:${id}:${now}`, 'channel.order', { channelOrderId: id }, now);
            result.received++;
        }
        if (actor) await audit(tx, actor, 'channel.orders.imported', channel, { received: result.received, duplicates: result.duplicates, rejected: result.rejected.length });
    });
    return result;
}

// Staff map an external SKU to a store product once; every order waiting on mapping is re-queued.
async function mapSku(database, { channel, externalSku, productId, variant = '' }, actor, now = Date.now()) {
    if (!adapter.CHANNELS.includes(channel) || !externalSku || !productId) fail(400, 'بيانات ربط المنتج غير صالحة.');
    return transaction(database, async tx => {
        const product = (await tx.execute({ sql: 'SELECT variants FROM store_products WHERE id = ?', args: [productId] })).rows[0];
        if (!product) fail(404, 'المنتج غير موجود.');
        const variants = JSON.parse(product.variants || '[]');
        if ((variants.length && !variants.includes(variant)) || (!variants.length && variant)) fail(400, 'التنويع غير صالح لهذا المنتج.');
        await tx.execute({ sql: 'INSERT INTO channel_sku_map(channel, external_sku, product_id, variant) VALUES (?, ?, ?, ?) ON CONFLICT(channel, external_sku) DO UPDATE SET product_id = excluded.product_id, variant = excluded.variant', args: [channel, externalSku, productId, variant] });
        const waiting = (await tx.execute({ sql: "SELECT id FROM channel_orders WHERE channel = ? AND status = 'needs_mapping'", args: [channel] })).rows;
        for (const row of waiting) await enqueue(tx, `channel-order:${row.id}:remap:${now}`, 'channel.order', { channelOrderId: row.id }, now);
        await audit(tx, actor, 'channel.sku.mapped', `${channel}:${externalSku}`, { productId, requeued: waiting.length });
        return { requeued: waiting.length };
    });
}

const tools = [
    {
        name: 'import_order', kind: 'propose', action: 'import_order',
        validate(args) {
            if (typeof args.channelOrderId !== 'string' || typeof args.key !== 'string' || !args.body || !Array.isArray(args.lines)) fail(400, 'Invalid import proposal');
            return args;
        },
        async run(ctx, args) {
            const row = (await ctx.db.execute({ sql: 'SELECT id, status FROM channel_orders WHERE id = ?', args: [args.channelOrderId] })).rows[0];
            if (!row) return { ok: false, reason: 'missing_channel_order' };
            if (row.status === 'imported') return { ok: true };
            // A savepoint lets a business failure (for example, no stock) be recorded without losing the rest of the transaction.
            await ctx.db.execute('SAVEPOINT import_order');
            try {
                const placed = await placeOrder(ctx.db, prepareOrder(args.body, args.key), args.body, args.key, ctx.now);
                await ctx.db.execute('RELEASE import_order');
                await ctx.db.execute({ sql: "UPDATE channel_orders SET status = 'imported', order_number = ?, reason = '', updated_at = ? WHERE id = ?", args: [placed.orderNumber, ctx.now, row.id] });
                await audit(ctx.db, 'agent:aggregator', 'channel.order.imported', placed.orderNumber, { channelOrderId: row.id, approvedBy: ctx.approvedBy, replayed: placed.replayed });
                return { ok: true, orderNumber: placed.orderNumber };
            } catch (error) {
                if (!(error.status >= 400 && error.status < 500)) throw error;
                await ctx.db.execute('ROLLBACK TO import_order');
                await ctx.db.execute('RELEASE import_order');
                await setStatus(ctx.db, row.id, 'rejected', error.message.slice(0, 200), ctx.now);
                return { ok: false, reason: 'order_rejected' };
            }
        }
    }
];

class OrderAggregatorAgent extends BaseAgent {
    constructor() { super({ name: 'aggregator', version: 'rules-v1', tools }); }
    async plan(ctx, job) {
        if (job.type === 'channel.poll') return this.poll(ctx);
        const row = (await ctx.db.execute({ sql: 'SELECT * FROM channel_orders WHERE id = ?', args: [JSON.parse(job.payload).channelOrderId] })).rows[0];
        if (!row || !['received', 'needs_mapping', 'manual'].includes(row.status)) return;
        const order = JSON.parse(row.payload);
        if (order.payment !== 'cod') return setStatus(ctx.db, row.id, 'manual', 'prepaid_requires_manual', ctx.now); // no payment ledger yet; staff handle these by hand
        const items = [];
        const lines = [];
        const missing = [];
        for (const line of order.lines) {
            const mapped = (await ctx.db.execute({ sql: 'SELECT product_id, variant FROM channel_sku_map WHERE channel = ? AND external_sku = ?', args: [row.channel, line.external_sku] })).rows[0];
            if (!mapped) { missing.push(line.external_sku); continue; }
            items.push({ id: mapped.product_id, qty: line.qty, variant: mapped.variant });
            lines.push({ product_id: mapped.product_id, unit_minor: line.unit_minor, qty: line.qty });
        }
        if (missing.length) return setStatus(ctx.db, row.id, 'needs_mapping', `unmapped_sku:${missing.join(',').slice(0, 150)}`, ctx.now);
        const body = { customer_name: order.customer.name, customer_phone: order.customer.phone, customer_address: order.customer.address, notes: `${row.channel} #${order.external_id}`, payment_method: 'cash', items };
        const key = importKey(row.channel, order.external_id);
        try { prepareOrder(body, key); }
        catch (error) { if (!error.status) throw error; return setStatus(ctx.db, row.id, 'rejected', error.message.slice(0, 200), ctx.now); }
        // The store price is authoritative; the Guardian warns staff when the channel charged something different.
        const outcome = await this.submit(ctx, {
            sourceId: `import:${row.id}`, action: 'import_order', subject: `${row.channel}:${order.external_id}`,
            evidence: { channel: row.channel, externalId: order.external_id, customer: order.customer.name, lines },
            proposal: { tool: 'import_order', channelOrderId: row.id, key, body, lines }
        });
        if (outcome.blocked) await setStatus(ctx.db, row.id, 'rejected', `guardian:${outcome.verdict.reasons.map(reason => reason.code).join(',')}`.slice(0, 200), ctx.now);
        else await setStatus(ctx.db, row.id, 'proposed', '', ctx.now);
    }
    async poll(ctx) {
        if (!shopify.configured()) return;
        const state = (await ctx.db.execute("SELECT value FROM system_state WHERE key = 'shopify_last_poll'")).rows[0];
        const since = state ? Number(state.value) : ctx.now - 7 * 86400000;
        const rows = await shopify.fetchOrders(process.env, since, ctx.fetcher || fetch);
        // Stored before the cursor moves; a re-fetched order is a harmless duplicate.
        if (rows.length) await ingest(ctx.db, 'shopify', rows.slice(0, 100), 'agent:aggregator', ctx.now);
        await ctx.db.execute({ sql: "INSERT INTO system_state(key, value) VALUES ('shopify_last_poll', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", args: [ctx.now - 60000] });
    }
}
module.exports = new OrderAggregatorAgent();
module.exports.ingest = ingest;
module.exports.mapSku = mapSku;
module.exports.importKey = importKey;
