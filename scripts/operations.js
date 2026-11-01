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
    if (action !== 'backup') await store.initializeStoreDatabase();
    const db = await getDatabase();
    try {
        if (action === 'migrate') {
            console.log(JSON.stringify({ event: 'migrations.complete', versions: (await db.execute('SELECT version FROM schema_migrations ORDER BY version')).rows }));
        } else if (action === 'staff-create') {
            const id = await require('../lib/staff').createStaff(db, { email: process.env.BOOTSTRAP_STAFF_EMAIL, name: process.env.BOOTSTRAP_STAFF_NAME, password: process.env.BOOTSTRAP_STAFF_PASSWORD, totpSecret: process.env.BOOTSTRAP_STAFF_TOTP_SECRET, role: process.env.BOOTSTRAP_STAFF_ROLE || 'admin' });
            console.log(JSON.stringify({ event: 'staff.created', id }));
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
        } else throw new Error('Unknown action');
    } finally { await db.close(); }
}
main().catch(error => { console.error(JSON.stringify({ event: 'operation.failed', message: error.message })); process.exitCode = 1; });
