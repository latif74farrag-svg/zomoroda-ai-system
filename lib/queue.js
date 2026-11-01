const crypto = require('node:crypto');
const { transaction } = require('./storage');

async function claim(database, now = Date.now()) {
    return transaction(database, async tx => {
        await tx.execute({ sql: "UPDATE jobs SET status = CASE WHEN attempts >= 5 THEN 'dead' ELSE 'pending' END, lease_token = NULL, lease_until = NULL WHERE status = 'running' AND lease_until <= ?", args: [now] });
        const job = (await tx.execute({ sql: "SELECT * FROM jobs WHERE status = 'pending' AND available_at <= ? ORDER BY available_at, created_at LIMIT 1", args: [now] })).rows[0];
        if (!job) return null;
        const token = crypto.randomUUID();
        await tx.execute({ sql: "UPDATE jobs SET status = 'running', attempts = attempts + 1, lease_until = ?, lease_token = ? WHERE id = ?", args: [now + 60000, token, job.id] });
        return { ...job, attempts: Number(job.attempts) + 1, lease_token: token };
    });
}
async function runOnce(database, handler, now = Date.now()) {
    const job = await claim(database, now);
    if (!job) return false;
    try {
        await handler(job);
        await database.execute({ sql: "UPDATE jobs SET status = 'done', lease_until = NULL, lease_token = NULL WHERE id = ? AND lease_token = ? AND status = 'running'", args: [job.id, job.lease_token] });
    } catch (error) {
        const paused = error.status === 503 && error.message === 'Agent paused';
        await database.execute({ sql: "UPDATE jobs SET status = ?, available_at = ?, lease_until = NULL, lease_token = NULL, last_error = ?, attempts = attempts - ? WHERE id = ? AND lease_token = ? AND status = 'running'", args: [paused || job.attempts < 5 ? 'pending' : 'dead', now + (paused ? 60000 : Math.min(3600000, 1000 * 2 ** job.attempts)), paused ? 'agent_paused' : `handler_failed:${error.status || 'internal'}`, paused ? 1 : 0, job.id, job.lease_token] });
    }
    return true;
}
module.exports = { claim, runOnce };
