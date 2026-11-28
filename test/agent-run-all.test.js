const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fixture } = require('./helpers');
const { transaction } = require('../lib/storage');
const { upsertLeads } = require('../lib/leads');
const roster = require('../lib/agent-roster');

test('run-all gives every agent an honest outcome, creates real records once, and never repeats them', async t => {
    const db = await fixture(); t.after(() => db.close());
    // migration 18: the five commander agents are not left paused by the migration itself
    const paused = (await db.execute("SELECT agent FROM agent_controls WHERE agent IN ('pricing','bi','crm','distribution','procurement') AND paused = 1")).rows;
    assert.equal(paused.length, 0);
    await db.execute("UPDATE agent_controls SET paused = 0 WHERE agent = 'global'");
    await transaction(db, tx => upsertLeads(tx, [
        { contact: '01011111111', name: 'Pharmacy A', sector: 'pharmacies' },
        { contact: '01022222222', name: 'Hotel B', sector: 'hotels' },
        { contact: '01033333333', name: 'Opted out', sector: 'salon' }
    ]));
    await db.execute("UPDATE leads SET consent = 1 WHERE sector IN ('pharmacies','hotels')");
    await db.execute("UPDATE leads SET consent = 1, opted_out = 1 WHERE sector = 'salon'");

    const first = await roster.runAllNow(db, 'staff-1');
    assert.equal(first.results.length, roster.ROSTER.length);
    assert.deepEqual(first.results.map(item => item.agent), roster.ROSTER.map(item => item.key));
    for (const item of first.results) assert.ok(['done', 'idle', 'external', 'skipped', 'failed'].includes(item.status) && item.message, item.agent);
    assert.equal(first.results.filter(item => item.status === 'failed').length, 0, JSON.stringify(first.results.filter(item => item.status === 'failed')));
    const by = key => first.results.find(item => item.agent === key);
    assert.equal(by('whatsapp').status, 'external');
    assert.equal(by('pricing').status, 'skipped');
    assert.equal(by('crm').status, 'skipped');

    // marketing: one draft per sector with consenting, not-opted-out leads; pharmacies receive Ronza wipes only
    assert.equal(by('marketing').status, 'done');
    const drafts = (await db.execute("SELECT proposal FROM agent_tasks WHERE agent = 'marketing'")).rows.map(row => JSON.parse(row.proposal));
    assert.deepEqual(drafts.map(item => item.sector).sort(), ['hotels', 'pharmacies']);
    assert.equal(drafts.find(item => item.sector === 'pharmacies').product_type, 'ronzawipes');
    assert.ok(drafts.every(item => item.tool === 'campaign_draft' && item.channel === 'whatsapp'));
    assert.equal((await db.execute('SELECT COUNT(*) AS n FROM marketing_campaigns')).rows[0].n, 0, 'proposals are not campaigns until staff approve');

    // commander reports completed with evidence from a committed transaction
    for (const agent of ['bi', 'distribution', 'procurement']) {
        assert.equal(by(agent).status, 'done', agent);
        const task = (await db.execute({ sql: "SELECT status, result FROM commander_tasks WHERE assigned_agent = ?", args: [agent] })).rows[0];
        assert.equal(task.status, 'COMPLETED');
        assert.equal(JSON.parse(task.result).evidence_kind, 'database_transaction');
    }
    assert.equal((await db.execute("SELECT COUNT(*) AS n FROM outbox")).rows[0].n, 0, 'nothing is sent without approval');
    const keys = (await db.execute("SELECT idempotency_key FROM commander_tasks WHERE source = 'run_all'")).rows.map(row => row.idempotency_key);
    assert.equal(new Set(keys).size, 3);
    assert.ok(keys.every(key => /^runall-[a-z]+-[a-z]+-\d+$/.test(key)), keys.join());

    // second click in the same hour changes nothing
    const before = await Promise.all(['agent_tasks', 'commander_tasks', 'marketing_campaigns', 'outbox'].map(async table => (await db.execute(`SELECT COUNT(*) AS n FROM ${table}`)).rows[0].n));
    const second = await roster.runAllNow(db, 'staff-1');
    const after = await Promise.all(['agent_tasks', 'commander_tasks', 'marketing_campaigns', 'outbox'].map(async table => (await db.execute(`SELECT COUNT(*) AS n FROM ${table}`)).rows[0].n));
    assert.deepEqual(after, before);
    assert.equal(second.results.find(item => item.agent === 'marketing').status, 'idle');
});

test('run-all skips a manually paused agent and reports it, without running its work', async t => {
    const db = await fixture(); t.after(() => db.close());
    await db.execute("UPDATE agent_controls SET paused = 0 WHERE agent = 'global'");
    await db.execute("UPDATE agent_controls SET paused = 1 WHERE agent = 'bi'");
    const run = await roster.runAllNow(db, 'staff-1');
    assert.equal(run.results.find(item => item.agent === 'bi').status, 'skipped');
    assert.equal((await db.execute("SELECT COUNT(*) AS n FROM commander_tasks WHERE assigned_agent = 'bi'")).rows[0].n, 0);
});
