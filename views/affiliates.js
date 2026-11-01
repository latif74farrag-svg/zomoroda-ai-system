function getAffiliatesHtml() {
    return `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>الماميز والمندوبات | الزمردة</title></head>
<body class="zs-page"><main class="zs-wrap">
<div class="zs-head"><h1>الماميز والمندوبات</h1><p>تسجيل المندوبات وشجرة الإشراف وحساب العمولات. تُرقّى المشرفة تلقائياً عند ضم <b id="threshold">5</b> مندوبات. المندوبات والسفيرات يُرسل لهن كتالوج المستهلك فقط: <b id="catalog">—</b></p></div>
<div id="note" class="zs-note" role="status" aria-live="polite">جارٍ التحميل…</div>
<section class="zs-kpis">
<div class="zs-kpi"><span>المندوبات المسجلات</span><strong id="k-count">—</strong></div>
<div class="zs-kpi"><span>مشرفات الفرق</span><strong id="k-leaders">—</strong></div>
<div class="zs-kpi"><span>عمولة المندوبة المباشرة</span><strong id="k-direct">—</strong></div>
<div class="zs-kpi"><span>عمولة الإشراف</span><strong id="k-override">—</strong></div>
</section>
<div class="zs-grid2">
<section class="zs-panel"><h2>تسجيل مندوبة</h2><p class="zs-sub">اترك رقم المشرفة فارغاً إن لم تكن تحت إشراف أحد.</p>
<form id="reg" class="zs-form"><label for="rname">الاسم</label><input id="rname" required maxlength="100"><label for="rphone">رقم الواتساب</label><input id="rphone" required inputmode="tel" placeholder="01001234567"><label for="rsup">رقم المشرفة (اختياري)</label><input id="rsup" inputmode="tel"><button class="zs-btn" type="submit">تسجيل</button></form></section>
<section class="zs-panel"><h2>تسجيل عملية بيع</h2><p class="zs-sub">تُحسب العمولة المباشرة وعمولة المشرفة تلقائياً.</p>
<form id="sale" class="zs-form"><label for="sphone">المندوبة</label><select id="sphone" required></select><label for="samount">قيمة البيع بالجنيه</label><input id="samount" type="number" min="1" step="0.01" required><button class="zs-btn" type="submit">تسجيل البيع</button></form></section>
</div>
<section class="zs-panel"><h2>الفريق</h2><div class="zs-scroll"><table class="zs-table"><thead><tr><th>الاسم</th><th>الرتبة</th><th>فريقها</th><th>المبيعات</th><th>العمولات (ج.م)</th></tr></thead><tbody id="list"></tbody></table></div></section>
</main>
<script>
const $ = id => document.getElementById(id);
let csrf = '';
function note(text, error) { $('note').textContent = text; $('note').classList.toggle('error', Boolean(error)); }
async function api(url, options = {}) {
    const response = await fetch(url, { credentials: 'same-origin', ...options, headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf, ...(options.headers || {}) } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'تعذر تنفيذ الطلب.');
    return data;
}
function cell(row, value) { const td = document.createElement('td'); td.textContent = value; row.append(td); }
async function load() {
    const d = await api('/api/v1/admin/affiliates');
    $('threshold').textContent = d.promotionThreshold;
    $('catalog').textContent = d.consumerCatalog;
    $('k-count').textContent = d.affiliates.length;
    $('k-leaders').textContent = d.affiliates.filter(a => a.role === 'team_leader').length;
    $('k-direct').textContent = d.rates.direct + '%';
    $('k-override').textContent = d.rates.override + '%';
    const body = $('list'); body.replaceChildren();
    const select = $('sphone'); select.replaceChildren();
    if (!d.affiliates.length) { const tr = document.createElement('tr'); const td = document.createElement('td'); td.colSpan = 5; td.className = 'zs-empty'; td.textContent = 'لا توجد مندوبات مسجلات بعد.'; tr.append(td); body.append(tr); }
    d.affiliates.forEach(a => {
        const tr = document.createElement('tr');
        cell(tr, a.name); cell(tr, a.role === 'team_leader' ? 'مشرفة فريق' : 'مندوبة'); cell(tr, a.team); cell(tr, a.sales); cell(tr, (a.commissionMinor / 100).toFixed(2));
        body.append(tr);
        const o = document.createElement('option'); o.value = a.phone; o.textContent = a.name + ' (' + a.phone.slice(-4) + ')'; select.append(o);
    });
}
$('reg').onsubmit = async e => {
    e.preventDefault();
    try {
        const d = await api('/api/v1/admin/affiliates', { method: 'POST', body: JSON.stringify({ name: $('rname').value, phone: $('rphone').value, supervisor_phone: $('rsup').value || undefined }) });
        note(d.promotedSupervisor ? 'تم التسجيل وتمت ترقية المشرفة إلى مشرفة فريق.' : 'تم تسجيل المندوبة.');
        $('reg').reset(); await load();
    } catch (error) { note(error.message, true); }
};
$('sale').onsubmit = async e => {
    e.preventDefault();
    try {
        const d = await api('/api/v1/admin/affiliates/sales', { method: 'POST', body: JSON.stringify({ phone: $('sphone').value, amount_minor: Math.round(Number($('samount').value) * 100) }) });
        note('سُجّل البيع. عمولة المندوبة ' + (d.directMinor / 100).toFixed(2) + ' ج.م' + (d.overrideMinor ? ' وعمولة المشرفة ' + (d.overrideMinor / 100).toFixed(2) + ' ج.م.' : '.'));
        $('sale').reset(); await load();
    } catch (error) { note(error.message, true); }
};
(async () => {
    try {
        const session = await api('/api/store/admin/session');
        if (!session.authenticated || session.staff.role !== 'admin') { note('هذه الصفحة لحساب المدير. سجّل الدخول من صفحة الحساب.', true); return; }
        csrf = session.csrf || '';
        await load(); note('تم تحميل البيانات.');
    } catch (error) { note(error.message, true); }
})();
</script></body></html>`;
}
module.exports = { getAffiliatesHtml };
