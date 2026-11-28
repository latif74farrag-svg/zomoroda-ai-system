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
        body { margin: 0; min-height: 100vh; display: flex; flex-direction: column; background: #f5f8f5; color: #123e34; font: 15px/1.8 'Cairo', sans-serif; }
        header { padding: 17px 24px; color: #043f32; background: #fff; border-bottom: 1px solid #dce7e0; }
        header nav { width: min(1000px, 100%); margin: auto; display: flex; justify-content: space-between; align-items: center; gap: 16px; }
        .brand { display: flex; align-items: center; gap: 10px; color: inherit; text-decoration: none; font-weight: 800; }
        .brand img { width: 76px; height: 54px; object-fit: contain; background: #fff; border-radius: 9px; }
        header nav > a:last-child { color: #006b50; font-size: 14px; text-underline-offset: 5px; }
        main { width: min(1080px, calc(100% - 40px)); margin: 48px auto 24px; flex: 1; }
        .card { padding: 38px 42px; min-width: 0; background: #fff; }
        .auth-layout { display: grid; grid-template-columns: .9fr 1.1fr; border: 1px solid #dce7e0; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 60px #123e3409; }
        .welcome { padding: 48px 40px; background: #043f32; color: #fff; display: flex; flex-direction: column; justify-content: space-between; gap: 42px; }
        .welcome-mark { width: 46px; height: 40px; color: #d1b775; margin-bottom: 28px; }
        .welcome h1 { color: #fff; font-size: clamp(28px, 3vw, 40px); line-height: 1.6; margin: 0 0 18px; font-weight: 800; }
        .welcome p { color: #c3d9ce; max-width: 32ch; margin: 0; }
        .benefits { padding-top: 24px; border-top: 1px solid #ffffff25; display: grid; gap: 16px; font-size: 14px; }
        .benefits span { color: #d1b775; margin-inline-end: 12px; }
        .card h2 { font-size: 25px; margin-bottom: 8px; }
        h1, h2 { margin-top: 0; color: #064e3b; }
        .muted { color: #5f736b; font-size: 14px; }
        .tabs { display: flex; gap: 4px; margin: 25px 0; padding: 5px; background: #edf5f0; border-radius: 12px; }
        button, input, textarea { width: 100%; min-width: 0; min-height: 50px; padding: 12px 14px; border: 1px solid #bdcfc4; border-radius: 9px; font: inherit; }
        input, textarea { display: block; color: #123e34; background: #fff; }
        input::placeholder, textarea::placeholder { color: #75867e; font-size: 13px; opacity: 1; }
        textarea { min-height: 125px; resize: vertical; }
        button { border: 0; background: #047857; color: #fff; font-weight: 800; cursor: pointer; }
        button:disabled { opacity: .6; cursor: wait; }
        button:hover { background: #043f32; }
        :where(a, button, input, textarea, summary):focus-visible { outline: 3px solid #b88d31; outline-offset: 4px; }
        .tabs button { flex: 1; min-height: 43px; padding: 7px 12px; background: transparent; color: #5f736b; }
        .tabs button.active { background: #fff; color: #043f32; box-shadow: 0 2px 6px #123e3410; }
        label { display: block; margin: 17px 0 7px; font-weight: 700; font-size: 13px; }
        .form-actions { margin-top: 25px; }
        .login-hint { font-size: 12px; color: #5f736b; margin: 8px 0 0; }
        .form-footer { margin: 19px 0 0; text-align: center; font-size: 13px; }
        a { color: #006b50; text-underline-offset: 4px; }
        .help-area { margin-top: 22px; border: 1px solid #dce7e0; border-radius: 16px; background: #fff; padding: 0 26px; }
        .help-area details + details { border-top: 1px solid #dce7e0; }
        summary { cursor: pointer; padding: 20px 0; font-weight: 700; }
        details[open] summary { color: #006b50; }
        .help-content { padding-bottom: 25px; max-width: 600px; }
        .help-content button { margin-top: 19px; width: auto; min-width: 180px; }
        .help-content p { color: #5f736b; font-size: 14px; margin-top: 0; }
        #accountSection { border: 1px solid #dce7e0; border-radius: 20px; }
        #emptyOrders { padding: 26px; border: 1px dashed #bdcfc4; border-radius: 12px; text-align: center; }
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
        @media (max-width: 760px) {
            main { margin-top: 24px; }
            .auth-layout { grid-template-columns: 1fr; }
            .welcome { padding: 28px; gap: 0; }
            .welcome h1 { font-size: 28px; margin-bottom: 8px; }
            .welcome p { max-width: none; }
            .welcome-mark, .benefits { display: none; }
            .card { padding: 28px; }
        }
        @media (max-width: 420px) {
            main { width: calc(100% - 24px); margin-top: 16px; }
            header { padding: 12px 16px; }
            .brand { font-size: 14px; gap: 7px; }
            .brand img { width: 48px; height: 39px; }
            header nav > a:last-child { font-size: 12px; }
            .welcome, .card { padding: 24px 20px; }
            .help-area { padding-inline: 20px; }
            .account-actions { flex-wrap: wrap; }
        }
    </style>
</head>
<body>
    <header><nav>
        <a class="brand" href="/store"><img src="/assets/zomoroda-store-logo.png" alt="شعار متجر الزمردة"><span>متجر الزمردة</span></a>
        <a href="/store">العودة للمتجر</a>
    </nav></header>
    <main>
        <div id="notice" role="status" aria-live="polite"></div>
        <div id="authSection" class="auth-layout">
            <aside class="welcome" aria-labelledby="welcomeTitle">
                <div>
                    <svg class="welcome-mark" viewBox="0 0 48 40" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M10 3h28l8 12-22 23L2 15 10 3Z M2 15h44 M10 3l7 12 7 23 7-23 7-12 M17 15l7-12 7 12"/></svg>
                    <h1 id="welcomeTitle">أهلاً بك في<br>عائلة الزمردة</h1>
                    <p>كل ما تحتاجه للعناية اليومية، وحساب يجمع طلباتك في مكان واحد.</p>
                </div>
                <div class="benefits">
                    <div><span aria-hidden="true">◇</span>تابع طلباتك وتفاصيل مشترياتك</div>
                    <div><span aria-hidden="true">◇</span>تواصل مع خدمة العملاء من حسابك</div>
                </div>
            </aside>
            <section class="card" aria-labelledby="authTitle">
            <h2 id="authTitle">حسابك في الزمردة</h2>
            <p class="muted">سجّل دخولك لمتابعة طلباتك، أو أنشئ حساباً جديداً.</p>
            <div class="tabs">
                <button id="loginTab" type="button" class="active">تسجيل الدخول</button>
                <button id="registerTab" type="button">إنشاء حساب</button>
            </div>
            <form id="loginForm">
                <label for="loginPhone">رقم الهاتف أو البريد الإلكتروني للموظف</label>
                <input id="loginPhone" type="text" autocomplete="username" dir="ltr" placeholder="01012345678 / name@example.com" aria-describedby="loginHint" required>
                <p id="loginHint" class="login-hint">للعملاء: رقم الهاتف · للموظفين: البريد الإلكتروني</p>
                <label for="loginPassword">كلمة المرور</label>
                <input id="loginPassword" type="password" autocomplete="current-password" minlength="8" required>
                <div class="form-actions"><button type="submit">دخول إلى حسابي</button></div>
                <p class="form-footer"><a href="#recovery" id="recoveryLink">نسيت كلمة المرور؟</a></p>
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
            <p class="form-footer muted">تفضّل التسوق أولاً؟ <a href="/store">تصفح المنتجات</a></p>
            </section>
        </div>
        <section id="accountSection" class="card" hidden>
            <div class="account-actions">
                <div><h1>مرحباً <span id="customerName"></span></h1><p class="muted" id="customerPhone"></p></div>
                <button id="logoutButton" type="button">تسجيل الخروج</button>
            </div>
            <h2>طلباتي</h2>
            <p id="emptyOrders" class="muted" hidden>لا توجد طلبات مرتبطة بحسابك حتى الآن.</p>
            <div id="ordersList"></div>
            <p><a href="/store">تابع التسوق</a></p>
        </section>
        <div class="help-area" aria-label="المساعدة والدعم">
            <details id="recovery">
                <summary>استعادة كلمة المرور</summary>
                <div class="help-content">
                    <p>لحسابات العملاء: تواصل مع خدمة العملاء للتحقق من هويتك والحصول على رمز مؤقت، ثم أدخله هنا لتعيين كلمة مرور جديدة.</p>
                    <p>للموظفين: <a href="/store/admin">انتقل إلى صفحة دخول الإدارة</a> لاستخدام خيارات الدخول المتاحة لحسابك.</p>
                    <form id="resetPasswordForm"><label for="resetToken">الرمز المؤقت من خدمة العملاء</label><input id="resetToken" autocomplete="off" required><label for="resetPassword">كلمة مرور جديدة (12 حرفاً على الأقل)</label><input id="resetPassword" type="password" minlength="12" maxlength="128" autocomplete="new-password" required><button>تغيير كلمة المرور</button></form>
                </div>
            </details>
            <details id="support">
                <summary>تحتاج مساعدة؟ تواصل معنا</summary>
                <div class="help-content">
                    <p>اكتب استفسارك وأضف رقم هاتفك أو بريدك الإلكتروني حتى نتمكن من الرد عليك.</p>
                    <form id="supportForm"><label for="supportMessage">رسالتك ووسيلة التواصل المفضلة</label><textarea id="supportMessage" minlength="3" maxlength="2000" placeholder="كيف يمكننا مساعدتك؟" required></textarea><button>إرسال طلب دعم</button></form>
                </div>
            </details>
        </div>
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
                if (endpoint === '/api/store/admin/login') {
                    window.location.href = '/store/admin';
                    return;
                }
                await renderAccount(result.customer);
            } catch (error) {
                showNotice(error.message, 'error');
            } finally {
                button.disabled = false;
            }
        }

        document.getElementById('recoveryLink').addEventListener('click', () => {
            document.getElementById('recovery').open = true;
            document.getElementById('resetToken').focus();
        });
        document.getElementById('loginTab').addEventListener('click', () => switchTab(false));
        document.getElementById('registerTab').addEventListener('click', () => switchTab(true));
        document.getElementById('loginForm').addEventListener('submit', event => {
            const identifier = document.getElementById('loginPhone').value.trim();
            const isStaff = identifier.includes('@');
            return submitAuth(event, isStaff ? '/api/store/admin/login' : '/api/store/customer/login', {
                [isStaff ? 'email' : 'phone']: identifier,
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

        document.getElementById('resetPasswordForm').addEventListener('submit', async event => {
            event.preventDefault();
            try {
                await request('/api/store/customer/password-reset', { method: 'POST', body: JSON.stringify({ token: document.getElementById('resetToken').value.trim(), password: document.getElementById('resetPassword').value }) });
                event.target.reset();
                showNotice('تم تغيير كلمة المرور. يمكنك تسجيل الدخول الآن.', 'success');
            } catch (error) { showNotice(error.message, 'error'); }
        });
        document.getElementById('supportForm').addEventListener('submit', async event => {
            event.preventDefault();
            try {
                const data = await request('/api/v1/support/tickets', { method: 'POST', body: JSON.stringify({ message: document.getElementById('supportMessage').value }) });
                event.target.reset(); showNotice('تم تسجيل طلب الدعم: ' + data.ticketId, 'success');
            } catch (error) { showNotice(error.message, 'error'); }
        });
        loadSession();
    </script>
</body>
</html>`;
}

module.exports = { getStoreAccountHtml };
