const crypto = require('node:crypto');
const { transaction } = require('./storage');
const { fail, audit, enqueue } = require('./commerce');
const tools = require('./commander-tools');
const TERMINAL = new Set(['COMPLETED', 'REJECTED', 'CANCELLED', 'EXPIRED']);
const MAX_ATTEMPTS = 5;
const select = async (tx, id) => (await tx.execute({ sql: 'SELECT * FROM commander_tasks WHERE id=?', args: [id] })).rows[0];
function decode(row) { return row ? { ...row, input: JSON.parse(row.input), result: row.result ? JSON.parse(row.result) : null } : null; }
async function move(tx, task, status, actor, details = {}, now = Date.now()) {
    await tx.execute({ sql: 'INSERT INTO commander_events(task_id,actor,from_status,to_status,details,created_at) VALUES (?,?,?,?,?,?)', args: [task.id, actor, task.status || null, status, JSON.stringify(details), now] });
    await tx.execute({ sql: 'UPDATE commander_tasks SET status=?, updated_at=? WHERE id=?', args: [status, now, task.id] });
    await audit(tx, actor, 'commander.' + status.toLowerCase(), task.id, details);
    task.status = status;
}
async function schedule(tx, task, now = Date.now()) {
    const id = `commander:${task.id}:${task.generation || 0}`;
    await enqueue(tx, id, 'commander.execute', { taskId: task.id }, Math.max(Number(task.due_at), now));
    await tx.execute({ sql: 'UPDATE jobs SET priority=? WHERE id=?', args: [task.priority, id] });
}
async function create(database, body, actor, key, now = Date.now()) {
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(k => !['type','input','priority','dueAt','expiresAt','dependsOn','source','expectedOutcome'].includes(k))) fail(400, 'حقول المهمة غير مدعومة.');
    if (typeof key !== 'string' || !/^[A-Za-z0-9_-]{8,120}$/.test(key)) fail(400, 'مفتاح العملية مطلوب.');
    const tool = tools.definition(body.type);
    const input = tool.validate(body.input ?? {});
    const request = { type: body.type, input, priority: tools.integer(body.priority ?? 0, 0, 10), dueAt: body.dueAt === undefined ? null : tools.integer(body.dueAt, 0, Number.MAX_SAFE_INTEGER), expiresAt: body.expiresAt == null ? null : tools.integer(body.expiresAt, 1, Number.MAX_SAFE_INTEGER), dependsOn: body.dependsOn == null ? null : tools.text(body.dependsOn, 80), source: tools.text(body.source ?? 'staff_dashboard', 300), expectedOutcome: tools.text(body.expectedOutcome ?? tool.label, 300) };
    const hash = crypto.createHash('sha256').update(JSON.stringify([actor, request])).digest('hex');
    return transaction(database, async tx => {
        const prior = (await tx.execute({ sql: 'SELECT * FROM commander_tasks WHERE idempotency_key=?', args: [key] })).rows[0];
        if (prior) { if (prior.request_hash !== hash) fail(409, 'مفتاح العملية مستخدم لبيانات مختلفة.'); return decode(prior); }
        if (request.expiresAt && request.expiresAt <= (request.dueAt ?? now)) fail(400, 'انتهاء المهمة يجب أن يلي موعد التنفيذ.');
        if (request.dependsOn && !await select(tx, request.dependsOn)) fail(400, 'المهمة السابقة غير موجودة.');
        const task = { id: crypto.randomUUID(), status: null, generation: 0, priority: request.priority, due_at: request.dueAt ?? now };
        await tx.execute({ sql: `INSERT INTO commander_tasks(id,idempotency_key,request_hash,created_by,creator_agent,assigned_agent,type,input,source,expected_outcome,priority,due_at,expires_at,depends_on,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,'NEW',?,?)`, args: [task.id,key,hash,actor,'manager',tool.agent,request.type,JSON.stringify(input),request.source,request.expectedOutcome,request.priority,task.due_at,request.expiresAt,request.dependsOn,now,now] });
        await move(tx, task, 'NEW', actor, {}, now);
        await move(tx, task, 'ASSIGNED', 'agent:manager', { agent: tool.agent, dependsOn: request.dependsOn }, now);
        if (tool.approval) {
            await move(tx, task, 'RUNNING', 'agent:manager', { phase: 'validated_for_review' }, now);
            await move(tx, task, 'AWAITING_APPROVAL', 'agent:manager', { input, type: request.type }, now);
        } else await schedule(tx, task, now);
        return decode(await select(tx, task.id));
    });
}
async function review(database, id, decision, actor, now = Date.now()) {
    if (!['approved','rejected'].includes(decision)) fail(400, 'قرار المراجعة غير صالح.');
    return transaction(database, async tx => {
        const task = await select(tx, id);
        if (!task || task.status !== 'AWAITING_APPROVAL') fail(409, 'المهمة غير متاحة للمراجعة.');
        if (task.expires_at && Number(task.expires_at) <= now) { await move(tx, task, 'EXPIRED', actor, {}, now); return decode(await select(tx, id)); }
        await tx.execute({ sql: 'UPDATE commander_tasks SET reviewed_by=?,reviewed_at=? WHERE id=?', args: [actor,now,id] });
        await move(tx, task, decision === 'approved' ? 'APPROVED' : 'REJECTED', actor, { input: JSON.parse(task.input), type: task.type, decision }, now);
        if (decision === 'approved') await schedule(tx, task, now);
        return decode(await select(tx, id));
    });
}
async function control(database, id, action, actor, now = Date.now()) {
    if (!['cancel','retry'].includes(action)) fail(400, 'إجراء غير مدعوم.');
    return transaction(database, async tx => {
        const task = await select(tx, id);
        if (!task || TERMINAL.has(task.status)) fail(409, 'المهمة مغلقة أو غير موجودة.');
        if (task.expires_at && Number(task.expires_at) <= now) { await move(tx, task, 'EXPIRED', actor, {}, now); return decode(await select(tx, id)); }
        if (action === 'cancel') await move(tx, task, 'CANCELLED', actor, {}, now);
        else {
            if (task.status !== 'FAILED' || Number(task.attempts) >= MAX_ATTEMPTS) fail(409, 'المهمة غير متاحة لإعادة المحاولة.');
            task.generation = Number(task.generation) + 1;
            await tx.execute({ sql: 'UPDATE commander_tasks SET generation=?, last_error=NULL WHERE id=?', args: [task.generation,id] });
            await tx.execute({ sql: "UPDATE jobs SET status='done', lease_token=NULL, lease_until=NULL WHERE type='commander.execute' AND id LIKE ? AND status IN ('pending','running')", args: [`commander:${task.id}:%`] });
            await move(tx, task, task.reviewed_by ? 'APPROVED' : 'ASSIGNED', actor, { retry: true }, now);
            await schedule(tx, task, now);
        }
        return decode(await select(tx, id));
    });
}
async function execute(database, job, now = Date.now()) {
    const { taskId } = JSON.parse(job.payload);
    try {
        const deferred = await transaction(database, async tx => {
            const task = await select(tx, taskId);
            if (!task || TERMINAL.has(task.status)) return;
            // A manual retry supersedes every older queue generation, including already leased jobs.
            if (job.id !== `commander:${task.id}:${task.generation}`) return;
            if (task.expires_at && Number(task.expires_at) <= now) return move(tx, task, 'EXPIRED', 'agent:manager', {}, now);
            if (Number(task.attempts) >= MAX_ATTEMPTS) return;
            const tool = tools.definition(task.type);
            if (task.assigned_agent !== tool.agent) fail(403, 'Invalid task assignment');
            if (tool.approval && (!task.reviewed_by || !['APPROVED','FAILED'].includes(task.status))) fail(403, 'Staff approval required');
            if (!await require('./agents').enabled(tx, task.assigned_agent)) return 'paused';
            if (Number(task.due_at) > now) return 'scheduled';
            if (task.depends_on) {
                const parent = await select(tx, task.depends_on);
                if (parent && ['CANCELLED','REJECTED','EXPIRED'].includes(parent.status)) return move(tx, task, 'CANCELLED', 'agent:manager', { dependency: parent.id, dependencyStatus: parent.status }, now);
                if (!parent || parent.status !== 'COMPLETED') return 'dependency';
            }
            await tx.execute({ sql: 'UPDATE commander_tasks SET attempts=attempts+1,last_error=NULL WHERE id=?', args: [task.id] });
            const actor = `agent:${tool.agent}`;
            await move(tx, task, 'RUNNING', actor, {}, now);
            await move(tx, task, 'EXECUTING', actor, {}, now);
            const result = await tool.run(tx, tool.validate(JSON.parse(task.input)), task, now);
            if (!result || typeof result !== 'object') fail(500, 'Missing execution evidence');
            const evidence = { ...result, as_of: now, task_id: task.id, type: task.type, evidence_kind: 'database_transaction' };
            await tx.execute({ sql: 'UPDATE commander_tasks SET result=? WHERE id=?', args: [JSON.stringify(evidence),task.id] });
            await move(tx, task, 'COMPLETED', actor, { evidenceKind: evidence.evidence_kind }, now);
        });
        if (deferred) throw Object.assign(new Error('Task deferred'), { defer: true, reason: deferred });
    } catch (error) {
        if (error.defer) throw error;
        // The operation transaction rolled back, including all domain writes. Persist only the failure.
        await transaction(database, async tx => {
            const task = await select(tx, taskId);
            if (!task || TERMINAL.has(task.status) || job.id !== `commander:${task.id}:${task.generation}`) return;
            await tx.execute({ sql: 'UPDATE commander_tasks SET attempts=attempts+1,last_error=? WHERE id=?', args: [`execution_failed:${error.status || 'internal'}`,task.id] });
            await move(tx, task, 'FAILED', `agent:${task.assigned_agent}`, { code: error.status || 'internal', retryable: !error.status || error.status >= 500 }, now);
        });
        if (!error.status || error.status >= 500) throw error;
    }
}
async function detail(database, id) {
    const task = decode(await select(database, id));
    if (!task) fail(404, 'المهمة غير موجودة.');
    const events = (await database.execute({ sql: 'SELECT * FROM commander_events WHERE task_id=? ORDER BY id', args: [id] })).rows.map(row => ({ ...row, details: JSON.parse(row.details) }));
    return { task, events };
}
async function overview(database, now = Date.now()) {
    const counts = (await database.execute('SELECT status, COUNT(*) AS count FROM commander_tasks GROUP BY status')).rows;
    const metrics = (await database.execute({ sql: `SELECT assigned_agent, COUNT(*) AS total, SUM(CASE WHEN status='COMPLETED' THEN 1 ELSE 0 END) AS completed, SUM(CASE WHEN status='FAILED' THEN 1 ELSE 0 END) AS failed, SUM(CASE WHEN status NOT IN ('COMPLETED','CANCELLED','REJECTED','EXPIRED') AND due_at < ? THEN 1 ELSE 0 END) AS overdue, SUM(CASE WHEN attempts>1 THEN attempts-1 ELSE 0 END) AS retries, AVG(CASE WHEN status='COMPLETED' THEN updated_at-created_at ELSE NULL END) AS average_turnaround_ms FROM commander_tasks GROUP BY assigned_agent`, args: [now] })).rows.map(row => ({ ...row, success_rate: Number(row.total) ? Number(row.completed) / Number(row.total) : null, execution_cost_minor: null }));
    const tasks = (await database.execute('SELECT * FROM commander_tasks ORDER BY created_at DESC,id LIMIT 100')).rows.map(decode);
    return { counts, metrics, tasks, types: tools.types(), as_of: now };
}
async function tick(database, now = Date.now()) {
    // Expire even unreviewed tasks; they have no queue job to notice their deadline.
    await transaction(database, async tx => {
        const expired = (await tx.execute({ sql: "SELECT * FROM commander_tasks WHERE expires_at <= ? AND status NOT IN ('COMPLETED','REJECTED','CANCELLED','EXPIRED') LIMIT 100", args: [now] })).rows;
        for (const task of expired) await move(tx, task, 'EXPIRED', 'agent:manager', {}, now);
    });
    if (!await require('./agents').enabled(database, 'manager')) return;
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }).formatToParts(now).map(part => [part.type, part.value]));
    if (Number(parts.hour) < 9) return;
    const date = `${parts.year}-${parts.month}-${parts.day}`;
    await create(database, { type: 'manager.report', input: { days: 1 }, source: 'daily_schedule', expectedOutcome: 'تقرير إدارة يومي من السجلات الفعلية' }, 'agent:manager', `commander-daily-${date}`, now);
}
module.exports = { create, review, control, execute, detail, overview, tick };
