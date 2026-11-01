const crypto = require('node:crypto');
const { promisify } = require('node:util');
const scrypt = promisify(crypto.scrypt);
const { transaction, production } = require('./storage');
const { audit, fail } = require('./commerce');
const digest = value => crypto.createHash('sha256').update(value).digest('hex');

function encryptionKey() {
    const secret = process.env.STAFF_MFA_KEY || '';
    if (secret.length < 32) fail(503, 'STAFF_MFA_KEY must contain at least 32 random characters');
    return crypto.createHash('sha256').update(secret).digest();
}
function encrypt(value) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return [iv, cipher.getAuthTag(), encrypted].map(buffer => buffer.toString('base64')).join('.');
}
function decrypt(value) {
    const [iv, tag, encrypted] = value.split('.').map(part => Buffer.from(part, 'base64'));
    const cipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), iv);
    cipher.setAuthTag(tag);
    return Buffer.concat([cipher.update(encrypted), cipher.final()]).toString('utf8');
}
function totp(secret, step) {
    let bits = '';
    for (const character of secret.toUpperCase()) {
        const index = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(character);
        if (index < 0) fail(400, 'Invalid TOTP secret');
        bits += index.toString(2).padStart(5, '0');
    }
    const bytes = Buffer.from((bits.match(/.{8}/g) || []).map(byte => parseInt(byte, 2)));
    const counter = Buffer.alloc(8);
    counter.writeBigUInt64BE(BigInt(step));
    const hash = crypto.createHmac('sha1', bytes).update(counter).digest();
    const offset = hash[hash.length - 1] & 15;
    return String((hash.readUInt32BE(offset) & 0x7fffffff) % 1000000).padStart(6, '0');
}
async function createStaff(database, { email, name, password, role = 'admin', totpSecret }) {
    if (typeof password !== 'string' || password.length < 14 || password.length > 256 || !['admin', 'operations', 'support'].includes(role) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '') || !/^[A-Z2-7]{32,64}$/.test(totpSecret || '') || !name || name.length > 120) fail(400, 'Invalid staff account; use a 14+ character password and a 32+ character base32 TOTP secret');
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = (await scrypt(password, salt, 64)).toString('hex');
    const id = crypto.randomUUID();
    return transaction(database, async tx => {
        await tx.execute({ sql: 'INSERT INTO staff(id, email, name, role, password_hash, password_salt, totp_secret) VALUES (?, ?, ?, ?, ?, ?, ?)', args: [id, email.toLowerCase(), name, role, hash, salt, encrypt(totpSecret)] });
        await audit(tx, 'bootstrap:cli', 'staff.created', id, { role });
        return id;
    });
}
async function login(database, { email, password, code }, now = Date.now()) {
    if (typeof email !== 'string' || email.length > 254 || typeof password !== 'string' || password.length > 256 || !/^\d{6}$/.test(code || '')) fail(401, 'بيانات الدخول غير صحيحة.');
    const user = (await database.execute({ sql: 'SELECT * FROM staff WHERE email = ? AND disabled = 0', args: [email.toLowerCase()] })).rows[0];
    const hash = await scrypt(password, user?.password_salt || 'unavailable-staff-account', 64);
    if (!user || !crypto.timingSafeEqual(hash, Buffer.from(user.password_hash, 'hex'))) fail(401, 'بيانات الدخول غير صحيحة.');
    const secret = decrypt(user.totp_secret);
    const step = Math.floor(now / 30000);
    const matched = [step - 1, step, step + 1].find(value => value > user.last_totp_step && totp(secret, value) === code);
    if (matched === undefined) fail(401, 'رمز التحقق غير صحيح أو تم استخدامه.');
    const token = crypto.randomBytes(32).toString('hex');
    const csrf = crypto.randomBytes(32).toString('hex');
    await transaction(database, async tx => {
        const updated = await tx.execute({ sql: 'UPDATE staff SET last_totp_step = ? WHERE id = ? AND last_totp_step < ? AND disabled = 0', args: [matched, user.id, matched] });
        if (Number(updated.rowsAffected) !== 1) fail(401, 'رمز التحقق تم استخدامه.');
        await tx.execute({ sql: 'DELETE FROM staff_sessions WHERE expires_at < ?', args: [now] });
        await tx.execute({ sql: 'INSERT INTO staff_sessions VALUES (?, ?, ?, ?)', args: [digest(token), user.id, csrf, now + 8 * 3600000] });
        await audit(tx, user.id, 'staff.login', user.id);
    });
    return { token, csrf };
}
function cookieValue(req, name) {
    return String(req.headers.cookie || '').split(';').map(value => value.trim()).find(value => value.startsWith(name + '='))?.slice(name.length + 1) || '';
}
async function session(database, token, now = Date.now()) {
    if (!/^[a-f0-9]{64}$/.test(token)) return null;
    return (await database.execute({ sql: 'SELECT staff.id, staff.name, staff.role, staff_sessions.csrf FROM staff_sessions JOIN staff ON staff.id = staff_sessions.staff_id WHERE token_hash = ? AND expires_at > ? AND disabled = 0', args: [digest(token), now] })).rows[0] || null;
}
function setCookie(res, token, clear = false) {
    res.setHeader('Set-Cookie', `zmr_staff=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${clear ? 0 : 28800}${production() ? '; Secure' : ''}`);
}
const permissions = { admin: ['catalog', 'orders', 'inventory', 'support', 'agents', 'audit'], operations: ['orders', 'inventory'], support: ['support'] };
function requirePermission(permission) {
    return (req, res, next) => {
        if (!req.staff) return res.status(401).json({ success: false, error: 'سجّل الدخول لإدارة المتجر.' });
        if (!permissions[req.staff.role]?.includes(permission)) return res.status(403).json({ success: false, error: 'صلاحيات غير كافية.' });
        if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers['x-csrf-token'] !== req.staff.csrf) return res.status(403).json({ success: false, error: 'CSRF token required' });
        next();
    };
}
module.exports = { createStaff, login, session, requirePermission, cookieValue, setCookie, digest, totp };
