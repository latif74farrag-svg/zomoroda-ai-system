// Agent #20: the Guardian. A fail-closed gate that every agent proposal and every approved execution passes through.
// It is deterministic (no LLM) and accepts either the database or an open transaction, so it can run at both checkpoints.
const crypto = require('node:crypto');
const { normalizeContact } = require('../leads');
const { outreachDecision } = require('../outreach-policy');
const { LIST_FOR_SECTOR } = require('../price-lists');

// Every action must be listed here. Anything else is blocked (fail closed).
const TIMING = new Set(['working_hours', 'message_spacing', 'batch_break']);
const KNOWN_ACTIONS = new Set(['import_order', 'apply_fixes', 'outreach_whatsapp', 'outreach_email', 'reply_social']);

function cairoDay(now) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(new Date(now));
}

async function checkOutreach(db, action, payload, now, add) {
    const contact = normalizeContact(payload.contact);
    if (!contact) return add('block', 'invalid_contact');
    if ((await db.execute({ sql: 'SELECT 1 FROM do_not_contact WHERE contact_key = ?', args: [contact.key] })).rows.length) return add('block', 'do_not_contact');
    const lead = (await db.execute({ sql: 'SELECT * FROM leads WHERE contact_key = ?', args: [contact.key] })).rows[0];
    if (lead && Number(lead.opted_out)) return add('block', 'opted_out');
    const decision = outreachDecision({
        sector: payload.sector || lead?.sector, productType: payload.productType, retailPrice: payload.retailPrice,
        channel: action === 'outreach_email' ? 'email' : 'whatsapp', consent: Boolean(lead && Number(lead.consent)), optedOut: false,
        lastContactAt: lead?.last_contact_at ? Number(lead.last_contact_at) : null, lastWhatsappAt: payload.lastWhatsappAt,
        batchCount: payload.batchCount, breakStartedAt: payload.breakStartedAt, now
    });
    // Timing rules (hours, spacing, break) are enforced by the sender at the moment of sending, so approving after hours still queues the message.
    if (!decision.allowed && !(payload.deferTiming && TIMING.has(decision.reason))) add('block', decision.reason);
}

// Social replies are only allowed on supported channels, inside the platform's reply window (24h for Meta).
function checkReply(payload, now, add) {
    if (!['messenger', 'instagram', 'telegram'].includes(payload.channel)) add('block', 'channel');
    if (payload.windowExpiresAt && now > Number(payload.windowExpiresAt)) add('block', 'window_expired');
    if (!String(payload.text || '').trim() || String(payload.text).length > 1000) add('block', 'invalid_text');
}

// Authoritative prices: retail products come from store_products, sector lines from that sector's own price list.
async function checkPrices(db, payload, add) {
    const sectorList = payload.sector ? LIST_FOR_SECTOR[payload.sector] : null;
    for (const line of payload.lines) {
        if (line.product_id) {
            const product = (await db.execute({ sql: 'SELECT price FROM store_products WHERE id = ?', args: [line.product_id] })).rows[0];
            if (!product) { add('block', 'unknown_product', { product_id: line.product_id }); continue; }
            const expected = Math.round(Number(product.price) * 100);
            if (expected !== line.unit_minor) add('warn', 'price_mismatch', { product_id: line.product_id, expected_minor: expected, actual_minor: line.unit_minor });
        } else if (line.item_key) {
            if (!sectorList) { add('block', 'sector_required', { item_key: line.item_key }); continue; }
            if (line.list && line.list !== sectorList) { add('block', 'catalog_isolation', { item_key: line.item_key, list: line.list, allowed: sectorList }); continue; }
            const item = (await db.execute({ sql: 'SELECT unit_minor, carton_minor, unit_tax_minor, carton_tax_minor, consumer_minor FROM price_list_items WHERE list = ? AND item_key = ?', args: [sectorList, line.item_key] })).rows[0];
            if (!item) { add('warn', 'unknown_item', { item_key: line.item_key }); continue; }
            const known = [item.unit_minor, item.carton_minor, item.unit_tax_minor, item.carton_tax_minor, item.consumer_minor].filter(value => value !== null && value !== undefined).map(Number);
            if (!known.includes(line.unit_minor)) add('warn', 'price_mismatch', { item_key: line.item_key, known_minor: known, actual_minor: line.unit_minor });
        } else add('block', 'unidentified_line');
    }
}

async function dailyLimit(db, agent, action) {
    return (await db.execute({ sql: "SELECT agent, daily_limit FROM guardian_limits WHERE action = ? AND agent IN (?, '*') ORDER BY CASE WHEN agent = '*' THEN 1 ELSE 0 END LIMIT 1", args: [action, agent] })).rows[0] || null;
}

// phase 'propose' only reads counters; phase 'execute' reserves one unit atomically (and is the only phase that can consume budget).
async function review(db, { agent, action, subject, payload = {}, phase = 'propose', taskId = null, now = Date.now() }) {
    const reasons = [];
    const add = (level, code, detail) => reasons.push(detail ? { level, code, detail } : { level, code });
    if (!KNOWN_ACTIONS.has(action)) add('block', 'unknown_action');
    else {
        if (phase === 'execute') {
            const global = (await db.execute("SELECT paused FROM agent_controls WHERE agent = 'global'")).rows[0];
            if (!global || Number(global.paused)) add('block', 'global_pause');
        }
        if (action.startsWith('outreach_')) await checkOutreach(db, action, payload, now, add);
        if (action === 'reply_social') checkReply(payload, now, add);
        if (Array.isArray(payload.lines) && payload.lines.length) await checkPrices(db, payload, add);
        const limit = await dailyLimit(db, agent, action);
        if (limit && !reasons.some(reason => reason.level === 'block')) {
            const day = cairoDay(now);
            if (phase === 'execute') {
                const max = Number(limit.daily_limit);
                const reserved = max > 0 ? await db.execute({ sql: 'INSERT INTO guardian_usage(day, agent, action, count) VALUES (?, ?, ?, 1) ON CONFLICT(day, agent, action) DO UPDATE SET count = count + 1 WHERE count < ?', args: [day, limit.agent, action, max] }) : { rowsAffected: 0 };
                if (Number(reserved.rowsAffected) !== 1) add('block', 'daily_limit', { limit: max });
            } else {
                const used = (await db.execute({ sql: 'SELECT count FROM guardian_usage WHERE day = ? AND agent = ? AND action = ?', args: [day, limit.agent, action] })).rows[0];
                if (Number(used?.count || 0) >= Number(limit.daily_limit)) add('warn', 'daily_limit_reached', { limit: Number(limit.daily_limit) });
            }
        }
    }
    const verdict = reasons.some(reason => reason.level === 'block') ? 'block' : reasons.length ? 'warn' : 'pass';
    await db.execute({ sql: 'INSERT INTO guardian_decisions(id, agent, action, subject, verdict, reasons, task_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', args: [crypto.randomUUID(), agent, String(action), String(subject ?? ''), verdict, JSON.stringify(reasons), taskId, now] });
    return { verdict, reasons };
}

module.exports = { review, KNOWN_ACTIONS, cairoDay };
