// Message library: the 50 legacy scripts, cleaned, stored per sector. Used for staff-reviewed drafts only.
const crypto = require('node:crypto');
const { transaction } = require('./storage');

const SECTOR_MAP = { pharmacy: ['pharmacies'], hotels: ['hotels', 'supplies'], wholesalers: ['hypermarkets', 'distribution'], salons: ['salon'], retail: ['moms', 'retail'] };
const FIXES = [[/جملة الجملة/g, 'الجملة'], [/للقياسة والترتيب/g, 'للنظافة والترتيب'], [/سيبلنا/g, 'أرسل لنا'], [/سيبي لنا/g, 'أرسلي لنا'], [/سيبي لنا/g, 'أرسلي لنا'], [/المصرح(?:ة)? طبياً/g, 'الموثوقة']];

function clean(text) {
    return FIXES.reduce((value, [pattern, replacement]) => value.replace(pattern, replacement), String(text)).trim();
}

async function seedTemplates(database, legacy) {
    let added = 0;
    await transaction(database, async tx => {
        for (const [legacyKey, scripts] of Object.entries(legacy)) {
            for (const sector of SECTOR_MAP[legacyKey] || []) {
                for (const script of scripts) {
                    const result = await tx.execute({ sql: 'INSERT OR IGNORE INTO message_templates(id, sector, body, created_at) VALUES (?, ?, ?, ?)', args: [crypto.randomUUID(), sector, clean(script), Date.now()] });
                    added += Number(result.rowsAffected);
                }
            }
        }
    });
    return { added };
}

async function listTemplates(database, sector) {
    const rows = (await database.execute(sector ? { sql: 'SELECT id, sector, body FROM message_templates WHERE active = 1 AND sector = ? ORDER BY rowid', args: [sector] } : 'SELECT id, sector, body FROM message_templates WHERE active = 1 ORDER BY sector, rowid')).rows;
    return rows.map(row => ({ id: row.id, sector: row.sector, body: row.body }));
}

module.exports = { seedTemplates, listTemplates, clean };
