const crypto = require('node:crypto');
const { transaction, production } = require('./storage');
const { fail } = require('./commerce');

async function rateLimit(database, key, limit, windowMs, now = Date.now()) {
    const bucket = crypto.createHash('sha256').update(key).digest('hex');
    return transaction(database, async tx => {
        const result = await tx.execute({ sql: 'INSERT INTO rate_limits(bucket, hits, reset_at) VALUES (?, 1, ?) ON CONFLICT(bucket) DO UPDATE SET hits = CASE WHEN reset_at <= ? THEN 1 ELSE hits + 1 END, reset_at = CASE WHEN reset_at <= ? THEN excluded.reset_at ELSE reset_at END RETURNING hits', args: [bucket, now + windowMs, now, now] });
        // Check outside the transaction so rejected attempts remain counted.
        return Number(result.rows[0].hits) <= limit;
    });
}
function securityHeaders(req, res, next) {
    const requestId = crypto.randomUUID();
    res.setHeader('X-Request-ID', requestId);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; img-src 'self' https: data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
    if (production()) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
    res.setHeader('Cache-Control', 'no-store');
    const start = Date.now();
    if (process.env.LOG_HTTP !== 'false') res.on('finish', () => console.log(JSON.stringify({ event: 'http', requestId, method: req.method, route: req.route?.path || 'unmatched', status: res.statusCode, durationMs: Date.now() - start })));
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        const origin = req.headers.origin;
        const allowed = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
        if ((origin && origin !== new URL(allowed).origin) || req.headers['sec-fetch-site'] === 'cross-site') return res.status(403).json({ success: false, error: 'Cross-origin request denied' });
        if (req.headers.cookie && !origin && req.headers['sec-fetch-site'] !== 'same-origin' && !req.headers['x-csrf-token']) return res.status(403).json({ success: false, error: 'Same-origin request required' });
    }
    next();
}
async function enforceLimit(database, key, limit, windowMs) {
    if (!await rateLimit(database, key, limit, windowMs)) fail(429, 'محاولات كثيرة. يرجى المحاولة لاحقاً.');
}
module.exports = { securityHeaders, rateLimit, enforceLimit };
