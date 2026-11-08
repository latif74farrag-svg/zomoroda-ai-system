// Durable outbox shared by every outbound channel. Agents never send: an approved task inserts a row here,
// and a channel sender (WhatsApp process, worker for email/social) delivers it only when gate() allows.
// Gate = agent switch + the same outreach policy the Guardian uses (consent, 30 days, hours, spacing, 5-message break).
const crypto = require('node:crypto');
const { transaction } = require('./storage');
const { audit, fail } = require('./commerce');
const { outreachDecision } = require('./outreach-policy');

const CHANNELS = ['whatsapp', 'email', 'messenger', 'instagram', 'telegram'];
const CONTROL = { whatsapp: 'whatsapp', email: 'email', messenger: 'social', instagram: 'social', telegram: 'social' };
const SENT_ACTION = { whatsapp: 'agent.whatsapp.sent', email: 'agent.email.sent', messenger: 'agent.social.sent', instagram: 'agent.social.sent', telegram: 'agent.social.sent' };
const FAILED_ACTION = { whatsapp: 'agent.whatsapp.failed', email: 'agent.email.failed', messenger: 'agent.social.failed', instagram: 'agent.social.failed', telegram: 'agent.social.failed' };
const TIMING = new Set(['working_hours', 'message_spacing', 'batch_break']); // wait, do not cancel
const MAX_ATTEMPTS = 3;
const MIN = 60000;
// Gap between two sends, randomised so traffic does not look scripted. WhatsApp: at least 10 minutes (policy), email: 1-3 minutes.
const PACING = { whatsapp: [10 * MIN, 15 * MIN], email: [MIN, 3 * MIN] };

const mask = recipient => recipient.includes('@') ? recipient.replace(/^(.{2}).*(@.*)$/, '$1••••$2') : `${recipient.slice(0, 4)}••••${recipient.slice(-3)}`;
const pacingKey = channel => `outbox_next:${channel}`;

async function enqueue(db, { channel, recipient, subject = '', body, kind = 'outreach', agent, sector = '', productType = '', taskId = null, windowExpiresAt = null, now = Date.now() }) {
    if (!CHANNELS.includes(channel)) fail(400, 'Unknown channel');
    const text = String(body || '').trim();
    if (!recipient || !text || text.length > 4000) fail(400, 'Invalid message');
    const id = crypto.randomUUID();
    const result = await db.execute({
        sql: 'INSERT OR IGNORE INTO outbox(id, channel, recipient, subject, body, kind, agent, sector, product_type, task_id, window_expires_at, available_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: [id, channel, String(recipient), String(subject).slice(0, 200), text, kind, agent, sector, productType, taskId, windowExpiresAt, now, now]
    });
    return { id, created: Number(result.rowsAffected) === 1 };
}

async function streak(db, channel) {
    const rows = (await db.execute({ sql: "SELECT sent_at FROM outbox WHERE channel = ? AND status = 'sent' AND kind = 'outreach' ORDER BY sent_at DESC LIMIT 10", args: [channel] })).rows.map(row => Number(row.sent_at));
    let count = 0;
    for (let index = 0; index < rows.length; index++) {
        if (index > 0 && rows[index - 1] - rows[index] >= 30 * MIN) break; // a 30-minute gap ended the previous batch
        count++;
    }
    return { batchCount: count, breakStartedAt: rows[0] || null, lastSentAt: rows[0] || null };
}

// -> { ok: true } | { hold: reason } (try again later) | { cancel: reason } (this message must never be sent)
async function gate(db, row, now = Date.now()) {
    const agents = require('./agents');
    if (!await agents.enabled(db, CONTROL[row.channel])) return { hold: 'paused' };
    if (row.kind === 'reply') {
        if (row.window_expires_at && now > Number(row.window_expires_at)) return { cancel: 'window_expired' };
        return { ok: true };
    }
    const next = (await db.execute({ sql: 'SELECT value FROM system_state WHERE key = ?', args: [pacingKey(row.channel)] })).rows[0];
    if (next && Number(next.value) > now) return { hold: 'pacing' };
    if ((await db.execute({ sql: 'SELECT 1 FROM do_not_contact WHERE contact_key = ?', args: [row.recipient] })).rows.length) return { cancel: 'do_not_contact' };
    const lead = (await db.execute({ sql: 'SELECT * FROM leads WHERE contact_key = ?', args: [row.recipient] })).rows[0];
    const state = row.channel === 'whatsapp' ? await streak(db, 'whatsapp') : {};
    const decision = outreachDecision({
        sector: row.sector, productType: row.product_type, retailPrice: ['moms', 'retail'].includes(row.sector), channel: row.channel,
        consent: Boolean(lead && Number(lead.consent)), optedOut: Boolean(lead && Number(lead.opted_out)),
        lastContactAt: lead?.last_contact_at ? Number(lead.last_contact_at) : null, lastWhatsappAt: state.lastSentAt, batchCount: state.batchCount, breakStartedAt: state.breakStartedAt, now
    });
    if (decision.allowed) return { ok: true };
    return TIMING.has(decision.reason) ? { hold: decision.reason } : { cancel: decision.reason };
}

async function finish(db, row, status, fields, now) {
    await transaction(db, async tx => {
        await tx.execute({ sql: 'UPDATE outbox SET status = ?, last_error = ?, attempts = ?, available_at = ?, sent_at = ? WHERE id = ?', args: [status, fields.error || '', fields.attempts ?? Number(row.attempts), fields.availableAt ?? now, fields.sentAt ?? null, row.id] });
        if (status === 'sent') {
            if (row.kind === 'outreach') await tx.execute({ sql: "UPDATE leads SET last_contact_at = ?, stage = CASE WHEN stage = 'new' THEN 'welcomed' ELSE stage END, updated_at = ? WHERE contact_key = ?", args: [now, now, row.recipient] });
            await audit(tx, `agent:${CONTROL[row.channel]}`, SENT_ACTION[row.channel], row.id, { to: mask(row.recipient), kind: row.kind, channel: row.channel });
            const range = PACING[row.channel];
            if (range && row.kind === 'outreach') await tx.execute({ sql: 'INSERT INTO system_state(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', args: [pacingKey(row.channel), now + range[0] + Math.floor(Math.random() * (range[1] - range[0]))] });
        } else if (status === 'cancelled') {
            await audit(tx, `agent:${CONTROL[row.channel]}`, 'outbox.cancelled', row.id, { reason: fields.reason, to: mask(row.recipient) });
        } else if (fields.error) {
            await audit(tx, `agent:${CONTROL[row.channel]}`, FAILED_ACTION[row.channel], row.id, { to: mask(row.recipient), error: fields.error, final: status === 'failed' });
        }
    });
}

// Delivers at most one message. `send(row)` performs the real network call. Returns what happened, never throws.
async function deliverNext(db, { channels, send, ready = () => true }, now = Date.now()) {
    // A row stuck in "sending" (process died mid-send) is NOT retried automatically: it may already have been delivered.
    await db.execute({ sql: "UPDATE outbox SET status = 'failed', last_error = 'interrupted' WHERE status = 'sending' AND available_at < ?", args: [now - 15 * MIN] });
    const marks = channels.map(() => '?').join(',');
    const row = (await db.execute({ sql: `SELECT * FROM outbox WHERE status = 'queued' AND available_at <= ? AND channel IN (${marks}) ORDER BY created_at LIMIT 1`, args: [now, ...channels] })).rows[0];
    if (!row) return { status: 'idle' };
    if (!ready(row)) return { status: 'held', reason: 'not_configured' };
    const verdict = await gate(db, row, now);
    if (verdict.cancel) { await finish(db, row, 'cancelled', { reason: verdict.cancel, error: verdict.cancel }, now); return { status: 'cancelled', reason: verdict.cancel, id: row.id }; }
    if (verdict.hold) return { status: 'held', reason: verdict.hold };
    const claimed = await db.execute({ sql: "UPDATE outbox SET status = 'sending', available_at = ? WHERE id = ? AND status = 'queued'", args: [now, row.id] });
    if (Number(claimed.rowsAffected) !== 1) return { status: 'idle' }; // another sender took it
    try {
        await send(row);
        await finish(db, row, 'sent', { sentAt: now, attempts: Number(row.attempts) + 1 }, now);
        return { status: 'sent', id: row.id };
    } catch (error) {
        const attempts = Number(row.attempts) + 1;
        const final = attempts >= MAX_ATTEMPTS;
        await finish(db, row, final ? 'failed' : 'queued', { attempts, error: String(error?.message || error).replace(/\s+/g, ' ').slice(0, 160), availableAt: now + attempts * 5 * MIN }, now);
        return { status: final ? 'failed' : 'retry', id: row.id };
    }
}

async function cancel(db, id, actor) {
    await transaction(db, async tx => {
        const result = await tx.execute({ sql: "UPDATE outbox SET status = 'cancelled', last_error = 'staff' WHERE id = ? AND status IN ('queued', 'failed')", args: [id] });
        if (!Number(result.rowsAffected)) fail(409, 'الرسالة أُرسلت أو أُلغيت بالفعل.');
        await audit(tx, actor, 'outbox.cancelled', id, { reason: 'staff' });
    });
}
async function retry(db, id, actor) {
    await transaction(db, async tx => {
        const result = await tx.execute({ sql: "UPDATE outbox SET status = 'queued', attempts = 0, last_error = '', available_at = ? WHERE id = ? AND status = 'failed'", args: [Date.now(), id] });
        if (!Number(result.rowsAffected)) fail(409, 'يمكن إعادة المحاولة للرسائل الفاشلة فقط.');
        await audit(tx, actor, 'outbox.retried', id, {});
    });
}
async function list(db, { status, limit = 100 } = {}) {
    const rows = (await db.execute({ sql: `SELECT id, channel, recipient, subject, body, kind, status, attempts, last_error, available_at, sent_at, created_at FROM outbox ${status ? 'WHERE status = ?' : ''} ORDER BY created_at DESC LIMIT ?`, args: status ? [status, Math.min(Number(limit) || 100, 200)] : [Math.min(Number(limit) || 100, 200)] })).rows;
    return rows.map(row => ({ ...row, recipient: mask(row.recipient) }));
}

module.exports = { CHANNELS, CONTROL, enqueue, gate, deliverNext, cancel, retry, list, mask, streak };
