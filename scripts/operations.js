const fs = require('node:fs');
const path = require('node:path');
const store = require('../store_data');
const { getDatabase } = require('../lib/storage');

async function main() {
    const action = process.argv[2];
    if (action === 'restore-check') {
        const source = process.argv[3];
        const destination = process.argv[4];
        if (!source) throw new Error('Provide an encrypted backup filename and optional NEW isolated restore filename');
        if (destination) fs.mkdirSync(path.dirname(path.resolve(destination)), { recursive: true });
        console.log(JSON.stringify(await require('../lib/backup').restore(fs.readFileSync(source, 'utf8'), process.env.BACKUP_ENCRYPTION_KEY, destination)));
        return;
    }
    if (action === 'campaign-import' && !process.argv.includes('--apply')) {
        if (!process.argv[3]) throw new Error('Provide the legacy SQLite source file; add --apply only after reviewing the preview.');
        const report = await require('../lib/legacy-campaigns').importLegacyCampaigns(null, fs.readFileSync(process.argv[3]), 'migration:cli', { apply: false });
        console.log(JSON.stringify(report));
        return;
    }
    if (action === 'business-import' && !process.argv.includes('--apply')) {
        const { rows, counts } = require('./business-data').collectLeads(path.resolve(process.argv[3] || '.'));
        const report = await require('../lib/leads').importLeads(null, rows, 'migration:cli', { apply: false });
        console.log(JSON.stringify({ ...report, sources: counts, templates: Object.values(require('./business-data').loadLegacyMessages(path.resolve(process.argv[3] || '.'))).reduce((n, list) => n + list.length, 0) }));
        return;
    }
    if (action === 'prices-import' && !process.argv.includes('--apply')) {
        const lists = require('./price-data').collectPriceLists(path.resolve(process.argv[3] || '.'));
        console.log(JSON.stringify(Object.fromEntries(Object.entries(lists).map(([list, data]) => [list, { items: data.items.length, source: data.source, warnings: data.items.filter(item => item.warning).map(item => item.warning) }]))));
        return;
    }
    if (action === 'store-refresh' && !process.argv.includes('--apply')) {
        const { changes } = require('./store-refresh').plan(path.join(__dirname, '..'), require('./price-data').collectPriceLists(path.resolve(process.argv[3] || '.')).consumer.items);
        console.log(JSON.stringify(changes.map(change => change.action === 'retire' ? change : { id: change.id, price: `${change.oldPrice} -> ${change.price}`, carton: `${change.oldCarton} -> ${change.carton}` })));
        return;
    }
    if (action !== 'backup') await store.initializeStoreDatabase();
    const db = await getDatabase();
    try {
        if (action === 'migrate') {
            console.log(JSON.stringify({ event: 'migrations.complete', versions: (await db.execute('SELECT version FROM schema_migrations ORDER BY version')).rows }));
        } else if (action === 'staff-create') {
            const id = await require('../lib/staff').createStaff(db, { email: process.env.BOOTSTRAP_STAFF_EMAIL, name: process.env.BOOTSTRAP_STAFF_NAME, password: process.env.BOOTSTRAP_STAFF_PASSWORD, totpSecret: process.env.BOOTSTRAP_STAFF_TOTP_SECRET, role: process.env.BOOTSTRAP_STAFF_ROLE || 'admin' });
            console.log(JSON.stringify({ event: 'staff.created', id }));
        } else if (action === 'staff-create-email') {
            const id = await require('../lib/staff').createEmailStaff(db, { email: process.env.BOOTSTRAP_STAFF_EMAIL, name: process.env.BOOTSTRAP_STAFF_NAME, role: process.env.BOOTSTRAP_STAFF_ROLE || 'admin' });
            console.log(JSON.stringify({ event: 'staff.created', id, loginMode: 'email' }));
        } else if (action === 'backup') {
            const destination = process.argv[3] || path.join('backups', `commerce-${Date.now()}.encrypted.json`);
            fs.mkdirSync(path.dirname(path.resolve(destination)), { recursive: true });
            const snapshot = await require('../lib/backup').snapshot(db, process.env.BACKUP_ENCRYPTION_KEY);
            fs.writeFileSync(destination, snapshot, { flag: 'wx', mode: 0o600 });
            console.log(JSON.stringify({ event: 'backup.complete', destination }));
        } else if (action === 'import-legacy') {
            if (!process.argv[3]) throw new Error('Provide the source SQLite file; dry-run is default, add --apply after rehearsal');
            const report = await require('../lib/import-legacy').importLegacy(db, fs.readFileSync(process.argv[3]), { apply: process.argv.includes('--apply') });
            console.log(JSON.stringify(report));
        } else if (action === 'campaign-import') {
            if (!process.argv[3] || !process.argv.includes('--apply')) throw new Error('Provide the legacy SQLite source file and --apply after reviewing the preview.');
            const report = await require('../lib/legacy-campaigns').importLegacyCampaigns(db, fs.readFileSync(process.argv[3]), 'migration:cli', { apply: true });
            console.log(JSON.stringify(report));
        } else if (action === 'business-import') {
            const { rows, counts } = require('./business-data').collectLeads(path.resolve(process.argv[3] || '.'));
            const leads = await require('../lib/leads').importLeads(db, rows, 'migration:cli', { apply: true });
            const templates = await require('../lib/templates').seedTemplates(db, require('./business-data').loadLegacyMessages(path.resolve(process.argv[3] || '.')));
            console.log(JSON.stringify({ leads, templates, sources: counts, summary: await require('../lib/leads').leadSummary(db) }));
        } else if (action === 'prices-import') {
            const { PERIOD, collectPriceLists } = require('./price-data');
            const priceLists = require('../lib/price-lists');
            const lists = collectPriceLists(path.resolve(process.argv[3] || '.'));
            const report = [];
            for (const [list, data] of Object.entries(lists)) report.push(await priceLists.replaceList(db, list, PERIOD, data.items, data.source, 'migration:cli'));
            console.log(JSON.stringify({ period: PERIOD, lists: report, overview: await priceLists.overview(db) }));
        } else if (action === 'store-refresh') {
            const root = path.join(__dirname, '..');
            const { changes, next } = require('./store-refresh').plan(root, require('./price-data').collectPriceLists(path.resolve(process.argv[3] || '.')).consumer.items);
            const images = JSON.parse(fs.readFileSync(path.join(__dirname, 'store_product_images.json'), 'utf8'));
            const statements = changes.map(change => change.action === 'retire'
                ? { sql: 'UPDATE store_products SET is_active = 0 WHERE id = ?', args: [change.id] }
                : { sql: 'UPDATE store_products SET price = ?, carton = ?, name = ?, image_url = COALESCE(?, image_url) WHERE id = ?', args: [change.price, change.carton, change.name, images[change.id] || null, change.id] });
            await db.batch(statements, 'write');
            fs.writeFileSync(path.join(__dirname, 'whacka_products.json'), JSON.stringify(next, null, 2) + '\n');
            console.log(JSON.stringify({ event: 'store.refreshed', updated: next.length, retired: changes.length - next.length }));
        } else if (action === 'campaign-status') {
            console.log(JSON.stringify(await require('../lib/legacy-campaigns').campaignArchive(db)));
        } else throw new Error('Unknown action');
    } finally { await db.close(); }
}
main().catch(error => { console.error(JSON.stringify({ event: 'operation.failed', message: error.message })); process.exitCode = 1; });
