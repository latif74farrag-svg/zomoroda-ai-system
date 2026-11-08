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
});
