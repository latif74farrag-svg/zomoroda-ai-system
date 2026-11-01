const crypto = require('node:crypto');
const { transaction } = require('./storage');
const { fail, audit } = require('./commerce');

const DAY = 86400000;
const STAGES = ['new', 'awaiting_category', 'welcomed', 'catalog_sent', 'prices_sent', 'order_inquired', 'ordered', 'opted_out'];
const SECTOR_LABELS = {
    pharmacies: 'الصيدليات والوكلاء', hypermarkets: 'الهايبرات وتجار الجملة', distribution: 'شركات التوزيع والمخازن', hotels: 'الفنادق والتوريدات',
    supplies: 'الشركات والتوريدات', salon: 'الصالونات ومراكز التجميل', moms: 'الماميز ومندوبو المبيعات وسفراء الزمردة (بالعمولة)', retail: 'عملاء التجزئة', unknown: 'غير مصنف'
};
// Order matters: more specific sectors are tested first.
const SECTOR_KEYWORDS = [
    ['pharmacies', ['صيدل', 'دكتور', 'مذخر', 'مكتب علمي', 'ادوي', 'أدوي']],
    ['salon', ['صالون', 'كوافير', 'بيوتي', 'حلاق', 'سبا', 'spa', 'تجميل', 'ميك اب']],
    ['distribution', ['توزيع', 'موزع', 'مستودع', 'مخزن']],
    ['hypermarkets', ['هايبر', 'ماركت', 'جملة', 'تجزئة', 'سلاسل']],
    ['hotels', ['فندق', 'فنادق', 'منتجع', 'ريزورت', 'قرية سياحية', 'hotel', 'resort']],
    ['supplies', ['توريد', 'مطعم', 'مطاعم', 'كافيه', 'مستشفى', 'شركة', 'مؤسسة']],
    ['moms', ['ماميز', 'مندوب', 'سفير', 'سفراء', 'سفيرة', 'جروب', 'ربة بيت', 'ربات بيوت', 'شغل من البيت', 'عمولة']]
];

function classifySector(text) {
    const haystack = String(text || '').toLowerCase();
    for (const [sector, words] of SECTOR_KEYWORDS) if (words.some(word => haystack.includes(word))) return sector;
    return 'unknown';
}

// Phones become Egyptian international digits (20XXXXXXXXXX); emails are lowercased. Anything else is rejected.
function normalizeContact(value) {
    const raw = String(value ?? '').trim();
    if (!raw) return null;
    if (raw.includes('@') && !/@(c|g)\.us$/i.test(raw)) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw) ? { key: raw.toLowerCase(), channel: 'email' } : null;
    let digits = raw.replace(/@.*$/, '').replace(/\D/g, '').replace(/^00/, '');
    if (/^0\d{10}$/.test(digits)) digits = '2' + digits;
    else if (/^1\d{9}$/.test(digits)) digits = '20' + digits;
    if (/^20(1\d{9}|[2-9]\d{7,9})$/.test(digits)) return { key: digits, channel: 'whatsapp' };
    // Numbers from other countries keep their own international form.
    return /^[1-9]\d{9,14}$/.test(digits) && !digits.startsWith('20') ? { key: digits, channel: 'whatsapp' } : null;
}

function mask(key) {
    return key.includes('@') ? key.replace(/^(.{2}).*(@.*)$/, '$1••••$2') : `${key.slice(0, 4)}••••${key.slice(-3)}`;
}

async function upsertLeads(tx, rows, actor, now = Date.now()) {
    const result = { added: 0, merged: 0, rejected: 0 };
    for (const row of rows) {
        const contact = normalizeContact(row.contact);
        if (!contact) { result.rejected++; continue; }
        const existing = (await tx.execute({ sql: 'SELECT id FROM leads WHERE contact_key = ?', args: [contact.key] })).rows[0];
        const stage = STAGES.includes(row.stage) ? row.stage : 'new';
        const sector = SECTOR_LABELS[row.sector] ? row.sector : 'unknown';
        await tx.execute({
            sql: `INSERT INTO leads(id, contact_key, channel, name, sector, source, stage, notes, last_contact_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                  ON CONFLICT(contact_key) DO UPDATE SET
                    name = CASE WHEN leads.name = '' THEN excluded.name ELSE leads.name END,
                    sector = CASE WHEN leads.sector = 'unknown' THEN excluded.sector ELSE leads.sector END,
                    stage = CASE WHEN excluded.stage != 'new' AND leads.opted_out = 0 THEN excluded.stage ELSE leads.stage END,
                    notes = CASE WHEN leads.notes = '' THEN excluded.notes ELSE leads.notes END,
                    last_contact_at = CASE WHEN excluded.last_contact_at IS NULL THEN leads.last_contact_at WHEN leads.last_contact_at IS NULL OR excluded.last_contact_at > leads.last_contact_at THEN excluded.last_contact_at ELSE leads.last_contact_at END,
                    updated_at = excluded.updated_at`,
            args: [crypto.randomUUID(), contact.key, contact.channel, String(row.name || '').trim().slice(0, 120), sector, String(row.source || 'import').slice(0, 40), stage, String(row.notes || '').slice(0, 300), row.lastContactAt > 0 ? row.lastContactAt : null, now, now]
        });
        existing ? result.merged++ : result.added++;
    }
    if (actor) await audit(tx, actor, 'leads.imported', 'leads', result);
    return result;
}

async function importLeads(database, rows, actor, { apply = false } = {}) {
    if (!Array.isArray(rows) || !rows.length || rows.length > 5000) fail(400, 'عدد السجلات غير صالح.');
    if (!apply) {
        const keys = new Set();
        let rejected = 0;
        for (const row of rows) { const contact = normalizeContact(row.contact); contact ? keys.add(contact.key) : rejected++; }
        const known = new Set();
        if (database) for (const key of keys) if ((await database.execute({ sql: 'SELECT 1 FROM leads WHERE contact_key = ?', args: [key] })).rows.length) known.add(key);
        return { mode: 'preview', rows: rows.length, unique: keys.size, alreadyStored: known.size, rejected };
    }
    return transaction(database, async tx => ({ mode: 'imported', ...(await upsertLeads(tx, rows, actor)) }));
}

async function setOptOut(tx, contactKey) {
    await tx.execute({ sql: "UPDATE leads SET opted_out = 1, stage = 'opted_out', updated_at = ? WHERE contact_key = ?", args: [Date.now(), contactKey] });
}

async function leadSummary(database, now = Date.now()) {
    const cutoff = now - 30 * DAY;
    const sectors = (await database.execute({
        sql: `SELECT sector, COUNT(*) AS total,
                SUM(CASE WHEN opted_out = 0 AND (last_contact_at IS NULL OR last_contact_at <= ?) THEN 1 ELSE 0 END) AS available,
                SUM(CASE WHEN opted_out = 0 AND last_contact_at > ? THEN 1 ELSE 0 END) AS blocked,
                SUM(opted_out) AS opted_out, SUM(consent) AS consented,
                MIN(CASE WHEN opted_out = 0 AND last_contact_at > ? THEN last_contact_at END) AS earliest_blocked
              FROM leads GROUP BY sector ORDER BY total DESC`, args: [cutoff, cutoff, cutoff]
    })).rows.map(row => ({ sector: row.sector, label: SECTOR_LABELS[row.sector] || row.sector, total: row.total, available: row.available, blocked: row.blocked, optedOut: row.opted_out, consented: row.consented, nextAvailableAt: row.earliest_blocked ? Number(row.earliest_blocked) + 30 * DAY : null }));
    const stages = (await database.execute('SELECT stage, COUNT(*) AS count FROM leads GROUP BY stage')).rows;
    return { sectors, stages: Object.fromEntries(stages.map(row => [row.stage, row.count])), total: sectors.reduce((sum, row) => sum + row.total, 0) };
}

async function listLeads(database, { sector, stage, limit = 100 } = {}) {
    const where = [];
    const args = [];
    if (sector) { where.push('sector = ?'); args.push(sector); }
    if (stage) { where.push('stage = ?'); args.push(stage); }
    const rows = (await database.execute({ sql: `SELECT id, contact_key, channel, name, sector, stage, source, consent, opted_out, last_contact_at FROM leads ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY updated_at DESC LIMIT ?`, args: [...args, Math.min(Number(limit) || 100, 300)] })).rows;
    return rows.map(row => ({ id: row.id, contact: mask(row.contact_key), channel: row.channel, name: row.name, sector: row.sector, sectorLabel: SECTOR_LABELS[row.sector] || row.sector, stage: row.stage, source: row.source, consent: Boolean(row.consent), optedOut: Boolean(row.opted_out), lastContactAt: row.last_contact_at ? Number(row.last_contact_at) : null, availableAt: row.last_contact_at ? Number(row.last_contact_at) + 30 * DAY : null }));
}

module.exports = { STAGES, SECTOR_LABELS, classifySector, normalizeContact, upsertLeads, importLeads, setOptOut, leadSummary, listLeads };
