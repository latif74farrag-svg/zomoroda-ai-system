const { coordinate, propose } = require('./agents');

// Reuse real event handlers and stable source IDs; retries cannot create duplicate proposals.
async function launch(database, agent) {
    let jobs = [];
    if (agent === 'orders') {
        jobs = (await database.execute("SELECT order_number FROM store_orders WHERE status = 'pending' ORDER BY created_at LIMIT 10")).rows
            .map(row => ({ id: `order:${row.order_number}`, type: 'order.created', payload: JSON.stringify({ orderNumber: row.order_number }) }));
    } else if (agent === 'support') {
        jobs = (await database.execute("SELECT id FROM support_tickets WHERE status = 'open' ORDER BY created_at LIMIT 10")).rows
            .map(row => ({ id: `support:${row.id}`, type: 'support.created', payload: JSON.stringify({ ticketId: row.id }) }));
    } else if (agent === 'inventory') {
        const { lowStockThreshold } = await require('./agent-settings').get(database, 'inventory');
        jobs = (await database.execute({ sql: 'SELECT product_id, on_hand, reserved FROM inventory WHERE on_hand - reserved <= ? ORDER BY product_id LIMIT 10', args: [lowStockThreshold] })).rows
            .map(row => ({ id: `manual-stock:${row.product_id}:${row.on_hand}:${row.reserved}`, type: 'inventory.changed', payload: JSON.stringify({ productId: row.product_id }) }));
    } else if (agent === 'manager' || agent === 'ads') {
        const source = `manual:${agent}:${Math.floor(Date.now() / 3600000)}`;
        if ((await database.execute({ sql: 'SELECT id FROM agent_tasks WHERE agent = ? AND source_id = ?', args: [agent, source] })).rows.length) return { checked: 0 };
        const proposal = agent === 'manager'
            ? { tool: 'reminder', kind: 'manual', text: 'راجع المقترحات المعلقة وحالة الطابور وإعدادات الوكلاء اليوم.' }
            : { tool: 'post_draft', title: 'منشور عند الطلب', sector: 'social', channel: 'social', product_type: 'organic', message: require('./manager-agent').SLOTS[0].text };
        await propose(database, agent, source, { trigger: 'manual' }, proposal, `${agent}-v1`);
        return { checked: 1 };
    }
    for (const job of jobs) {
        if ((await database.execute({ sql: 'SELECT id FROM agent_tasks WHERE agent = ? AND source_id = ?', args: [agent, job.id] })).rows.length) continue;
        await coordinate(database, job);
    }
    return { checked: jobs.length };
}
module.exports = { launch };
