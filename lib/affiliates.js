const crypto = require('node:crypto');
const { transaction } = require('./storage');
const { fail, audit } = require('./commerce');
const { normalizeContact } = require('./leads');

const PROMOTION_THRESHOLD = 5;

// The old code paid 10% + 3% and the old dashboard advertised 5% + 2%, so the rates are configuration, not constants.
function rates(env = process.env) {
    const pct = (value, fallback) => { const n = Number(value); return Number.isFinite(n) && n >= 0 && n <= 50 ? n : fallback; };
    return { direct: pct(env.AFFILIATE_DIRECT_PCT, 5), override: pct(env.AFFILIATE_OVERRIDE_PCT, 2) };
}

function phoneOf(value) {
    const contact = normalizeContact(value);
    if (!contact || contact.channel !== 'whatsapp') fail(400, 'رقم الهاتف غير صالح.');
    return contact.key;
}

async function registerAffiliate(database, { phone, name, supervisorPhone }, actor) {
    const key = phoneOf(phone);
    const cleanName = String(name || '').trim();
    if (cleanName.length < 2 || cleanName.length > 100) fail(400, 'اسم المندوبة مطلوب.');
    const supervisor = supervisorPhone ? phoneOf(supervisorPhone) : null;
    if (supervisor === key) fail(400, 'لا يمكن أن تشرف المندوبة على نفسها.');
    return transaction(database, async tx => {
        if (supervisor && !(await tx.execute({ sql: 'SELECT 1 FROM affiliates WHERE phone = ?', args: [supervisor] })).rows.length) fail(404, 'رقم المشرفة غير مسجل في النظام.');
        if ((await tx.execute({ sql: 'SELECT 1 FROM affiliates WHERE phone = ?', args: [key] })).rows.length) fail(409, 'رقم الهاتف مسجل مسبقاً.');
        await tx.execute({ sql: 'INSERT INTO affiliates(phone, name, supervisor_phone, created_at) VALUES (?, ?, ?, ?)', args: [key, cleanName, supervisor, Date.now()] });
        let promoted = false;
        if (supervisor) {
            const count = (await tx.execute({ sql: 'SELECT COUNT(*) AS n FROM affiliates WHERE supervisor_phone = ?', args: [supervisor] })).rows[0].n;
            if (count >= PROMOTION_THRESHOLD) promoted = Number((await tx.execute({ sql: "UPDATE affiliates SET role = 'team_leader' WHERE phone = ? AND role = 'representative'", args: [supervisor] })).rowsAffected) === 1;
        }
        await audit(tx, actor, 'affiliate.registered', key.slice(-4), { supervised: Boolean(supervisor), promoted });
        return { phone: key, promotedSupervisor: promoted };
    });
}

// Amounts are integer piastres; commissions are rounded once per sale.
async function recordSale(database, { repPhone, amountMinor }, actor, env = process.env) {
    const key = phoneOf(repPhone);
    if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0 || amountMinor > 100000000) fail(400, 'قيمة البيع غير صالحة.');
    const { direct, override } = rates(env);
    return transaction(database, async tx => {
        const rep = (await tx.execute({ sql: 'SELECT supervisor_phone FROM affiliates WHERE phone = ?', args: [key] })).rows[0];
        if (!rep) fail(404, 'المندوبة غير مسجلة.');
        const directMinor = Math.round(amountMinor * direct / 100);
        const overrideMinor = rep.supervisor_phone ? Math.round(amountMinor * override / 100) : 0;
        await tx.execute({ sql: 'UPDATE affiliates SET sales_count = sales_count + 1, commission_minor = commission_minor + ? WHERE phone = ?', args: [directMinor, key] });
        if (overrideMinor) await tx.execute({ sql: 'UPDATE affiliates SET commission_minor = commission_minor + ? WHERE phone = ?', args: [overrideMinor, rep.supervisor_phone] });
        await tx.execute({ sql: 'INSERT INTO affiliate_sales(id, rep_phone, amount_minor, direct_minor, override_minor, supervisor_phone, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', args: [crypto.randomUUID(), key, amountMinor, directMinor, overrideMinor, rep.supervisor_phone, actor, Date.now()] });
        await audit(tx, actor, 'affiliate.sale', key.slice(-4), { amountMinor, directMinor, overrideMinor });
        return { directMinor, overrideMinor };
    });
}

async function affiliateOverview(database, env = process.env) {
    const rows = (await database.execute('SELECT phone, name, supervisor_phone, role, sales_count, commission_minor, created_at FROM affiliates ORDER BY created_at DESC LIMIT 300')).rows;
    const teamSize = {};
    for (const row of rows) if (row.supervisor_phone) teamSize[row.supervisor_phone] = (teamSize[row.supervisor_phone] || 0) + 1;
    return {
        rates: rates(env), promotionThreshold: PROMOTION_THRESHOLD, consumerCatalog: require('./sales').CONSUMER,
        affiliates: rows.map(row => ({ phone: row.phone, name: row.name, role: row.role, supervised: Boolean(row.supervisor_phone), team: teamSize[row.phone] || 0, sales: row.sales_count, commissionMinor: row.commission_minor }))
    };
}

module.exports = { rates, registerAffiliate, recordSale, affiliateOverview, PROMOTION_THRESHOLD };
