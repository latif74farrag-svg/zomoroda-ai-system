const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fixture } = require('./helpers');
const roster = require('../lib/agent-roster');
const { audit } = require('../lib/commerce');
const { transaction } = require('../lib/storage');

const setGlobal = (db, paused) => db.execute({ sql: "UPDATE agent_controls SET paused = ? WHERE agent = 'global'", args: [paused] });
const find = (data, key) => data.agents.find(agent => agent.key === key);

test('every roster agent has a control row and one consistent state', async t => {
    const db = await fixture(); t.after(() => db.close());
    const rows = (await db.execute('SELECT agent FROM agent_controls')).rows.map(row => row.agent);
    for (const key of roster.KEYS) assert.ok(rows.includes(key), `missing control for ${key}`);

    await setGlobal(db, 1); // fresh installs start with the global stop on
    let data = await roster.overview(db);
    assert.ok(data.global.paused);
    assert.ok(data.agents.every(agent => agent.state === 'stopped'));

    await setGlobal(db, 0);
    await transaction(db, tx => audit(tx, 'agent:ads', 'agent.proposed', 't1', {}));
    await roster.setPaused(db, 'marketing', true, 'staff-1', 'مراجعة الرسائل');
    data = await roster.overview(db);
    assert.equal(find(data, 'ads').state, 'active'); // acted in the last 24h
    assert.equal(find(data, 'support').state, 'ready'); // on, nothing to do yet
    const paused = find(data, 'marketing');
    assert.equal(paused.state, 'paused');
    assert.equal(paused.paused_reason, 'مراجعة الرسائل');
    assert.equal(paused.paused_by, 'staff-1');
    assert.equal(data.summary.paused, 1);
});

test('pausing records an audit entry, resuming clears the reason, unknown agents are refused', async t => {
    const db = await fixture(); t.after(() => db.close());
    await roster.setPaused(db, 'whatsapp', true, 'staff-1', 'x'.repeat(500));
    let row = (await db.execute("SELECT * FROM agent_controls WHERE agent = 'whatsapp'")).rows[0];
    assert.equal(row.paused, 1);
    assert.equal(row.paused_reason.length, 200);
    const entry = (await db.execute("SELECT details FROM audit_log WHERE action = 'agent.control' AND resource = 'whatsapp'")).rows[0];
    assert.equal(JSON.parse(entry.details).paused, true);
    await roster.setPaused(db, 'whatsapp', false, 'staff-1');
    row = (await db.execute("SELECT * FROM agent_controls WHERE agent = 'whatsapp'")).rows[0];
    assert.equal(row.paused, 0);
    assert.equal(row.paused_reason, '');
    await assert.rejects(roster.setPaused(db, 'hacker', true, 'staff-1'), { status: 400 });
    await assert.rejects(roster.setPaused(db, 'ads', 'yes', 'staff-1'), { status: 400 });
});

test('standalone agents stop when paused by the agent or globally, and fail closed', async t => {
    const db = await fixture(); t.after(() => db.close());
    await setGlobal(db, 0);
    assert.equal(await roster.isPaused(db, 'whatsapp'), false);
    await roster.setPaused(db, 'whatsapp', true, 's');
    assert.equal(await roster.isPaused(db, 'whatsapp'), true);
    await roster.setPaused(db, 'whatsapp', false, 's');
    await setGlobal(db, 1);
    assert.equal(await roster.isPaused(db, 'whatsapp'), true);
    assert.equal(await roster.isPaused(db, 'unknown-agent'), true); // no control row: do not act
    assert.equal(await roster.isPaused({ execute: async () => { throw new Error('db down'); } }, 'whatsapp'), true);
});

test('run now respects pause; bulk review only touches that agent\'s waiting proposals', async t => {
    const db = await fixture(); t.after(() => db.close());
    await setGlobal(db, 1);
    await assert.rejects(roster.runNow(db, 'refinement', 's'), { status: 409 });
    await assert.rejects(roster.runNow(db, 'support', 's'), { status: 400 }); // not an on-demand agent
    await setGlobal(db, 0);
    assert.ok((await roster.runNow(db, 'refinement', 's')).message);
    assert.equal((await db.execute("SELECT COUNT(*) AS n FROM jobs WHERE type = 'leads.refine'")).rows[0].n >= 1, true);

    const insert = (id, agent) => db.execute({ sql: "INSERT INTO agent_tasks(id, agent, source_id, version, evidence, proposal, created_at) VALUES (?, ?, ?, 'v', '{}', '{\"tool\":\"reminder\",\"kind\":\"monthly\"}', ?)", args: [id, agent, id, Date.now()] });
    await insert('a1', 'manager'); await insert('a2', 'manager'); await insert('b1', 'ads');
    assert.equal((await roster.reviewAll(db, 'manager', 'rejected', 'staff-1')).reviewed, 2);
    const status = id => db.execute({ sql: 'SELECT status FROM agent_tasks WHERE id = ?', args: [id] }).then(result => result.rows[0].status);
    assert.equal(await status('a1'), 'rejected');
    assert.equal(await status('b1'), 'proposed');
    await assert.rejects(roster.reviewAll(db, 'manager', 'maybe', 's'), { status: 400 });
});
