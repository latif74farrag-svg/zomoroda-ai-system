const crypto = require('node:crypto');
const { transaction } = require('./storage');
const { audit, enqueue, fail, transitionOrder } = require('./commerce');

async function enabled(database, agent) {
    const controls = (await database.execute({ sql: "SELECT paused FROM agent_controls WHERE agent IN ('global', ?)", args: [agent] })).rows;
    return controls.length === 2 && controls.every(row => !row.paused);
}
async function propose(database, agent, sourceId, evidence, proposal, version = 'rules-v1') {
    if (!await enabled(database, agent)) fail(503, 'Agent paused');
    return transaction(database, async tx => {
        const id = crypto.randomUUID();
        await tx.execute({ sql: 'INSERT OR IGNORE INTO agent_tasks(id, agent, source_id, version, evidence, proposal, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', args: [id, agent, sourceId, version, JSON.stringify(evidence), JSON.stringify(proposal), Date.now()] });
        const task = (await tx.execute({ sql: 'SELECT id FROM agent_tasks WHERE agent = ? AND source_id = ?', args: [agent, sourceId] })).rows[0];
        await audit(tx, `agent:${agent}`, 'agent.proposed', task.id, { sourceId, version });
        return task.id;
    });
}
async function coordinate(database, job) {
    const payload = JSON.parse(job.payload);
    if (job.type === 'order.created') {
        const order = (await database.execute({ sql: 'SELECT order_number, status, total_minor FROM store_orders WHERE order_number = ?', args: [payload.orderNumber] })).rows[0];
        if (!order || order.status !== 'pending') return;
        await propose(database, 'orders', job.id, order, { tool: 'confirm_order', orderNumber: order.order_number });
    } else if (job.type === 'inventory.changed') {
        const stock = (await database.execute({ sql: 'SELECT * FROM inventory WHERE product_id = ?', args: [payload.productId] })).rows[0];
        if (stock && stock.on_hand - stock.reserved <= stock.low_stock) await propose(database, 'inventory', job.id, stock, { tool: 'replenishment_recommendation', productId: stock.product_id, message: 'Review stock and arrange replenishment through staff.' });
    } else if (job.type === 'support.created') {
        if (!await enabled(database, 'support')) fail(503, 'Agent paused');
        if ((await database.execute({ sql: 'SELECT id FROM agent_tasks WHERE agent = ? AND source_id = ?', args: ['support', job.id] })).rows.length) return;
        const ticket = (await database.execute({ sql: 'SELECT id, message, status FROM support_tickets WHERE id = ?', args: [payload.ticketId] })).rows[0];
        if (!ticket || ticket.status !== 'open') return;
        const draft = await require('./model').supportDraft(database, ticket);
        await propose(database, 'support', job.id, { ticketId: payload.ticketId }, { tool: 'support_draft', ticketId: payload.ticketId, text: draft.text, category: draft.category, escalate: draft.escalate }, draft.version);
    } else if (job.type === 'agent.execute') {
        await transaction(database, async tx => {
        const task = (await tx.execute({ sql: 'SELECT * FROM agent_tasks WHERE id = ?', args: [payload.taskId] })).rows[0];
        if (!task || task.status === 'executed' || task.status === 'rejected') return;
        if (!await enabled(tx, task.agent)) fail(503, 'Agent paused');
        if (task.status !== 'approved' || !task.approved_by) fail(403, 'Staff approval required');
        const proposal = JSON.parse(task.proposal);
        if (task.agent === 'orders' && proposal.tool === 'confirm_order') {
            await transitionOrder(tx, proposal.orderNumber, 'confirmed', `approved-agent:${task.approved_by}`);
        } else if (!((task.agent === 'support' && proposal.tool === 'support_draft') || (task.agent === 'inventory' && proposal.tool === 'replenishment_recommendation'))) fail(403, 'Tool is not allowlisted');
        // Drafts and purchasing suggestions remain visible to staff; no external send or spending tool exists.
            await tx.execute({ sql: "UPDATE agent_tasks SET status = 'executed' WHERE id = ? AND status = 'approved'", args: [task.id] });
            await audit(tx, `agent:${task.agent}`, 'agent.executed', task.id, { approvedBy: task.approved_by, tool: proposal.tool });
        });
    } else if (job.type !== 'order.status') fail(400, 'Unknown job type');
}
async function review(database, id, decision, actor) {
    if (!['approved', 'rejected'].includes(decision)) fail(400, 'Invalid decision');
    return transaction(database, async tx => {
        const result = await tx.execute({ sql: "UPDATE agent_tasks SET status = ?, approved_by = ? WHERE id = ? AND status = 'proposed'", args: [decision, actor, id] });
        if (Number(result.rowsAffected) !== 1) fail(409, 'Task already reviewed or missing');
        if (decision === 'approved') await enqueue(tx, `execute:${id}`, 'agent.execute', { taskId: id });
        await audit(tx, actor, `agent.${decision}`, id);
    });
}
module.exports = { coordinate, review, enabled };
