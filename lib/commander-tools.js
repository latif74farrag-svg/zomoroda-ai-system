// Database-only tools. No HTTP, shell, model calls or implicit external authority.
const { fail } = require('./commerce');
const STAGES = ['new', 'qualified', 'quoted', 'won', 'lost'];
function text(value, max = 500) {
    if (typeof value !== 'string' || !value.trim() || value.length > max) fail(400, 'راجع النص المطلوب وطوله.');
    return value.trim();
}
function integer(value, min, max) {
    if (!Number.isSafeInteger(value) || value < min || value > max) fail(400, 'قيمة رقمية غير صالحة.');
    return value;
}
function fields(input, allowed) {
    if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !allowed.includes(key))) fail(400, 'بيانات المهمة غير مدعومة.');
}
function windowInput(input) { fields(input, ['days']); return { days: integer(input.days ?? 1, 1, 90) }; }
const rows = async (tx, sql, args = []) => (await tx.execute({ sql, args })).rows.map(row => ({ ...row }));
async function lead(tx, id) {
    if (!(await rows(tx, 'SELECT id FROM leads WHERE id = ?', [id])).length) fail(404, 'العميل غير موجود.');
}
async function businessReport(tx, input, now) {
    const cutoff = new Date(now - input.days * 86400000).toISOString().slice(0, 19).replace('T', ' ');
    const sales = (await rows(tx, `SELECT COUNT(*) AS orders, COALESCE(SUM(total_minor),0) AS booked_minor FROM store_orders WHERE datetime(created_at) >= datetime(?) AND datetime(created_at) <= datetime(?) AND status NOT IN ('cancelled','returned')`, [cutoff, new Date(now).toISOString()]))[0];
    const collections = (await rows(tx, 'SELECT COALESCE(SUM(amount_minor),0) AS collected_minor FROM cod_collections WHERE created_at >= ? AND created_at <= ?', [now - input.days * 86400000, now]))[0];
    const customers = (await rows(tx, 'SELECT COUNT(*) AS new_leads FROM leads WHERE created_at >= ? AND created_at <= ?', [now - input.days * 86400000, now]))[0];
    const followups = (await rows(tx, "SELECT COUNT(*) AS uncontacted FROM leads WHERE opted_out = 0 AND last_contact_at IS NULL"))[0];
    return { ...sales, ...collections, ...customers, ...followups, days: input.days, sales_basis: 'booked_non_cancelled_non_returned_orders', roi: null, roi_unavailable_reason: 'No verified campaign cost and revenue attribution', sources: ['store_orders', 'cod_collections', 'leads'] };
}
async function stockReport(tx) {
    const items = await rows(tx, `SELECT i.product_id, p.name, i.on_hand, i.reserved, i.on_hand-i.reserved AS available, i.low_stock,
        (SELECT MAX(h.created_at) FROM inventory_history h WHERE h.product_id=i.product_id) AS last_stock_adjustment_at
        FROM inventory i JOIN store_products p ON p.id=i.product_id WHERE i.on_hand-i.reserved <= i.low_stock ORDER BY available, i.product_id LIMIT 201`);
    return { low_stock: items.slice(0, 200), truncated: items.length > 200, balance_verified_at: null, provenance: 'last_stock_adjustment_at is recorded adjustment time, not physical stock verification' };
}
const DEFINITIONS = {
    'manager.report': { agent: 'manager', label: 'تقرير الإدارة', validate: windowInput, async run(tx, input, task, now) {
        return { ...(await businessReport(tx, input, now)), ...(await stockReport(tx)),
            campaigns: await rows(tx, 'SELECT status, COUNT(*) AS count FROM marketing_campaigns GROUP BY status'),
            delivery: await rows(tx, 'SELECT channel, status, COUNT(*) AS count FROM outbox WHERE created_at >= ? GROUP BY channel, status', [now - input.days * 86400000]),
            tasks: await rows(tx, 'SELECT assigned_agent, status, COUNT(*) AS count FROM commander_tasks WHERE id <> ? GROUP BY assigned_agent, status', [task.id]),
            pending_legacy_approvals: Number((await rows(tx, "SELECT COUNT(*) AS n FROM agent_tasks WHERE status='proposed'"))[0].n),
            dead_jobs: Number((await rows(tx, "SELECT COUNT(*) AS n FROM jobs WHERE status='dead'"))[0].n) };
    } },
    'bi.report': { agent: 'bi', label: 'تقرير المبيعات والتحصيل', validate: windowInput, run: (tx, input, task, now) => businessReport(tx, input, now) },
    'pricing.simulate': { agent: 'pricing', label: 'محاكاة الربحية', validate(input) {
        fields(input, ['productId', 'costMinor', 'discountBps']);
        return { productId: text(input.productId, 80), costMinor: integer(input.costMinor, 0, 1000000000), discountBps: integer(input.discountBps ?? 0, 0, 10000) };
    }, async run(tx, input) {
        const product = (await rows(tx, 'SELECT id, price FROM store_products WHERE id = ? AND is_active = 1', [input.productId]))[0];
        if (!product) fail(404, 'المنتج غير موجود أو غير نشط.');
        const listMinor = Math.round(Number(product.price) * 100);
        if (!Number.isSafeInteger(listMinor) || listMinor < 0 || listMinor > 1000000000) fail(409, 'سعر المنتج غير صالح.');
        const saleMinor = Math.round(listMinor * (10000 - input.discountBps) / 10000);
        const profitMinor = saleMinor - input.costMinor;
        return { product_id: product.id, list_minor: listMinor, sale_minor: saleMinor, cost_minor: input.costMinor, profit_minor: profitMinor, margin_bps: saleMinor ? Math.round(profitMinor * 10000 / saleMinor) : null, cost_source: 'explicit_task_input', price_source: 'store_products.price', effect: 'simulation_only' };
    } },
    'distribution.report': { agent: 'distribution', label: 'تقرير تغطية القطاعات', validate(input) { fields(input, []); return {}; }, async run(tx) {
        return { sectors: await rows(tx, 'SELECT sector, COUNT(*) AS leads, SUM(consent) AS consented, SUM(opted_out) AS opted_out FROM leads GROUP BY sector ORDER BY leads DESC'), geographical_coverage: null, limitation: 'No verified region or distributor territory dataset', sources: ['leads'] };
    } },
    'procurement.report': { agent: 'procurement', label: 'تقرير احتياجات التوريد', validate(input) { fields(input, []); return {}; }, async run(tx) {
        return { ...(await stockReport(tx)), purchase_orders: await rows(tx, 'SELECT status, COUNT(*) AS count, COALESCE(SUM(total_minor),0) AS total_minor FROM purchase_orders GROUP BY status'), effect: 'report_only', sources: ['inventory', 'inventory_history', 'purchase_orders'] };
    } },
    'crm.note': { agent: 'crm', label: 'تسجيل ملاحظة عميل', validate(input) { fields(input, ['leadId', 'note']); return { leadId: text(input.leadId, 80), note: text(input.note, 1000) }; }, async run(tx, input, task, now) {
        await lead(tx, input.leadId);
        await tx.execute({ sql: 'INSERT INTO crm_notes VALUES (?,?,?,?,?)', args: [task.id, input.leadId, input.note, task.created_by, now] });
        return { note_id: task.id, lead_id: input.leadId, effect: 'note_saved', contact_recorded: false };
    } },
    'crm.create_opportunity': { agent: 'crm', label: 'إنشاء فرصة بيع', validate(input) {
        fields(input, ['leadId', 'title', 'valueMinor']); return { leadId: text(input.leadId, 80), title: text(input.title, 180), valueMinor: integer(input.valueMinor ?? 0, 0, 100000000000) };
    }, async run(tx, input, task, now) {
        await lead(tx, input.leadId);
        await tx.execute({ sql: "INSERT INTO crm_opportunities VALUES (?,?,?,'new',?,?,?,?,?)", args: [task.id, input.leadId, input.title, input.valueMinor, task.created_by, task.id, now, now] });
        return { opportunity_id: task.id, stage: 'new', effect: 'opportunity_saved' };
    } },
    'crm.update_opportunity': { agent: 'crm', label: 'تحديث فرصة بيع بعد المراجعة', approval: true, validate(input) {
        fields(input, ['opportunityId', 'stage', 'valueMinor', 'expectedUpdatedAt']);
        if (!STAGES.includes(input.stage)) fail(400, 'مرحلة البيع غير صالحة.');
        return { opportunityId: text(input.opportunityId, 80), stage: input.stage, valueMinor: integer(input.valueMinor, 0, 100000000000), expectedUpdatedAt: integer(input.expectedUpdatedAt, 0, Number.MAX_SAFE_INTEGER) };
    }, async run(tx, input, task, now) {
        const changed = await tx.execute({ sql: 'UPDATE crm_opportunities SET stage=?, value_minor=?, updated_at=? WHERE id=? AND updated_at=?', args: [input.stage, input.valueMinor, Math.max(now, input.expectedUpdatedAt + 1), input.opportunityId, input.expectedUpdatedAt] });
        if (Number(changed.rowsAffected) !== 1) fail(409, 'تغيرت فرصة البيع أو لم تعد موجودة. أنشئ طلب مراجعة جديداً.');
        return { opportunity_id: input.opportunityId, stage: input.stage, effect: 'opportunity_updated' };
    } }
};
function definition(type) { if (!Object.hasOwn(DEFINITIONS, type)) fail(400, 'نوع المهمة غير مدعوم.'); return DEFINITIONS[type]; }
function types() { return Object.entries(DEFINITIONS).map(([type, tool]) => ({ type, agent: tool.agent, label: tool.label, approval: Boolean(tool.approval) })); }
module.exports = { definition, types, text, integer };
