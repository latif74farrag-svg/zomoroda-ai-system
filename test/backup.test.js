const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fixture, order } = require('./helpers');
const { snapshot, restore } = require('../lib/backup');
const { createOrder } = require('../lib/commerce');
test('encrypted backup restores tables and rejects tampering or the wrong key', async t => {
    const db = await fixture(); t.after(() => db.close());
    await createOrder(db, order(), 'backup-checkout-00001');
    const secret = 'test-backup-key-'.repeat(4);
    const backup = await snapshot(db, secret);
    assert.ok(!backup.includes('Test Customer'));
    const report = await restore(backup, secret);
    assert.equal(report.tables.find(table => table.name === 'store_orders').count, 1);
    assert.equal(report.tables.find(table => table.name === 'schema_migrations').count, require('../lib/migrations').migrations.length);
    await assert.rejects(restore(backup, 'another-key-'.repeat(4)));
    const altered = JSON.parse(backup); const bytes = Buffer.from(altered.data, 'base64'); bytes[0] ^= 1; altered.data = bytes.toString('base64');
    await assert.rejects(restore(JSON.stringify(altered), secret));
});
