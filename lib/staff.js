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
    if (!user || user.login_mode === 'email' || !crypto.timingSafeEqual(hash, Buffer.from(user.password_hash, 'hex'))) fail(401, 'بيانات الدخول غير صحيحة.');
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
// Email-code accounts: no password to remember and no authenticator app. A 6-digit code, valid 10 minutes, is mailed to the account.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_TTL = 10 * 60000;
const MAX_CODE_ATTEMPTS = 5;
const codeHash = (email, code) => crypto.createHmac('sha256', encryptionKey()).update(`${email}:${code}`).digest('hex');

async function createEmailStaff(database, { email, name, role = 'admin' }, actor = 'bootstrap:cli') {
    const clean = String(email || '').trim().toLowerCase();
    if (!EMAIL_PATTERN.test(clean) || clean.length > 254 || typeof name !== 'string' || name.trim().length < 2 || !['admin', 'operations', 'support'].includes(role)) fail(400, 'Invalid staff account');
    // The password and authenticator secret are random and never shown, so only the emailed code can open this account.
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = (await scrypt(crypto.randomBytes(32).toString('hex'), salt, 64)).toString('hex');
    const secret = Array.from(crypto.randomBytes(32), byte => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'[byte % 32]).join('');
    const id = crypto.randomUUID();
    return transaction(database, async tx => {
        await tx.execute({ sql: "INSERT INTO staff(id, email, name, role, password_hash, password_salt, totp_secret, login_mode) VALUES (?, ?, ?, ?, ?, ?, ?, 'email')", args: [id, clean, name.trim(), role, hash, salt, encrypt(secret)] });
        await audit(tx, actor, 'staff.created', id, { role, loginMode: 'email' });
        return id;
    });
}

async function requestEmailCode(database, email, send, now = Date.now()) {
    const clean = String(email || '').trim().toLowerCase();
    if (!EMAIL_PATTERN.test(clean) || clean.length > 254) fail(400, 'أدخل بريداً إلكترونياً صحيحاً.');
    const user = (await database.execute({ sql: "SELECT id FROM staff WHERE email = ? AND disabled = 0 AND login_mode = 'email'", args: [clean] })).rows[0];
    if (!user) return { sent: true }; // identical answer for unknown accounts, so addresses cannot be probed
    const previous = (await database.execute({ sql: 'SELECT created_at FROM email_login_codes WHERE email = ?', args: [clean] })).rows[0];
    if (previous && now - Number(previous.created_at) < 60000) fail(429, 'انتظر دقيقة قبل طلب رمز جديد.');
    const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    await send({ to: clean, subject: 'رمز دخول الإدارة - الزمردة', text: `رمز الدخول: ${code}\n\nصالح لمدة 10 دقائق ويُستخدم مرة واحدة. إذا لم تطلبه فتجاهل هذه الرسالة.` });
    await database.execute({ sql: 'INSERT INTO email_login_codes(email, code_hash, expires_at, attempts, created_at) VALUES (?, ?, ?, 0, ?) ON CONFLICT(email) DO UPDATE SET code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0, created_at = excluded.created_at', args: [clean, codeHash(clean, code), now + CODE_TTL, now] });
    return { sent: true };
}

async function verifyEmailCode(database, { email, code }, now = Date.now()) {
    const clean = String(email || '').trim().toLowerCase();
    const invalid = () => fail(401, 'الرمز غير صحيح أو انتهت صلاحيته.');
    if (!EMAIL_PATTERN.test(clean) || !/^\d{6}$/.test(code || '')) invalid();
    const user = (await database.execute({ sql: "SELECT id FROM staff WHERE email = ? AND disabled = 0 AND login_mode = 'email'", args: [clean] })).rows[0];
    const row = (await database.execute({ sql: 'SELECT code_hash, expires_at, attempts FROM email_login_codes WHERE email = ?', args: [clean] })).rows[0];
    const expected = codeHash(clean, code);
    const matches = user && row && Number(row.expires_at) > now && Number(row.attempts) < MAX_CODE_ATTEMPTS && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(row.code_hash));
    if (!matches) {
        if (row) await database.execute({ sql: 'UPDATE email_login_codes SET attempts = attempts + 1 WHERE email = ?', args: [clean] });
        invalid();
    }
    const token = crypto.randomBytes(32).toString('hex');
    const csrf = crypto.randomBytes(32).toString('hex');
    await transaction(database, async tx => {
        const used = await tx.execute({ sql: 'DELETE FROM email_login_codes WHERE email = ? AND code_hash = ?', args: [clean, expected] });
        if (Number(used.rowsAffected) !== 1) invalid();
        await tx.execute({ sql: 'DELETE FROM staff_sessions WHERE expires_at < ?', args: [now] });
        await tx.execute({ sql: 'INSERT INTO staff_sessions VALUES (?, ?, ?, ?)', args: [digest(token), user.id, csrf, now + 8 * 3600000] });
        await audit(tx, user.id, 'staff.login', user.id, { method: 'email_code' });
    });
    return { token, csrf };
}

const ROLES = ['admin', 'operations', 'support'];

async function listStaff(database) {
    const rows = (await database.execute('SELECT id, email, name, role, disabled, login_mode FROM staff ORDER BY disabled, role, name')).rows;
    return rows.map(row => ({ id: row.id, email: row.email, name: row.name, role: row.role, disabled: Boolean(row.disabled), loginMode: row.login_mode }));
}

async function addStaff(database, input, actor) {
    try { return { id: await createEmailStaff(database, input, actor) }; }
    catch (error) { if (/UNIQUE/i.test(error.message)) fail(409, 'هذا البريد مسجل بالفعل.'); throw error; }
}

// Role, enabled state and login method. An admin can never lock themselves out or remove the last active admin.
async function updateStaff(database, id, patch, actor) {
    return transaction(database, async tx => {
        const user = (await tx.execute({ sql: 'SELECT id, role, disabled, login_mode FROM staff WHERE id = ?', args: [id] })).rows[0];
        if (!user) fail(404, 'المستخدم غير موجود.');
        const role = patch.role === undefined ? user.role : patch.role;
        const disabled = patch.disabled === undefined ? Boolean(user.disabled) : patch.disabled;
        const loginMode = patch.login_mode === undefined ? user.login_mode : patch.login_mode;
        if (!ROLES.includes(role) || typeof disabled !== 'boolean' || !['email', 'totp'].includes(loginMode) || (loginMode === 'totp' && user.login_mode === 'email')) fail(400, 'بيانات التعديل غير صالحة.');
        if (id === actor && (role !== user.role || disabled || loginMode !== user.login_mode)) fail(400, 'لا يمكنك تعديل حسابك بنفسك.');
        if (user.role === 'admin' && !user.disabled && (role !== 'admin' || disabled)) {
            const others = (await tx.execute({ sql: "SELECT COUNT(*) AS n FROM staff WHERE role = 'admin' AND disabled = 0 AND id != ?", args: [id] })).rows[0].n;
            if (!others) fail(409, 'يجب أن يبقى مدير واحد فعّال على الأقل.');
        }
        await tx.execute({ sql: 'UPDATE staff SET role = ?, disabled = ?, login_mode = ? WHERE id = ?', args: [role, disabled ? 1 : 0, loginMode, id] });
        if (role !== user.role || disabled || loginMode !== user.login_mode) await tx.execute({ sql: 'DELETE FROM staff_sessions WHERE staff_id = ?', args: [id] });
        await audit(tx, actor, 'staff.updated', id, { role, disabled, loginMode });
        return { id, role, disabled, loginMode };
    });
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
const permissions = { admin: ['catalog', 'orders', 'inventory', 'support', 'agents', 'audit', 'users'], operations: ['orders', 'inventory'], support: ['support'] };
function requirePermission(permission) {
    return (req, res, next) => {
        if (!req.staff) return res.status(401).json({ success: false, error: 'سجّل الدخول لإدارة المتجر.' });
        if (!permissions[req.staff.role]?.includes(permission)) return res.status(403).json({ success: false, error: 'صلاحيات غير كافية.' });
        if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers['x-csrf-token'] !== req.staff.csrf) return res.status(403).json({ success: false, error: 'CSRF token required' });
        next();
    };
}
module.exports = { createStaff, createEmailStaff, listStaff, addStaff, updateStaff, requestEmailCode, verifyEmailCode, login, session, requirePermission, cookieValue, setCookie, digest, totp };
