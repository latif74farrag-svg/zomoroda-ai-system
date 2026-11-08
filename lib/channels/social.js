// Messenger, Instagram and Telegram: receive customer messages through webhooks and send approved replies.
// Meta and Telegram do not allow messaging someone who never wrote to you, so there is deliberately no cold outreach here.
// Meta: replies are allowed for 24h after the customer's last message. Credentials
// are resolved by the caller from encrypted website settings or environment fallback.
const crypto = require('node:crypto');

const META_WINDOW_MS = 24 * 3600000;
const WINDOW_SAFETY_MS = 30 * 60000; // queue time and approval must finish before the real limit
const GRAPH = 'https://graph.facebook.com/v21.0/me/messages';

function configured(env = process.env) {
    return {
        meta: Boolean(env.META_APP_SECRET && env.META_VERIFY_TOKEN && env.META_PAGE_ACCESS_TOKEN && !/your_.*_here/i.test(env.META_PAGE_ACCESS_TOKEN)),
        telegram: Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_WEBHOOK_SECRET)
    };
}
function safeEqual(a, b) {
    const left = Buffer.from(String(a || '')), right = Buffer.from(String(b || ''));
    return left.length === right.length && crypto.timingSafeEqual(left, right);
}
function verifyMetaSignature(rawBody, header, secret) {
    if (!rawBody || !header || !secret) return false;
    return safeEqual(header, 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex'));
}
const verifyTelegramSecret = (header, secret) => Boolean(secret) && safeEqual(header, secret);

// Meta payload -> [{ channel, senderId, text, externalId, receivedAt }]. Echoes of our own messages and non-text events are dropped.
function parseMeta(body) {
    const channel = body?.object === 'instagram' ? 'instagram' : body?.object === 'page' ? 'messenger' : null;
    if (!channel) return [];
    const out = [];
    for (const entry of body.entry || []) for (const event of entry.messaging || []) {
        const message = event.message;
        if (!message || message.is_echo || typeof message.text !== 'string' || !message.text.trim() || !event.sender?.id || !message.mid) continue;
        out.push({ channel, senderId: String(event.sender.id), text: message.text.trim().slice(0, 1000), externalId: String(message.mid), receivedAt: Number(event.timestamp) || Date.now() });
    }
    return out;
}
// Telegram: only private chats with the bot (a user who started it).
function parseTelegram(update) {
    const message = update?.message;
    if (!message || message.chat?.type !== 'private' || typeof message.text !== 'string' || !message.text.trim()) return [];
    return [{ channel: 'telegram', senderId: String(message.chat.id), text: message.text.trim().slice(0, 1000), externalId: String(update.update_id ?? message.message_id), receivedAt: Number(message.date) * 1000 || Date.now() }];
}

// Stores new messages and queues one drafting job per message. Duplicate deliveries (webhooks retry) are ignored.
async function ingest(db, messages) {
    const { transaction } = require('../storage');
    const { enqueue } = require('../commerce');
    let stored = 0;
    for (const message of messages) {
        await transaction(db, async tx => {
            const id = crypto.randomUUID();
            const result = await tx.execute({ sql: 'INSERT OR IGNORE INTO inbound_messages(id, channel, sender_id, text, external_id, received_at) VALUES (?, ?, ?, ?, ?, ?)', args: [id, message.channel, message.senderId, message.text, message.externalId, message.receivedAt] });
            if (Number(result.rowsAffected) !== 1) return;
            stored++;
            await enqueue(tx, `inbound:${id}`, 'inbound.message', { inboundId: id });
        });
    }
    return { stored };
}
const windowFor = (channel, receivedAt) => channel === 'telegram' ? null : Number(receivedAt) + META_WINDOW_MS - WINDOW_SAFETY_MS;

async function post(url, headers, body) {
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`${new URL(url).hostname} responded ${response.status}`); // never include the URL: it carries a token for Telegram
}
// `row` is an outbox row. The caller supplies server-side resolved credentials.
async function send(row, env = process.env, http = post) {
    if (row.channel === 'telegram') {
        if (!env.TELEGRAM_BOT_TOKEN) throw new Error('telegram not configured');
        return http(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {}, { chat_id: row.recipient, text: row.body });
    }
    if (!configured(env).meta) throw new Error('meta not configured');
    return http(GRAPH, { Authorization: `Bearer ${env.META_PAGE_ACCESS_TOKEN}` }, { recipient: { id: row.recipient }, messaging_type: 'RESPONSE', message: { text: row.body } });
}
const ready = (row, env = process.env) => row.channel === 'telegram' ? configured(env).telegram : configured(env).meta;

module.exports = { configured, verifyMetaSignature, verifyTelegramSecret, parseMeta, parseTelegram, ingest, windowFor, send, ready, safeEqual };
