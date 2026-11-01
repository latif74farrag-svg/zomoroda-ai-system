function getUsersHtml() {
    return `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>المستخدمون والأدوار | الزمردة</title></head>
<body class="zs-page"><main class="zs-wrap">
<div class="zs-head"><h1>المستخدمون والأدوار</h1><p>أضف موظفاً بالبريد الإلكتروني فقط؛ يصله رمز دخول على بريده في كل مرة، دون كلمة مرور أو تطبيق مصادقة.</p></div>
<div id="note" class="zs-note" role="status" aria-live="polite">جارٍ التحميل…</div>
<section class="zs-panel"><h2>إضافة مستخدم</h2><p class="zs-sub">المدير: كل الصلاحيات. العمليات: الطلبات والمخزون. الدعم: ردود العملاء فقط.</p>
<form id="add" class="zs-form" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr));align-items:end">
<div><label for="uname">الاسم</label><input id="uname" required minlength="2" maxlength="100"></div>
<div><label for="uemail">البريد الإلكتروني</label><input id="uemail" type="email" required maxlength="254" autocomplete="off"></div>
<div><label for="urole">الدور</label><select id="urole"><option value="admin">مدير</option><option value="operations">عمليات</option><option value="support">دعم</option></select></div>
<div><button class="zs-btn" type="submit">إضافة</button></div></form></section>
<section class="zs-panel"><h2>الحسابات</h2><div class="zs-scroll"><table class="zs-table"><thead><tr><th>الاسم</th><th>البريد</th><th>الدور</th><th>طريقة الدخول</th><th>الحالة</th><th>إجراءات</th></tr></thead><tbody id="list"></tbody></table></div></section>
</main>
<script>
const $ = id => document.getElementById(id);
const ROLES = { admin: 'مدير', operations: 'عمليات', support: 'دعم' };
let csrf = '';
function note(text, error) { $('note').textContent = text; $('note').classList.toggle('error', Boolean(error)); }
async function api(url, options = {}) {
    const response = await fetch(url, { credentials: 'same-origin', ...options, headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf, ...(options.headers || {}) } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'تعذر تنفيذ الطلب.');
    return data;
}
function cell(row, value) { const td = document.createElement('td'); td.append(value); row.append(td); return td; }
async function patch(id, body, done) {
    try { await api('/api/v1/admin/users/' + encodeURIComponent(id), { method: 'PATCH', body: JSON.stringify(body) }); note(done); await load(); }
    catch (error) { note(error.message, true); await load(); }
}
async function load() {
    const d = await api('/api/v1/admin/users');
    const body = $('list'); body.replaceChildren();
    d.users.forEach(user => {
        const self = user.id === d.currentId;
        const tr = document.createElement('tr');
        cell(tr, user.name + (self ? ' (أنت)' : ''));
        cell(tr, user.email).style.direction = 'ltr';
        const select = document.createElement('select');
        Object.entries(ROLES).forEach(([key, label]) => { const o = document.createElement('option'); o.value = key; o.textContent = label; select.append(o); });
        select.value = user.role; select.disabled = self; select.setAttribute('aria-label', 'دور ' + user.name);
        select.onchange = () => patch(user.id, { role: select.value }, 'تم تغيير الدور.');
        cell(tr, select);
        cell(tr, user.loginMode === 'email' ? 'رمز على البريد' : 'كلمة مرور + تطبيق مصادقة');
        const state = document.createElement('span'); state.className = 'zs-chip' + (user.disabled ? ' warn' : ''); state.textContent = user.disabled ? 'معطّل' : 'فعّال';
        cell(tr, state);
        const actions = cell(tr, document.createElement('span'));
        const toggle = document.createElement('button'); toggle.className = 'zs-btn ghost'; toggle.type = 'button'; toggle.disabled = self;
        toggle.textContent = user.disabled ? 'تفعيل' : 'تعطيل';
        toggle.onclick = () => patch(user.id, { disabled: !user.disabled }, user.disabled ? 'تم تفعيل الحساب.' : 'تم تعطيل الحساب.');
        actions.append(toggle);
        if (user.loginMode !== 'email' && !self) {
            const convert = document.createElement('button'); convert.className = 'zs-btn ghost'; convert.type = 'button'; convert.style.marginInlineStart = '6px';
            convert.textContent = 'التحويل للدخول بالبريد';
            convert.onclick = () => { if (confirm('بعد التحويل لن تعمل كلمة المرور وتطبيق المصادقة لهذا الحساب. متابعة؟')) patch(user.id, { login_mode: 'email' }, 'تم التحويل للدخول برمز البريد.'); };
            actions.append(convert);
        }
        body.append(tr);
    });
}
$('add').onsubmit = async event => {
    event.preventDefault();
    try {
        await api('/api/v1/admin/users', { method: 'POST', body: JSON.stringify({ name: $('uname').value, email: $('uemail').value, role: $('urole').value }) });
        note('تمت الإضافة. يمكنه الدخول من صفحة الحساب برمز يصله على بريده.');
        $('add').reset(); await load();
    } catch (error) { note(error.message, true); }
};
(async () => {
    try {
        const session = await api('/api/store/admin/session');
        if (!session.authenticated || session.staff.role !== 'admin') { note('هذه الصفحة لحساب المدير. سجّل الدخول من صفحة الحساب.', true); return; }
        csrf = session.csrf || '';
        await load(); note('تم تحميل الحسابات.');
    } catch (error) { note(error.message, true); }
})();
</script></body></html>`;
}
module.exports = { getUsersHtml };
