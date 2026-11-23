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
        .form-card { scroll-margin-top: 24px; }
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
        .product h3 { margin: 0 0 6px; font-size: 15.5px; line-height: 1.5; overflow-wrap:anywhere; }
        .chips { display: flex; flex-wrap: wrap; gap: 6px; }
        .chip { display: inline-block; padding: 1px 10px; border-radius: 999px; background: #f1f5f9; color: #334155; font-size: 12.5px; font-weight: 700; }
        .chip.price { background: #ecfdf5; color: #047857; }
        .chip.ok { background: #ecfdf5; color: #047857; }
        .chip.low { background: #fffbeb; color: #b45309; }
        .chip.out, .chip.hide { background: #fef2f2; color: #b91c1c; }
        .stock-detail { margin: 8px 0 0; font-size: 12px; color: #475569; }
        .help { margin: 6px 0; color: #475569; font-size: 12.5px; }
        .catalog-head { display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; }
        .catalog-filters { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px; }
        dialog { width:min(540px, calc(100% - 28px)); max-height:calc(100dvh - 32px); overflow:auto; border:1px solid #cbd5e1; border-radius:18px; padding:24px; color:#0f172a; box-shadow:0 24px 80px #0f172a33; }
        dialog::backdrop { background:#0f172a88; }
        .stock-summary { display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; margin:16px 0; }
        .stock-summary div { background:#f0fdf4; border:1px solid #d1fae5; border-radius:12px; padding:10px; text-align:center; }
        .stock-summary span { display:block; font-size:12px; color:#475569; }
        .stock-summary strong { font-size:22px; color:#065f46; }
        #stockError { color:#991b1b; }
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
        @media (max-width: 540px) { main { width:calc(100% - 20px); } .card { padding:14px; } .product { grid-template-columns: 64px minmax(0, 1fr); } .product img, .product .no-img { width: 64px; height: 64px; } .product .actions { grid-column: 1 / -1; flex-direction: row; flex-wrap:wrap; } .product .actions > * { flex: 1 0 40%; } .row2, .catalog-filters { grid-template-columns: 1fr; } .dropzone { grid-template-columns:72px minmax(0,1fr); gap:10px; } .thumb { width:72px; height:72px; } .toolbar { flex-wrap:wrap; } .toolbar input { min-width:0; } }
        @media (prefers-reduced-motion: reduce) { * { scroll-behavior:auto !important; } }
    </style>
</head>
<body>
    <main>
        <div id="notice" role="status" aria-live="polite"></div>
        <div id="setupNotice" class="hint" hidden></div>
        <section id="loginSection" class="card login-card">
            <h1>دخول الإدارة</h1>
            <p>اكتب بريدك الإلكتروني وكلمة المرور، وهذا كل شيء.</p>
            <form id="pwForm"><div class="field"><label for="pwEmail">البريد الإلكتروني</label><input id="pwEmail" type="email" autocomplete="username" required></div>
                <div class="field"><label for="pwPassword">كلمة المرور</label><input id="pwPassword" type="password" autocomplete="current-password" required></div>
                <button id="pwButton" style="width:100%">دخول</button>
            </form>
            <details style="margin-top:18px"><summary>طرق دخول أخرى (رمز على البريد / تطبيق مصادقة)</summary>
            <form id="emailForm" style="margin-top:12px"><div class="field"><label for="ecMail">البريد الإلكتروني</label><input id="ecMail" type="email" autocomplete="email" required></div>
                <div class="field" id="ecCodeField" hidden><label for="ecCode">الرمز الذي وصلك على البريد</label><input id="ecCode" inputmode="numeric" pattern="[0-9]{6}" autocomplete="one-time-code" maxlength="6"></div>
                <button id="ecButton" style="width:100%">إرسال الرمز إلى بريدي</button>
            </form>
            <p style="margin-top:14px"><b>تطبيق المصادقة:</b></p>
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
                    <div class="kpi warn"><span>مخزون منخفض (1–5)</span><strong id="kLow">—</strong></div>
                    <div class="kpi warn"><span>بدون رصيد متاح</span><strong id="kOut">—</strong></div>
                </div>
                <div class="grid">
                    <section class="card">
                        <div class="catalog-head"><h2>كتالوج المنتجات</h2><button id="newProduct" type="button" class="ghost">إضافة منتج</button></div>
                        <p class="help">عدد القطع بالكرتونة لا يغيّر رصيد المخزون. استخدم «تعديل المخزون» لتسجيل الكمية الفعلية بوحدة بيع المنتج.</p>
                        <div class="toolbar"><input id="productSearch" type="search" placeholder="ابحث باسم المنتج أو التصنيف" aria-label="بحث في المنتجات"><button id="refreshProducts" type="button" class="secondary">تحديث</button></div>
                        <div class="catalog-filters"><select id="categoryFilter" aria-label="تصفية حسب التصنيف"><option value="all">كل التصنيفات</option>${categoryOptions}</select><select id="stockFilter" aria-label="تصفية حسب المخزون والظهور"><option value="all">كل المنتجات</option><option value="available">متاح للبيع</option><option value="out">بدون رصيد متاح</option><option value="low">مخزون منخفض (1–5)</option><option value="hidden">مخفية عن المتجر</option></select></div>
                        <p id="productCount" class="muted" role="status" aria-live="polite"></p>
                        <div id="productList" class="product-list" aria-busy="false"></div>
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
                                <div class="field"><label for="carton">عدد القطع بالكرتونة (تعبئة فقط)</label><input id="carton" type="number" min="1" step="1" aria-describedby="cartonHelp"><p id="cartonHelp" class="help">معلومة عن التعبئة؛ ليست الكمية الموجودة في المخزن.</p></div>
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
                        <div id="formStock" class="hint">المنتج الجديد يبدأ بدون مخزون. بعد حفظه، سجّل الكمية من «تعديل المخزون».</div>
                        <div class="form-actions"><button id="saveButton">حفظ المنتج</button><button id="resetButton" type="button" class="secondary">إلغاء</button></div>
                    </form>
                </div>
            </section>
            <section id="ordersTab" hidden>
                <div class="card"><h2>إدارة الطلبات</h2><p class="muted">راجع بيانات التوصيل وحدّث حالة الطلب. لا تُعرض بيانات العملاء إلا للمسؤول المسجل دخوله.</p><div class="toolbar"><select id="orderStatusFilter" aria-label="تصفية الطلبات"><option value="all">كل الحالات</option><option value="pending">قيد المراجعة</option><option value="confirmed">تم التأكيد</option><option value="shipped">تم الشحن</option><option value="delivered">تم التسليم</option><option value="cancelled">ملغي</option></select><button id="refreshOrders" type="button" class="secondary">تحديث الطلبات</button></div><div id="orderList" class="order-list"></div></div>
            </section>
        </section>
    </main>
    <dialog id="stockDialog" aria-labelledby="stockTitle" aria-describedby="stockHelp">
        <form id="stockForm">
            <h2 id="stockTitle">تعديل المخزون</h2><p id="stockProductName"></p>
            <p id="stockHelp" class="help">أدخل عدد وحدات البيع الفعلية، وليس عدد القطع داخل الكرتونة. مثال: 3 كراتين × 18 رول = إضافة 54 رول إذا كانت وحدة البيع رول.</p>
            <div class="stock-summary"><div><span>الموجود بالمخزن</span><strong id="stockOnHand">—</strong></div><div><span>محجوز للطلبات</span><strong id="stockReserved">—</strong></div><div><span>المتاح للبيع</span><strong id="stockAvailable">—</strong></div></div>
            <div class="field"><label for="stockDelta">الكمية المراد إضافتها أو خصمها *</label><input id="stockDelta" type="number" step="1" min="-1000000" max="1000000" required aria-describedby="stockProjection"><p id="stockProjection" class="help" aria-live="polite">للإضافة اكتب رقماً موجباً، وللخصم اكتب رقماً سالباً.</p></div>
            <div class="field"><label for="stockReason">سبب التعديل *</label><input id="stockReason" minlength="3" maxlength="500" placeholder="مثال: جرد فعلي أو استلام بضاعة" required></div>
            <p id="stockError" role="alert"></p>
            <div class="form-actions"><button id="stockSave">تسجيل حركة المخزون</button><button id="stockCancel" type="button" class="secondary">إلغاء</button></div>
        </form>
    </dialog>
    <script>
        const categories = ${JSON.stringify(Object.fromEntries(Object.entries(categories).map(([id, category]) => [id, category.name])))};
        const statusNames = { pending: 'قيد المراجعة', confirmed: 'تم التأكيد', shipped: 'تم الشحن', delivered: 'تم التسليم', cancelled: 'ملغي', delivery_failed: 'تعذر التسليم', returned: 'مرتجع' };
        let products = [];
        let selectedStockProduct = null;
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

        document.getElementById('pwForm').addEventListener('submit', async event => {
            event.preventDefault();
            const button = document.getElementById('pwButton');
            button.disabled = true;
            try {
                const login = await api('/api/store/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: document.getElementById('pwEmail').value, password: document.getElementById('pwPassword').value }) });
                csrf = login.csrf;
                document.getElementById('pwPassword').value = '';
                await checkSession();
                showNotice('تم تسجيل الدخول بنجاح.');
            } catch (error) {
                showNotice(error.message, 'error');
            } finally {
                button.disabled = false;
            }
        });

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
            const normalize = value => String(value || '').normalize('NFKD').replace(/[\u064b-\u065f\u0670\u0640]/g, '').replace(/[إأآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').toLowerCase().trim();
            const query = normalize(document.getElementById('productSearch').value);
            const category = document.getElementById('categoryFilter').value;
            const filter = document.getElementById('stockFilter').value;
            list.replaceChildren();
            const filtered = products.filter(product => {
                const stock = Number(product.available_stock || 0);
                return normalize(product.name + ' ' + product.brand + ' ' + (categories[product.category] || '')).includes(query)
                    && (category === 'all' || product.category === category)
                    && (filter === 'all' || filter === 'available' && product.is_active && stock > 0 || filter === 'out' && stock <= 0 || filter === 'low' && stock > 0 && stock <= 5 || filter === 'hidden' && !product.is_active);
            });
            document.getElementById('productCount').textContent = 'عرض ' + filtered.length + ' من ' + products.length + ' منتج';
            if (!filtered.length) list.append(makeElement('p', 'لا توجد منتجات مطابقة.', 'muted'));
            filtered.forEach(product => {
                const card = makeElement('article', undefined, 'product' + (product.is_active ? '' : ' is-hidden'));
                let image;
                if (product.image_url) {
                    image = document.createElement('img');
                    image.src = product.image_url;
                    image.alt = product.name;
                    image.loading = 'lazy';
                    image.addEventListener('error', () => image.replaceWith(makeElement('div', 'تعذّر تحميل الصورة', 'no-img')), { once: true });
                } else {
                    image = makeElement('div', 'بدون صورة', 'no-img');
                }
                const details = document.createElement('div');
                details.append(makeElement('h3', product.name));
                const chips = makeElement('div', undefined, 'chips');
                chips.append(makeElement('span', categories[product.category] || product.category, 'chip'));
                chips.append(makeElement('span', Number(product.price).toLocaleString('ar-EG') + ' ج.م', 'chip price'));
                const stock = Number(product.available_stock || 0);
                const stockLabel = stock <= 0 ? (product.stock_reserved > 0 ? 'محجوز بالكامل' : 'بدون رصيد متاح') : stock <= 5 ? 'مخزون منخفض: ' + stock : 'متاح للبيع: ' + stock;
                chips.append(makeElement('span', stockLabel, 'chip ' + (stock <= 0 ? 'out' : stock <= 5 ? 'low' : 'ok')));
                if (product.carton) chips.append(makeElement('span', 'تعبئة الكرتونة: ' + product.carton, 'chip'));
                if (!product.is_active) chips.append(makeElement('span', 'مخفي عن المتجر', 'chip hide'));
                details.append(chips);
                details.append(makeElement('p', 'الموجود: ' + product.stock_on_hand + ' • المحجوز: ' + product.stock_reserved + ' • وحدة البيع: ' + (product.unit || 'قطعة'), 'stock-detail'));
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
                const inventory = makeElement('button', 'تعديل المخزون', 'ghost');
                inventory.type = 'button';
                inventory.setAttribute('aria-label', 'تعديل مخزون ' + product.name);
                inventory.addEventListener('click', () => openStock(product));
                actions.append(preview, edit, inventory, toggle);
                card.append(image, details, actions);
                list.append(card);
            });
        }

        async function loadProducts() {
            const list = document.getElementById('productList');
            const refresh = document.getElementById('refreshProducts');
            list.setAttribute('aria-busy', 'true');
            refresh.disabled = true;
            try {
                const data = await api('/api/store/admin/products');
                products = data.products;
                const set = (id, value) => { document.getElementById(id).textContent = value; };
                set('kTotal', products.length);
                set('kVisible', products.filter(product => product.is_active).length);
                set('kHidden', products.filter(product => !product.is_active).length);
                set('kNoImage', products.filter(product => !product.image_url).length);
                set('kLow', products.filter(product => Number(product.available_stock) > 0 && Number(product.available_stock) <= 5).length);
                set('kOut', products.filter(product => Number(product.available_stock || 0) <= 0).length);
                renderProducts();
                return true;
            } catch (error) { showNotice('تعذّر تحديث الكتالوج: ' + error.message, 'error'); return false; }
            finally { list.setAttribute('aria-busy', 'false'); refresh.disabled = false; }
        }

        function openStock(product) {
            selectedStockProduct = product;
            document.getElementById('stockForm').reset();
            document.getElementById('stockError').textContent = '';
            document.getElementById('stockProductName').textContent = product.name + ' — وحدة البيع: ' + (product.unit || 'قطعة');
            document.getElementById('stockOnHand').textContent = product.stock_on_hand;
            document.getElementById('stockReserved').textContent = product.stock_reserved;
            document.getElementById('stockAvailable').textContent = product.available_stock;
            updateStockProjection();
            document.getElementById('stockDialog').showModal();
        }
        function updateStockProjection() {
            if (!selectedStockProduct) return;
            const input = document.getElementById('stockDelta');
            const delta = Number(input.value);
            const valid = input.value !== '' && Number.isSafeInteger(delta) && delta !== 0 && Math.abs(delta) <= 1000000 && selectedStockProduct.available_stock + delta >= 0;
            input.setCustomValidity(input.value === '' ? '' : valid ? '' : 'أدخل كمية صحيحة غير صفرية، ولا تخصم من الكمية المحجوزة للطلبات.');
            document.getElementById('stockProjection').textContent = valid ? 'بعد التسجيل: الموجود ' + (selectedStockProduct.stock_on_hand + delta) + '، والمتاح للبيع ' + (selectedStockProduct.available_stock + delta) : 'للإضافة اكتب رقماً موجباً، وللخصم اكتب رقماً سالباً. لا يمكن خصم الكمية المحجوزة.';
        }
        document.getElementById('stockDelta').addEventListener('input', updateStockProjection);
        document.getElementById('stockCancel').addEventListener('click', () => document.getElementById('stockDialog').close());
        document.getElementById('stockDialog').addEventListener('cancel', event => { if (document.getElementById('stockSave').disabled) event.preventDefault(); });
        document.getElementById('stockForm').addEventListener('submit', async event => {
            event.preventDefault();
            const product = selectedStockProduct;
            if (!product) return;
            const button = document.getElementById('stockSave');
            if (button.disabled) return;
            button.disabled = true;
            document.getElementById('stockError').textContent = '';
            const payload = { delta: Number(document.getElementById('stockDelta').value), reason: document.getElementById('stockReason').value.trim() };
            const fingerprint = JSON.stringify([product.id, payload]);
            const locked = ['stockDelta', 'stockReason', 'stockCancel'].map(id => document.getElementById(id));
            locked.forEach(element => { element.disabled = true; });
            try {
                let attempt;
                try { attempt = JSON.parse(sessionStorage.getItem('zmr_catalog_stock_attempt')); } catch (_) {}
                if (!attempt || attempt.fingerprint !== fingerprint) {
                    attempt = { fingerprint, key: crypto.randomUUID() };
                    sessionStorage.setItem('zmr_catalog_stock_attempt', JSON.stringify(attempt));
                }
                await api('/api/v1/admin/inventory/' + encodeURIComponent(product.id) + '/adjustments', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': attempt.key }, body: JSON.stringify(payload) });
                sessionStorage.removeItem('zmr_catalog_stock_attempt');
                document.getElementById('stockDialog').close();
                const refreshed = await loadProducts();
                const updated = products.find(item => item.id === product.id);
                if (document.getElementById('productId').value === product.id && updated) updateFormStock(updated);
                showNotice(refreshed ? 'تم تسجيل حركة المخزون وتحديث الكتالوج.' : 'تم تسجيل حركة المخزون، لكن تعذّر تحديث العرض. اضغط «تحديث»؛ لا تكرر الحركة.', refreshed ? 'success' : 'error');
            } catch (error) { document.getElementById('stockError').textContent = error.message + ' إذا انقطع الاتصال، أعد المحاولة بنفس البيانات لتجنب تكرار الحركة.'; }
            finally { button.disabled = false; locked.forEach(element => { element.disabled = false; }); }
        });

        function updateFormStock(product) {
            const box = document.getElementById('formStock');
            box.replaceChildren(makeElement('p', 'المخزون: موجود ' + product.stock_on_hand + ' • محجوز ' + product.stock_reserved + ' • متاح للبيع ' + product.available_stock));
            const button = makeElement('button', 'تعديل المخزون', 'ghost');
            button.type = 'button';
            button.addEventListener('click', () => openStock(product));
            box.append(button);
        }

        function resetForm() {
            document.getElementById('productForm').reset();
            document.getElementById('productId').value = '';
            document.getElementById('active').checked = true;
            document.getElementById('formTitle').textContent = 'إضافة منتج';
            document.getElementById('imagePreview').hidden = true;
            document.getElementById('imagePreview').removeAttribute('src');
            document.getElementById('formStock').textContent = 'المنتج الجديد يبدأ بدون مخزون. بعد حفظه، سجّل الكمية من «تعديل المخزون».';
            uploadedFile = null;
        }

        function editProduct(product) {
            resetForm();
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
            updateFormStock(product);
            document.getElementById('productForm').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
            document.getElementById('name').focus({ preventScroll: true });
        }

        document.getElementById('productForm').addEventListener('submit', async event => {
            event.preventDefault();
            const button = document.getElementById('saveButton');
            if (button.disabled) return;
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
                const refreshed = await loadProducts();
                if (expected && savedUrl !== expected) showNotice('تم حفظ المنتج لكن الصورة لم تُثبَّت. أعد المحاولة.', 'error');
                else if (!refreshed) showNotice('تم حفظ المنتج، لكن تعذّر تحديث القائمة. اضغط «تحديث».', 'error');
                else showNotice((data.message || 'تم حفظ المنتج.') + (expected ? ' وتم تثبيت الصورة.' : ''));
            } catch (error) { showNotice(error.message, 'error'); }
            finally { button.disabled = false; }
        });

        document.getElementById('resetButton').addEventListener('click', resetForm);
        document.getElementById('newProduct').addEventListener('click', () => { resetForm(); document.getElementById('productForm').scrollIntoView({ block: 'start' }); document.getElementById('name').focus({ preventScroll: true }); });
        document.getElementById('categoryFilter').addEventListener('change', renderProducts);
        document.getElementById('stockFilter').addEventListener('change', renderProducts);
        document.getElementById('productSearch').addEventListener('input', renderProducts);
        document.getElementById('refreshProducts').addEventListener('click', loadProducts);
        document.getElementById('refreshOrders').addEventListener('click', loadOrders);
        document.getElementById('orderStatusFilter').addEventListener('change', loadOrders);

        // Uploads the chosen file once; returns true when imageUrl holds the new image.
        let uploadedFile = null;
        let uploadPromise = null;
        async function uploadSelectedImage() {
            if (uploadPromise) {
                const result = await uploadPromise;
                return result ? uploadSelectedImage() : false;
            }
            uploadPromise = performImageUpload();
            try { return await uploadPromise; }
            finally { uploadPromise = null; }
        }
        async function performImageUpload() {
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
                if (input.files[0] !== file) return true; // Editing another product must not inherit a late upload.
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
