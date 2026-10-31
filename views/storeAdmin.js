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
        body { margin: 0; min-height: 100vh; background: #f1f5f9; color: #0f172a; font-family: 'Cairo', sans-serif; }
        header { padding: 18px 24px; color: white; background: linear-gradient(135deg, #022c22, #047857); }
        header nav, main { width: min(1200px, calc(100% - 32px)); margin: auto; }
        header nav { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
        header a { color: #d1fae5; text-decoration: none; }
        .admin-brand { display: flex; align-items: center; gap: 10px; }
        .admin-brand img { width: 76px; height: 54px; object-fit: contain; background: #fff; border-radius: 9px; }
        main { padding: 28px 0 56px; }
        h1, h2 { color: #064e3b; }
        .card { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 22px; box-shadow: 0 8px 24px #0f172a0a; }
        .login-card { max-width: 460px; margin: 60px auto; }
        .grid { display: grid; grid-template-columns: minmax(280px, .8fr) minmax(0, 1.4fr); gap: 20px; align-items: start; }
        .field { margin: 12px 0; }
        label { display: block; margin-bottom: 5px; font-size: 14px; font-weight: 700; }
        input, select, textarea, button { width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 9px; font: inherit; }
        textarea { resize: vertical; min-height: 74px; }
        input[type="checkbox"] { width: auto; }
        button { cursor: pointer; border: 0; color: white; background: #047857; font-weight: 800; }
        button:disabled { opacity: .6; cursor: wait; }
        .secondary { background: #475569; }
        .danger { background: #b91c1c; }
        .toolbar { display: flex; gap: 10px; align-items: center; margin: 16px 0; }
        .toolbar input { flex: 1; }
        .product-list, .order-list { display: grid; gap: 12px; }
        .product, .order { border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; display: grid; gap: 12px; }
        .product { grid-template-columns: 76px minmax(0, 1fr) auto; align-items: center; }
        .product img { width: 76px; height: 76px; object-fit: cover; border-radius: 10px; background: #ecfdf5; }
        .product h3, .order h3 { margin: 0 0 4px; color: #064e3b; }
        .muted { color: #64748b; font-size: 13px; }
        .actions { display: flex; gap: 8px; }
        .actions button { width: auto; padding: 8px 12px; }
        .order-top { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
        .order select { width: auto; min-width: 170px; }
        .tabs { display: flex; gap: 10px; margin: 22px 0 16px; }
        .tabs button { width: auto; padding: 9px 18px; background: #d1fae5; color: #064e3b; }
        .tabs button.active { background: #047857; color: white; }
        #notice { margin: 14px 0; padding: 10px 14px; border-radius: 9px; }
        #notice:empty { display: none; }
        #notice.error { color: #991b1b; background: #fee2e2; }
        #notice.success { color: #065f46; background: #d1fae5; }
        .preview { max-width: 120px; max-height: 100px; display: block; margin-top: 8px; border-radius: 8px; }
        .hint { padding: 12px; border-radius: 10px; color: #854d0e; background: #fef3c7; font-size: 13px; }
        [hidden] { display: none !important; }
        @media (max-width: 800px) { .grid { grid-template-columns: 1fr; } }
        @media (max-width: 540px) { .product { grid-template-columns: 60px minmax(0, 1fr); } .product img { width: 60px; height: 60px; } .product .actions { grid-column: 1 / -1; } }
    </style>
</head>
<body>
    <header><nav><strong class="admin-brand"><img src="/assets/zomoroda-store-logo.png" alt="شعار متجر الزمردة"><span>إدارة متجر الزمردة</span></strong><span><a href="/store">عرض المتجر</a> <button id="logoutButton" class="secondary" style="width:auto;margin-right:12px;padding:7px 12px" hidden>تسجيل الخروج</button></span></nav></header>
    <main>
        <div id="notice" role="status" aria-live="polite"></div>
        <section id="loginSection" class="card login-card">
            <h1>دخول الإدارة</h1>
            <p class="muted">هذه الصفحة مخصصة لإدارة المنتجات والطلبات.</p>
            <form id="loginForm">
                <div class="field"><label for="password">كلمة مرور الإدارة</label><input id="password" type="password" autocomplete="current-password" required></div>
                <button id="loginButton">دخول آمن</button>
            </form>
        </section>
        <section id="adminSection" hidden>
            <div id="setupNotice" class="hint" hidden></div>
            <div class="tabs">
                <button type="button" class="active" data-tab="products">المنتجات والأسعار</button>
                <button type="button" data-tab="orders">الطلبات</button>
            </div>
            <section id="productsTab">
                <div class="grid">
                    <form id="productForm" class="card">
                        <h2 id="formTitle">إضافة منتج</h2>
                        <input id="productId" type="hidden">
                        <div class="field"><label for="name">اسم المنتج *</label><input id="name" maxlength="160" required></div>
                        <div class="field"><label for="brand">العلامة التجارية</label><input id="brand" maxlength="80"></div>
                        <div class="field"><label for="category">التصنيف *</label><select id="category" required>${categoryOptions}</select></div>
                        <div class="field"><label for="price">السعر بالجنيه *</label><input id="price" type="number" min="0" step="0.01" required></div>
                        <div class="field"><label for="unit">الوحدة</label><input id="unit" maxlength="80"></div>
                        <div class="field"><label for="carton">عدد القطع بالكرتونة</label><input id="carton" type="number" min="1" step="1"></div>
                        <div class="field"><label for="variants">الأنواع/الروائح (افصل بينها بفاصلة)</label><input id="variants" maxlength="500"></div>
                        <div class="field"><label for="description">الوصف</label><textarea id="description" maxlength="1000"></textarea></div>
                        <div class="field"><label for="imageUrl">رابط الصورة</label><input id="imageUrl" type="text" maxlength="2048" placeholder="رابط https أو مسار /assets/store-products/..."></div>
                        <div class="field"><label for="imageFile">رفع صورة جديدة (JPG / PNG / WebP، حتى 4MB)</label><input id="imageFile" type="file" accept="image/jpeg,image/png,image/webp"><button id="uploadButton" type="button" class="secondary" style="margin-top:8px">رفع الصورة</button><img id="imagePreview" class="preview" alt="معاينة صورة المنتج" hidden></div>
                        <div class="field"><label><input id="active" type="checkbox" checked> المنتج ظاهر في المتجر</label></div>
                        <div class="actions"><button id="saveButton">حفظ المنتج</button><button id="resetButton" type="button" class="secondary">إلغاء</button></div>
                    </form>
                    <section class="card">
                        <h2>كتالوج المنتجات</h2>
                        <div class="toolbar"><input id="productSearch" placeholder="ابحث باسم المنتج أو التصنيف"><button id="refreshProducts" type="button" class="secondary" style="width:auto">تحديث</button></div>
                        <div id="productList" class="product-list"></div>
                    </section>
                </div>
            </section>
            <section id="ordersTab" hidden>
                <div class="card"><h2>إدارة الطلبات</h2><p class="muted">راجع بيانات التوصيل وحدّث حالة الطلب. لا تُعرض بيانات العملاء إلا للمسؤول المسجل دخوله.</p><div class="toolbar"><select id="orderStatusFilter"><option value="all">كل الحالات</option><option value="pending">قيد المراجعة</option><option value="confirmed">تم التأكيد</option><option value="shipped">تم الشحن</option><option value="delivered">تم التسليم</option><option value="cancelled">ملغي</option></select><button id="refreshOrders" type="button" class="secondary" style="width:auto">تحديث الطلبات</button></div><div id="orderList" class="order-list"></div></div>
            </section>
        </section>
    </main>
    <script>
        const categories = ${JSON.stringify(Object.fromEntries(Object.entries(categories).map(([id, category]) => [id, category.name])))};
        const statusNames = { pending: 'قيد المراجعة', confirmed: 'تم التأكيد', shipped: 'تم الشحن', delivered: 'تم التسليم', cancelled: 'ملغي' };
        let products = [];
        const notice = document.getElementById('notice');

        async function api(url, options = {}) {
            const response = await fetch(url, { credentials: 'same-origin', ...options });
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
                if (session.authenticated) showAdmin();
                if (!session.configured || !session.imageStorageReady) {
                    document.getElementById('setupNotice').hidden = false;
                    document.getElementById('setupNotice').textContent = session.setupMessage +
                        (session.imageStorageReady ? '' : ' رفع الصور يتطلب إعداد Vercel Blob.');
                }
            } catch (error) {
                showNotice(error.message, 'error');
            }
        }

        function showAdmin() {
            document.getElementById('loginSection').hidden = true;
            document.getElementById('adminSection').hidden = false;
            document.getElementById('logoutButton').hidden = false;
            loadProducts();
            loadOrders();
        }

        document.getElementById('loginForm').addEventListener('submit', async event => {
            event.preventDefault();
            const button = document.getElementById('loginButton');
            button.disabled = true;
            try {
                await api('/api/store/admin/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: document.getElementById('password').value })
                });
                document.getElementById('password').value = '';
                showAdmin();
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
                const card = makeElement('article', undefined, 'product');
                const image = document.createElement('img');
                image.src = product.image_url || '';
                image.alt = product.name;
                image.hidden = !product.image_url;
                const details = document.createElement('div');
                details.append(makeElement('h3', product.name));
                details.append(makeElement('div', (categories[product.category] || product.category) + ' • ' + product.price + ' ج.م', 'muted'));
                details.append(makeElement('div', product.is_active ? 'ظاهر في المتجر' : 'مخفي', 'muted'));
                const actions = makeElement('div', undefined, 'actions');
                const edit = makeElement('button', 'تعديل');
                edit.type = 'button';
                edit.addEventListener('click', () => editProduct(product));
                const toggle = makeElement('button', product.is_active ? 'إخفاء' : 'إظهار', product.is_active ? 'danger' : '');
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
                actions.append(edit, toggle);
                card.append(image, details, actions);
                list.append(card);
            });
        }

        async function loadProducts() {
            try {
                const data = await api('/api/store/admin/products');
                products = data.products;
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
            const button = document.getElementById('saveButton');
            button.disabled = true;
            try {
                const data = await api(id ? '/api/store/admin/products/' + encodeURIComponent(id) : '/api/store/admin/products', {
                    method: id ? 'PUT' : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(product)
                });
                resetForm();
                await loadProducts();
                showNotice(data.message || 'تم حفظ المنتج.');
            } catch (error) { showNotice(error.message, 'error'); }
            finally { button.disabled = false; }
        });

        document.getElementById('resetButton').addEventListener('click', resetForm);
        document.getElementById('productSearch').addEventListener('input', renderProducts);
        document.getElementById('refreshProducts').addEventListener('click', loadProducts);
        document.getElementById('refreshOrders').addEventListener('click', loadOrders);
        document.getElementById('orderStatusFilter').addEventListener('change', loadOrders);

        document.getElementById('uploadButton').addEventListener('click', async () => {
            const file = document.getElementById('imageFile').files[0];
            if (!file) return showNotice('اختر صورة أولاً.', 'error');
            const button = document.getElementById('uploadButton');
            button.disabled = true;
            try {
                const formData = new FormData();
                formData.append('image', file);
                const data = await api('/api/store/admin/images', { method: 'POST', body: formData });
                document.getElementById('imageUrl').value = data.url;
                const preview = document.getElementById('imagePreview');
                preview.src = data.url;
                preview.hidden = false;
                showNotice('تم رفع الصورة. احفظ المنتج لتثبيتها في الكتالوج.');
            } catch (error) { showNotice(error.message, 'error'); }
            finally { button.disabled = false; }
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
