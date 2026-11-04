function getActivityHtml() {
    return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>نشاط الوكلاء | الزمردة</title>
<style>
body{margin:0;background:#f1f5f9}
.ac-head h1,.ac-panel h2{margin:0}.ac-head p{margin:2px 0 0}
.ac-wrap{width:min(1240px,calc(100% - 32px));margin:auto;padding:24px 0 56px;font-family:'Cairo',Tahoma,Arial,sans-serif;color:#0f172a}
.ac-wrap *{box-sizing:border-box;font-family:inherit}
.ac-head{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap;margin-bottom:16px}
.ac-head h1{font-size:26px;font-weight:800;color:#064e3b;line-height:1.3}
.ac-head p{font-size:14px;color:#475569}
.ac-live{display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:700;color:#047857;background:#ecfdf5;border:1px solid #a7f3d0;padding:6px 12px;border-radius:999px}
.ac-live i{width:9px;height:9px;border-radius:50%;background:#10b981;animation:pulse 1.6s infinite}
.ac-live.off{color:#92400e;background:#fffbeb;border-color:#fde68a}.ac-live.off i{background:#f59e0b;animation:none}
@keyframes pulse{50%{opacity:.25}}
.ac-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-bottom:20px}
.ac-kpi{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:16px 18px}
.ac-kpi span{display:block;font-size:13px;color:#475569}.ac-kpi strong{font-size:26px;font-weight:800;color:#064e3b}
.ac-grid{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(260px,1fr);gap:20px;align-items:start}
.ac-panel{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:20px}
.ac-panel h2{font-size:17px;font-weight:800;color:#064e3b;margin-bottom:12px}
.ac-filters{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px}
.ac-filters button{border:1px solid #cbd5e1;background:#fff;color:#334155;border-radius:999px;padding:5px 13px;font-size:13px;font-weight:700;cursor:pointer}
.ac-filters button[aria-pressed=true]{background:#064e3b;color:#fff;border-color:#064e3b}
.ac-feed{display:flex;flex-direction:column;gap:8px}
.ac-item{display:flex;gap:12px;align-items:flex-start;padding:11px 13px;border-radius:12px;background:#f8fafc;border-right:4px solid #94a3b8}
.ac-item.ok{border-right-color:#10b981}.ac-item.warn{border-right-color:#f59e0b}.ac-item.bad{border-right-color:#dc2626;background:#fef2f2}.ac-item.info{border-right-color:#3b82f6}
.ac-icon{font-size:20px;line-height:1.4;flex:none;width:28px;text-align:center}
.ac-text{font-size:14.5px;font-weight:600;overflow-wrap:anywhere}
.ac-meta{font-size:12px;color:#64748b;margin-top:2px}
.ac-cat{display:inline-block;background:#e2e8f0;color:#334155;border-radius:6px;padding:0 7px;margin-inline-start:6px;font-size:11px;font-weight:700}
.ac-agent{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:10px 0;border-bottom:1px solid #eef2f6}
.ac-agent:last-child{border:0}.ac-agent b{font-size:14px}.ac-agent small{display:block;color:#64748b;font-size:12px}
.ac-state{font-size:12px;font-weight:800;padding:3px 10px;border-radius:999px;background:#ecfdf5;color:#047857;white-space:nowrap}
.ac-state.paused{background:#fffbeb;color:#b45309}.ac-state.idle{background:#f1f5f9;color:#64748b}
.ac-empty{text-align:center;padding:22px;color:#475569;background:#f8fafc;border:1px dashed #e2e8f0;border-radius:12px;font-size:14px}
.ac-note{margin-bottom:14px;padding:11px 14px;border:1px solid #d6e5d9;border-radius:12px;background:#edf6ef;color:#315d42;font-size:14px}.ac-note.error{border-color:#f0d4c8;background:#fff2ec;color:#853d25}
@media(max-width:860px){.ac-grid{grid-template-columns:1fr}}
</style>
</head>
<body>
<main class="ac-wrap">
  <div class="ac-head"><div><h1>نشاط الوكلاء</h1><p>تابع لحظياً ما يفعله الوكلاء والفريق: البحث، رسائل واتساب، الحملات، والطلبات. يتجدد تلقائياً كل 8 ثوانٍ.</p></div><span id="live" class="ac-live off"><i></i><span id="liveText">جارٍ الاتصال…</span></span></div>
  <div id="note" class="ac-note" role="status" aria-live="polite">جارٍ تحميل النشاط…</div>
  <section class="ac-kpis" aria-label="مؤشرات اليوم">
    <div class="ac-kpi"><span>رسائل واتساب (آخر 24 ساعة)</span><strong id="kSent">—</strong></div>
    <div class="ac-kpi"><span>عمليات بحث (آخر 24 ساعة)</span><strong id="kSearch">—</strong></div>
    <div class="ac-kpi"><span>وكلاء نشطون</span><strong id="kActive">—</strong></div>
    <div class="ac-kpi"><span>العامل الخلفي</span><strong id="kWorker">—</strong></div>
  </section>
  <div class="ac-grid">
    <section class="ac-panel"><h2>سجل النشاط المباشر</h2>
      <div class="ac-filters" id="filters" role="group" aria-label="تصفية النشاط"></div>
      <div id="feed" class="ac-feed"><div class="ac-empty">جارٍ التحميل…</div></div>
    </section>
    <aside class="ac-panel"><h2>حالة الوكلاء</h2><div id="agents"></div></aside>
  </div>
</main>
<script>
const el = id => document.getElementById(id);
const FILTERS = [['all','الكل'],['whatsapp','واتساب'],['search','البحث'],['agents','الوكلاء'],['marketing','التسويق'],['orders','الطلبات'],['inventory','المخزون'],['catalog','المنتجات'],['staff','الفريق']];
let category = 'all', timer;
function make(tag, text, cls) { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (cls) n.className = cls; return n; }
function ago(ms) {
    if (!ms) return 'لم يعمل بعد';
    const s = Math.round((Date.now() - ms) / 1000);
    if (s < 60) return 'منذ لحظات';
    if (s < 3600) return 'منذ ' + Math.round(s / 60) + ' دقيقة';
    if (s < 86400) return 'منذ ' + Math.round(s / 3600) + ' ساعة';
    return new Date(ms).toLocaleDateString('ar-EG');
}
function renderFilters() {
    const root = el('filters'); root.replaceChildren();
    FILTERS.forEach(([key, label]) => {
        const b = make('button', label); b.type = 'button'; b.setAttribute('aria-pressed', String(key === category));
        b.onclick = () => { category = key; renderFilters(); load(); };
        root.append(b);
    });
}
function renderFeed(entries) {
    const root = el('feed'); root.replaceChildren();
    if (!entries.length) { root.append(make('div', 'لا يوجد نشاط في هذا القسم بعد. سيظهر هنا فور أن يعمل أي وكيل أو موظف.', 'ac-empty')); return; }
    entries.forEach(e => {
        const item = make('article', undefined, 'ac-item ' + e.tone);
        item.append(make('div', e.icon, 'ac-icon'));
        const body = make('div');
        body.append(make('div', e.text, 'ac-text'));
        const meta = make('div', new Date(e.created_at).toLocaleString('ar-EG') + ' · ' + ago(e.created_at), 'ac-meta');
        meta.append(make('span', e.category_label, 'ac-cat'));
        body.append(meta); item.append(body); root.append(item);
    });
}
function renderAgents(agents) {
    const root = el('agents'); root.replaceChildren();
    agents.forEach(a => {
        const row = make('div', undefined, 'ac-agent');
        const info = make('div'); info.append(make('b', a.name), make('small', a.actions_24h ? a.actions_24h + ' إجراء في 24 ساعة · آخر نشاط ' + ago(a.last_at) : 'لا نشاط في آخر 24 ساعة'));
        const state = a.paused ? ['متوقف', 'paused'] : a.actions_24h ? ['نشط', ''] : ['خامل', 'idle'];
        row.append(info, make('span', state[0], 'ac-state ' + state[1])); root.append(row);
    });
}
async function load() {
    try {
        const response = await fetch('/api/v1/admin/activity?limit=80&category=' + encodeURIComponent(category), { credentials: 'same-origin' });
        const data = await response.json().catch(() => ({}));
        if (response.status === 401) { el('note').textContent = 'سجّل الدخول بحساب المدير لعرض النشاط.'; el('note').className = 'ac-note error'; return; }
        if (!response.ok) throw new Error(data.error || 'تعذر تحميل النشاط.');
        el('note').hidden = true;
        el('kSent').textContent = data.stats.sentToday; el('kSearch').textContent = data.stats.searchesToday;
        el('kActive').textContent = data.agents.filter(a => a.actions_24h && !a.paused).length + ' من ' + data.agents.length;
        const age = data.stats.workerHeartbeatAgeMs;
        el('kWorker').textContent = age === null ? 'غير متصل' : age < 120000 ? 'متصل' : 'متأخر';
        renderFeed(data.entries); renderAgents(data.agents);
        el('live').className = 'ac-live'; el('liveText').textContent = 'مباشر · آخر تحديث ' + new Date().toLocaleTimeString('ar-EG');
    } catch (error) {
        el('note').hidden = false; el('note').className = 'ac-note error'; el('note').textContent = error.message;
        el('live').className = 'ac-live off'; el('liveText').textContent = 'انقطع الاتصال';
    }
}
renderFilters(); load();
timer = setInterval(() => { if (!document.hidden) load(); }, 8000);
</script>
</body>
</html>`;
}
module.exports = { getActivityHtml };
