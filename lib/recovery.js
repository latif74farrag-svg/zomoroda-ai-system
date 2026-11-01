const crypto = require('node:crypto');
const { promisify } = require('node:util');
const { transaction } = require('./storage');
const { audit, fail } = require('./commerce');
const { digest } = require('./staff');
const scrypt = promisify(crypto.scrypt);

async function issue(database, { phone, verified, verification }, actor, now = Date.now()) {
    if (verified !== true || typeof verification !== 'string' || verification.length < 5 || verification.length > 500 || !/^(010|011|012|015)\d{8}$/.test(phone || '')) fail(400, 'Verified identity and verification reference required');
    const token = crypto.randomBytes(32).toString('hex');
    await transaction(database, async tx => {
        const user = (await tx.execute({ sql: 'SELECT id FROM store_customers WHERE phone = ?', args: [phone] })).rows[0];
        if (!user) fail(404, 'Customer account not found');
        await tx.execute({ sql: 'DELETE FROM customer_recovery WHERE customer_id = ? OR expires_at < ?', args: [user.id, now] });
        await tx.execute({ sql: 'INSERT INTO customer_recovery VALUES (?, ?, ?, 0)', args: [digest(token), user.id, now + 900000] });
        await audit(tx, actor, 'customer.recovery_issued', user.id, { verification });
    });
    return token;
}
async function reset(database, { token, password }, now = Date.now()) {
    if (!/^[a-f0-9]{64}$/.test(token || '') || typeof password !== 'string' || password.length < 12 || password.length > 128) fail(400, 'Invalid recovery token or password; use at least 12 characters');
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = (await scrypt(password, salt, 64)).toString('hex');
    await transaction(database, async tx => {
        const receipt = (await tx.execute({ sql: 'SELECT customer_id FROM customer_recovery WHERE token_hash = ? AND used = 0 AND expires_at > ?', args: [digest(token), now] })).rows[0];
        if (!receipt) fail(400, 'Recovery token expired or already used');
        await tx.execute({ sql: 'UPDATE store_customers SET password_salt = ?, password_hash = ?, session_version = session_version + 1 WHERE id = ?', args: [salt, hash, receipt.customer_id] });
        await tx.execute({ sql: 'UPDATE customer_recovery SET used = 1 WHERE customer_id = ?', args: [receipt.customer_id] });
        await audit(tx, receipt.customer_id, 'customer.password_reset', receipt.customer_id);
    });
}
module.exports = { issue, reset };
