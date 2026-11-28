const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fixture, order } = require('./helpers');
const { transaction } = require('../lib/storage');
const { migrate } = require('../lib/migrations');
const { upsertLeads } = require('../lib/leads');
const { createOrder } = require('../lib/commerce');
const commander = require('../lib/commander');
const { runOnce } = require('../lib/queue');
const NOW = Date.parse('2026-11-28T10:00:00Z');
const read = async (db, id) => (await commander.detail(db, id)).task;
const work = (db, now = NOW, target = db) => runOnce(db, job => commander.execute(target, job, now), now);
async function setup(t) {
    const db = await fixture(); t.after(() => db.close());
    await db.execute('UPDATE agent_controls SET paused=0');
    await transaction(db, tx => upsertLeads(tx, [{ contact: '01012345678', name: 'Synthetic customer', sector: 'hotels' }]));
    const lead = (await db.execute('SELECT id FROM leads')).rows[0].id;
    return { db, lead };
}
test('commander migration replay, routing, immutable idempotency and allowlist', async t => {
    const { db } = await setup(t); await migrate(db);
    const body = { type: 'pricing.simulate', input: { productId: 'p1', costMinor: 600, discountBps: 1000 } };
    const task = await commander.create(db, body, 'staff', 'pricing-key-1', NOW);
    assert.equal(task.assigned_agent, 'pricing');
    assert.equal((await commander.create(db, body, 'staff', 'pricing-key-1', NOW + 60000)).id, task.id);
    await assert.rejects(commander.create(db, { ...body, priority: 3 }, 'staff', 'pricing-key-1', NOW), { status: 409 });
    await assert.rejects(commander.create(db, { ...body, assigned_agent: 'manager' }, 'staff', 'new-key-0001', NOW), { status: 400 });
    await assert.rejects(commander.create(db, { type: 'shell.exec', input: {} }, 'staff', 'new-key-0002', NOW), { status: 400 });
    await assert.rejects(commander.create(db, { type: '__proto__', input: {} }, 'staff', 'new-key-0003', NOW), { status: 400 });
    await assert.rejects(commander.create(db, { ...body, input: { ...body.input, sql: 'DELETE' } }, 'staff', 'new-key-0004', NOW), { status: 400 });
    await work(db);
    const completed = await read(db, task.id);
    assert.equal(completed.status, 'COMPLETED');
    assert.deepEqual([completed.result.list_minor, completed.result.sale_minor, completed.result.profit_minor, completed.result.margin_bps], [1015, 914, 314, 3435]);
    assert.equal((await db.execute("SELECT price FROM store_products WHERE id='p1'")).rows[0].price, 10.15);
    assert.equal((await commander.detail(db, task.id)).events.at(-1).to_status, 'COMPLETED');
});
test('CRM writes once, records provenance, preserves opt-out and actual contact history', async t => {
    const { db, lead } = await setup(t);
    await db.execute('UPDATE leads SET opted_out=1,last_contact_at=123');
    const task = await commander.create(db, { type: 'crm.note', input: { leadId: lead, note: 'Review only' }, source: 'test_import' }, 'staff', 'note-key-001', NOW);
    await Promise.all([work(db), work(db)]);
    await commander.execute(db, { id: `commander:${task.id}:0`, payload: JSON.stringify({ taskId: task.id }) }, NOW);
    assert.equal((await db.execute('SELECT COUNT(*) AS n FROM crm_notes')).rows[0].n, 1);
    assert.equal((await read(db, task.id)).result.contact_recorded, false);
    const row = (await db.execute('SELECT opted_out,last_contact_at FROM leads')).rows[0];
    assert.deepEqual([row.opted_out, row.last_contact_at], [1, 123]);
});
test('CRM opportunity review binds exact input; stale approvals cannot overwrite newer edits', async t => {
    const { db, lead } = await setup(t);
    const created = await commander.create(db, { type: 'crm.create_opportunity', input: { leadId: lead, title: 'Synthetic hotel', valueMinor: 10000 } }, 'staff', 'opportunity-1', NOW);
    await work(db);
    const opportunity = (await db.execute('SELECT * FROM crm_opportunities')).rows[0];
    const input = { opportunityId: created.id, stage: 'quoted', valueMinor: 12000, expectedUpdatedAt: opportunity.updated_at };
    const pending = await commander.create(db, { type: 'crm.update_opportunity', input }, 'staff', 'opportunity-2', NOW);
    assert.equal(pending.status, 'AWAITING_APPROVAL');
    assert.equal(await work(db), false);
    assert.equal((await db.execute('SELECT stage FROM crm_opportunities')).rows[0].stage, 'new');
    await commander.review(db, pending.id, 'approved', 'reviewer', NOW);
    await assert.rejects(commander.review(db, pending.id, 'approved', 'reviewer', NOW), { status: 409 });
    await work(db);
    const detail = await commander.detail(db, pending.id);
    assert.equal(detail.task.status, 'COMPLETED');
    assert.deepEqual(detail.events.find(e => e.to_status === 'APPROVED').details.input, input);
    assert.equal(detail.task.reviewed_by, 'reviewer');
    const stale = await commander.create(db, { type: 'crm.update_opportunity', input }, 'staff', 'opportunity-3', NOW);
    await commander.review(db, stale.id, 'approved', 'reviewer', NOW); await work(db);
    assert.equal((await read(db, stale.id)).status, 'FAILED');
    assert.equal((await db.execute('SELECT stage,value_minor FROM crm_opportunities')).rows[0].value_minor, 12000);
});
test('global/agent stop and dependencies defer without consuming attempts; priorities route first', async t => {
    const { db, lead } = await setup(t);
    const parent = await commander.create(db, { type: 'crm.note', input: { leadId: lead, note: 'First step' } }, 'staff', 'parent-key-01', NOW);
    const child = await commander.create(db, { type: 'bi.report', dependsOn: parent.id, priority: 10 }, 'staff', 'child-key-001', NOW);
    await work(db); // higher priority child cannot bypass dependency
    assert.equal((await read(db, child.id)).attempts, 0);
    await db.execute("UPDATE agent_controls SET paused=1 WHERE agent='global'");
    await work(db);
    assert.equal((await read(db, parent.id)).attempts, 0);
    await db.execute("UPDATE agent_controls SET paused=0 WHERE agent='global'");
    await db.execute("UPDATE agent_controls SET paused=1 WHERE agent='crm'");
    await work(db, NOW + 60000); // child still deferred
    await work(db, NOW + 60000); // parent paused
    assert.equal((await read(db, parent.id)).attempts, 0);
    await db.execute("UPDATE agent_controls SET paused=0 WHERE agent='crm'");
    await work(db, NOW + 120000); // child still waits; parent finishes next
    await work(db, NOW + 120000);
    await work(db, NOW + 180000);
    assert.equal((await read(db, parent.id)).status, 'COMPLETED');
    assert.equal((await read(db, child.id)).status, 'COMPLETED');
    const jobs = (await db.execute('SELECT attempts FROM jobs')).rows;
    assert.ok(jobs.every(j => j.attempts === 1));
});
test('expiration, rejection, cancellation and terminal dependencies prevent execution', async t => {
    const { db } = await setup(t);
    const expires = await commander.create(db, { type: 'bi.report', expiresAt: NOW + 1 }, 'staff', 'expires-key-1', NOW);
    await work(db, NOW + 2); assert.equal((await read(db, expires.id)).status, 'EXPIRED');
    await assert.rejects(commander.control(db, expires.id, 'retry', 'staff', NOW + 3), { status: 409 });
    const parent = await commander.create(db, { type: 'bi.report' }, 'staff', 'cancel-key-01', NOW);
    const child = await commander.create(db, { type: 'bi.report', dependsOn: parent.id }, 'staff', 'cancel-child-1', NOW);
    await commander.control(db, parent.id, 'cancel', 'staff', NOW);
    await work(db); await work(db);
    assert.equal((await read(db, child.id)).status, 'CANCELLED');
    const task = await commander.create(db, { type: 'crm.update_opportunity', input: { opportunityId: 'missing', stage: 'won', valueMinor: 100, expectedUpdatedAt: 1 } }, 'staff', 'reject-key-01', NOW);
    await commander.review(db, task.id, 'rejected', 'staff', NOW);
    assert.equal((await read(db, task.id)).status, 'REJECTED');
});
test('rollback after a domain write, safe retry and superseded queue generation', async t => {
    const { db, lead } = await setup(t);
    const task = await commander.create(db, { type: 'crm.note', input: { leadId: lead, note: 'Atomic' } }, 'staff', 'rollback-key-1', NOW);
    let inject = true;
    const faulty = { transaction: async mode => {
        const tx = await db.transaction(mode);
        return { ...tx, execute: statement => {
            if (inject && statement.sql?.startsWith('UPDATE commander_tasks SET result=')) { inject = false; throw new Error('Synthetic storage outage'); }
            return tx.execute(statement);
        } };
    } };
    await work(db, NOW, faulty);
    assert.equal((await db.execute('SELECT COUNT(*) AS n FROM crm_notes')).rows[0].n, 0);
    assert.equal((await read(db, task.id)).status, 'FAILED');
    await commander.control(db, task.id, 'retry', 'staff', NOW + 1);
    await commander.execute(db, { id: `commander:${task.id}:0`, payload: JSON.stringify({ taskId: task.id }) }, NOW + 2);
    assert.equal((await db.execute('SELECT COUNT(*) AS n FROM crm_notes')).rows[0].n, 0);
    await work(db, NOW + 2);
    assert.equal((await read(db, task.id)).status, 'COMPLETED');
    assert.equal((await read(db, task.id)).attempts, 2);
    assert.equal((await db.execute('SELECT COUNT(*) AS n FROM crm_notes')).rows[0].n, 1);
});
test('reports reconcile sales, collections, sectors and stock and disclose missing evidence', async t => {
    const { db } = await setup(t);
    // checkout's actual database effects, not an invented sales fixture.
    await createOrder(db, order(2), 'report-checkout-key');
    await db.execute({ sql: 'UPDATE store_orders SET created_at=?', args: ['2026-11-28 09:30:00'] });
    await db.execute("UPDATE inventory SET low_stock=9");
    const report = await commander.create(db, { type: 'manager.report', input: { days: 1 } }, 'staff', 'report-key-01', NOW);
    const coverage = await commander.create(db, { type: 'distribution.report' }, 'staff', 'coverage-key-1', NOW);
    const procurement = await commander.create(db, { type: 'procurement.report' }, 'staff', 'procure-key-01', NOW);
    // Work only commander jobs here; checkout also enqueues the existing order workflow.
    for (const task of [report, coverage, procurement]) await commander.execute(db, { id: `commander:${task.id}:0`, payload: JSON.stringify({ taskId: task.id }) }, NOW);
    const result = (await read(db, report.id)).result;
    assert.equal(result.orders, 1); assert.equal(result.booked_minor, 2030); assert.equal(result.collected_minor, 0);
    assert.equal(result.low_stock[0].available, 8); assert.equal(result.balance_verified_at, null); assert.equal(result.roi, null);
    assert.equal((await read(db, coverage.id)).result.sectors[0].leads, 1);
    assert.equal((await read(db, procurement.id)).result.effect, 'report_only');
    const overview = await commander.overview(db, NOW + 1);
    assert.equal(overview.types.length, 8);
    assert.ok(overview.metrics.every(m => m.execution_cost_minor === null));
});
