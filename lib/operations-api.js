const crypto = require('node:crypto');
const multer = require('multer');
const { getDatabase, transaction, production } = require('./storage');
const { fail, audit, enqueue, adjustStockInTransaction } = require('./commerce');
const { requirePermission } = require('./staff');
const { enforceLimit } = require('./security');
const { review } = require('./agents');

function install(app, store) {
    const legacyCampaignUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 1 } }).single('database');
    const route = handler => async (req, res, next) => {
        try { await store.initializeStoreDatabase(); await handler(req, res, await getDatabase()); }
        catch (error) { next(error); }
    };
    app.get('/health/live', (req, res) => res.json({ status: 'ok' }));
    const shell = require('../views/admin-shell');
    app.get('/store/operations', (req, res) => {
        const html = require('../views/operations').getOperationsHtml()
            .replace('</head>', `<style>${require('../views/operationsTheme').css}</style></head>`);
        res.send(shell.wrap(html, 'operations'));
    });
    app.get('/store/manager', (req, res) => res.send(shell.wrap(require('../views/manager').getManagerHtml(), 'manager')));
    app.get('/store/agents', (req, res) => res.send(shell.wrap(require('../views/agents').getAgentsHtml(), 'agents')));
    app.get('/store/channels', (req, res) => {
        const status = req.staff?.role === 'admin' ? require('./channels').getChannelStatus() : null;
        res.send(shell.wrap(require('../views/channels').getChannelsHtml(status), 'channels'));
    });
    app.get(['/store/campaigns', '/store/marketing'], (req, res) => res.send(shell.wrap(require('../views/marketing').getMarketingHtml(), 'campaigns')));
    app.get('/store/users', (req, res) => res.send(shell.wrap(require('../views/users').getUsersHtml(), 'users')));
    app.get('/store/leads', (req, res) => res.send(shell.wrap(require('../views/leads').getLeadsHtml(), 'leads')));
    app.get('/store/affiliates', (req, res) => res.send(shell.wrap(require('../views/affiliates').getAffiliatesHtml(), 'affiliates')));
    app.get('/store/campaign-history', (req, res) => res.send(shell.wrap(require('../views/campaign-center').getCampaignCenterHtml(), 'history')));
    app.get('/api/v1/admin/channels', requirePermission('agents'), (req, res) => {
        res.json({ success: true, ...require('./channels').getChannelStatus() });
    });
    app.get('/api/v1/admin/leads/summary', requirePermission('agents'), route(async (req, res, db) => {
        res.json({ success: true, ...(await require('./leads').leadSummary(db)) });
    }));
    app.get('/api/v1/admin/leads', requirePermission('agents'), route(async (req, res, db) => {
        res.json({ success: true, leads: await require('./leads').listLeads(db, { sector: req.query.sector, stage: req.query.stage, limit: req.query.limit }) });
    }));
    app.post('/api/v1/admin/leads', requirePermission('agents'), route(async (req, res, db) => {
        const leads = require('./leads');
        const input = Array.isArray(req.body?.rows) ? req.body.rows : [];
        if (!input.length || input.length > 500) fail(400, 'أضف من 1 إلى 500 جهة اتصال.');
        const rows = input.map(row => ({ contact: row.contact, name: row.name, notes: row.notes, source: 'manual', sector: row.sector || leads.classifySector(`${row.name || ''} ${row.notes || ''}`) }));
        res.status(201).json({ success: true, ...(await leads.importLeads(db, rows, req.staff.id, { apply: true })) });
    }));
    app.post('/api/v1/admin/sales/reply', requirePermission('support'), route(async (req, res, db) => {
        await enforceLimit(db, `sales:${req.staff.id}`, 60, 600000);
        res.json({ success: true, ...(await require('./sales').handleMessage(db, { senderId: req.body?.senderId, message: req.body?.message, channel: 'whatsapp' }, req.staff.id)) });
    }));
    app.get('/api/v1/admin/price-lists', requirePermission('agents'), route(async (req, res, db) => {
        res.json({ success: true, lists: await require('./price-lists').overview(db) });
    }));
    app.get('/api/v1/admin/price-lists/:list', requirePermission('agents'), route(async (req, res, db) => {
        res.json({ success: true, items: await require('./price-lists').listItems(db, req.params.list, { search: req.query.q, limit: req.query.limit }) });
    }));
    app.get('/api/v1/admin/users', requirePermission('users'), route(async (req, res, db) => {
        res.json({ success: true, users: await require('./staff').listStaff(db), currentId: req.staff.id });
    }));
    app.post('/api/v1/admin/users', requirePermission('users'), route(async (req, res, db) => {
        res.status(201).json({ success: true, ...(await require('./staff').addStaff(db, { email: req.body?.email, name: req.body?.name, role: req.body?.role }, req.staff.id)) });
    }));
    app.patch('/api/v1/admin/users/:id', requirePermission('users'), route(async (req, res, db) => {
        res.json({ success: true, ...(await require('./staff').updateStaff(db, req.params.id, req.body || {}, req.staff.id)) });
    }));
    app.get('/api/v1/admin/templates', requirePermission('agents'), route(async (req, res, db) => {
        res.json({ success: true, templates: await require('./templates').listTemplates(db, req.query.sector) });
    }));
    app.get('/api/v1/admin/affiliates', requirePermission('agents'), route(async (req, res, db) => {
        res.json({ success: true, ...(await require('./affiliates').affiliateOverview(db)) });
    }));
    app.post('/api/v1/admin/affiliates', requirePermission('agents'), route(async (req, res, db) => {
        res.status(201).json({ success: true, ...(await require('./affiliates').registerAffiliate(db, { phone: req.body?.phone, name: req.body?.name, supervisorPhone: req.body?.supervisor_phone }, req.staff.id)) });
    }));
    app.post('/api/v1/admin/affiliates/sales', requirePermission('agents'), route(async (req, res, db) => {
        res.status(201).json({ success: true, ...(await require('./affiliates').recordSale(db, { repPhone: req.body?.phone, amountMinor: req.body?.amount_minor }, req.staff.id)) });
    }));
    app.post('/api/v1/admin/agents/tick', requirePermission('agents'), route(async (req, res, db) => {
        res.json({ success: true, ...(await require('./manager-agent').tick(db)) });
    }));
    app.get('/api/v1/admin/legacy/campaigns', requirePermission('agents'), route(async (req, res, db) => {
        res.json({ success: true, ...(await require('./legacy-campaigns').campaignArchive(db)) });
    }));
    app.post('/api/v1/admin/legacy/campaigns/import', requirePermission('agents'), legacyCampaignUpload, route(async (req, res, db) => {
        if (!req.file?.buffer) fail(400, 'اختر ملف قاعدة البيانات القديمة أولاً.');
        const report = await require('./legacy-campaigns').importLegacyCampaigns(db, req.file.buffer, req.staff.id, { apply: req.body.apply === 'true' });
        res.json({ success: true, ...report });
    }));
    app.get('/health/ready', route(async (req, res, db) => {
        require('./commerce').shippingFee();
        if (production() && (!(process.env.STORE_ADMIN_SESSION_SECRET?.length >= 32) || !(process.env.STAFF_MFA_KEY?.length >= 32) || !/^https:\/\//.test(process.env.BASE_URL || ''))) fail(503, 'Production identity or origin configuration missing');
        await db.execute('SELECT 1');
        res.json({ status: 'ready' });
    }));
    app.post('/api/v1/carts/quote', route(async (req, res, db) => {
        await enforceLimit(db, `quote:${req.ip}`, 120, 60000);
        res.json({ success: true, quote: await require('./commerce').quote(db, req.body.items) });
    }));
    app.get('/api/v1/admin/inventory', requirePermission('inventory'), route(async (req, res, db) => {
        res.json({ success: true, inventory: (await db.execute('SELECT inventory.*, store_products.name FROM inventory JOIN store_products ON store_products.id = inventory.product_id ORDER BY product_id LIMIT 1000')).rows });
    }));
    app.post('/api/v1/admin/inventory/:id/adjustments', requirePermission('inventory'), route(async (req, res, db) => {
        const key = req.headers['idempotency-key'];
        if (!/^[A-Za-z0-9_-]{16,128}$/.test(key || '')) fail(400, 'Idempotency-Key required');
        // A shared receipt table protects manual adjustments against repeated HTTP submissions.
        const payload = JSON.stringify({ id: req.params.id, delta: req.body.delta, reason: req.body.reason, actor: req.staff.id });
        const hash = crypto.createHash('sha256').update(payload).digest('hex');
        // The stock adjustment service supports execution in an existing transaction.
        await transaction(db, async tx => {
            const existing = (await tx.execute({ sql: 'SELECT request_hash FROM operation_receipts WHERE key = ?', args: [key] })).rows[0];
            if (existing) { if (existing.request_hash !== hash) fail(409, 'Idempotency conflict'); return; }
            await adjustStockInTransaction(tx, req.params.id, req.body.delta, req.body.reason, req.staff.id);
            await tx.execute({ sql: 'INSERT INTO operation_receipts VALUES (?, ?)', args: [key, hash] });
        });
        res.json({ success: true });
    }));
    app.get('/api/v1/admin/operations', requirePermission('audit'), route(async (req, res, db) => {
        const jobs = (await db.execute('SELECT status, COUNT(*) AS count FROM jobs GROUP BY status')).rows;
        const campaigns = (await db.execute('SELECT status, COUNT(*) AS count FROM marketing_campaigns GROUP BY status')).rows;
        const oldest = (await db.execute("SELECT MIN(created_at) AS created_at FROM jobs WHERE status IN ('pending', 'running')")).rows[0];
        const stock = (await db.execute('SELECT COUNT(*) AS count FROM inventory WHERE on_hand - reserved <= low_stock')).rows[0];
        const heartbeat = (await db.execute("SELECT value FROM system_state WHERE key = 'worker_heartbeat'")).rows[0];
        res.json({ success: true, jobs, campaigns, oldestJobAgeMs: oldest.created_at ? Date.now() - oldest.created_at : 0, workerHeartbeatAgeMs: heartbeat ? Date.now() - heartbeat.value : null, lowStockProducts: stock.count });
    }));
    app.get('/api/v1/admin/audit', requirePermission('audit'), route(async (req, res, db) => {
        const formatter = require('./audit-format');
        const rows = (await db.execute('SELECT * FROM audit_log ORDER BY id DESC LIMIT 100')).rows;
        res.json({ success: true, entries: await formatter.formatEntries(db, rows) });
    }));
    // Live activity feed: readable entries, optional category filter and "newer than id" polling.
    app.get('/api/v1/admin/activity', requirePermission('audit'), route(async (req, res, db) => {
        const formatter = require('./audit-format');
        const limit = Math.min(Math.max(Number(req.query.limit) || 60, 1), 200);
        const afterId = Number(req.query.after) || 0;
        const rows = (await db.execute({ sql: 'SELECT * FROM audit_log WHERE id > ? ORDER BY id DESC LIMIT ?', args: [afterId, limit * 3] })).rows;
        let entries = await formatter.formatEntries(db, rows);
        if (req.query.category && req.query.category !== 'all') entries = entries.filter(entry => entry.category === req.query.category);
        entries = entries.slice(0, limit);
        const controls = (await db.execute('SELECT agent, paused FROM agent_controls')).rows;
        const since = Date.now() - 86400000;
        const lastByAgent = (await db.execute({ sql: "SELECT actor, MAX(created_at) AS last_at, COUNT(*) AS total FROM audit_log WHERE actor LIKE 'agent:%' AND created_at > ? GROUP BY actor", args: [since] })).rows;
        const sentToday = (await db.execute({ sql: "SELECT COUNT(*) AS count FROM audit_log WHERE action = 'agent.whatsapp.sent' AND created_at > ?", args: [since] })).rows[0].count;
        const searchesToday = (await db.execute({ sql: "SELECT COUNT(*) AS count FROM audit_log WHERE action IN ('agent.search', 'staff.search') AND created_at > ?", args: [since] })).rows[0].count;
        const heartbeat = (await db.execute("SELECT value FROM system_state WHERE key = 'worker_heartbeat'")).rows[0];
        const agents = Object.entries(formatter.AGENT_NAMES).filter(([key]) => key !== 'global').map(([key, name]) => {
            const control = controls.find(item => item.agent === key);
            const last = lastByAgent.find(item => item.actor === `agent:${key}`);
            return { key, name, paused: Boolean(control && Number(control.paused)), last_at: last ? Number(last.last_at) : null, actions_24h: last ? Number(last.total) : 0 };
        });
        res.json({ success: true, entries, agents, stats: { sentToday: Number(sentToday), searchesToday: Number(searchesToday), workerHeartbeatAgeMs: heartbeat ? Date.now() - heartbeat.value : null } });
    }));
    // Records staff page navigation and searches for quality assurance and security review.
    app.post('/api/v1/admin/activity/track', requirePermission('support'), route(async (req, res, db) => {
        const kind = req.body?.kind;
        if (!['page_view', 'search'].includes(kind)) fail(400, 'Invalid activity kind');
        await enforceLimit(db, 'activity-track:' + req.staff.id, 120, 60000);
        const page = String(req.body.page || '').slice(0, 120);
        const query = String(req.body.query || '').slice(0, 200);
        await transaction(db, tx => audit(tx, req.staff.id, kind === 'search' ? 'staff.search' : 'staff.page_view', kind === 'search' ? query || '-' : page || '-', kind === 'search' ? { page } : {}));
        res.json({ success: true });
    }));
    app.get('/store/activity', (req, res) => res.send(shell.wrap(require('../views/activity').getActivityHtml(), 'activity')));
    app.get('/api/v1/admin/jobs', requirePermission('audit'), route(async (req, res, db) => {
        res.json({ success: true, jobs: (await db.execute("SELECT id, type, status, attempts, available_at, last_error FROM jobs WHERE status != 'done' ORDER BY created_at LIMIT 100")).rows });
    }));
    app.post('/api/v1/admin/jobs/:id/retry', requirePermission('agents'), route(async (req, res, db) => {
        await transaction(db, async tx => {
            const result = await tx.execute({ sql: "UPDATE jobs SET status = 'pending', attempts = 0, available_at = ?, last_error = NULL WHERE id = ? AND status = 'dead'", args: [Date.now(), req.params.id] });
            if (!Number(result.rowsAffected)) fail(409, 'Job is not dead');
            await audit(tx, req.staff.id, 'job.retried', req.params.id);
        });
        res.json({ success: true });
    }));
    app.get('/api/v1/admin/marketing/campaigns', requirePermission('agents'), route(async (req, res, db) => {
        const campaigns = (await db.execute('SELECT * FROM marketing_campaigns ORDER BY updated_at DESC LIMIT 200')).rows;
        res.json({ success: true, campaigns });
    }));
    app.post('/api/v1/admin/marketing/campaigns', requirePermission('agents'), route(async (req, res, db) => {
        const campaign = require('./marketing').validateCampaign(req.body || {});
        const id = crypto.randomUUID();
        const now = Date.now();
        await transaction(db, async tx => {
            await tx.execute({ sql: "INSERT INTO marketing_campaigns(id, title, sector, channel, product_type, message, status, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)", args: [id, campaign.title, campaign.sector, campaign.channel, campaign.product_type, campaign.message, req.staff.id, now, now] });
            await audit(tx, req.staff.id, 'marketing.campaign.created', id, { sector: campaign.sector, channel: campaign.channel });
        });
        res.status(201).json({ success: true, id });
    }));
    app.patch('/api/v1/admin/marketing/campaigns/:id', requirePermission('agents'), route(async (req, res, db) => {
        const id = req.params.id;
        const body = req.body || {};
        const existing = (await db.execute({ sql: 'SELECT * FROM marketing_campaigns WHERE id = ?', args: [id] })).rows[0];
        if (!existing) fail(404, 'Campaign not found');
        const hasContent = ['title', 'sector', 'channel', 'product_type', 'message'].some(key => Object.hasOwn(body, key));
        if (hasContent && existing.status !== 'draft') fail(409, 'Only draft campaigns can be edited');
        const campaign = hasContent ? require('./marketing').validateCampaign({ ...existing, ...body }) : existing;
        const nextStatus = body.status ?? existing.status;
        const allowed = { draft: ['draft', 'ready'], ready: ['ready', 'draft', 'archived'], archived: ['archived'] };
        if (!allowed[existing.status]?.includes(nextStatus)) fail(400, 'Invalid campaign status transition');
        await transaction(db, async tx => {
            await tx.execute({ sql: 'UPDATE marketing_campaigns SET title = ?, sector = ?, channel = ?, product_type = ?, message = ?, status = ?, updated_at = ? WHERE id = ?', args: [campaign.title, campaign.sector, campaign.channel, campaign.product_type, campaign.message, nextStatus, Date.now(), id] });
            await audit(tx, req.staff.id, hasContent ? 'marketing.campaign.updated' : 'marketing.campaign.status', id, { status: nextStatus });
        });
        res.json({ success: true });
    }));
    app.post('/api/v1/admin/marketing/proposals', requirePermission('agents'), route(async (req, res, db) => {
        const marketing = require('./marketing');
        const campaign = marketing.validateCampaign({ ...req.body, message: marketing.draftMessage(req.body?.sector, req.body?.product_type) });
        const taskId = await require('./agents').propose(db, 'marketing', `campaign:${crypto.randomUUID()}`, { sector: campaign.sector, channel: campaign.channel, product_type: campaign.product_type }, { tool: 'campaign_draft', ...campaign }, 'marketing-v1');
        res.status(201).json({ success: true, taskId });
    }));
    app.get('/api/v1/admin/agents', requirePermission('agents'), route(async (req, res, db) => {
        res.json({ success: true, controls: (await db.execute('SELECT * FROM agent_controls')).rows, tasks: (await db.execute('SELECT * FROM agent_tasks ORDER BY created_at DESC LIMIT 100')).rows });
    }));
    app.patch('/api/v1/admin/agents/:agent', requirePermission('agents'), route(async (req, res, db) => {
        if (!['global', 'inventory', 'orders', 'support', 'marketing', 'manager', 'ads', 'sales', 'affiliate'].includes(req.params.agent) || typeof req.body.paused !== 'boolean') fail(400, 'Invalid agent control');
        await transaction(db, async tx => {
            await tx.execute({ sql: 'UPDATE agent_controls SET paused = ? WHERE agent = ?', args: [req.body.paused ? 1 : 0, req.params.agent] });
            await audit(tx, req.staff.id, 'agent.control', req.params.agent, { paused: req.body.paused });
        });
        res.json({ success: true });
    }));
    app.post('/api/v1/admin/agent-tasks/:id/review', requirePermission('agents'), route(async (req, res, db) => {
        await review(db, req.params.id, req.body.decision, req.staff.id);
        res.json({ success: true });
    }));
    app.post('/api/v1/support/tickets', route(async (req, res, db) => {
        await enforceLimit(db, `support:${req.ip}`, 5, 600000);
        const message = req.body.message;
        if (typeof message !== 'string' || message.trim().length < 3 || message.length > 2000) fail(400, 'Invalid support message');
        const id = crypto.randomUUID();
        await transaction(db, async tx => {
            await tx.execute({ sql: 'INSERT INTO support_tickets(id, message, created_at) VALUES (?, ?, ?)', args: [id, message.trim(), Date.now()] });
            await enqueue(tx, `support:${id}`, 'support.created', { ticketId: id });
        });
        res.status(201).json({ success: true, ticketId: id });
    }));
    app.get('/api/v1/admin/support', requirePermission('support'), route(async (req, res, db) => {
        res.json({ success: true, tickets: (await db.execute('SELECT * FROM support_tickets ORDER BY created_at DESC LIMIT 100')).rows });
    }));
    app.post('/api/v1/admin/customer-recovery', requirePermission('support'), route(async (req, res, db) => {
        await enforceLimit(db, `recovery:staff:${req.staff.id}`, 10, 3600000);
        const token = await require('./recovery').issue(db, req.body, req.staff.id);
        res.json({ success: true, token });
    }));
    app.post('/api/store/customer/password-reset', route(async (req, res, db) => {
        await enforceLimit(db, `recovery:ip:${req.ip}`, 10, 900000);
        await require('./recovery').reset(db, req.body);
        res.json({ success: true });
    }));
    app.patch('/api/v1/admin/support/:id', requirePermission('support'), route(async (req, res, db) => {
        if (!['open', 'resolved'].includes(req.body.status)) fail(400, 'Invalid status');
        await transaction(db, async tx => {
            const result = await tx.execute({ sql: 'UPDATE support_tickets SET status = ? WHERE id = ?', args: [req.body.status, req.params.id] });
            if (!Number(result.rowsAffected)) fail(404, 'Ticket not found');
            await audit(tx, req.staff.id, 'support.status', req.params.id, { status: req.body.status });
        });
        res.json({ success: true });
    }));
    app.post('/api/v1/admin/orders/:number/collection', requirePermission('orders'), route(async (req, res, db) => {
        const { amount_minor: amount, reference } = req.body;
        if (!Number.isSafeInteger(amount) || amount < 0 || typeof reference !== 'string' || reference.length < 3 || reference.length > 120) fail(400, 'Invalid collection');
        await transaction(db, async tx => {
            const order = (await tx.execute({ sql: 'SELECT status, total_minor FROM store_orders WHERE order_number = ?', args: [req.params.number] })).rows[0];
            if (!order || order.status !== 'delivered' || order.total_minor !== amount) fail(409, 'Collection must match a delivered order total');
            const existing = (await tx.execute({ sql: 'SELECT * FROM cod_collections WHERE order_number = ?', args: [req.params.number] })).rows[0];
            if (existing) { if (existing.reference !== reference || existing.amount_minor !== amount) fail(409, 'Collection already recorded'); return; }
            await tx.execute({ sql: 'INSERT INTO cod_collections VALUES (?, ?, ?, ?, ?)', args: [req.params.number, amount, reference, req.staff.id, Date.now()] });
            await audit(tx, req.staff.id, 'cod.collected', req.params.number, { amount_minor: amount, reference });
        });
        res.json({ success: true });
    }));
}
module.exports = { install };
