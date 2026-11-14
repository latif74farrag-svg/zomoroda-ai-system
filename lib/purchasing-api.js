const { requirePermission } = require('./staff');
const purchasing = require('./purchasing');
function install(app, route) {
    const permission = requirePermission('purchasing');
    app.get('/api/v1/admin/purchasing', permission, route(async (req, res, db) => res.json({ success: true, ...(await purchasing.overview(db)) })));
    app.post('/api/v1/admin/purchasing/suppliers', permission, route(async (req, res, db) => res.status(201).json({ success: true, ...(await purchasing.addSupplier(db, req.body || {}, req.staff.id, req.get('Idempotency-Key'))) })));
    app.post('/api/v1/admin/purchasing/orders', permission, route(async (req, res, db) => res.status(201).json({ success: true, ...(await purchasing.createOrder(db, req.body || {}, req.staff.id, req.get('Idempotency-Key'))) })));
    app.patch('/api/v1/admin/purchasing/orders/:id', permission, route(async (req, res, db) => res.json({ success: true, ...(await purchasing.changeStatus(db, req.params.id, req.body?.status, req.staff.id)) })));
    app.post('/api/v1/admin/purchasing/orders/:id/receive', permission, route(async (req, res, db) => res.json({ success: true, ...(await purchasing.receive(db, req.params.id, req.body || {}, req.staff.id, req.get('Idempotency-Key'))) })));
}
module.exports = { install };
