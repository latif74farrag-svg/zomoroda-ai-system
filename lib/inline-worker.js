// Runs the agent worker inside the web server so one command (`npm start`) is enough.
// Without this, agents only ran if someone separately started worker.js (locally) or waited for the daily Vercel cron.
// Each pass is the same bounded, durable cron-worker pass; pauses, approvals and the Guardian still apply.
// Set INLINE_WORKER=0 to disable (for example when worker.js runs as its own process).
const INTERVAL_MS = 30000;

function start({ getDatabase, initialize, run = require('./cron-worker').run, interval = INTERVAL_MS, log = console } = {}) {
    if (process.env.INLINE_WORKER === '0') return { stop() {} };
    let stopped = false, busy = false, timer = null;
    async function pass() {
        if (stopped || busy) return;
        busy = true;
        try {
            await initialize();
            await run(await getDatabase(), { batchSize: 10, source: 'inline' });
        } catch (error) {
            log.error(JSON.stringify({ event: 'inline_worker.failure', code: error.status || 'internal' }));
        } finally { busy = false; }
    }
    pass();
    timer = setInterval(pass, interval);
    timer.unref?.();
    log.log(JSON.stringify({ event: 'inline_worker.started', everySeconds: interval / 1000 }));
    return { stop() { stopped = true; clearInterval(timer); } };
}
module.exports = { start };
