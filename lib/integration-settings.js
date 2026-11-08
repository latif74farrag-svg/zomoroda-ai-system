const crypto = require('node:crypto');
const { transaction } = require('./storage');
const { audit, fail } = require('./commerce');

const FIELDS = [
    { key: 'META_APP_SECRET', label: 'Meta App Secret', group: 'meta' },
    { key: 'META_VERIFY_TOKEN', label: 'رمز التحقق الذي تختاره في Meta', group: 'meta' },
    { key: 'META_PAGE_ACCESS_TOKEN', label: 'Meta Page Access Token', group: 'meta' },
    { key: 'TELEGRAM_BOT_TOKEN', label: 'توكن البوت من BotFather', group: 'telegram' },
    { key: 'TELEGRAM_WEBHOOK_SECRET', label: 'رمز حماية Webhook لتليجرام', group: 'telegram' }
];
const KEYS = new Set(FIELDS.map(field => field.key));
function key() {
    const secret = process.env.STAFF_MFA_KEY || '';
    if (secret.length < 32) fail(503, 'اضبط STAFF_MFA_KEY ثابتاً من 32 حرفاً على الأقل في بيئة الخادم أولاً.');
    return crypto.createHash('sha256').update('integration-secrets:v1:' + secret).digest();
}
function encrypt(name, value) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
    cipher.setAAD(Buffer.from(name));
    const data = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return [iv, cipher.getAuthTag(), data].map(part => part.toString('base64')).join('.');
}
function decrypt(name, value) {
    try {
        const [iv, tag, data] = value.split('.').map(part => Buffer.from(part, 'base64'));
        const cipher = crypto.createDecipheriv('aes-256-gcm', key(), iv);
        cipher.setAAD(Buffer.from(name)); cipher.setAuthTag(tag);
        return Buffer.concat([cipher.update(data), cipher.final()]).toString('utf8');
    } catch (_) { fail(503, 'تعذر قراءة مفاتيح الربط المشفرة. تحقق من ثبات STAFF_MFA_KEY.'); }
}
async function environment(db, env = process.env) {
    const result = { ...env };
    for (const row of (await db.execute('SELECT name, encrypted_value FROM integration_secrets')).rows) {
        if (KEYS.has(row.name)) result[row.name] = decrypt(row.name, row.encrypted_value);
    }
    return result;
}
async function describe(db, env = process.env) {
    const rows = (await db.execute('SELECT name, updated_at FROM integration_secrets')).rows;
    return {
        encryptionReady: Boolean(process.env.STAFF_MFA_KEY?.length >= 32),
        webhookBaseUrl: /^https:\/\//.test(env.BASE_URL || '') ? new URL(env.BASE_URL).origin : null,
        fields: FIELDS.map(field => {
            const row = rows.find(item => item.name === field.key);
            return { ...field, configured: Boolean(row || env[field.key]), source: row ? 'website' : env[field.key] ? 'environment' : 'none', updatedAt: row ? Number(row.updated_at) : null };
        })
    };
}
async function registerTelegram(db, actor, fetcher = fetch) {
    const env = await environment(db);
    if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_WEBHOOK_SECRET) fail(400, 'احفظ توكن البوت ورمز حماية Webhook أولاً.');
    let origin;
    try {
        const parsed = new URL(env.BASE_URL);
        if (parsed.protocol !== 'https:' || parsed.username || parsed.password) throw new Error();
        origin = parsed.origin;
    } catch (_) { fail(503, 'اضبط BASE_URL بعنوان الموقع العام الذي يبدأ بـ https في بيئة الخادم.'); }
    try {
        const response = await fetcher(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/setWebhook`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(15000),
            body: JSON.stringify({ url: origin + '/webhooks/telegram', secret_token: env.TELEGRAM_WEBHOOK_SECRET, allowed_updates: ['message'], drop_pending_updates: false })
        });
        const result = await response.json();
        if (!response.ok || result.ok !== true || result.result !== true) throw new Error();
    } catch (_) { fail(503, 'لم يكتمل تسجيل تليجرام. تحقق من التوكن وعنوان الموقع العام ثم أعد المحاولة.'); }
    await transaction(db, tx => audit(tx, actor, 'integration.telegram.registered', 'telegram', {}));
    return { success: true, message: 'تم تسجيل Webhook لتليجرام. افتح البوت وأرسل رسالة لاختبار الاستقبال.' };
}
async function save(db, values, remove, actor) {
    if (!values || typeof values !== 'object' || Array.isArray(values) || !Array.isArray(remove)) fail(400, 'إعدادات الربط غير صالحة.');
    const changes = [];
    for (const [name, value] of Object.entries(values)) {
        if (!KEYS.has(name) || typeof value !== 'string' || value.length > 8192) fail(400, 'حقل ربط غير صالح.');
        if (!value.trim()) continue; // An empty password field always preserves its current value.
        if (/\s/.test(value.trim())) fail(400, 'المفتاح لا يجب أن يحتوي على مسافات.');
        if (name === 'TELEGRAM_WEBHOOK_SECRET' && !/^[A-Za-z0-9_-]{1,256}$/.test(value.trim())) fail(400, 'رمز تليجرام يقبل الحروف الإنجليزية والأرقام و _ و - فقط.');
        changes.push({ name, encrypted: encrypt(name, value.trim()) });
    }
    if (remove.some(name => !KEYS.has(name)) || changes.some(change => remove.includes(change.name))) fail(400, 'لا يمكن حفظ وحذف نفس المفتاح.');
    await transaction(db, async tx => {
        for (const { name, encrypted } of changes) await tx.execute({ sql: 'INSERT INTO integration_secrets(name, encrypted_value, updated_by, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(name) DO UPDATE SET encrypted_value = excluded.encrypted_value, updated_by = excluded.updated_by, updated_at = excluded.updated_at', args: [name, encrypted, actor, Date.now()] });
        for (const name of remove) await tx.execute({ sql: 'DELETE FROM integration_secrets WHERE name = ?', args: [name] });
        await audit(tx, actor, 'integration.settings.updated', 'social', { changedFields: changes.map(change => change.name), removedFields: remove });
    });
    return describe(db);
}
module.exports = { environment, describe, save, registerTelegram };
