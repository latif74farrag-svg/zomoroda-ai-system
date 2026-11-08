// A bounded worker pass for Vercel Cron. Unlike worker.js, this never waits or
// loops forever: each invocation does small, durable work and returns.
const { expireReservations } = require('./commerce');
const { runOnce } = require('./queue');
const { coordinate } = require('./agents');

async function run(database, { now = Date.now(), batchSize = 10, source = 'cron' } = {}) {
    const limit = Math.min(Math.max(Number(batchSize) || 10, 1), 20);
    await database.execute({ sql: "INSERT INTO system_state(key, value) VALUES ('worker_heartbeat', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", args: [now] });
    await expireReservations(database, now);
    await database.execute({ sql: 'DELETE FROM rate_limits WHERE reset_at < ?', args: [now - 3600000] });
    await require('./manager-agent').tick(database, now);
    await require('./agentic/registry').tick(database, now);
    let processed = 0;
    while (processed < limit && await runOnce(database, job => coordinate(database, job), now)) processed++;
    const delivery = await require('./channels/delivery').tick(database, now);
    await database.execute({ sql: "INSERT INTO system_state(key, value) VALUES ('batch_worker_success', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", args: [now] });
    if (source === 'cron') await database.execute({ sql: "INSERT INTO system_state(key, value) VALUES ('cron_worker_success', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", args: [now] });
    return { processed, delivery };
}

module.exports = { run };
