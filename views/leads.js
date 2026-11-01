function getLeadsHtml() {
    return `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>العملاء المحتملون | الزمردة</title></head>
<body class="zs-page"><main class="zs-wrap">
<div class="zs-head"><h1>العملاء المحتملون</h1><p>قاعدة جهات الاتصال مع حاجز الـ30 يوماً ومراحل المحادثة. لا شيء يُرسل من هذه الصفحة؛ كل الردود مسودات.</p></div>
<div id="note" class="zs-note" role="status" aria-live="polite">جارٍ التحميل…</div>
<section class="zs-kpis" aria-label="ملخص">
<div class="zs-kpi"><span>إجمالي جهات الاتصال</span><strong id="k-total">—</strong></div>
<div class="zs-kpi"><span>متاحة للمراسلة الآن</span><strong id="k-available">—</strong></div>
<div class="zs-kpi"><span>داخل فترة الـ30 يوماً</span><strong id="k-blocked">—</strong></div>
<div class="zs-kpi"><span>أقرب موعد إتاحة</span><strong id="k-next" style="font-size:18px">—</strong></div>
</section>
<section class="zs-panel"><h2>القطاعات</h2><p class="zs-sub">كل قطاع بحاجز المراسلة الخاص به.</p>
<div class="zs-scroll"><table class="zs-table"><thead><tr><th>القطاع</th><th>الإجمالي</th><th>متاح الآن</th><th>داخل الـ30 يوماً</th><th>أوقفوا الرسائل</th><th>موعد الإتاحة القادم</th></tr></thead><tbody id="sectors"></tbody></table></div>
<p style="margin-top:12px" id="stages"></p></section>
<div class="zs-grid2">
<section class="zs-panel"><h2>مساعد المبيعات</h2><p class="zs-sub">جرّب رسالة عميل لترى التصنيف والمرحلة وفاتورة مبدئية. المخرج مسودة لمراجعتك فقط.</p>
<form id="sales" class="zs-form"><label for="sid">رقم أو معرّف العميل</label><input id="sid" required maxlength="80" placeholder="01001234567"><label for="smsg">رسالة العميل</label><textarea id="smsg" required maxlength="1000" placeholder="احنا صيدلية في الدقي ومحتاجين 50 رونزا"></textarea><button class="zs-btn" type="submit">إنشاء مسودة الرد</button></form><div id="draft" style="margin-top:12px"></div></section>
<section class="zs-panel"><h2>إضافة جهات اتصال</h2><p class="zs-sub">سطر لكل جهة: الرقم أو الإيميل، ثم الاسم (اختياري)، مفصولين بفاصلة. يُصنَّف القطاع تلقائياً من الاسم.</p>
<form id="add" class="zs-form"><textarea id="rows" required placeholder="01012345678, صيدلية النور&#10;info@hotel.com, فندق الجزيرة"></textarea><button class="zs-btn" type="submit">إضافة</button></form></section>
</div>
<section class="zs-panel"><h2>قائمة العملاء</h2><div class="zs-form" style="grid-template-columns:minmax(0,260px);margin-bottom:12px"><select id="filter" aria-label="تصفية حسب القطاع"></select></div>
<div class="zs-scroll"><table class="zs-table"><thead><tr><th>الاسم</th><th>التواصل</th><th>القطاع</th><th>المرحلة</th><th>آخر مراسلة</th><th>يمكن مراسلته</th></tr></thead><tbody id="list"></tbody></table></div></section>
<section class="zs-panel"><h2>مكتبة الرسائل</h2><p class="zs-sub">الصيغ المعتمدة لكل قطاع. انسخ الصيغة وراجعها قبل أي استخدام.</p>
<div class="zs-form" style="grid-template-columns:minmax(0,260px);margin-bottom:12px"><select id="tplSector" aria-label="قطاع الرسائل"></select></div><div id="templates"></div></section>
</main>
<script>
const $ = id => document.getElementById(id);
const STAGES = { new:'جديد', awaiting_category:'بانتظار تحديد الفئة', welcomed:'أُرسلت الترحيبة', catalog_sent:'أُرسل الكتالوج', prices_sent:'أُرسلت الأسعار', order_inquired:'استفسر عن طلب', ordered:'طلب', opted_out:'أوقف الرسائل' };
const SECTORS = { pharmacies:'الصيدليات والوكلاء', hypermarkets:'الهايبرات وتجار الجملة', distribution:'شركات التوزيع', hotels:'الفنادق', supplies:'الشركات والتوريدات', salon:'الصالونات', moms:'الماميز', retail:'التجزئة', unknown:'غير مصنف' };
const fmt = ms => ms ? new Date(ms).toLocaleDateString('ar-EG') : '—';
let csrf = '';
function note(text, error) { $('note').textContent = text; $('note').classList.toggle('error', Boolean(error)); }
async function api(url, options = {}) {
    const response = await fetch(url, { credentials: 'same-origin', ...options, headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf, ...(options.headers || {}) } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'تعذر تنفيذ الطلب.');
    return data;
}
function cell(row, value) { const td = document.createElement('td'); td.textContent = value; row.append(td); }
function fillSelect(select, withAll) {
    select.replaceChildren();
    if (withAll) { const all = document.createElement('option'); all.value = ''; all.textContent = 'كل القطاعات'; select.append(all); }
    Object.entries(SECTORS).forEach(([key, label]) => { const o = document.createElement('option'); o.value = key; o.textContent = label; select.append(o); });
}
async function loadSummary() {
    const s = await api('/api/v1/admin/leads/summary');
    $('k-total').textContent = s.total;
    $('k-available').textContent = s.sectors.reduce((n, r) => n + r.available, 0);
    $('k-blocked').textContent = s.sectors.reduce((n, r) => n + r.blocked, 0);
    $('k-next').textContent = fmt(s.sectors.map(r => r.nextAvailableAt).filter(Boolean).sort()[0]);
    const body = $('sectors'); body.replaceChildren();
    s.sectors.forEach(r => { const tr = document.createElement('tr'); cell(tr, r.label); cell(tr, r.total); cell(tr, r.available); cell(tr, r.blocked); cell(tr, r.optedOut); cell(tr, fmt(r.nextAvailableAt)); body.append(tr); });
    const stages = $('stages'); stages.replaceChildren();
    Object.entries(s.stages).forEach(([stage, count]) => { const chip = document.createElement('span'); chip.className = 'zs-chip' + (stage === 'opted_out' ? ' warn' : ''); chip.textContent = (STAGES[stage] || stage) + ': ' + count; stages.append(chip); });
}
async function loadList() {
    const d = await api('/api/v1/admin/leads?limit=100' + ($('filter').value ? '&sector=' + encodeURIComponent($('filter').value) : ''));
    const body = $('list'); body.replaceChildren();
    if (!d.leads.length) { const tr = document.createElement('tr'); const td = document.createElement('td'); td.colSpan = 6; td.className = 'zs-empty'; td.textContent = 'لا توجد جهات اتصال.'; tr.append(td); body.append(tr); return; }
    d.leads.forEach(l => { const tr = document.createElement('tr'); cell(tr, l.name || '—'); cell(tr, l.contact); cell(tr, l.sectorLabel); cell(tr, STAGES[l.stage] || l.stage); cell(tr, fmt(l.lastContactAt)); cell(tr, l.optedOut ? 'لا، أوقف الرسائل' : (l.availableAt && l.availableAt > Date.now() ? 'بعد ' + fmt(l.availableAt) : 'نعم')); body.append(tr); });
}
async function loadTemplates() {
    const d = await api('/api/v1/admin/templates?sector=' + encodeURIComponent($('tplSector').value));
    const root = $('templates'); root.replaceChildren();
    if (!d.templates.length) { const e = document.createElement('div'); e.className = 'zs-empty'; e.textContent = 'لا توجد صيغ لهذا القطاع بعد.'; root.append(e); return; }
    d.templates.forEach(t => { const box = document.createElement('div'); box.className = 'zs-tpl'; box.textContent = t.body; root.append(box); });
}
$('sales').onsubmit = async e => {
    e.preventDefault();
    try {
        const d = await api('/api/v1/admin/sales/reply', { method: 'POST', body: JSON.stringify({ senderId: $('sid').value, message: $('smsg').value }) });
        const box = $('draft'); box.replaceChildren();
        const reply = document.createElement('div'); reply.className = 'zs-draft'; reply.textContent = d.reply; box.append(reply);
        const meta = document.createElement('p'); meta.style.marginTop = '8px';
        const chip = document.createElement('span'); chip.className = 'zs-chip'; chip.textContent = 'المرحلة: ' + (STAGES[d.stage] || d.stage); meta.append(chip);
        d.attachments.forEach(a => { const c = document.createElement('span'); c.className = 'zs-chip'; c.textContent = (a.type === 'catalog' ? 'كتالوج: ' : 'أسعار: ') + a.file; meta.append(c); });
        box.append(meta);
        await Promise.all([loadSummary(), loadList()]);
    } catch (error) { note(error.message, true); }
};
$('add').onsubmit = async e => {
    e.preventDefault();
    try {
        const rows = $('rows').value.split(/\\r?\\n/).map(line => line.trim()).filter(Boolean).map(line => { const [contact, ...name] = line.split(','); return { contact: contact.trim(), name: name.join(',').trim() }; });
        const d = await api('/api/v1/admin/leads', { method: 'POST', body: JSON.stringify({ rows }) });
        note('أُضيف ' + d.added + '، ودُمج ' + d.merged + '، ورُفض ' + d.rejected + ' (رقم أو إيميل غير صالح).');
        $('rows').value = '';
        await Promise.all([loadSummary(), loadList()]);
    } catch (error) { note(error.message, true); }
};
$('filter').onchange = () => loadList().catch(e => note(e.message, true));
$('tplSector').onchange = () => loadTemplates().catch(e => note(e.message, true));
(async () => {
    fillSelect($('filter'), true); fillSelect($('tplSector'), false); $('tplSector').value = 'pharmacies';
    try {
        const session = await api('/api/store/admin/session');
        if (!session.authenticated || session.staff.role !== 'admin') { note('هذه الصفحة لحساب المدير. سجّل الدخول من صفحة الحساب.', true); return; }
        csrf = session.csrf || '';
        await Promise.all([loadSummary(), loadList(), loadTemplates()]);
        note('تم تحميل البيانات.');
    } catch (error) { note(error.message, true); }
})();
</script></body></html>`;
}
module.exports = { getLeadsHtml };
