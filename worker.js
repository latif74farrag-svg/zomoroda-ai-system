const store = require('./store_data');
const { getDatabase } = require('./lib/storage');
const { expireReservations } = require('./lib/commerce');
const { coordinate } = require('./lib/agents');
const { runOnce } = require('./lib/queue');

async function main() {
    await store.initializeStoreDatabase();
    const database = await getDatabase();
    let stopping = false;
    for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => { stopping = true; });
    console.log(JSON.stringify({ event: 'worker.started' }));
    let lastHeartbeat = 0;
    let lastMaintenance = 0;
    let lastTick = 0;
    while (!stopping) {
        try {
            if (Date.now() - lastHeartbeat >= 10000) {
                await database.execute({ sql: "INSERT INTO system_state(key, value) VALUES ('worker_heartbeat', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", args: [Date.now()] });
                lastHeartbeat = Date.now();
            }
            if (Date.now() - lastMaintenance >= 30000) {
                await expireReservations(database);
                await database.execute({ sql: 'DELETE FROM rate_limits WHERE reset_at < ?', args: [Date.now() - 3600000] });
                lastMaintenance = Date.now();
            }
            if (Date.now() - lastTick >= 3600000) {
                await require('./lib/manager-agent').tick(database);
                await require('./lib/agentic/registry').tick(database);
                lastTick = Date.now();
            }
            if (Date.now() - lastDelivery >= 5000) { // email + social replies from the outbox; each send is gated by the agent switch and outreach policy
                await require('./lib/channels/delivery').tick(database);
                lastDelivery = Date.now();
            }
            const worked = await runOnce(database, job => coordinate(database, job));
            if (!worked) await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            console.error(JSON.stringify({ event: 'worker.failure', code: error.status || 'internal' }));
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
    await database.close();
}
if (require.main === module) main().catch(() => { console.error('Worker startup failed; check persistent database configuration'); process.exitCode = 1; });
module.exports = { main };
