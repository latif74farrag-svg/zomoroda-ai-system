// One-click opt-out for email recipients: a signed link in every outreach email. Opting out is permanent (Do-Not-Contact).
const crypto = require('node:crypto');
const { transaction, production } = require('./storage');
const { audit } = require('./commerce');
const { setOptOut } = require('./leads');

function secret() {
    const value = process.env.UNSUBSCRIBE_SECRET || process.env.STORE_ADMIN_SESSION_SECRET || '';
    if (value.length >= 32) return value;
    if (production()) throw Object.assign(new Error('Unsubscribe secret missing'), { status: 503 });
    return 'development-only-unsubscribe-secret-0000';
}
const sign = payload => crypto.createHmac('sha256', secret()).update(payload).digest('base64url');

function makeToken(contactKey) {
    const payload = Buffer.from(String(contactKey)).toString('base64url');
    return `${payload}.${sign(payload)}`;
}
function readToken(token) {
    const [payload, signature] = String(token || '').split('.');
    if (!payload || !signature) return null;
    const expected = Buffer.from(sign(payload)), given = Buffer.from(signature);
    if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
    return Buffer.from(payload, 'base64url').toString();
}
function linkFor(contactKey, base = process.env.BASE_URL || '') {
    return `${base.replace(/\/$/, '')}/unsubscribe?t=${makeToken(contactKey)}`;
}
async function optOut(db, contactKey) {
    await transaction(db, async tx => {
        await setOptOut(tx, contactKey);
        await tx.execute({ sql: "UPDATE outbox SET status = 'cancelled', last_error = 'opted_out' WHERE recipient = ? AND status = 'queued'", args: [contactKey] });
        await audit(tx, 'guest', 'lead.unsubscribed', 'lead', {});
    });
}
module.exports = { makeToken, readToken, linkFor, optOut };
