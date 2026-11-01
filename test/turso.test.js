const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { createClient } = require('@libsql/client/web');
const { transaction } = require('../lib/storage');
const enabled = Boolean(process.env.TEST_TURSO_DATABASE_URL && process.env.TEST_TURSO_AUTH_TOKEN);
test('isolated Turso transaction concurrency, rollback and persistence', { skip: !enabled }, async () => {
    const db = createClient({ url: process.env.TEST_TURSO_DATABASE_URL, authToken: process.env.TEST_TURSO_AUTH_TOKEN });
    const name = 'verification_' + crypto.randomBytes(8).toString('hex');
    try {
        await db.execute(`CREATE TABLE ${name}(id INTEGER PRIMARY KEY, stock INTEGER NOT NULL, events INTEGER NOT NULL)`);
        await db.execute(`INSERT INTO ${name} VALUES (1, 1, 0)`);
        await assert.rejects(transaction(db, async tx => { await tx.execute(`UPDATE ${name} SET stock = 0`); throw new Error('rollback'); }));
        assert.equal(Number((await db.execute(`SELECT stock FROM ${name}`)).rows[0].stock), 1);
        const outcomes = await Promise.allSettled(Array.from({ length: 10 }, () => transaction(db, async tx => {
            const changed = await tx.execute(`UPDATE ${name} SET stock = stock - 1, events = events + 1 WHERE stock > 0`);
            return Number(changed.rowsAffected);
        })));
        assert.equal(outcomes.filter(outcome => outcome.status === 'fulfilled' && outcome.value === 1).length, 1);
        const independent = createClient({ url: process.env.TEST_TURSO_DATABASE_URL, authToken: process.env.TEST_TURSO_AUTH_TOKEN });
        try { const row = (await independent.execute(`SELECT * FROM ${name}`)).rows[0]; assert.equal(Number(row.stock), 0); assert.equal(Number(row.events), 1); }
        finally { independent.close(); }
    } finally { await db.execute(`DROP TABLE IF EXISTS ${name}`); db.close(); }
});
