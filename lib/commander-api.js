const { requirePermission } = require('./staff');
const { enforceLimit } = require('./security');
const commander = require('./commander');
function install(app, route) {
    const permission = requirePermission('agents');
    app.get('/api/v1/admin/commander/overview', permission, route(async (req, res, db) => {
        res.json({ success: true, ...(await commander.overview(db)) });
    }));
    app.get('/api/v1/admin/commander/options', permission, route(async (req, res, db) => {
        res.json({ success: true,
            leads: await require('./leads').listLeads(db, { limit: 300 }),
            products: (await db.execute('SELECT id,name FROM store_products WHERE is_active=1 ORDER BY name LIMIT 300')).rows,
            opportunities: (await db.execute('SELECT * FROM crm_opportunities ORDER BY updated_at DESC LIMIT 100')).rows,
            // These prove accepted outbound / received inbound events, not comprehensive connector health.
            channelEvidence: (await db.execute('SELECT channel, MAX(sent_at) AS last_accepted_at, SUM(CASE WHEN status=\'failed\' THEN 1 ELSE 0 END) AS failed FROM outbox GROUP BY channel')).rows
        });
    }));
    app.get('/api/v1/admin/commander/crm/:id', permission, route(async (req, res, db) => {
        res.json({ success: true,
            notes: (await db.execute({ sql: 'SELECT * FROM crm_notes WHERE lead_id=? ORDER BY created_at DESC LIMIT 100', args: [req.params.id] })).rows,
            opportunities: (await db.execute({ sql: 'SELECT * FROM crm_opportunities WHERE lead_id=? ORDER BY updated_at DESC LIMIT 100', args: [req.params.id] })).rows
        });
    }));
    app.post('/api/v1/admin/commander/tasks', permission, route(async (req, res, db) => {
        await enforceLimit(db, `commander-create:${req.staff.id}`, 30, 60000);
        const task = await commander.create(db, req.body, req.staff.id, req.headers['idempotency-key']);
        res.json({ success: true, task });
    }));
    app.get('/api/v1/admin/commander/tasks/:id', permission, route(async (req, res, db) => {
        res.json({ success: true, ...(await commander.detail(db, req.params.id)) });
    }));
    app.post('/api/v1/admin/commander/tasks/:id/review', permission, route(async (req, res, db) => {
        res.json({ success: true, task: await commander.review(db, req.params.id, req.body?.decision, req.staff.id) });
    }));
    for (const action of ['cancel', 'retry']) app.post(`/api/v1/admin/commander/tasks/:id/${action}`, permission, route(async (req, res, db) => {
        res.json({ success: true, task: await commander.control(db, req.params.id, action, req.staff.id) });
    }));
}
module.exports = { install };
