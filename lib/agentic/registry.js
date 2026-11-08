// Orchestrator seam: maps job types and agent names to the agent classes. It routes work and nothing else;
// money and messaging actions only happen through an approved agent.execute task that passes the Guardian.
const refinement = require('./data-refinement');
const aggregator = require('./order-aggregator');
const outreach = require('./outreach');
const social = require('./social');

const byAgent = { refinement, aggregator, outreach, social };
const byJob = { 'leads.refine': refinement, 'channel.order': aggregator, 'channel.poll': aggregator, 'outreach.plan': outreach, 'inbound.message': social };

const handles = type => Object.hasOwn(byJob, type);
const has = agent => Object.hasOwn(byAgent, agent);
const dispatch = (database, job, extra) => byJob[job.type].handle(database, job, extra);
const execute = (tx, task, proposal) => byAgent[task.agent].execute(tx, task, proposal);

// Periodic maintenance from the worker. Job ids contain their time bucket, so repeats are no-ops.
async function tick(database, now = Date.now()) {
    const { enqueue } = require('../commerce');
    const hour = Math.floor(now / 3600000);
    await enqueue(database, `refine:${hour}`, 'leads.refine', {}, now);
    const { pollIntervalMinutes } = await require('../agent-settings').get(database, 'aggregator');
    const bucket = Math.floor(now / (pollIntervalMinutes * 60000));
    if (require('../integrations/shopify').configured()) await enqueue(database, `poll:shopify:${bucket}`, 'channel.poll', { channel: 'shopify' }, now);
}
module.exports = { handles, has, dispatch, execute, tick };
