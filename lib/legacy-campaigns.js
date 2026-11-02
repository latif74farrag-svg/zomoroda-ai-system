const crypto = require('node:crypto');
const { transaction } = require('./storage');
const { fail } = require('./commerce');

const campaignTables = ['campaign_state', 'sent_history', 'monthly_offers', 'scheduled_posts', 'manager_logs'];

async function readLegacyCampaigns(bytes) {
    if (!Buffer.isBuffer(bytes) || bytes.length < 100 || bytes.length > 10 * 1024 * 1024 || !bytes.subarray(0, 16).equals(Buffer.from('SQLite format 3\u0000'))) fail(400, 'اختر ملف قاعدة بيانات SQLite صالحاً لا يتجاوز 10 ميجابايت.');
    const SQL = await require('sql.js')();
    const source = new SQL.Database(bytes);
    try {
        if (source.exec('PRAGMA integrity_check')[0]?.values[0]?.[0] !== 'ok') fail(400, 'ملف قاعدة البيانات غير سليم.');
        const known = new Set((source.exec("SELECT name FROM sqlite_master WHERE type = 'table'")[0]?.values || []).map(row => row[0]));
        const records = [];
        for (const table of campaignTables) {
            if (!known.has(table)) continue;
            const statement = source.prepare(`SELECT * FROM "${table}"`);
            let rowNumber = 0;
            try { while (statement.step()) records.push({ table, rowNumber: rowNumber++, data: statement.getAsObject() }); }
            finally { statement.free(); }
        }
        return { sourceHash: crypto.createHash('sha256').update(bytes).digest('hex'), records };
    } finally { source.close(); }
}

async function importLegacyCampaigns(database, bytes, actor, { apply = false } = {}) {
    const extracted = await readLegacyCampaigns(bytes);
    if (!extracted.records.length) fail(400, 'لا يحتوي الملف على بيانات حملات قديمة قابلة للاسترجاع.');
    const tables = Object.fromEntries(campaignTables.map(table => [table, extracted.records.filter(row => row.table === table).length]));
    const report = { sourceHash: extracted.sourceHash, mode: apply ? 'imported' : 'preview', tables, records: extracted.records.length };
    if (!apply) return report;
    return transaction(database, async tx => {
        const existing = (await tx.execute({ sql: "SELECT DISTINCT source_hash FROM legacy_records WHERE table_name IN ('campaign_state', 'sent_history', 'monthly_offers', 'scheduled_posts', 'manager_logs') LIMIT 2", args: [] })).rows;
        if (existing.length && existing.some(row => row.source_hash !== extracted.sourceHash)) fail(409, 'يوجد مصدر حملات معتمد بالفعل. لا يمكن خلطه بملف قاعدة بيانات قديم آخر.');
        for (const row of extracted.records) await tx.execute({ sql: 'INSERT OR IGNORE INTO legacy_records(source_hash, table_name, row_number, data) VALUES (?, ?, ?, ?)', args: [extracted.sourceHash, row.table, row.rowNumber, JSON.stringify(row.data)] });
        await require('./commerce').audit(tx, actor, 'legacy.campaigns.imported', extracted.sourceHash, report);
        return report;
    });
}

function mask(value) {
    const text = String(value || '');
    return text.length <= 5 ? '••••' : `${text.slice(0, 2)}••••${text.slice(-2)}`;
}

async function campaignArchive(database) {
    const rows = (await database.execute({ sql: "SELECT table_name, data FROM legacy_records WHERE table_name IN ('campaign_state', 'sent_history', 'monthly_offers', 'scheduled_posts', 'manager_logs') ORDER BY row_number DESC LIMIT 600", args: [] })).rows;
    const grouped = Object.fromEntries(campaignTables.map(table => [table, []]));
    for (const row of rows) { try { grouped[row.table_name].push(JSON.parse(row.data)); } catch {} }
    return {
        summary: Object.fromEntries(campaignTables.map(table => [table, grouped[table].length])),
        states: grouped.campaign_state,
        offers: grouped.monthly_offers,
        scheduledPosts: [...grouped.scheduled_posts, ...grouped.manager_logs.map(item => ({ title: item.action_type || 'سجل إدارة', created_at: item.created_at || '', sector: item.details || '' }))],
        history: grouped.sent_history.slice(0, 20).map(item => ({ platform: item.platform || '', sector: item.sector || item.category || '', sentAt: item.sent_at || item.created_at || '', recipient: mask(item.target_identifier) })),
        logs: grouped.manager_logs.slice(0, 20)
    };
}

module.exports = { importLegacyCampaigns, campaignArchive };
