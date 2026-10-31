function getStoreAccountHtml() {
    return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>حسابي | متجر الزمردة</title>
    <link rel="icon" type="image/png" href="/assets/zomoroda-store-logo.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; }
        body { margin: 0; min-height: 100vh; display: flex; flex-direction: column; background: #f8fafc; color: #0f172a; font-family: 'Cairo', sans-serif; }
        header { padding: 14px 20px; color: #fff; background: linear-gradient(135deg, #022c22, #047857); }
        header nav { width: min(1000px, 100%); margin: auto; display: flex; justify-content: space-between; align-items: center; gap: 16px; }
        .brand { display: flex; align-items: center; gap: 10px; color: inherit; text-decoration: none; font-weight: 800; }
        .brand img { width: 76px; height: 54px; object-fit: contain; background: #fff; border-radius: 9px; }
        header nav > a:last-child { color: #d1fae5; }
        main { width: min(760px, calc(100% - 32px)); margin: 36px auto; flex: 1; }
        .card { padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background: #fff; box-shadow: 0 8px 24px #0f172a0a; }
        h1, h2 { margin-top: 0; color: #064e3b; }
        .muted { color: #64748b; }
        .tabs { display: flex; gap: 10px; margin: 20px 0; }
        button, input { width: 100%; padding: 11px 13px; border: 1px solid #cbd5e1; border-radius: 9px; font: inherit; }
        button { border: 0; background: #047857; color: #fff; font-weight: 800; cursor: pointer; }
        button:disabled { opacity: .6; cursor: wait; }
        .tabs button { width: auto; padding: 8px 18px; background: #d1fae5; color: #064e3b; }
        .tabs button.active { background: #047857; color: white; }
        label { display: block; margin: 13px 0 5px; font-weight: 700; }
        .form-actions { margin-top: 18px; }
        #notice { margin: 14px 0; padding: 10px 14px; border-radius: 9px; }
        #notice:empty { display: none; }
        #notice.error { color: #991b1b; background: #fee2e2; }
        #notice.success { color: #065f46; background: #d1fae5; }
        .order { margin: 12px 0; padding: 15px; border: 1px solid #e2e8f0; border-radius: 11px; }
        .order-top { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
        .order ul { margin-bottom: 0; }
        .order a { color: #047857; font-weight: 700; }
        .account-actions { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
        .account-actions button { width: auto; padding-inline: 20px; background: #475569; }
        footer { padding: 20px; text-align: center; color: #64748b; }
        [hidden] { display: none !important; }
        @media (max-width: 520px) { .card { padding: 18px; } .brand img { width: 62px; height: 46px; } }
    </style>
</head>
<body>
    <header><nav>
        <a class="brand" href="/store"><img src="/assets/zomoroda-store-logo.png" alt="شعار متجر الزمردة"><span>متجر الزمردة</span></a>
        <a href="/store">العودة للمتجر</a>
    </nav></header>
    <main>
        <div id="notice" role="status" aria-live="polite"></div>
        <section id="authSection" class="card">
            <h1>حساب العميل</h1>
            <p class="muted">أنشئ حساباً لمتابعة طلباتك من مكان واحد. يمكنك إتمام الطلب كضيف أيضاً.</p>
            <p class="muted">لا يتوفر تحقق برسالة نصية أو استعادة كلمة المرور حالياً؛ استخدم رقمك وكلمة مرور يمكنك تذكرها.</p>
            <div class="tabs">
                <button id="loginTab" type="button" class="active">تسجيل الدخول</button>
                <button id="registerTab" type="button">إنشاء حساب</button>
            </div>
            <form id="loginForm">
                <label for="loginPhone">رقم الهاتف</label>
                <input id="loginPhone" type="tel" inputmode="tel" autocomplete="tel" pattern="^(010|011|012|015)[0-9]{8}$" placeholder="01012345678" required>
                <label for="loginPassword">كلمة المرور</label>
                <input id="loginPassword" type="password" autocomplete="current-password" minlength="8" required>
                <div class="form-actions"><button type="submit">دخول إلى حسابي</button></div>
            </form>
            <form id="registerForm" hidden>
                <label for="registerName">الاسم بالكامل</label>
                <input id="registerName" type="text" autocomplete="name" maxlength="120" required>
                <label for="registerPhone">رقم الهاتف</label>
                <input id="registerPhone" type="tel" inputmode="tel" autocomplete="tel" pattern="^(010|011|012|015)[0-9]{8}$" placeholder="01012345678" required>
                <label for="registerPassword">كلمة المرور (8 أحرف على الأقل)</label>
                <input id="registerPassword" type="password" autocomplete="new-password" minlength="8" maxlength="128" required>
                <label for="confirmPassword">تأكيد كلمة المرور</label>
                <input id="confirmPassword" type="password" autocomplete="new-password" minlength="8" maxlength="128" required>
                <div class="form-actions"><button type="submit">إنشاء الحساب</button></div>
            </form>
        </section>
        <section id="accountSection" class="card" hidden>
            <div class="account-actions">
                <div><h1>مرحباً <span id="customerName"></span></h1><p class="muted" id="customerPhone"></p></div>
                <button id="logoutButton" type="button">تسجيل الخروج</button>
            </div>
            <h2>طلباتي</h2>
            <p id="emptyOrders" class="muted" hidden>لا توجد طلبات مرتبطة بحسابك حتى الآن.</p>
            <div id="ordersList"></div>
            <p><a href="/store">تابع التسوق ←</a></p>
        </section>
    </main>
    <footer>متجر الزمردة كوزماتيكس © ${new Date().getFullYear()}</footer>
    <script>
        const notice = document.getElementById('notice');
        const authSection = document.getElementById('authSection');
        const accountSection = document.getElementById('accountSection');

        function showNotice(message, type) {
            notice.textContent = message || '';
            notice.className = type || '';
        }

        async function request(url, options = {}) {
            const response = await fetch(url, {
                ...options,
                headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
            });
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.error || 'تعذر إكمال العملية.');
            return data;
        }

        function showLogin() {
            authSection.hidden = false;
            accountSection.hidden = true;
        }

        async function renderAccount(customer) {
            authSection.hidden = true;
            accountSection.hidden = false;
            document.getElementById('customerName').textContent = customer.name;
            document.getElementById('customerPhone').textContent = customer.phone;
            const result = await request('/api/store/customer/orders');
            const list = document.getElementById('ordersList');
            list.replaceChildren();
            document.getElementById('emptyOrders').hidden = result.orders.length > 0;
            for (const order of result.orders) {
                const card = document.createElement('article');
                card.className = 'order';
                const top = document.createElement('div');
                top.className = 'order-top';
                const number = document.createElement('strong');
                number.textContent = order.order_number;
                const status = document.createElement('span');
                status.textContent = order.status_label;
                top.append(number, status);
                const summary = document.createElement('p');
                summary.textContent = new Date(order.created_at).toLocaleDateString('ar-EG') + ' • ' + Number(order.total).toFixed(2) + ' ج.م';
                const items = document.createElement('ul');
                for (const item of order.items) {
                    const row = document.createElement('li');
                    row.textContent = item.name + ' × ' + item.quantity;
                    items.append(row);
                }
                const track = document.createElement('a');
                track.href = '/store/track?order_number=' + encodeURIComponent(order.order_number);
                track.textContent = 'متابعة حالة الطلب';
                card.append(top, summary, items, track);
                list.append(card);
            }
        }

        async function loadSession() {
            try {
                const result = await request('/api/store/customer/session');
                if (result.authenticated) await renderAccount(result.customer);
            } catch (error) {
                showNotice(error.message, 'error');
            }
        }

        function switchTab(register) {
            document.getElementById('loginForm').hidden = register;
            document.getElementById('registerForm').hidden = !register;
            document.getElementById('loginTab').classList.toggle('active', !register);
            document.getElementById('registerTab').classList.toggle('active', register);
            showNotice('', '');
        }

        async function submitAuth(event, endpoint, payload, button) {
            event.preventDefault();
            button.disabled = true;
            try {
                const result = await request(endpoint, { method: 'POST', body: JSON.stringify(payload) });
                showNotice('', '');
                await renderAccount(result.customer);
            } catch (error) {
                showNotice(error.message, 'error');
            } finally {
                button.disabled = false;
            }
        }

        document.getElementById('loginTab').addEventListener('click', () => switchTab(false));
        document.getElementById('registerTab').addEventListener('click', () => switchTab(true));
        document.getElementById('loginForm').addEventListener('submit', event => {
            submitAuth(event, '/api/store/customer/login', {
                phone: document.getElementById('loginPhone').value,
                password: document.getElementById('loginPassword').value
            }, document.querySelector('#loginForm button[type="submit"]'));
        });
        document.getElementById('registerForm').addEventListener('submit', event => {
            const password = document.getElementById('registerPassword').value;
            const confirmation = document.getElementById('confirmPassword').value;
            if (password !== confirmation) {
                event.preventDefault();
                showNotice('كلمتا المرور غير متطابقتين.', 'error');
                return;
            }
            submitAuth(event, '/api/store/customer/register', {
                name: document.getElementById('registerName').value,
                phone: document.getElementById('registerPhone').value,
                password
            }, document.querySelector('#registerForm button[type="submit"]'));
        });
        document.getElementById('logoutButton').addEventListener('click', async () => {
            try {
                await request('/api/store/customer/logout', { method: 'POST' });
                document.getElementById('loginForm').reset();
                document.getElementById('registerForm').reset();
                showLogin();
                showNotice('تم تسجيل الخروج.', 'success');
            } catch (error) {
                showNotice(error.message, 'error');
            }
        });

        loadSession();
    </script>
</body>
</html>`;
}

module.exports = { getStoreAccountHtml };
