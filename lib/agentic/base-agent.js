// Standard agent contract. Subclasses declare an allowlist of tools and a plan(); everything they want to do to the
// outside world is a *proposal* that passes the Guardian, waits for staff approval, and passes the Guardian again on execution.
const { transaction } = require('../storage');
const { audit, fail } = require('../commerce');
const { redact } = require('../model');
const agents = require('../agents');
const guardian = require('./guardian');

// tool: { name, kind: 'read' | 'propose', action?, validate?(args) -> clean, run(ctx, args) }
// 'propose' tools run only after approval and return { ok: true } or { ok: false, reason }.
class BaseAgent {
    constructor({ name, version, tools }) {
        this.name = name;
        this.version = version;
        this.tools = new Map(tools.map(tool => [tool.name, tool]));
    }
    tool(name) {
        const tool = this.tools.get(name);
        if (!tool) fail(403, 'Tool is not allowlisted');
        return tool;
    }
    async call(ctx, name, args) {
        const tool = this.tool(name);
        return tool.run(ctx, tool.validate ? tool.validate(args) : args);
    }
    // Queue entry point. A paused agent throws 503 "Agent paused", which the queue treats as "keep the job, retry later".
    async handle(database, job, extra = {}) {
        if (!await agents.enabled(database, this.name)) fail(503, 'Agent paused');
        const ctx = { db: database, database, job, agent: this, now: Date.now(), ...extra };
        try { await this.plan(ctx, job); }
        catch (error) {
            if (!(error.status === 503 && error.message === 'Agent paused')) await this.logError(database, error, job);
            throw error;
        }
    }
    async plan() { throw new Error('plan() must be implemented by the agent'); }
    async logError(database, error, job) {
        try { await transaction(database, tx => audit(tx, `agent:${this.name}`, 'agent.error', job?.id || '-', { type: job?.type, status: error.status || 'internal', message: redact(error.message).slice(0, 200) })); }
        catch (_) { /* error logging must never hide the original failure */ }
    }
    // Checkpoint 1: Guardian review, then a staff-approval task. Returns { blocked, verdict } or { taskId, verdict }.
    async submit(ctx, { sourceId, action, subject, evidence = {}, proposal }) {
        const verdict = await guardian.review(ctx.db, { agent: this.name, action, subject, payload: proposal, phase: 'propose', now: ctx.now });
        if (verdict.verdict === 'block') return { blocked: true, verdict };
        const taskId = await agents.propose(ctx.db, this.name, sourceId, { ...evidence, guardian: verdict }, proposal, this.version);
        return { taskId, verdict };
    }
    // Checkpoint 2: runs inside the approved agent.execute transaction. Returns true when the tool ran.
    async execute(tx, task, proposal) {
        const tool = this.tool(proposal.tool);
        if (tool.kind !== 'propose') fail(403, 'Tool is not executable');
        const clean = tool.validate ? tool.validate(proposal) : proposal;
        const now = Date.now();
        const verdict = await guardian.review(tx, { agent: this.name, action: tool.action, subject: task.id, payload: clean, phase: 'execute', taskId: task.id, now });
        if (verdict.verdict === 'block') return this.reject(tx, task, verdict.reasons.map(reason => reason.code));
        const result = await tool.run({ db: tx, tx, task, approvedBy: task.approved_by, now, agent: this }, clean);
        if (!result.ok) return this.reject(tx, task, [result.reason]);
        await tx.execute({ sql: "UPDATE agent_tasks SET status = 'executed' WHERE id = ? AND status = 'approved'", args: [task.id] });
        await audit(tx, `agent:${this.name}`, 'agent.executed', task.id, { approvedBy: task.approved_by, tool: proposal.tool });
        return true;
    }
    async reject(tx, task, reasons) {
        await tx.execute({ sql: "UPDATE agent_tasks SET status = 'rejected' WHERE id = ? AND status = 'approved'", args: [task.id] });
        await audit(tx, `agent:${this.name}`, 'agent.blocked', task.id, { reasons });
        return false;
    }
}
module.exports = { BaseAgent };
