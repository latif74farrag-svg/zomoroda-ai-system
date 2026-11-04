function getStoreAdminHtml(categories) {
    const categoryOptions = Object.entries(categories).map(([id, category]) =>
        `<option value="${id}">${category.icon} ${category.name}</option>`
    ).join('');

    return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>إدارة المتجر | الزمردة كوزماتيكس</title>
    <link rel="icon" type="image/png" href="/assets/zomoroda-store-logo.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; }
        body { margin: 0; min-height: 100vh; background: #f1f5f9; color: #0f172a; font-family: 'Cairo', Tahoma, Arial, sans-serif; line-height: 1.7; }
        main { width: min(1240px, calc(100% - 32px)); margin: auto; padding: 24px 0 56px; }
        h1, h2, h3 { color: #064e3b; margin: 0; }
        h2 { font-size: 18px; font-weight: 800; }
        .page-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
        .page-head h1 { font-size: 26px; font-weight: 800; line-height: 1.3; }
        .page-head p { margin: 2px 0 0; color: #475569; font-size: 14px; }
        .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-bottom: 18px; }
        .kpi { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 12px 16px; }
        .kpi span { display: block; font-size: 13px; color: #475569; }
        .kpi strong { font-size: 24px; font-weight: 800; color: #064e3b; }
        .kpi.warn strong { color: #b45309; }
        .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 22px; box-shadow: 0 8px 24px #0f172a0a; }
        .login-card { max-width: 520px; margin: 24px auto 60px; }
        .grid { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(320px, 1fr); gap: 20px; align-items: start; }
        .form-card { position: sticky; top: 84px; max-height: calc(100vh - 100px); overflow-y: auto; }
        fieldset { border: 0; padding: 0; margin: 0 0 18px; }
        legend { padding: 0; margin-bottom: 8px; font-size: 14px; font-weight: 800; color: #064e3b; }
        .field { margin: 10px 0; }
        .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        label { display: block; margin-bottom: 4px; font-size: 13.5px; font-weight: 700; color: #334155; }
        input, select, textarea { width: 100%; padding: 10px 12px; border: 1.5px solid #cbd5e1; border-radius: 10px; font: inherit; background: #fff; }
        input:focus, select:focus, textarea:focus, button:focus-visible { outline: 3px solid #a7f3d0; outline-offset: 1px; border-color: #10b981; }
        textarea { resize: vertical; min-height: 74px; }
        input[type="checkbox"] { width: auto; margin-inline-end: 6px; }
        button { font: inherit; cursor: pointer; border: 0; border-radius: 10px; padding: 9px 16px; color: #fff; background: #047857; font-weight: 800; }
        button:hover { background: #064e3b; }
        button:disabled { opacity: .6; cursor: wait; }
        button.secondary { background: #475569; }
        button.ghost { background: #fff; color: #047857; border: 1.5px solid #a7f3d0; padding: 7px 14px; }
        button.ghost:hover { background: #ecfdf5; }
        button.danger { background: #fff; color: #b91c1c; border: 1.5px solid #fecaca; padding: 7px 14px; }
        button.danger:hover { background: #fef2f2; }
        .toolbar { display: flex; gap: 10px; align-items: center; margin: 14px 0; }
        .toolbar input, .toolbar select { flex: 1; }
        .toolbar button { white-space: nowrap; }
        .product-list, .order-list { display: grid; gap: 10px; }
        .product, .order { border: 1px solid #e2e8f0; border-radius: 14px; padding: 12px; background: #fff; }
        .product { display: grid; grid-template-columns: 84px minmax(0, 1fr) auto; gap: 14px; align-items: center; }
        .product:hover { border-color: #a7f3d0; box-shadow: 0 4px 14px #0f172a0d; }
        .product.is-hidden { opacity: .72; background: #f8fafc; }
        .product img, .product .no-img { width: 84px; height: 84px; border-radius: 12px; background: #f8fafc; border: 1px solid #e2e8f0; object-fit: contain; }
        .product .no-img { display: grid; place-items: center; font-size: 12px; color: #64748b; text-align: center; }
        .product h3 { margin: 0 0 6px; font-size: 15.5px; line-height: 1.5; }
        .chips { display: flex; flex-wrap: wrap; gap: 6px; }
        .chip { display: inline-block; padding: 1px 10px; border-radius: 999px; background: #f1f5f9; color: #334155; font-size: 12.5px; font-weight: 700; }
        .chip.price { background: #ecfdf5; color: #047857; }
        .chip.ok { background: #ecfdf5; color: #047857; }
        .chip.low { background: #fffbeb; color: #b45309; }
        .chip.out, .chip.hide { background: #fef2f2; color: #b91c1c; }
        .muted { color: #64748b; font-size: 13px; }
        .actions { display: flex; flex-direction: column; gap: 6px; align-items: stretch; }
        .actions button, .actions a { text-align: center; white-space: nowrap; }
        .preview-link { color: #047857; font-weight: 700; font-size: 13px; text-decoration: none; }
        .preview-link:hover { text-decoration: underline; }
        .form-actions { display: flex; gap: 8px; position: sticky; bottom: -22px; background: #fff; padding: 12px 0 0; }
        .form-actions button:first-child { flex: 1; }
        .dropzone { display: grid; grid-template-columns: 96px 1fr; gap: 14px; align-items: center; border: 2px dashed #a7f3d0; border-radius: 14px; padding: 12px; background: #f0fdf4; }
        .thumb { width: 96px; height: 96px; border-radius: 12px; background: #fff; border: 1px solid #e2e8f0; display: grid; place-items: center; overflow: hidden; }
        .thumb img { width: 100%; height: 100%; object-fit: contain; }
        .thumb .ph { font-size: 12px; color: #64748b; text-align: center; padding: 4px; }
        .thumb img:not([hidden]) + .ph { display: none; }
        .dropzone .help { font-size: 12.5px; color: #475569; margin: 6px 0 0; }
        .sr-file { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
        details.adv { margin-top: 10px; }
        details.adv summary { cursor: pointer; font-size: 13px; font-weight: 700; color: #475569; }
        .login-steps { margin: 14px 0; padding: 14px 32px 14px 14px; border-radius: 10px; background: #ecfdf5; color: #065f46; line-height: 1.8; }
        .order-top { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
        .order h3 { margin: 0 0 4px; }
        .order select { width: auto; min-width: 170px; }
        .tabs { display: inline-flex; gap: 6px; padding: 4px; background: #e2e8f0; border-radius: 12px; margin: 0 0 18px; }
        .tabs button { background: transparent; color: #334155; padding: 8px 20px; }
        .tabs button.active { background: #fff; color: #064e3b; box-shadow: 0 1px 4px #0f172a1a; }
        #notice { position: sticky; top: 72px; z-index: 20; margin: 0 0 14px; padding: 11px 16px; border-radius: 12px; font-weight: 700; font-size: 14px; box-shadow: 0 6px 18px #0f172a14; }
        #notice:empty { display: none; }
        #notice.error { color: #991b1b; background: #fee2e2; border: 1px solid #fecaca; }
        #notice.success { color: #065f46; background: #d1fae5; border: 1px solid #a7f3d0; }
        .hint { padding: 12px; border-radius: 10px; color: #854d0e; background: #fef3c7; font-size: 13px; margin-bottom: 14px; }
        [hidden] { display: none !important; }
        @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } .form-card { position: static; max-height: none; } }
        @media (max-width: 540px) { .product { grid-template-columns: 64px minmax(0, 1fr); } .product img, .product .no-img { width: 64px; height: 64px; } .product .actions { grid-column: 1 / -1; flex-direction: row; } .product .actions > * { flex: 1; } .row2 { grid-template-columns: 1fr; } }
    </style>
</head>
<body>
    <main>
        <div id="notice" role="status" aria-live="polite"></div>
        <div id="setupNotice" class="hint" hidden></div>
        <section id="loginSection" class="card login-card">
            <h1>دخول الإدارة</h1>
            <p>اكتب بريدك الإلكتروني وسيصلك رمز من 6 أرقام لتدخل به.</p>
            <form id="emailForm"><div class="field"><label for="ecMail">البريد الإلكتروني</label><input id="ecMail" type="email" autocomplete="email" required></div>
                <div class="field" id="ecCodeField" hidden><label for="ecCode">الرمز الذي وصلك على البريد</label><input id="ecCode" inputmode="numeric" pattern="[0-9]{6}" autocomplete="one-time-code" maxlength="6"></div>
                <button id="ecButton" style="width:100%">إرسال الرمز إلى بريدي</button>
            </form>
            <details style="margin-top:18px"><summary>الدخول بكلمة المرور وتطبيق المصادقة</summary>
            <form id="loginForm"><div class="field"><label for="email">البريد الإلكتروني</label><input id="email" type="email" autocomplete="username" required></div><div class="field"><label for="mfaCode">رمز التحقق</label><input id="mfaCode" inputmode="numeric" pattern="[0-9]{6}" autocomplete="one-time-code" required></div>
                <div class="field"><label for="password">كلمة مرور الإدارة</label><input id="password" type="password" autocomplete="current-password" required></div>
                <button id="loginButton" style="width:100%">دخول آمن</button>
            </form></details>
        </section>
        <section id="adminSection" hidden>
            <div class="page-head">
                <div><h1>المنتجات والطلبات</h1><p>أضف المنتجات وعدّل الأسعار والصور، وتابع حالة الطلبات.</p></div>
                <button id="logoutButton" class="secondary" hidden>تسجيل الخروج</button>
            </div>
            <div class="tabs" role="tablist">
                <button type="button" class="active" data-tab="products">المنتجات والأسعار</button>
                <button type="button" data-tab="orders">الطلبات</button>
            </div>
            <section id="productsTab">
                <div class="kpis" aria-label="ملخص الكتالوج">
                    <div class="kpi"><span>كل المنتجات</span><strong id="kTotal">—</strong></div>
                    <div class="kpi"><span>ظاهرة في المتجر</span><strong id="kVisible">—</strong></div>
                    <div class="kpi"><span>مخفية</span><strong id="kHidden">—</strong></div>
                    <div class="kpi warn"><span>بدون صورة</span><strong id="kNoImage">—</strong></div>
                    <div class="kpi warn"><span>مخزون منخفض</span><strong id="kLow">—</strong></div>
                </div>
                <div class="grid">
                    <section class="card">
                        <h2>كتالوج المنتجات</h2>
                        <div class="toolbar"><input id="productSearch" type="search" placeholder="ابحث باسم المنتج أو التصنيف" aria-label="بحث في المنتجات"><button id="refreshProducts" type="button" class="secondary">تحديث</button></div>
                        <div id="productList" class="product-list"></div>
                    </section>
                    <form id="productForm" class="card form-card">
                        <h2 id="formTitle" style="margin-bottom:12px">إضافة منتج</h2>
                        <input id="productId" type="hidden">
                        <fieldset><legend>1. المعلومات الأساسية</legend>
                            <div class="field"><label for="name">اسم المنتج *</label><input id="name" maxlength="160" required></div>
                            <div class="row2">
                                <div class="field"><label for="brand">العلامة التجارية</label><input id="brand" maxlength="80"></div>
                                <div class="field"><label for="category">التصنيف *</label><select id="category" required>${categoryOptions}</select></div>
                            </div>
                            <div class="field"><label for="description">الوصف</label><textarea id="description" maxlength="1000"></textarea></div>
                        </fieldset>
                        <fieldset><legend>2. السعر والتعبئة</legend>
                            <div class="row2">
                                <div class="field"><label for="price">السعر بالجنيه *</label><input id="price" type="number" min="0" step="0.01" required></div>
                                <div class="field"><label for="unit">الوحدة</label><input id="unit" maxlength="80" placeholder="مثال: عبوة 20 قطعة"></div>
                            </div>
                            <div class="row2">
                                <div class="field"><label for="carton">عدد القطع بالكرتونة</label><input id="carton" type="number" min="1" step="1"></div>
                                <div class="field"><label for="variants">الأنواع/الروائح</label><input id="variants" maxlength="500" placeholder="افصل بينها بفاصلة"></div>
                            </div>
                        </fieldset>
                        <fieldset><legend>3. صورة المنتج</legend>
                            <div class="dropzone">
                                <div class="thumb"><img id="imagePreview" alt="معاينة صورة المنتج" hidden><span class="ph">لا توجد صورة</span></div>
                                <div>
                                    <button id="uploadButton" type="button" class="ghost">اختيار صورة</button>
                                    <input id="imageFile" class="sr-file" type="file" accept="image/jpeg,image/png,image/webp" tabindex="-1" aria-label="ملف الصورة">
                                    <p class="help">JPG أو PNG أو WebP حتى 4MB. تُرفع الصورة فور اختيارها، ثم اضغط «حفظ المنتج».</p>
                                </div>
                            </div>
                            <details class="adv"><summary>أو استخدم رابط صورة</summary>
                                <div class="field"><label for="imageUrl">رابط الصورة</label><input id="imageUrl" type="text" maxlength="2048" placeholder="رابط https أو مسار /assets/store-products/..."></div>
                            </details>
                        </fieldset>
                        <fieldset><legend>4. الظهور</legend>
                            <label><input id="active" type="checkbox" checked> المنتج ظاهر في المتجر</label>
                        </fieldset>
                        <div class="form-actions"><button id="saveButton">حفظ المنتج</button><button id="resetButton" type="button" class="secondary">إلغاء</button></div>
                    </form>
                </div>
            </section>
            <section id="ordersTab" hidden>
                <div class="card"><h2>إدارة الطلبات</h2><p class="muted">راجع بيانات التوصيل وحدّث حالة الطلب. لا تُعرض بيانات العملاء إلا للمسؤول المسجل دخوله.</p><div class="toolbar"><select id="orderStatusFilter" aria-label="تصفية الطلبات"><option value="all">كل الحالات</option><option value="pending">قيد المراجعة</option><option value="confirmed">تم التأكيد</option><option value="shipped">تم الشحن</option><option value="delivered">تم التسليم</option><option value="cancelled">ملغي</option></select><button id="refreshOrders" type="button" class="secondary">تحديث الطلبات</button></div><div id="orderList" class="order-list"></div></div>
            </section>
        </section>
    </main>
    <script>
        const categories = ${JSON.stringify(Object.fromEntries(Object.entries(categories).map(([id, category]) => [id, category.name])))};
        const statusNames = { pending: 'قيد المراجعة', confirmed: 'تم التأكيد', shipped: 'تم الشحن', delivered: 'تم التسليم', cancelled: 'ملغي', delivery_failed: 'تعذر التسليم', returned: 'مرتجع' };
        let products = [];
        let csrf = "";
        const notice = document.getElementById('notice');

        async function api(url, options = {}) {
            const response = await fetch(url, { credentials: 'same-origin', ...options, headers: { ...options.headers, 'X-CSRF-Token': csrf } });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || 'تعذر إكمال العملية.');
            return data;
        }

        function showNotice(text, type = 'success') {
            notice.textContent = text;
            notice.className = type;
        }

        function makeElement(tag, text, className) {
            const element = document.createElement(tag);
            if (text !== undefined) element.textContent = text;
            if (className) element.className = className;
            return element;
        }

        async function checkSession() {
            try {
                const session = await api('/api/store/admin/session');
                csrf = session.csrf || "";
                if (session.authenticated) showAdmin(session.staff.role);
                if (!session.configured) {
                    document.getElementById('setupNotice').hidden = false;
                    document.getElementById('setupNotice').textContent = session.setupMessage;
                }
            } catch (error) {
                showNotice(error.message, 'error');
            }
        }

        function showAdmin(role = 'admin') {
            if (role !== 'admin') { window.location.href = '/store/operations'; return; }
            document.getElementById('loginSection').hidden = true;
            document.getElementById('adminSection').hidden = false;
            document.getElementById('logoutButton').hidden = false;
            loadProducts();
            loadOrders();
        }

        let codeSent = false;
        document.getElementById('emailForm').addEventListener('submit', async event => {
            event.preventDefault();
            const button = document.getElementById('ecButton');
            button.disabled = true;
            try {
                const email = document.getElementById('ecMail').value;
                if (!codeSent) {
                    await api('/api/store/admin/login/code', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
                    codeSent = true;
                    document.getElementById('ecCodeField').hidden = false;
                    document.getElementById('ecCode').required = true;
                    document.getElementById('ecCode').focus();
                    button.textContent = 'دخول';
                    showNotice('إن كان البريد مسجلاً فقد أُرسل إليه رمز صالح 10 دقائق.');
                } else {
                    const login = await api('/api/store/admin/login/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, code: document.getElementById('ecCode').value }) });
                    csrf = login.csrf;
                    document.getElementById('ecCode').value = '';
                    await checkSession();
                    showNotice('تم تسجيل الدخول بنجاح.');
                }
            } catch (error) {
                showNotice(error.message, 'error');
            } finally {
                button.disabled = false;
            }
        });

        document.getElementById('loginForm').addEventListener('submit', async event => {
            event.preventDefault();
            const button = document.getElementById('loginButton');
            button.disabled = true;
            try {
                const login = await api('/api/store/admin/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: document.getElementById('email').value, password: document.getElementById('password').value, code: document.getElementById('mfaCode').value })
                });
                csrf = login.csrf;
                document.getElementById('password').value = '';
                document.getElementById('mfaCode').value = '';
                await checkSession();
                showNotice('تم تسجيل الدخول بنجاح.');
            } catch (error) {
                showNotice(error.message, 'error');
            } finally {
                button.disabled = false;
            }
        });

        document.getElementById('logoutButton').addEventListener('click', async () => {
            await api('/api/store/admin/logout', { method: 'POST' });
            location.reload();
        });

        document.querySelectorAll('[data-tab]').forEach(button => button.addEventListener('click', () => {
            document.querySelectorAll('[data-tab]').forEach(tab => tab.classList.toggle('active', tab === button));
            document.getElementById('productsTab').hidden = button.dataset.tab !== 'products';
            document.getElementById('ordersTab').hidden = button.dataset.tab !== 'orders';
        }));

        function renderProducts() {
            const list = document.getElementById('productList');
            const query = document.getElementById('productSearch').value.trim().toLowerCase();
            list.replaceChildren();
            const filtered = products.filter(product => (product.name + ' ' + (categories[product.category] || '')).toLowerCase().includes(query));
            if (!filtered.length) list.append(makeElement('p', 'لا توجد منتجات مطابقة.', 'muted'));
            filtered.forEach(product => {
                const card = makeElement('article', undefined, 'product' + (product.is_active ? '' : ' is-hidden'));
                let image;
                if (product.image_url) {
                    image = document.createElement('img');
                    image.src = product.image_url;
                    image.alt = product.name;
                    image.loading = 'lazy';
                } else {
                    image = makeElement('div', 'بدون صورة', 'no-img');
                }
                const details = document.createElement('div');
                details.append(makeElement('h3', product.name));
                const chips = makeElement('div', undefined, 'chips');
                chips.append(makeElement('span', categories[product.category] || product.category, 'chip'));
                chips.append(makeElement('span', Number(product.price).toLocaleString('ar-EG') + ' ج.م', 'chip price'));
                const stock = Number(product.available_stock || 0);
                chips.append(makeElement('span', stock <= 0 ? 'نفد المخزون' : stock <= 5 ? 'مخزون منخفض: ' + stock : 'متوفر: ' + stock, 'chip ' + (stock <= 0 ? 'out' : stock <= 5 ? 'low' : 'ok')));
                if (!product.is_active) chips.append(makeElement('span', 'مخفي عن المتجر', 'chip hide'));
                details.append(chips);
                const actions = makeElement('div', undefined, 'actions');
                const preview = makeElement('a', 'صفحة المنتج');
                preview.href = '/store/product/' + encodeURIComponent(product.id);
                preview.target = '_blank';
                preview.rel = 'noopener noreferrer';
                preview.className = 'preview-link';
                const edit = makeElement('button', 'تعديل', 'ghost');
                edit.type = 'button';
                edit.addEventListener('click', () => editProduct(product));
                const toggle = makeElement('button', product.is_active ? 'إخفاء' : 'إظهار', product.is_active ? 'danger' : 'ghost');
                toggle.type = 'button';
                toggle.addEventListener('click', async () => {
                    try {
                        await api('/api/store/admin/products/' + encodeURIComponent(product.id) + '/visibility', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ active: !product.is_active })
                        });
                        await loadProducts();
                        showNotice('تم تحديث ظهور المنتج.');
                    } catch (error) { showNotice(error.message, 'error'); }
                });
                actions.append(preview, edit, toggle);
                card.append(image, details, actions);
                list.append(card);
            });
        }

        async function loadProducts() {
            try {
                const data = await api('/api/store/admin/products');
                products = data.products;
                const set = (id, value) => { document.getElementById(id).textContent = value; };
                set('kTotal', products.length);
                set('kVisible', products.filter(product => product.is_active).length);
                set('kHidden', products.filter(product => !product.is_active).length);
                set('kNoImage', products.filter(product => !product.image_url).length);
                set('kLow', products.filter(product => Number(product.available_stock || 0) <= 5).length);
                renderProducts();
            } catch (error) { showNotice(error.message, 'error'); }
        }

        function resetForm() {
            document.getElementById('productForm').reset();
            document.getElementById('productId').value = '';
            document.getElementById('active').checked = true;
            document.getElementById('formTitle').textContent = 'إضافة منتج';
            document.getElementById('imagePreview').hidden = true;
            document.getElementById('imagePreview').removeAttribute('src');
        }

        function editProduct(product) {
            document.getElementById('productId').value = product.id;
            document.getElementById('name').value = product.name;
            document.getElementById('brand').value = product.brand || '';
            document.getElementById('category').value = product.category;
            document.getElementById('price').value = product.price;
            document.getElementById('unit').value = product.unit || '';
            document.getElementById('carton').value = product.carton || '';
            document.getElementById('variants').value = (product.variants || []).join(', ');
            document.getElementById('description').value = product.desc || '';
            document.getElementById('imageUrl').value = product.image_url || '';
            document.getElementById('active').checked = product.is_active;
            document.getElementById('formTitle').textContent = 'تعديل المنتج';
            const preview = document.getElementById('imagePreview');
            preview.src = product.image_url || '';
            preview.hidden = !product.image_url;
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        document.getElementById('productForm').addEventListener('submit', async event => {
            event.preventDefault();
            const button = document.getElementById('saveButton');
            button.disabled = true;
            // A selected-but-not-uploaded file used to be ignored silently, so the old image stayed.
            if (!(await uploadSelectedImage())) { button.disabled = false; return; }
            const id = document.getElementById('productId').value;
            const product = {
                name: document.getElementById('name').value.trim(),
                brand: document.getElementById('brand').value.trim(),
                category: document.getElementById('category').value,
                price: Number(document.getElementById('price').value),
                unit: document.getElementById('unit').value.trim(),
                carton: document.getElementById('carton').value || null,
                variants: document.getElementById('variants').value.split(',').map(value => value.trim()).filter(Boolean),
                description: document.getElementById('description').value.trim(),
                image_url: document.getElementById('imageUrl').value.trim(),
                is_active: document.getElementById('active').checked
            };
            try {
                const data = await api(id ? '/api/store/admin/products/' + encodeURIComponent(id) : '/api/store/admin/products', {
                    method: id ? 'PUT' : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(product)
                });
                const expected = product.image_url;
                const savedUrl = data.product && data.product.image_url || '';
                resetForm();
                uploadedFile = null;
                await loadProducts();
                if (expected && savedUrl !== expected) showNotice('تم حفظ المنتج لكن الصورة لم تُثبَّت. أعد المحاولة.', 'error');
                else showNotice((data.message || 'تم حفظ المنتج.') + (expected ? ' وتم تثبيت الصورة.' : ''));
            } catch (error) { showNotice(error.message, 'error'); }
            finally { button.disabled = false; }
        });

        document.getElementById('resetButton').addEventListener('click', resetForm);
        document.getElementById('productSearch').addEventListener('input', renderProducts);
        document.getElementById('refreshProducts').addEventListener('click', loadProducts);
        document.getElementById('refreshOrders').addEventListener('click', loadOrders);
        document.getElementById('orderStatusFilter').addEventListener('change', loadOrders);

        // Uploads the chosen file once; returns true when imageUrl holds the new image.
        let uploadedFile = null;
        async function uploadSelectedImage() {
            const input = document.getElementById('imageFile');
            const file = input.files[0];
            if (!file) return true;
            if (uploadedFile === file) return true;
            const button = document.getElementById('uploadButton');
            button.disabled = true;
            button.textContent = 'جارٍ رفع الصورة…';
            try {
                const formData = new FormData();
                formData.append('image', file);
                const data = await api('/api/store/admin/images', { method: 'POST', body: formData });
                document.getElementById('imageUrl').value = data.url;
                const preview = document.getElementById('imagePreview');
                preview.src = data.url;
                preview.hidden = false;
                uploadedFile = file;
                showNotice('تم رفع الصورة. اضغط «حفظ المنتج» لتثبيتها في الكتالوج.');
                return true;
            } catch (error) {
                showNotice('فشل رفع الصورة، لم يُحفظ أي تغيير: ' + error.message, 'error');
                return false;
            } finally { button.disabled = false; button.textContent = 'اختيار صورة'; }
        }
        // The button opens the file picker; choosing a file uploads it right away.
        document.getElementById('uploadButton').addEventListener('click', () => document.getElementById('imageFile').click());
        document.getElementById('imageFile').addEventListener('change', () => {
            uploadedFile = null;
            if (document.getElementById('imageFile').files[0]) uploadSelectedImage();
        });

        async function loadOrders() {
            const list = document.getElementById('orderList');
            try {
                const status = document.getElementById('orderStatusFilter').value;
                const data = await api('/api/store/admin/orders?status=' + encodeURIComponent(status));
                list.replaceChildren();
                if (!data.orders.length) return list.append(makeElement('p', 'لا توجد طلبات حتى الآن.', 'muted'));
                data.orders.forEach(order => {
                    const card = makeElement('article', undefined, 'order');
                    const top = makeElement('div', undefined, 'order-top');
                    const heading = document.createElement('div');
                    heading.append(makeElement('h3', order.order_number));
                    heading.append(makeElement('div', order.customer_name + ' • ' + order.customer_phone, 'muted'));
                    heading.append(makeElement('div', order.customer_address, 'muted'));
                    top.append(heading, makeElement('strong', Number(order.total).toFixed(2) + ' ج.م'));
                    const select = document.createElement('select');
                    Object.entries(statusNames).forEach(([value, label]) => {
                        const option = document.createElement('option');
                        option.value = value;
                        option.textContent = label;
                        option.selected = order.status === value;
                        select.append(option);
                    });
                    select.addEventListener('change', async () => {
                        try {
                            await api('/api/store/admin/orders/' + encodeURIComponent(order.order_number), {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ status: select.value })
                            });
                            showNotice('تم تحديث حالة الطلب.');
                        } catch (error) { showNotice(error.message, 'error'); }
                    });
                    const itemNames = order.items.map(item => item.name + ' × ' + item.quantity).join('، ');
                    card.append(top, makeElement('div', itemNames, 'muted'), makeElement('div', 'تاريخ الطلب: ' + order.created_at, 'muted'), makeElement('div', 'العنوان: ' + order.customer_address, 'muted'), makeElement('div', 'ملاحظات: ' + (order.notes || 'لا توجد ملاحظات'), 'muted'));
                    card.append(select);
                    list.append(card);
                });
            } catch (error) { showNotice(error.message, 'error'); }
        }

        checkSession();
    </script>
</body>
</html>`;
}

module.exports = { getStoreAdminHtml };
