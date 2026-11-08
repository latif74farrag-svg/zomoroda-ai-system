const express = require('express');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { put: putBlob } = require('@vercel/blob');
const app = express();
const IS_VERCEL = Boolean(process.env.VERCEL);
const storage = require('./lib/storage');
const staffAuth = require('./lib/staff');
const commerce = require('./lib/commerce');
const { securityHeaders, enforceLimit } = require('./lib/security');
const IS_PRODUCTION = storage.production();
const BUSINESS_IDENTITY = { whatsapp: process.env.BUSINESS_WHATSAPP || '01010997511' };
app.disable('x-powered-by');
if (IS_VERCEL) app.set('trust proxy', 1);
app.use(securityHeaders);
app.use(express.json({ limit: '64kb', verify: (req, res, buffer) => { if (req.url.startsWith('/webhooks/')) req.rawBody = buffer; } })); // raw bytes are needed to verify webhook signatures
app.use(express.urlencoded({ extended: false, limit: '64kb' }));
app.use('/assets', express.static(path.join(__dirname, 'assets'), { dotfiles: 'deny', index: false }));
app.get('/', (req, res) => res.redirect('/store'));
app.get('/review', (req, res) => res.redirect('/store/manager'));
app.use(['/api/campaign', '/api/offers', '/api/support/chat', '/review', '/media', '/review_queue'], (req, res) => res.status(410).json({ success: false, error: 'Use the authenticated operations API' }));

const { getStoreHtml } = require('./views/store');
const { getCheckoutHtml } = require('./views/checkout');
const { getOrderTrackingHtml } = require('./views/orderTracking');
const { getStoreAdminHtml } = require('./views/storeAdmin');
const { getStoreAccountHtml } = require('./views/storeAccount');
const { getStoreProductHtml } = require('./views/storeProduct');
const { STORE_PRODUCTS, CATEGORY_LABELS, getStoreProducts, getStoreProductById } = require('./products_config');
const storeData = require('./store_data');
const catalog = require('./lib/catalog').createCatalog(storeData, CATEGORY_LABELS);

const imageUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 4 * 1024 * 1024, files: 1 } }).single('image');
function getAdminSessionSecret() {
    const secret = process.env.STORE_ADMIN_SESSION_SECRET || '';
    return secret.length >= 32 ? secret : null;
}
app.use(async (req, res, next) => {
    try {
        const token = staffAuth.cookieValue(req, 'zmr_staff');
        if (token) {
            await storeData.initializeStoreDatabase();
            req.staff = await staffAuth.session(await storage.getDatabase(), token);
        }
        next();
    } catch (error) { next(error); }
});
function requireStoreAdmin(req, res, next) {
    const permission = req.path.includes('/orders') ? 'orders' : 'catalog';
    return staffAuth.requirePermission(permission)(req, res, next);
}
app.use((req, res, next) => {
    if (/^\/api\/v1\/(products(?:\/[^/?]+)?|orders(?:\/track)?|customer(?:\/[^?]*)?)(?:\?|$)/.test(req.url)) req.url = req.url.replace('/api/v1/', '/api/store/');
    if (/^\/api\/v1\/admin\/(products(?:\/[^/?]+(?:\/visibility)?)?|orders(?:\/[^/?]+)?|images|session|login|logout)(?:\?|$)/.test(req.url)) req.url = req.url.replace('/api/v1/admin/', '/api/store/admin/');
    next();
});
require('./lib/operations-api').install(app, storeData);
app.use(['/api/store/customer/login', '/api/store/customer/register', '/api/store/orders/track'], async (req, res, next) => {
    try {
        await storeData.initializeStoreDatabase();
        await enforceLimit(await storage.getDatabase(), req.baseUrl + ':' + req.ip, 15, 900000);
        next();
    } catch (error) { next(error); }
});
function ensureStoreCustomerStorage() { return storeData.initializeStoreDatabase(); }
function publicStoreCustomer(customer) {
    if (!customer) return null;
    return { id: customer.id, name: customer.name, phone: customer.phone, created_at: customer.created_at };
}
const findStoreCustomerByPhone = storeData.getCustomerByPhone;
const findStoreCustomerById = storeData.getCustomerById;
const createStoreCustomer = storeData.createCustomer;
const invalidateStoreCustomerSessions = storeData.invalidateCustomerSessions;
const findStoreCustomerOrders = storeData.getCustomerOrders;

const CUSTOMER_SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
const customerAuthAttempts = new Map();
const scryptAsync = require('util').promisify(crypto.scrypt);
const CUSTOMER_PASSWORD_HASH_BYTES = 64;

function createCustomerSession(customerId, sessionVersion, expiresAt, secret) {
    const payload = Buffer.from(JSON.stringify({ id: customerId, ver: sessionVersion, exp: expiresAt })).toString('base64url');
    const signature = crypto.createHmac('sha256', secret).update(`store-customer:${payload}`).digest('hex');
    return `${payload}.${signature}`;
}

async function getStoreCustomerSession(req) {
    const secret = getAdminSessionSecret();
    if (!secret) return null;
    const cookie = String(req.headers.cookie || '').split(';')
        .map(value => value.trim())
        .find(value => value.startsWith('zmr_store_customer='));
    if (!cookie) return null;

    let token;
    try {
        token = decodeURIComponent(cookie.slice('zmr_store_customer='.length));
    } catch (error) {
        return null;
    }
    const separator = token.lastIndexOf('.');
    if (separator <= 0) return null;
    const payload = token.slice(0, separator);
    const signature = token.slice(separator + 1);
    if (!/^[a-f0-9]{64}$/.test(signature)) return null;
    const expected = crypto.createHmac('sha256', secret).update(`store-customer:${payload}`).digest();
    if (!crypto.timingSafeEqual(Buffer.from(signature, 'hex'), expected)) return null;

    let session;
    try {
        session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    } catch (error) {
        return null;
    }
    if (typeof session.id !== 'string' || !Number.isSafeInteger(session.exp) || session.exp <= Date.now()) return null;
    const customer = await findStoreCustomerById(session.id);
    return customer && Number(customer.session_version) === session.ver ? customer : null;
}

function setCustomerSessionCookie(req, res, customer) {
    const secret = getAdminSessionSecret();
    if (!secret) throw new Error('إعداد سر جلسة المتجر غير مكتمل.');
    const expiresAt = Date.now() + CUSTOMER_SESSION_TTL_SECONDS * 1000;
    const token = createCustomerSession(customer.id, Number(customer.session_version || 0), expiresAt, secret);
    const secure = IS_PRODUCTION || req.secure ? '; Secure' : '';
    res.setHeader('Set-Cookie', `zmr_store_customer=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${CUSTOMER_SESSION_TTL_SECONDS}${secure}`);
}

function customerAuthRateLimited(req, res) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const previous = customerAuthAttempts.get(ip);
    if (previous && previous.resetAt > now && previous.count >= 10) {
        res.status(429).json({ success: false, error: 'محاولات كثيرة. انتظر 15 دقيقة ثم أعد المحاولة.' });
        return true;
    }
    return false;
}

function recordCustomerAuthFailure(req) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const previous = customerAuthAttempts.get(ip);
    customerAuthAttempts.set(ip, previous && previous.resetAt > now
        ? { count: previous.count + 1, resetAt: previous.resetAt }
        : { count: 1, resetAt: now + 15 * 60 * 1000 });
}

function clearCustomerSessionCookie(req, res) {
    res.setHeader('Set-Cookie', 'zmr_store_customer=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' + (IS_VERCEL || req.secure ? '; Secure' : ''));
}

function storeAccountError(res, error) {
    console.error('❌ تعذر إكمال عملية حساب المتجر:', error.message);
    return res.status(503).json({ success: false, error: 'تعذر الوصول إلى حسابات المتجر حالياً. حاول مرة أخرى لاحقاً.' });
}

function storeAdminError(res, error, message = 'تعذر إكمال العملية. تحقق من إعدادات تخزين المتجر وحاول مرة أخرى.') {
    console.error('❌ خطأ في إدارة المتجر:', error.message);
    return res.status(error.status || 503).json({ success: false, error: error.status && error.status < 500 ? error.message : message });
}

function parseAdminProduct(body, id, existing = null) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const brand = typeof body.brand === 'string' ? body.brand.trim() : '';
    const unit = typeof body.unit === 'string' ? body.unit.trim() : '';
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    const category = typeof body.category === 'string' ? body.category : '';
    const price = body.price === '' || body.price === null || body.price === undefined ? NaN : Number(body.price);
    const carton = body.carton === null || body.carton === '' || body.carton === undefined ? null : Number(body.carton);
    const imageUrl = typeof body.image_url === 'string' ? body.image_url.trim() : '';
    const variants = Array.isArray(body.variants) ? body.variants.map(value => String(value).trim()).filter(Boolean) : [];
    const safeImageUrl = !imageUrl || (
        imageUrl.length <= 2048 &&
        (/^https:\/\/[^\s]+$/i.test(imageUrl) ||
            /^\/assets\/store-products\/[a-z0-9._/-]+\.(?:jpe?g|png|webp)$/i.test(imageUrl)) &&
        !imageUrl.includes('..')
    );

    if (!name || name.length > 160 || brand.length > 80 || unit.length > 80 || description.length > 1000 ||
        !Object.hasOwn(CATEGORY_LABELS, category) || !Number.isFinite(price) || price < 0 || price > 10000000 ||
        (carton !== null && (!Number.isInteger(carton) || carton < 1 || carton > 100000)) ||
        variants.length > 20 || variants.some(value => value.length > 80) || !safeImageUrl ||
        (body.variants !== undefined && !Array.isArray(body.variants)) ||
        (body.image_url !== undefined && typeof body.image_url !== 'string') ||
        (body.is_active !== undefined && typeof body.is_active !== 'boolean')) {
        return null;
    }

    return {
        id,
        name,
        brand,
        category,
        price,
        unit,
        carton,
        variants,
        description,
        image_url: imageUrl,
        is_active: body.is_active === undefined ? (existing?.is_active ?? true) : body.is_active === true
    };
}

app.get('/store/admin', (req, res) => {
    res.send(require('./views/admin-shell').wrap(getStoreAdminHtml(CATEGORY_LABELS), 'admin'));
});

app.get('/api/store/admin/session', async (req, res, next) => {
    try {
        await storeData.initializeStoreDatabase();
        const count = (await (await storage.getDatabase()).execute('SELECT COUNT(*) AS count FROM staff WHERE disabled = 0')).rows[0].count;
        res.json({ success: true, authenticated: Boolean(req.staff), staff: req.staff ? { id: req.staff.id, name: req.staff.name, role: req.staff.role } : null, csrf: req.staff?.csrf, configured: Boolean(count), storageReady: true, imageStorageReady: Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID), setupMessage: 'Create an individual staff account using npm run staff:create. STAFF_MFA_KEY must be configured.' });
    } catch (error) { next(error); }
});
app.post('/api/store/admin/login', async (req, res, next) => {
    try {
        await storeData.initializeStoreDatabase();
        const database = await storage.getDatabase();
        await enforceLimit(database, 'staff-login:' + req.ip, 10, 900000);
        const result = await staffAuth.login(database, req.body || {});
        staffAuth.setCookie(res, result.token);
        res.json({ success: true, csrf: result.csrf });
    } catch (error) { next(error); }
});
app.post('/api/store/admin/login/code', async (req, res, next) => {
    try {
        await storeData.initializeStoreDatabase();
        const database = await storage.getDatabase();
        await enforceLimit(database, 'staff-code:' + req.ip, 10, 900000);
        res.json({ success: true, ...(await staffAuth.requestEmailCode(database, req.body?.email, require('./lib/mailer').sendMail)) });
    } catch (error) { next(error); }
});
app.post('/api/store/admin/login/verify', async (req, res, next) => {
    try {
        await storeData.initializeStoreDatabase();
        const database = await storage.getDatabase();
        await enforceLimit(database, 'staff-verify:' + req.ip, 20, 900000);
        const result = await staffAuth.verifyEmailCode(database, req.body || {});
        staffAuth.setCookie(res, result.token);
        res.json({ success: true, csrf: result.csrf });
    } catch (error) { next(error); }
});
app.post('/api/store/admin/logout', (req, res, next) => staffAuth.requirePermission(req.staff?.role === 'operations' ? 'orders' : 'support')(req, res, next), async (req, res, next) => {
    try {
        const token = staffAuth.cookieValue(req, 'zmr_staff');
        await (await storage.getDatabase()).execute({ sql: 'DELETE FROM staff_sessions WHERE token_hash = ?', args: [staffAuth.digest(token)] });
        staffAuth.setCookie(res, '', true);
        res.json({ success: true });
    } catch (error) { next(error); }
});
app.get('/store/account', (req, res) => {
    res.send(getStoreAccountHtml());
});

app.get('/api/store/customer/session', async (req, res) => {
    try {
        const customer = await getStoreCustomerSession(req);
        res.json({ success: true, authenticated: Boolean(customer), customer: publicStoreCustomer(customer) });
    } catch (error) {
        storeAccountError(res, error);
    }
});

app.post('/api/store/customer/register', async (req, res) => {
    if (customerAuthRateLimited(req, res)) return;
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const phone = typeof req.body?.phone === 'string' ? req.body.phone.replace(/\D/g, '') : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!name || name.length > 120 || !/^(010|011|012|015)\d{8}$/.test(phone) ||
        password.length < 8 || password.length > 128) {
        recordCustomerAuthFailure(req);
        return res.status(400).json({ success: false, error: 'أدخل اسماً صحيحاً ورقم هاتف مصرياً وكلمة مرور من 8 أحرف على الأقل.' });
    }
    if (!getAdminSessionSecret()) {
        return res.status(503).json({ success: false, error: 'إعداد جلسات المتجر غير مكتمل. أضف STORE_ADMIN_SESSION_SECRET إلى إعدادات الخادم.' });
    }

    try {
        const existing = await findStoreCustomerByPhone(phone);
        if (existing) {
            recordCustomerAuthFailure(req);
            return res.status(409).json({ success: false, error: 'يوجد حساب بهذا الرقم بالفعل. سجّل الدخول بدلاً من ذلك.' });
        }
        const passwordSalt = crypto.randomBytes(16).toString('hex');
        const passwordHash = (await scryptAsync(password, passwordSalt, CUSTOMER_PASSWORD_HASH_BYTES)).toString('hex');
        const customer = await createStoreCustomer({
            id: crypto.randomUUID(),
            name,
            phone,
            passwordSalt,
            passwordHash
        });
        if (!customer) throw new Error('تعذر تحميل الحساب بعد إنشائه.');
        customerAuthAttempts.delete(req.ip || req.socket.remoteAddress || 'unknown');
        setCustomerSessionCookie(req, res, customer);
        res.status(201).json({ success: true, customer: publicStoreCustomer(customer) });
    } catch (error) {
        if (/UNIQUE constraint failed: store_customers\.phone/i.test(error.message)) {
            recordCustomerAuthFailure(req);
            return res.status(409).json({ success: false, error: 'يوجد حساب بهذا الرقم بالفعل. سجّل الدخول بدلاً من ذلك.' });
        }
        storeAccountError(res, error);
    }
});

app.post('/api/store/customer/login', async (req, res) => {
    if (customerAuthRateLimited(req, res)) return;
    const phone = typeof req.body?.phone === 'string' ? req.body.phone.replace(/\D/g, '') : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!/^(010|011|012|015)\d{8}$/.test(phone) || password.length < 8 || password.length > 128) {
        recordCustomerAuthFailure(req);
        return res.status(401).json({ success: false, error: 'رقم الهاتف أو كلمة المرور غير صحيحة.' });
    }
    if (!getAdminSessionSecret()) {
        return res.status(503).json({ success: false, error: 'إعداد جلسات المتجر غير مكتمل. أضف STORE_ADMIN_SESSION_SECRET إلى إعدادات الخادم.' });
    }

    try {
        const customer = await findStoreCustomerByPhone(phone);
        const salt = customer?.password_salt || 'zomoroda-store-account-check';
        const storedHash = customer?.password_hash || '0'.repeat(CUSTOMER_PASSWORD_HASH_BYTES * 2);
        const suppliedHash = await scryptAsync(password, salt, CUSTOMER_PASSWORD_HASH_BYTES);
        const expectedHash = Buffer.from(storedHash, 'hex');
        if (!customer || expectedHash.length !== suppliedHash.length ||
            !crypto.timingSafeEqual(expectedHash, suppliedHash)) {
            recordCustomerAuthFailure(req);
            return res.status(401).json({ success: false, error: 'رقم الهاتف أو كلمة المرور غير صحيحة.' });
        }
        customerAuthAttempts.delete(req.ip || req.socket.remoteAddress || 'unknown');
        setCustomerSessionCookie(req, res, customer);
        res.json({ success: true, customer: publicStoreCustomer(customer) });
    } catch (error) {
        storeAccountError(res, error);
    }
});

app.post('/api/store/customer/logout', async (req, res) => {
    try {
        const customer = await getStoreCustomerSession(req);
        if (customer) await invalidateStoreCustomerSessions(customer.id);
        clearCustomerSessionCookie(req, res);
        res.json({ success: true });
    } catch (error) {
        storeAccountError(res, error);
    }
});

app.get('/api/store/customer/orders', async (req, res) => {
    try {
        const customer = await getStoreCustomerSession(req);
        if (!customer) return res.status(401).json({ success: false, error: 'سجّل الدخول لعرض طلباتك.' });
        const statusLabels = {
            pending: 'قيد المراجعة',
            confirmed: 'تم التأكيد',
            shipped: 'تم الشحن',
            delivered: 'تم التسليم',
            cancelled: 'تم إلغاء الطلب'
        };
        const orders = await findStoreCustomerOrders(customer.id);
        res.json({
            success: true,
            orders: orders.map(order => ({
                ...order,
                status_label: statusLabels[order.status] || order.status
            }))
        });
    } catch (error) {
        storeAccountError(res, error);
    }
});

app.get('/api/store/admin/products', requireStoreAdmin, async (req, res) => {
    try {
        const products = await storeData.getProducts({ includeInactive: true });
        res.json({ success: true, products });
    } catch (error) {
        storeAdminError(res, error);
    }
});

app.post('/api/store/admin/products', requireStoreAdmin, async (req, res) => {
    const id = `prd-${crypto.randomBytes(8).toString('hex')}`;
    const product = parseAdminProduct(req.body || {}, id);
    if (!product) return res.status(400).json({ success: false, error: 'راجع بيانات المنتج والسعر والتصنيف والصورة.' });
    try {
        const saved = await storeData.saveProduct(product, req.staff.id);
        catalog.invalidate();
        res.status(201).json({ success: true, product: saved, message: 'تمت إضافة المنتج.' });
    } catch (error) {
        storeAdminError(res, error);
    }
});

app.put('/api/store/admin/products/:id', requireStoreAdmin, async (req, res) => {
    try {
        const existing = await storeData.getProductById(req.params.id, { includeInactive: true });
        if (!existing) return res.status(404).json({ success: false, error: 'المنتج غير موجود.' });
        const product = parseAdminProduct(req.body || {}, req.params.id, existing);
        if (!product) return res.status(400).json({ success: false, error: 'راجع بيانات المنتج والسعر والتصنيف والصورة.' });
        const saved = await storeData.saveProduct(product, req.staff.id);
        catalog.invalidate();
        res.json({ success: true, product: saved, message: 'تم تحديث المنتج.' });
    } catch (error) {
        storeAdminError(res, error);
    }
});

app.patch('/api/store/admin/products/:id/visibility', requireStoreAdmin, async (req, res) => {
    if (typeof req.body?.active !== 'boolean') {
        return res.status(400).json({ success: false, error: 'قيمة ظهور المنتج غير صالحة.' });
    }
    try {
        const updated = await storeData.setProductActive(req.params.id, req.body.active, req.staff.id);
        catalog.invalidate();
        if (!updated) return res.status(404).json({ success: false, error: 'المنتج غير موجود.' });
        res.json({ success: true });
    } catch (error) {
        storeAdminError(res, error);
    }
});

app.post('/api/store/admin/images', requireStoreAdmin, (req, res, next) => {
    imageUpload(req, res, error => {
        if (error) {
            const tooLarge = error.code === 'LIMIT_FILE_SIZE';
            return res.status(tooLarge ? 413 : 400).json({
                success: false,
                error: tooLarge ? 'يجب ألا يتجاوز حجم الصورة 4 ميجابايت.' : 'تعذر قراءة الصورة المرفوعة.'
            });
        }
        next();
    });
}, async (req, res) => {
    const blobStorageReady = Boolean(
        process.env.BLOB_READ_WRITE_TOKEN ||
        (process.env.BLOB_STORE_ID && (process.env.VERCEL_OIDC_TOKEN || IS_VERCEL))
    );
    const file = req.file;
    if (!file) return res.status(400).json({ success: false, error: 'اختر صورة للرفع.' });

    const imageTypes = [
        { mime: 'image/jpeg', extension: 'jpg', matches: buffer => buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff },
        { mime: 'image/png', extension: 'png', matches: buffer => buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) },
        { mime: 'image/webp', extension: 'webp', matches: buffer => buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP' }
    ];
    const imageType = imageTypes.find(type => type.mime === file.mimetype && type.matches(file.buffer));
    if (!imageType) return res.status(400).json({ success: false, error: 'الصورة يجب أن تكون JPG أو PNG أو WebP صالحة.' });

    // Blob is preferred; if it is missing or rejects the upload, keep the image in the database
    // so the admin is never blocked by storage configuration.
    if (blobStorageReady) {
        try {
            const blob = await putBlob(`store-products/${crypto.randomBytes(16).toString('hex')}.${imageType.extension}`, file.buffer, {
                access: 'public',
                contentType: imageType.mime,
                addRandomSuffix: true
            });
            return res.status(201).json({ success: true, url: blob.url, storage: 'blob' });
        } catch (error) {
            console.error('⚠️ فشل رفع الصورة إلى Vercel Blob، سيتم الحفظ في قاعدة البيانات:', error.message);
        }
    }
    try {
        const id = crypto.randomBytes(16).toString('hex');
        await storeData.initializeStoreDatabase();
        await (await storage.getDatabase()).execute({
            sql: 'INSERT INTO product_images(id, mime, data, created_at) VALUES (?, ?, ?, ?)',
            args: [id, imageType.mime, file.buffer.toString('base64'), Date.now()]
        });
        res.status(201).json({ success: true, url: `/assets/store-products/db/${id}.${imageType.extension}`, storage: 'database' });
    } catch (error) {
        storeAdminError(res, error, 'تعذر حفظ الصورة. حاول مرة أخرى بصورة أصغر.');
    }
});

app.get('/assets/store-products/db/:file', async (req, res, next) => {
    try {
        const match = /^([a-f0-9]{32})\.(?:jpg|png|webp)$/.exec(req.params.file);
        if (!match) return res.status(404).end();
        await storeData.initializeStoreDatabase();
        const row = (await (await storage.getDatabase()).execute({ sql: 'SELECT mime, data FROM product_images WHERE id = ?', args: [match[1]] })).rows[0];
        if (!row) return res.status(404).end();
        res.set({ 'Content-Type': row.mime, 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' });
        res.send(Buffer.from(row.data, 'base64'));
    } catch (error) { next(error); }
});

app.get('/api/store/admin/orders', requireStoreAdmin, async (req, res) => {
    try {
        const orders = await storeData.getOrders({ status: req.query.status || 'all' });
        res.json({ success: true, orders });
    } catch (error) {
        storeAdminError(res, error);
    }
});

app.patch('/api/store/admin/orders/:orderNumber', requireStoreAdmin, async (req, res) => {
    const allowedStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'delivery_failed', 'returned'];
    const status = req.body?.status;
    if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ success: false, error: 'حالة الطلب غير صالحة.' });
    }
    try {
        const updated = await storeData.updateOrderStatus(req.params.orderNumber, status, req.staff.id);
        if (!updated) return res.status(404).json({ success: false, error: 'الطلب غير موجود.' });
        res.json({ success: true });
    } catch (error) {
        storeAdminError(res, error);
    }
});

// 1. صفحة المتجر الرئيسية
app.get('/store', async (req, res) => {
    const category = req.query.category || 'all';
    try {
        const products = await catalog.products(category);
        res.send(getStoreHtml(products, CATEGORY_LABELS, category));
    } catch (error) {
        console.error('❌ تعذر تحميل منتجات المتجر:', error.message);
        res.status(503).send('تعذر تحميل كتالوج المتجر. تحقق من إعداد قاعدة بيانات المتجر ثم حاول مرة أخرى.');
    }
});

app.get('/store/product/:id', async (req, res) => {
    try {
        const product = await storeData.getProductById(req.params.id);
        if (!product) return res.status(404).send('هذا المنتج غير موجود أو غير متاح حالياً. <a href="/store">العودة إلى المتجر</a>');
        res.send(getStoreProductHtml(product, CATEGORY_LABELS[product.category]));
    } catch (error) {
        console.error('❌ تعذر تحميل صفحة المنتج:', error.message);
        res.status(503).send('تعذر تحميل بيانات المنتج. تحقق من اتصال قاعدة بيانات المتجر ثم حاول مرة أخرى.');
    }
});

// 2. صفحة إتمام الطلب (Checkout)
app.get('/store/checkout', (req, res) => {
    const html = getCheckoutHtml(BUSINESS_IDENTITY.whatsapp);
    res.send(html);
});

app.get('/store/track', (req, res) => {
    const html = getOrderTrackingHtml();
    res.send(html);
});

// 3. API قائمة المنتجات
app.get('/api/store/products', async (req, res) => {
    const { category } = req.query;
    try {
        const products = await catalog.products(category || 'all');
        if (!req.headers.cookie) res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=10');
        res.json({ success: true, count: products.length, categories: CATEGORY_LABELS, products });
    } catch (error) {
        storeAdminError(res, error, 'تعذر تحميل المنتجات حالياً.');
    }
});

// 4. API تفاصيل منتج واحد
app.get('/api/store/products/:id', async (req, res) => {
    let product;
    try {
        product = await storeData.getProductById(req.params.id);
    } catch (error) {
        return storeAdminError(res, error, 'تعذر تحميل المنتج حالياً.');
    }
    if (!product) {
        return res.status(404).json({ success: false, error: 'المنتج غير موجود' });
    }
    res.json({ success: true, product });
});

// 5. API تسجيل طلب جديد
app.post('/api/store/orders', async (req, res, next) => {
    try {
        await storeData.initializeStoreDatabase();
        const database = await storage.getDatabase();
        await enforceLimit(database, 'checkout:' + req.ip, 30, 600000);
        const customer = await getStoreCustomerSession(req);
        const result = await commerce.createOrder(database, req.body || {}, req.headers['idempotency-key'], customer);
        res.status(result.replayed ? 200 : 201).json({ success: true, ...result });
    } catch (error) { next(error); }
});

// 6. API تتبع الطلب باستخدام رقم الطلب ورقم الهاتف
async function findStoreOrder(phoneInput, orderNumberInput, res) {
    const phone = String(phoneInput || '').replace(/\D/g, '');
    const orderNumber = typeof orderNumberInput === 'string' ? orderNumberInput.trim().toUpperCase() : '';
    if (!/^(010|011|012|015)\d{8}$/.test(phone) || !/^ZMR-\d{8}-[A-F0-9]{16}$/.test(orderNumber)) return res.status(400).json({ success: false, error: 'Invalid tracking details' });
    try {
        const order = await storeData.getOrderForTracking(phone, orderNumber);
        if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
        res.json({ success: true, order });
    } catch (error) { return storeAdminError(res, error); }
}

app.post('/api/store/orders/track', (req, res) => {
    findStoreOrder(req.body?.phone, req.body?.order_number, res);
});

app.get('/api/store/orders/:phone', (req, res) => {
    res.status(405).json({ success: false, error: 'Use POST /api/store/orders/track' });
});

// ==========================================
// 🔌 9. تشغيل السيرفر
// [تعديل] دمج الـ listen المكرر في مكان واحد، ولا يعمل على Vercel
// ==========================================
const PORT = process.env.PORT || 3000;

if (!IS_VERCEL) {
    if (require.main === module) app.listen(PORT, '0.0.0.0', () => {
        console.log(JSON.stringify({ event: 'server.started', port: PORT, legacyOutreach: 'disabled' }));
    });
}

// [تعديل] تصدير واحد فقط (كان مكرراً) - مطلوب لـ Vercel
app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status = Number.isInteger(error.status) && error.status >= 400 && error.status <= 599 ? error.status : 503;
    console.error(JSON.stringify({ event: 'request.failure', requestId: res.getHeader('X-Request-ID'), status }));
    res.status(status).json({ success: false, error: status < 500 || error.expose ? error.message : 'Service temporarily unavailable' });
});
module.exports = app;
