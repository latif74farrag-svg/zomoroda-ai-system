const crypto = require('node:crypto');
const { transaction } = require('./storage');
const { minor, fail, audit } = require('./commerce');
const commerceTables = ['store_products', 'store_customers', 'store_orders'];
const archivedTables = ['affiliates', 'customers', 'orders', 'sent_history', 'campaign_state', 'manager_logs', 'monthly_offers', 'scheduled_posts'];
async function importLegacy(database, bytes, { apply = false } = {}) {
    const SQL = await require('sql.js')();
    const source = new SQL.Database(bytes);
    const sourceHash = crypto.createHash('sha256').update(bytes).digest('hex');
    const extracted = new Map();
    try {
        if (source.exec('PRAGMA integrity_check')[0]?.values[0][0] !== 'ok') fail(400, 'Source integrity check failed');
        const tables = new Set((source.exec("SELECT name FROM sqlite_master WHERE type = 'table'")[0]?.values || []).map(row => row[0]));
        for (const table of [...commerceTables, ...archivedTables]) {
            if (!tables.has(table)) continue;
            const statement = source.prepare(`SELECT * FROM "${table}"`);
            const rows = [];
            try { while (statement.step()) rows.push(statement.getAsObject()); }
            finally { statement.free(); }
            extracted.set(table, rows);
        }
    } finally { source.close(); }
    const report = { sourceHash, mode: apply ? 'apply' : 'dry-run', tables: [...extracted].map(([name, rows]) => ({ name, rows: rows.length, destination: commerceTables.includes(name) ? name : 'legacy_records' })), orderTotalMinor: (extracted.get('store_orders') || []).reduce((sum, row) => sum + minor(row.total), 0), inventory: 'All imported orders are historical; verify current stock separately. No imported commissions are recalculated.' };
    if (!apply) return report;
    return transaction(database, async tx => {
        const previous = (await tx.execute({ sql: 'SELECT report FROM import_runs WHERE source_hash = ?', args: [sourceHash] })).rows[0];
        if (previous) return { ...JSON.parse(previous.report), replayed: true };
        for (const table of ['store_orders', 'store_customers']) {
            if (Number((await tx.execute(`SELECT COUNT(*) AS count FROM ${table}`)).rows[0].count)) fail(409, 'Import requires an empty destination for orders and customers');
        }
        const changes = (await tx.execute("SELECT COUNT(*) AS count FROM audit_log WHERE action LIKE 'catalog.%'")).rows[0].count;
        if (Number(changes)) fail(409, 'Destination catalog has staff edits; resolve before importing');
        for (const [table, rows] of extracted) {
            if (!commerceTables.includes(table)) {
                for (let index = 0; index < rows.length; index++) await tx.execute({ sql: 'INSERT INTO legacy_records VALUES (?, ?, ?, ?)', args: [sourceHash, table, index, JSON.stringify(rows[index])] });
                continue;
            }
            const columns = new Set((await tx.execute(`PRAGMA table_info(${table})`)).rows.map(row => row.name));
            for (const original of rows) {
                const row = Object.fromEntries(Object.entries(original).filter(([column]) => columns.has(column) && (column !== 'id' || table !== 'store_orders')));
                if (table === 'store_orders') {
                    row.total_minor = minor(row.total); row.subtotal_minor = row.total_minor; row.shipping_minor = 0;
                    row.stock_state = 'legacy'; row.reservation_expires_at = null; row.idempotency_key = null; row.request_hash = null;
                }
                if (table === 'store_customers') row.session_version = Number(row.session_version || 0) + 1;
                const names = Object.keys(row);
                if (names.some(name => !/^[a-z_]+$/.test(name))) fail(400, 'Unsupported import column');
                const upsert = table === 'store_products' ? ' ON CONFLICT(id) DO UPDATE SET ' + names.filter(name => name !== 'id').map(name => `${name}=excluded.${name}`).join(',') : '';
                await tx.execute({ sql: `INSERT INTO ${table}(${names.join(',')}) VALUES (${names.map(() => '?').join(',')})${upsert}`, args: Object.values(row) });
            }
            if (table !== 'store_products') {
                const count = Number((await tx.execute(`SELECT COUNT(*) AS count FROM ${table}`)).rows[0].count);
                if (count !== rows.length) fail(409, 'Imported count mismatch');
            }
        }
        await tx.execute('INSERT OR IGNORE INTO inventory(product_id) SELECT id FROM store_products');
        const importedTotal = Number((await tx.execute('SELECT COALESCE(SUM(total_minor), 0) AS total FROM store_orders')).rows[0].total);
        if (importedTotal !== report.orderTotalMinor) fail(409, 'Imported order total mismatch');
        await tx.execute({ sql: 'INSERT INTO import_runs VALUES (?, ?, ?)', args: [sourceHash, JSON.stringify(report), Date.now()] });
        await audit(tx, 'migration:cli', 'legacy.imported', sourceHash, report);
        return report;
    });
}
module.exports = { importLegacy };
