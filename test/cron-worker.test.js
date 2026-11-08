const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fixture } = require('./helpers');
const { enqueue } = require('../lib/commerce');
const cronWorker = require('../lib/cron-worker');

test('cron worker records its heartbeat and bounds queue processing', async t => {
    const db = await fixture(); t.after(() => db.close());
    await db.execute("UPDATE agent_controls SET paused = 0 WHERE agent = 'global'");
    for (let index = 0; index < 3; index++) await enqueue(db, `cron-noop-${index}`, 'order.status', {}, 1000);
    const result = await cronWorker.run(db, { now: 1000, batchSize: 2 });
    assert.equal(result.processed, 2);
    assert.equal(Number((await db.execute("SELECT value FROM system_state WHERE key = 'worker_heartbeat'")).rows[0].value), 1000);
    assert.equal((await db.execute("SELECT COUNT(*) AS n FROM jobs WHERE status = 'done'")).rows[0].n, 2);
    assert.equal(Number((await db.execute("SELECT value FROM system_state WHERE key = 'cron_worker_success'")).rows[0].value), 1000);
});

test('daily status uses completed batches and distinguishes manual runs from Cron', async t => {
    const db = await fixture(); t.after(() => db.close());
    const old = { VERCEL: process.env.VERCEL, CRON_SECRET: process.env.CRON_SECRET };
    Object.assign(process.env, { VERCEL: '1', CRON_SECRET: 'test' });
    t.after(() => { for (const [key, value] of Object.entries(old)) if (value === undefined) delete process.env[key]; else process.env[key] = value; });
    const { status } = require('../lib/worker-status');
    assert.equal((await status(db)).label, 'بانتظار أول معالجة');
    await cronWorker.run(db, { now: 1000, source: 'manual', batchSize: 1 });
    const result = await status(db, 1000 + 12 * 3600000);
    assert.equal(result.healthy, true);
    assert.equal(result.lastCronSuccessAt, null);
    assert.equal((await status(db, 1000 + 27 * 3600000)).healthy, false);
});
