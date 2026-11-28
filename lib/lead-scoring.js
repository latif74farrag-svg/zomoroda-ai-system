// Lead scoring and routing. Rules only (no model calls, no cost): every point can be explained to staff.
// Writes score/priority/route on the lead row. It never contacts anyone: routing is a label that staff and the
// outreach agent read, and outreach still needs consent, the 30-day gap and approval.
const { fail } = require('./commerce');

const STAGE_POINTS = { new: 0, awaiting_category: 5, welcomed: 10, catalog_sent: 20, prices_sent: 30, order_inquired: 45, ordered: 55, opted_out: 0 };
const VALUABLE_SECTORS = new Set(['hotels', 'distribution', 'hypermarkets', 'pharmacies', 'supplies', 'salon']);
const HOT = 60, WARM = 35;

// Egyptian store orders keep a local phone (01XXXXXXXXX); leads keep international digits (20XXXXXXXXXX).
const localPhone = key => (/^20(1\d{9})$/.test(key) ? '0' + key.slice(2) : key);

function scoreLead(lead, signals = {}) {
    if (Number(lead.opted_out) || lead.stage === 'opted_out') return { score: 0, priority: 'none', route: 'none', reasons: ['opted_out'] };
    const reasons = [];
    let score = STAGE_POINTS[lead.stage] ?? 0;
    if (score) reasons.push(`stage:${lead.stage}`);
    const add = (points, reason) => { score += points; reasons.push(reason); };
    if (lead.sector && lead.sector !== 'unknown') add(10, 'sector_known');
    if (VALUABLE_SECTORS.has(lead.sector)) add(5, 'valuable_sector');
    if (Number(lead.consent)) add(10, 'consent');
    if (String(lead.name || '').trim()) add(5, 'has_name');
    if (signals.orders >= 1) add(15, 'has_orders');
    if (signals.orders >= 2) add(5, 'repeat_buyer');
    if (signals.openOpportunities >= 1) add(5, 'open_opportunity');
    score = Math.min(100, score);
    const priority = score >= HOT ? 'hot' : score >= WARM ? 'warm' : 'cold';
    // hot -> a person follows up; warm -> eligible for an outreach proposal; cold -> nurture later
    const route = priority === 'hot' ? 'sales' : priority === 'warm' ? 'outreach' : 'nurture';
    return { score, priority, route, reasons };
}

// Scores up to `limit` leads (least recently scored first). Updates only rows whose result changed.
async function scoreAll(db, now = Date.now(), { limit = 2000 } = {}) {
    const leads = (await db.execute({ sql: 'SELECT id, contact_key, name, sector, stage, consent, opted_out, score, priority, route FROM leads ORDER BY COALESCE(scored_at, 0), id LIMIT ?', args: [Math.min(Math.max(Number(limit) || 2000, 1), 5000)] })).rows;
    const orders = new Map((await db.execute("SELECT customer_phone, COUNT(*) AS n FROM store_orders WHERE status NOT IN ('cancelled','returned') GROUP BY customer_phone")).rows.map(row => [String(row.customer_phone), Number(row.n)]));
    const opportunities = new Map((await db.execute("SELECT lead_id, COUNT(*) AS n FROM crm_opportunities WHERE stage NOT IN ('won','lost') GROUP BY lead_id")).rows.map(row => [row.lead_id, Number(row.n)]));
    const summary = { scored: 0, changed: 0, hot: 0, warm: 0, cold: 0, none: 0 };
    for (const lead of leads) {
        const result = scoreLead(lead, { orders: orders.get(localPhone(lead.contact_key)) || 0, openOpportunities: opportunities.get(lead.id) || 0 });
        summary.scored++; summary[result.priority]++;
        const same = Number(lead.score) === result.score && lead.priority === result.priority && lead.route === result.route;
        if (!same) summary.changed++;
        await db.execute({ sql: 'UPDATE leads SET score = ?, priority = ?, route = ?, scored_at = ? WHERE id = ?', args: [result.score, result.priority, result.route, now, lead.id] });
    }
    return summary;
}

async function topLeads(db, { priority, limit = 20 } = {}) {
    if (priority && !['hot', 'warm', 'cold'].includes(priority)) fail(400, 'Invalid priority');
    return (await db.execute({ sql: `SELECT id, name, sector, stage, score, priority, route FROM leads WHERE opted_out = 0 ${priority ? 'AND priority = ?' : ''} ORDER BY score DESC, updated_at DESC LIMIT ?`, args: priority ? [priority, limit] : [limit] })).rows;
}
module.exports = { scoreLead, scoreAll, topLeads, HOT, WARM };
