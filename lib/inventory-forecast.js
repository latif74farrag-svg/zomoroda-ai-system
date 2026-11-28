// Predictive inventory: sales velocity from real orders -> days of cover -> suggested purchase quantity.
// Deterministic and database-only (no model calls, no cost). It never buys anything: results become staff-reviewed proposals.
const DAY = 86400000;
const { SQLITE_TIME } = { SQLITE_TIME: ms => new Date(ms).toISOString().slice(0, 19).replace('T', ' ') };

const DEFAULTS = { windowDays: 30, leadTimeDays: 14, coverDays: 30 };

// Units sold per product in the window. Cancelled and returned orders do not count as demand.
async function velocity(db, now, windowDays) {
    const rows = (await db.execute({ sql: "SELECT items FROM store_orders WHERE datetime(created_at) >= datetime(?) AND datetime(created_at) <= datetime(?) AND status NOT IN ('cancelled','returned')", args: [SQLITE_TIME(now - windowDays * DAY), SQLITE_TIME(now)] })).rows;
    const sold = new Map();
    for (const row of rows) {
        let items; try { items = JSON.parse(row.items); } catch { continue; } // an unreadable legacy row adds no demand
        if (!Array.isArray(items)) continue;
        for (const item of items) {
            const quantity = Number(item?.quantity ?? item?.qty);
            if (typeof item?.id === 'string' && Number.isInteger(quantity) && quantity > 0) sold.set(item.id, (sold.get(item.id) || 0) + quantity);
        }
    }
    return sold;
}

// Stock already ordered from suppliers but not yet received (draft and approved purchase orders).
async function incoming(db) {
    const rows = (await db.execute("SELECT l.product_id, SUM(l.quantity) AS n FROM purchase_order_lines l JOIN purchase_orders o ON o.id = l.order_id WHERE o.status IN ('draft','approved') GROUP BY l.product_id")).rows;
    return new Map(rows.map(row => [row.product_id, Number(row.n)]));
}

function clamp(value, fallback, min, max) {
    const number = Number(value);
    return Number.isInteger(number) && number >= min && number <= max ? number : fallback;
}

// Returns only products at risk, most urgent first. A product is at risk when its available stock plus incoming
// purchases will not last through the supplier lead time at the recent sales rate.
async function forecast(db, now = Date.now(), options = {}) {
    const windowDays = clamp(options.windowDays, DEFAULTS.windowDays, 7, 180);
    const leadTimeDays = clamp(options.leadTimeDays, DEFAULTS.leadTimeDays, 1, 120);
    const coverDays = clamp(options.coverDays, DEFAULTS.coverDays, 1, 180);
    const [sold, ordered] = [await velocity(db, now, windowDays), await incoming(db)];
    const stock = (await db.execute('SELECT i.product_id, p.name, i.on_hand, i.reserved FROM inventory i JOIN store_products p ON p.id = i.product_id WHERE p.is_active = 1')).rows;
    const risks = [];
    for (const row of stock) {
        const units = sold.get(row.product_id) || 0;
        if (!units) continue; // no recent sales: nothing to predict (the low-stock rule still covers empty shelves)
        const perDay = units / windowDays;
        const available = Number(row.on_hand) - Number(row.reserved);
        const onOrder = ordered.get(row.product_id) || 0;
        const daysOfCover = Math.max(0, available) / perDay;
        const daysWithIncoming = Math.max(0, available + onOrder) / perDay;
        if (daysWithIncoming >= leadTimeDays) continue;
        const suggested = Math.ceil(perDay * (leadTimeDays + coverDays) - available - onOrder);
        if (suggested < 1) continue;
        risks.push({ product_id: row.product_id, name: row.name, available, on_order: onOrder, sold_in_window: units, window_days: windowDays, per_day: Math.round(perDay * 100) / 100, days_of_cover: Math.round(daysOfCover * 10) / 10, lead_time_days: leadTimeDays, suggested_quantity: suggested, stockout_at: now + Math.floor(daysOfCover * DAY) });
    }
    return risks.sort((a, b) => a.days_of_cover - b.days_of_cover || a.product_id.localeCompare(b.product_id));
}

// Turns the riskiest products into review tasks for staff. One task per product per ISO-week, so reruns never duplicate.
async function proposeReplenishment(db, now = Date.now(), { limit = 20 } = {}) {
    const agents = require('./agents');
    const settings = await require('./agent-settings').get(db, 'inventory');
    const risks = await forecast(db, now, settings);
    const week = Math.floor(now / (7 * DAY));
    let created = 0;
    for (const risk of risks.slice(0, limit)) {
        const sourceId = `forecast:${risk.product_id}:${week}`;
        if ((await db.execute({ sql: 'SELECT id FROM agent_tasks WHERE agent = ? AND source_id = ?', args: ['inventory', sourceId] })).rows.length) continue;
        const cover = risk.days_of_cover < 1 ? 'أقل من يوم' : `نحو ${Math.floor(risk.days_of_cover)} يوم`;
        try {
            await agents.propose(db, 'inventory', sourceId, risk, { tool: 'replenishment_recommendation', productId: risk.product_id, title: `خطر نفاد: ${risk.name} (يكفي ${cover})`, message: `معدل البيع ${risk.per_day} وحدة/يوم، المتاح ${risk.available}${risk.on_order ? ` والمطلوب من الموردين ${risk.on_order}` : ''}. الكمية المقترحة للشراء: ${risk.suggested_quantity} وحدة. أنشئ أمر الشراء من صفحة المشتريات بعد المراجعة.`, suggested_quantity: risk.suggested_quantity }, 'forecast-v1');
            created++;
        } catch (error) {
            if (error.status === 429) break; // the agent's daily proposal limit protects staff from floods
            throw error;
        }
    }
    return { at_risk: risks.length, created };
}
module.exports = { forecast, proposeReplenishment, DEFAULTS };
