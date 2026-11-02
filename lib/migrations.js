const { transaction } = require('./storage');

const migrations = [
    [1, [
        `ALTER TABLE store_orders ADD COLUMN total_minor INTEGER`,
        `ALTER TABLE store_orders ADD COLUMN idempotency_key TEXT`,
        `ALTER TABLE store_orders ADD COLUMN request_hash TEXT`,
        `ALTER TABLE store_orders ADD COLUMN reservation_expires_at INTEGER`,
        `ALTER TABLE store_orders ADD COLUMN stock_state TEXT NOT NULL DEFAULT 'legacy'`,
        `UPDATE store_orders SET total_minor = CAST(ROUND(total * 100) AS INTEGER)`,
        `CREATE UNIQUE INDEX store_order_idempotency ON store_orders(idempotency_key)`,
        `CREATE TABLE inventory (product_id TEXT PRIMARY KEY, on_hand INTEGER NOT NULL DEFAULT 0 CHECK(on_hand >= 0), reserved INTEGER NOT NULL DEFAULT 0 CHECK(reserved >= 0 AND reserved <= on_hand), low_stock INTEGER NOT NULL DEFAULT 5)`,
        `CREATE TABLE inventory_history (id INTEGER PRIMARY KEY AUTOINCREMENT, product_id TEXT NOT NULL, delta INTEGER NOT NULL, reason TEXT NOT NULL, actor TEXT NOT NULL, created_at INTEGER NOT NULL)`,
        `CREATE TABLE audit_log (id INTEGER PRIMARY KEY AUTOINCREMENT, actor TEXT NOT NULL, action TEXT NOT NULL, resource TEXT NOT NULL, details TEXT NOT NULL, created_at INTEGER NOT NULL)`,
        `CREATE TABLE jobs (id TEXT PRIMARY KEY, type TEXT NOT NULL, payload TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0, available_at INTEGER NOT NULL, lease_until INTEGER, lease_token TEXT, last_error TEXT, created_at INTEGER NOT NULL)`,
        `CREATE INDEX jobs_due ON jobs(status, available_at)`,
        `CREATE TABLE staff (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, role TEXT NOT NULL, password_hash TEXT NOT NULL, password_salt TEXT NOT NULL, totp_secret TEXT NOT NULL, last_totp_step INTEGER NOT NULL DEFAULT -1, disabled INTEGER NOT NULL DEFAULT 0)`,
        `CREATE TABLE staff_sessions (token_hash TEXT PRIMARY KEY, staff_id TEXT NOT NULL, csrf TEXT NOT NULL, expires_at INTEGER NOT NULL)`,
        `CREATE TABLE rate_limits (bucket TEXT PRIMARY KEY, hits INTEGER NOT NULL, reset_at INTEGER NOT NULL)`,
        `CREATE TABLE agent_controls (agent TEXT PRIMARY KEY, paused INTEGER NOT NULL DEFAULT 0)`,
        `INSERT INTO agent_controls(agent, paused) VALUES ('global', 1), ('inventory', 0), ('orders', 0), ('support', 0)`,
        `CREATE TABLE agent_tasks (id TEXT PRIMARY KEY, agent TEXT NOT NULL, source_id TEXT NOT NULL, version TEXT NOT NULL, evidence TEXT NOT NULL, proposal TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'proposed', approved_by TEXT, created_at INTEGER NOT NULL, UNIQUE(agent, source_id))`,
        `CREATE TABLE support_tickets (id TEXT PRIMARY KEY, customer_id TEXT, message TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'open', created_at INTEGER NOT NULL)`,
        `CREATE TABLE customer_recovery (token_hash TEXT PRIMARY KEY, customer_id TEXT NOT NULL, expires_at INTEGER NOT NULL, used INTEGER NOT NULL DEFAULT 0)`,
        `CREATE TABLE cod_collections (order_number TEXT PRIMARY KEY, amount_minor INTEGER NOT NULL, reference TEXT NOT NULL UNIQUE, actor TEXT NOT NULL, created_at INTEGER NOT NULL)`,
        `CREATE TABLE operation_receipts (key TEXT PRIMARY KEY, request_hash TEXT NOT NULL)`
    ]],
    [2, [
        `ALTER TABLE store_orders ADD COLUMN subtotal_minor INTEGER`,
        `ALTER TABLE store_orders ADD COLUMN shipping_minor INTEGER NOT NULL DEFAULT 0`,
        `UPDATE store_orders SET subtotal_minor = total_minor`,
        `CREATE TABLE legacy_records (source_hash TEXT NOT NULL, table_name TEXT NOT NULL, row_number INTEGER NOT NULL, data TEXT NOT NULL, PRIMARY KEY(source_hash, table_name, row_number))`,
        `CREATE TABLE import_runs (source_hash TEXT PRIMARY KEY, report TEXT NOT NULL, created_at INTEGER NOT NULL)`,
        `CREATE TABLE system_state (key TEXT PRIMARY KEY, value INTEGER NOT NULL)`
    ]],
    [3, [
        `CREATE TABLE marketing_campaigns (id TEXT PRIMARY KEY, title TEXT NOT NULL, sector TEXT NOT NULL, channel TEXT NOT NULL, product_type TEXT NOT NULL, message TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'draft', created_by TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`,
        `CREATE INDEX marketing_campaigns_recent ON marketing_campaigns(updated_at DESC)`,
        `INSERT INTO agent_controls(agent, paused) VALUES ('marketing', 0)`
    ]],
    [4, [
        `CREATE TABLE leads (id TEXT PRIMARY KEY, contact_key TEXT NOT NULL UNIQUE, channel TEXT NOT NULL, name TEXT NOT NULL DEFAULT '', sector TEXT NOT NULL DEFAULT 'unknown', source TEXT NOT NULL DEFAULT 'manual', stage TEXT NOT NULL DEFAULT 'new', notes TEXT NOT NULL DEFAULT '', consent INTEGER NOT NULL DEFAULT 0, opted_out INTEGER NOT NULL DEFAULT 0, last_contact_at INTEGER, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`,
        `CREATE INDEX leads_sector_stage ON leads(sector, stage)`,
        `CREATE TABLE message_templates (id TEXT PRIMARY KEY, sector TEXT NOT NULL, body TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL, UNIQUE(sector, body))`,
        `CREATE TABLE affiliates (phone TEXT PRIMARY KEY, name TEXT NOT NULL, supervisor_phone TEXT, role TEXT NOT NULL DEFAULT 'representative', sales_count INTEGER NOT NULL DEFAULT 0, commission_minor INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL)`,
        `CREATE TABLE affiliate_sales (id TEXT PRIMARY KEY, rep_phone TEXT NOT NULL, amount_minor INTEGER NOT NULL, direct_minor INTEGER NOT NULL, override_minor INTEGER NOT NULL, supervisor_phone TEXT, created_by TEXT NOT NULL, created_at INTEGER NOT NULL)`,
        `INSERT INTO agent_controls(agent, paused) VALUES ('manager', 0), ('ads', 0), ('sales', 0), ('affiliate', 0)`
    ]],
    [5, [
        `CREATE TABLE price_list_items (list TEXT NOT NULL, item_key TEXT NOT NULL, period TEXT NOT NULL, barcode TEXT, name TEXT NOT NULL, brand TEXT NOT NULL DEFAULT '', category TEXT NOT NULL DEFAULT '', pack TEXT NOT NULL DEFAULT '', units_per_carton INTEGER, unit_minor INTEGER, carton_minor INTEGER, unit_tax_minor INTEGER, carton_tax_minor INTEGER, consumer_minor INTEGER, source TEXT NOT NULL, updated_at INTEGER NOT NULL, PRIMARY KEY(list, item_key))`,
        `CREATE INDEX price_list_barcode ON price_list_items(barcode)`
    ]],
    [6, [
        `ALTER TABLE staff ADD COLUMN login_mode TEXT NOT NULL DEFAULT 'totp'`,
        `CREATE TABLE email_login_codes (email TEXT PRIMARY KEY, code_hash TEXT NOT NULL, expires_at INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL)`
    ]]
];

async function migrate(database) {
    await database.execute('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL)');
    for (const [version, statements] of migrations) {
        await transaction(database, async tx => {
            if ((await tx.execute({ sql: 'SELECT version FROM schema_migrations WHERE version = ?', args: [version] })).rows.length) return;
            for (const sql of statements) await tx.execute(sql);
            await tx.execute({ sql: 'INSERT INTO schema_migrations VALUES (?, ?)', args: [version, Date.now()] });
        });
    }
}
module.exports = { migrate, migrations };
