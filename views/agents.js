// Unified agent management page: control + monitoring in one place. Every state shown here comes from
// GET /api/v1/admin/agents/overview, so the numbers and badges can never contradict another page.
function getAgentsHtml() {
    return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="theme-color" content="#064e3b">
    <title>إدارة الوكلاء | الزمردة</title>
    <style>
        :root{--green:#064e3b;--green2:#047857;--ink:#0f172a;--muted:#475569;--line:#e2e8f0;--bg:#f1f5f9;--white:#fff;--amber:#b45309;--red:#b91c1c;--blue:#1d4ed8}
        *{box-sizing:border-box}
        body{margin:0;background:var(--bg);color:var(--ink);font-family:'Cairo',Tahoma,Arial,sans-serif;line-height:1.7}
        button,input,select{font:inherit}
        a:focus-visible,button:focus-visible,select:focus-visible,input:focus-visible,summary:focus-visible{outline:3px solid #fbbf24;outline-offset:2px}
        main{width:min(1240px,calc(100% - 32px));margin:auto;padding:24px 0 56px}
        .head{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap;margin-bottom:14px}
        h1{margin:0;font-size:26px;font-weight:800;color:var(--green);line-height:1.3}
        h2{margin:0;font-size:18px;font-weight:800;color:var(--green)}
        .sub{margin:3px 0 0;color:var(--muted);font-size:14px}
        .live{display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:700;color:#047857;background:#ecfdf5;border:1px solid #a7f3d0;padding:6px 12px;border-radius:999px}
        .live i{width:9px;height:9px;border-radius:50%;background:#10b981;animation:pulse 1.6s infinite}
        .live.off{color:#92400e;background:#fffbeb;border-color:#fde68a}.live.off i{background:#f59e0b;animation:none}
        @keyframes pulse{50%{opacity:.25}}
        .notice{margin:0 0 14px;padding:11px 14px;border:1px solid #d6e5d9;border-radius:12px;background:#edf6ef;color:#315d42;font-size:14px}
        .notice.error{border-color:#f0d4c8;background:#fff2ec;color:#853d25}
        .master{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;padding:16px 18px;border-radius:16px;border:1px solid #a7f3d0;background:#ecfdf5;margin-bottom:14px}
        .master.stopped{border-color:#fcd34d;background:#fffbeb}
        .master h2{color:inherit;font-size:16px}.master p{margin:2px 0 0;font-size:13.5px;color:var(--muted)}
        .kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:14px}
        .kpi{background:var(--white);border:1px solid var(--line);border-radius:14px;padding:13px 16px}
        .kpi span{display:block;font-size:12.5px;color:var(--muted)}.kpi strong{font-size:24px;font-weight:800;color:var(--green)}
        .kpi.alert strong{color:var(--red)}
        .legend{display:flex;gap:14px;flex-wrap:wrap;font-size:12.5px;color:var(--muted);margin:0 0 14px}
        .tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px;border-bottom:2px solid var(--line)}
        .tab{border:0;background:none;padding:10px 16px;border-radius:10px 10px 0 0;font-weight:800;font-size:14.5px;color:var(--muted);cursor:pointer;border-bottom:3px solid transparent;margin-bottom:-2px}
        .tab[aria-selected=true]{color:var(--green);border-bottom-color:var(--green2);background:#fff}
        .tab .count{display:inline-block;min-width:20px;padding:0 6px;margin-inline-start:6px;border-radius:99px;background:#fef3c7;color:var(--amber);font-size:12px;text-align:center}
        .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:14px}
        .agent{background:var(--white);border:1px solid var(--line);border-radius:16px;padding:16px 18px;border-top:4px solid #cbd5e1}
        .agent.active{border-top-color:#10b981}.agent.ready{border-top-color:#94a3b8}.agent.paused{border-top-color:#f59e0b}.agent.stopped{border-top-color:#f59e0b;opacity:.9}
        .agent-top{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}
        .agent h3{margin:0;font-size:16px;font-weight:800}
        .about{margin:6px 0 10px;font-size:13px;color:var(--muted)}
        .state{font-size:12px;font-weight:800;padding:3px 11px;border-radius:999px;white-space:nowrap}
        .state.active{background:#dcfce7;color:#166534}.state.ready{background:#f1f5f9;color:#475569}.state.paused,.state.stopped{background:#fef3c7;color:var(--amber)}
        .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:8px 0 12px}
        .stat{background:#f8fafc;border-radius:10px;padding:7px 10px;text-align:center}
        .stat b{display:block;font-size:18px;color:var(--green)}.stat small{font-size:11.5px;color:var(--muted)}
        .stat.warn b{color:var(--amber)}.stat.bad b{color:var(--red)}
        .meta{font-size:12.5px;color:var(--muted);margin:0 0 10px}
        .setup{font-size:12.5px;border-radius:8px;padding:6px 10px;margin:0 0 10px}.setup.ok{background:#ecfdf5;color:#166534}.setup.no{background:#fff7ed;color:#9a3412}
        .why{font-size:12.5px;color:var(--amber);background:#fffbeb;border-radius:8px;padding:6px 10px;margin:0 0 10px}
        .row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
        .btn{border:0;border-radius:10px;padding:8px 14px;background:var(--green2);color:#fff;font-weight:800;font-size:13.5px;cursor:pointer}
        .btn:hover{background:var(--green)}
        .btn.secondary{background:#e8f1ec;color:#1f4d3a}.btn.secondary:hover{background:#d5e6dc}
        .btn.warn{background:#fef3c7;color:var(--amber)}.btn.danger{background:#fee2e2;color:var(--red)}
        .btn:disabled{opacity:.5;cursor:not-allowed}
        .pause-form,.settings-form{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;padding-top:10px;border-top:1px solid var(--line)}
        .pause-form input,select{flex:1;min-width:150px;border:1.5px solid #cbd5e1;border-radius:10px;padding:8px 11px;background:#fff;color:var(--ink)}
        .settings-form{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));align-items:end}
        .settings-form h4{grid-column:1/-1;margin:0;color:var(--green);font-size:14px}.settings-field{display:grid;gap:3px}.settings-field label{font-size:12.5px;font-weight:800}.settings-field small{font-size:11.5px;color:var(--muted);line-height:1.45}.settings-field input{width:100%;border:1.5px solid #cbd5e1;border-radius:10px;padding:8px 10px;background:#fff;color:var(--ink)}
        .panel{background:var(--white);border:1px solid var(--line);border-radius:16px;padding:18px}
        .toolbar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:12px}
        .chips{display:flex;gap:6px;flex-wrap:wrap}
        .chip{border:1px solid #cbd5e1;background:#fff;color:#334155;border-radius:999px;padding:4px 13px;font-size:13px;font-weight:700;cursor:pointer}
        .chip[aria-pressed=true]{background:var(--green);color:#fff;border-color:var(--green)}
        .task{margin:10px 0;padding:14px 16px;border:1px solid var(--line);border-radius:14px;background:#fff}
        .task-top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
        .task h3{margin:0;font-size:15px}
        .task-meta{margin-top:4px;color:var(--muted);font-size:12.5px}
        .task-summary{margin:8px 0 0;white-space:pre-wrap;overflow-wrap:anywhere}
        .pill{display:inline-block;padding:3px 10px;border-radius:99px;background:#edf1ee;color:#526259;font-size:12px;font-weight:750;white-space:nowrap}
        .pill.warn{background:#fef3c7;color:var(--amber)}.pill.ready{background:#dcfce7;color:#166534}.pill.bad{background:#fee2e2;color:var(--red)}
        details{margin-top:10px;border-top:1px solid var(--line);padding-top:8px}
        summary{cursor:pointer;color:var(--green2);font-weight:700;font-size:13px}
        .technical{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:10px}
        .technical h4{margin:0 0 4px;font-size:12px;color:var(--muted)}
        pre{max-height:260px;overflow:auto;margin:0;padding:10px;border-radius:9px;background:#f4f7f5;white-space:pre-wrap;overflow-wrap:anywhere;direction:ltr;text-align:left;font:12px/1.6 ui-monospace,Consolas,monospace}
        .feed{display:flex;flex-direction:column;gap:8px}
        .item{display:flex;gap:12px;align-items:flex-start;padding:10px 13px;border-radius:12px;background:#f8fafc;border-right:4px solid #94a3b8}
        .item.ok{border-right-color:#10b981}.item.warn{border-right-color:#f59e0b}.item.bad{border-right-color:#dc2626;background:#fef2f2}.item.info{border-right-color:#3b82f6}
        .item .icon{font-size:19px;flex:none;width:28px;text-align:center}
        .item .text{font-size:14.5px;font-weight:600;overflow-wrap:anywhere}.item .when{font-size:12px;color:#64748b}
        .cat{display:inline-block;background:#e2e8f0;color:#334155;border-radius:6px;padding:0 7px;margin-inline-start:6px;font-size:11px;font-weight:700}
        .empty{text-align:center;padding:22px;color:var(--muted);background:#f8fafc;border:1px dashed var(--line);border-radius:12px;font-size:14px}
        .hidden{display:none!important}
        @media(max-width:600px){.grid{grid-template-columns:1fr}.technical{grid-template-columns:1fr}.stats{grid-template-columns:repeat(3,1fr)}h1{font-size:22px}}
    </style>
</head>
<body>
<main>
    <div class="head">
        <div><h1>إدارة الوكلاء</h1><p class="sub">تحكّم في كل وكيل وتابع نشاطه ومقترحاته من مكان واحد. الوكلاء يقترحون فقط؛ لا ينفذ شيء حساس دون موافقتك.</p></div>
        <span id="live" class="live off"><i></i><span id="liveText">جارٍ الاتصال…</span></span>
    </div>
    <div id="notice" class="notice" role="status" aria-live="polite">جارٍ التحميل…</div>

    <section id="master" class="master" aria-label="التحكم الشامل"></section>

    <section class="kpis" aria-label="ملخص">
        <div class="kpi"><span>وكلاء نشطون (آخر 24 ساعة)</span><strong id="kActive">—</strong></div>
        <div class="kpi"><span>مقترحات بانتظار مراجعتك</span><strong id="kPending">—</strong></div>
        <div class="kpi" id="kFailBox"><span>أخطاء وإجراءات محظورة (24 ساعة)</span><strong id="kFail">—</strong></div>
        <div class="kpi"><span>وكلاء موقوفون</span><strong id="kPaused">—</strong></div>
        <div class="kpi"><span>معالجة المهام</span><strong id="kWorker">—</strong></div>
    </section>
    <div class="panel" style="margin-bottom:14px"><p id="workerDetails" class="sub"></p><button id="runWorker" type="button" class="btn">معالجة المهام الآن</button><p class="sub">يعالج مهمة واحدة والرسائل المعتمدة المؤهلة للإرسال. يمكن إعادة التشغيل بعد دقيقة. الموافقات والإيقاف العام يظلان نافذين.</p></div>
    <p class="legend"><span><b>نشط</b> = نفّذ إجراءً خلال 24 ساعة</span><span><b>جاهز</b> = مفعّل وينتظر مهاماً</span><span><b>موقوف</b> = أوقفته أنت</span><span><b>إيقاف شامل</b> = كل الوكلاء متوقفون</span></p>

    <div class="tabs" role="tablist" aria-label="أقسام الصفحة">
        <button class="tab" role="tab" id="tab-agents" data-tab="agents" aria-selected="true">الوكلاء</button>
        <button class="tab" role="tab" id="tab-tasks" data-tab="tasks" aria-selected="false">المقترحات<span class="count hidden" id="pendingBadge">0</span></button>
        <button class="tab" role="tab" id="tab-activity" data-tab="activity" aria-selected="false">النشاط المباشر</button>
        <button class="tab" role="tab" id="tab-outbox" data-tab="outbox" aria-selected="false">الصادر</button>
        <button class="tab" role="tab" id="tab-queue" data-tab="queue" aria-selected="false">الطابور</button>
    </div>

    <section id="pane-agents"><div id="agentGrid" class="grid"></div></section>

    <section id="pane-tasks" class="panel hidden">
        <div class="toolbar">
            <label for="taskAgent">الوكيل</label><select id="taskAgent"></select>
            <label for="taskFilter">الحالة</label>
            <select id="taskFilter"><option value="all">كل الحالات</option><option value="proposed">بانتظار المراجعة</option><option value="approved">تمت الموافقة</option><option value="executed">تم التنفيذ</option><option value="rejected">مرفوض</option></select>
            <span id="bulk" class="row hidden"><button class="btn" id="approveAll" type="button">موافقة على الكل</button><button class="btn danger" id="rejectAll" type="button">رفض الكل</button></span>
        </div>
        <div id="tasks"></div>
    </section>

    <section id="pane-activity" class="panel hidden">
        <div class="toolbar"><label for="feedAgent">الوكيل</label><select id="feedAgent"></select></div>
        <div id="filters" class="chips" role="group" aria-label="تصفية النشاط" style="margin-bottom:12px"></div>
        <div id="feed" class="feed"></div>
    </section>

    <section id="pane-outbox" class="panel hidden">
        <h2>الرسائل الصادرة</h2>
        <p class="sub">كل رسالة تخرج من هنا فقط بعد موافقتك. يمكنك إلغاء أي رسالة قبل إرسالها. الإرسال يلتزم بمواعيد العمل والفواصل تلقائياً.</p>
        <div class="toolbar"><label for="outboxStatus">الحالة</label><select id="outboxStatus"><option value="">الكل</option><option value="queued">بانتظار الإرسال</option><option value="sent">أُرسلت</option><option value="failed">فشلت</option><option value="cancelled">ملغاة</option></select></div>
        <div id="outbox"></div>
    </section>

    <section id="pane-queue" class="panel hidden">
        <h2>حالة المهام الخلفية</h2>
        <p class="sub" id="jobSummary">جارٍ تحميل حالة الطابور…</p>
        <div id="jobs"></div>
    </section>
</main>
<script>
(function () {
    var csrf = '';
    var overview = null, tasks = [], jobs = [], operations = null;
    var outboxRows = [], outboxStatus = '', tab = 'agents', taskAgent = 'all', taskStatus = 'all', feedAgent = 'all', category = 'all', pauseFormFor = null, settingsFormFor = null;
    var el = function (id) { return document.getElementById(id); };
    var STATE = { active: 'نشط', ready: 'جاهز', paused: 'موقوف', stopped: 'إيقاف شامل' };
    var TASK_STATUS = { proposed: 'بانتظار المراجعة', approved: 'تمت الموافقة — بانتظار التنفيذ', executed: 'تم التنفيذ', rejected: 'مرفوض' };
    var FILTERS = [['all','الكل'],['whatsapp','واتساب'],['search','البحث'],['agents','الوكلاء'],['marketing','التسويق'],['orders','الطلبات'],['inventory','المخزون'],['catalog','المنتجات'],['staff','الفريق']];

    function make(tag, text, cls) { var n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; }
    function setNotice(msg, error) { el('notice').textContent = msg; el('notice').className = 'notice' + (error ? ' error' : ''); }
    async function api(url, method, body) {
        var response = await fetch(url, { method: method || 'GET', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf }, body: body === undefined ? undefined : JSON.stringify(body) });
        var data = await response.json().catch(function () { return {}; });
        if (!response.ok) throw new Error(data.error || ('تعذر تنفيذ الطلب (' + response.status + ').'));
        return data;
    }
    function ago(ms) {
        if (!ms) return 'لم يعمل بعد';
        var s = Math.round((Date.now() - ms) / 1000);
        if (s < 60) return 'منذ لحظات';
        if (s < 3600) return 'منذ ' + Math.round(s / 60) + ' دقيقة';
        if (s < 86400) return 'منذ ' + Math.round(s / 3600) + ' ساعة';
        return new Date(ms).toLocaleDateString('ar-EG');
    }
    function time(v) { var t = Number(v); return t > 0 ? new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(t)) : 'غير متاح'; }
    function parseJson(v) { if (v && typeof v === 'object') return v; try { var p = JSON.parse(v); return p && typeof p === 'object' ? p : {}; } catch (e) { return {}; } }
    function agentName(key) { var a = overview && overview.agents.find(function (x) { return x.key === key; }); return a ? a.name : key; }
    function fillAgentSelect(select, value, onchange) {
        select.replaceChildren();
        var all = make('option', 'كل الوكلاء'); all.value = 'all'; select.append(all);
        overview.agents.forEach(function (a) { var o = make('option', a.name); o.value = a.key; select.append(o); });
        select.value = value; select.onchange = function () { onchange(select.value); };
    }
    // Runs an action, reports the result, then reloads everything so all sections stay consistent.
    async function act(button, fn, okMessage) {
        if (button) button.disabled = true;
        try { var result = await fn(); setNotice((result && result.message) || okMessage || 'تم التنفيذ.'); await loadAll(); }
        catch (error) { setNotice(error.message, true); if (button) button.disabled = false; }
    }

    function renderMaster() {
        var g = overview.global, root = el('master');
        root.replaceChildren(); root.className = 'master' + (g.paused ? ' stopped' : '');
        var text = make('div');
        text.append(make('h2', g.paused ? '⏸ الإيقاف الشامل مفعّل: كل الوكلاء متوقفون' : '▶ الوكلاء يعملون'));
        text.append(make('p', g.paused
            ? 'لا يعالج أي وكيل مهاماً جديدة ولا يرسل واتساب. الطابور محفوظ ولا يُحذف منه شيء.' + (g.paused_reason ? ' السبب: ' + g.paused_reason + '.' : '') + (g.paused_at ? ' منذ ' + ago(g.paused_at) + '.' : '')
            : 'يمكنك إيقاف وكيل بعينه من بطاقته، أو إيقاف الجميع فوراً من هنا.'));
        var button = make('button', g.paused ? 'تشغيل كل الوكلاء' : 'إيقاف الجميع فوراً', 'btn ' + (g.paused ? '' : 'danger'));
        button.type = 'button';
        button.onclick = function () {
            if (!g.paused && !confirm('إيقاف كل الوكلاء الآن؟ لن تُعالج مهام جديدة ولن يُرسل واتساب حتى تعيد التشغيل.')) return;
            act(button, function () { return api('/api/v1/admin/agents/global', 'PATCH', { paused: !g.paused, reason: g.paused ? '' : 'إيقاف طارئ من الصفحة' }); }, g.paused ? 'تم تشغيل الوكلاء.' : 'تم إيقاف جميع الوكلاء.');
        };
        root.append(text, button);
    }
    function renderKpis() {
        var s = overview.summary, age = s.worker_heartbeat_age_ms;
        el('kActive').textContent = s.active + ' من ' + s.total;
        el('kPending').textContent = s.pending_review;
        el('kFail').textContent = s.failures_24h; el('kFailBox').className = 'kpi' + (s.failures_24h ? ' alert' : '');
        el('kPaused').textContent = s.paused;
        el('kWorker').textContent = operations.worker ? operations.worker.label : age === null ? 'غير متصل' : age < 120000 ? 'متصل' : 'متأخر';
        if (operations.worker) {
            var w = operations.worker;
            el('workerDetails').textContent = (w.mode === 'daily' ? 'الجدولة التلقائية مرة يومياً على خطة Hobby. ' : '') + 'آخر دفعة مكتملة: ' + time(w.lastSuccessAt) + ' · آخر تشغيل Cron مكتمل: ' + time(w.lastCronSuccessAt);
        }
        var badge = el('pendingBadge'); badge.textContent = s.pending_review; badge.classList.toggle('hidden', !s.pending_review);
    }
    function stat(value, label, cls) { var d = make('div', undefined, 'stat' + (cls ? ' ' + cls : '')); d.append(make('b', String(value)), make('small', label)); return d; }
    function renderAgents() {
        var root = el('agentGrid'); root.replaceChildren();
        overview.agents.forEach(function (a) {
            var card = make('article', undefined, 'agent ' + a.state);
            var top = make('div', undefined, 'agent-top');
            top.append(make('h3', a.name), make('span', STATE[a.state], 'state ' + a.state));
            card.append(top, make('p', a.about, 'about'));
            if (a.paused && a.paused_reason) card.append(make('p', 'سبب الإيقاف: ' + a.paused_reason + (a.paused_at ? ' · ' + ago(a.paused_at) : ''), 'why'));
            if (a.setup) card.append(make('p', (a.setup.ok ? '✓ ' : '⚠ ') + a.setup.text, 'setup ' + (a.setup.ok ? 'ok' : 'no')));
            var stats = make('div', undefined, 'stats');
            stats.append(stat(a.tasks.proposed, 'بانتظار مراجعتك', a.tasks.proposed ? 'warn' : ''), stat(a.actions_24h, 'إجراءات 24 ساعة'), stat(a.failures_24h, 'أخطاء 24 ساعة', a.failures_24h ? 'bad' : ''));
            card.append(stats, make('p', 'آخر نشاط: ' + ago(a.last_at) + ' · نُفّذ: ' + a.tasks.executed + ' · رُفض: ' + a.tasks.rejected, 'meta'));
            if (a.outbox) card.append(make('p', 'في الصادر: ' + a.outbox.queued + ' · أُرسلت (24 ساعة): ' + a.outbox.sent_24h + ' · فاشلة: ' + a.outbox.failed, 'meta'));
            var row = make('div', undefined, 'row');
            var toggle = make('button', a.paused ? 'تشغيل الوكيل' : 'إيقاف مؤقت', 'btn ' + (a.paused ? '' : 'warn')); toggle.type = 'button';
            toggle.onclick = function () {
                if (a.paused) act(toggle, function () { return api('/api/v1/admin/agents/' + a.key, 'PATCH', { paused: false }); }, 'تم تشغيل ' + a.name + '.');
                else { pauseFormFor = pauseFormFor === a.key ? null : a.key; renderAgents(); }
            };
            row.append(toggle);
            (a.runs || []).forEach(function (option) {
                var run = make('button', option.label, 'btn secondary'); run.type = 'button';
                run.disabled = a.state === 'paused' || a.state === 'stopped'; run.title = run.disabled ? 'شغّل الوكيل أولاً.' : '';
                run.onclick = function () { act(run, function () { return api('/api/v1/admin/agents/' + a.key + '/run', 'POST', { option: option.key }); }); };
                row.append(run);
            });
            var review = make('button', a.tasks.proposed ? 'مراجعة المقترحات (' + a.tasks.proposed + ')' : 'المقترحات', 'btn secondary'); review.type = 'button';
            review.onclick = function () { taskAgent = a.key; taskStatus = a.tasks.proposed ? 'proposed' : 'all'; showTab('tasks'); };
            var feed = make('button', 'نشاطه', 'btn secondary'); feed.type = 'button';
            feed.onclick = function () { feedAgent = a.key; showTab('activity'); };
            var settings = make('button', 'خصائص الوكيل', 'btn secondary'); settings.type = 'button';
            settings.onclick = function () { settingsFormFor = settingsFormFor === a.key ? null : a.key; pauseFormFor = null; renderAgents(); };
            row.append(review, feed, settings); card.append(row);
            if (pauseFormFor === a.key) {
                var form = make('form', undefined, 'pause-form');
                var input = make('input'); input.placeholder = 'سبب الإيقاف (اختياري)'; input.maxLength = 200; input.setAttribute('aria-label', 'سبب الإيقاف');
                var ok = make('button', 'تأكيد الإيقاف', 'btn danger'); ok.type = 'submit';
                form.append(input, ok);
                form.onsubmit = function (e) { e.preventDefault(); pauseFormFor = null; act(ok, function () { return api('/api/v1/admin/agents/' + a.key, 'PATCH', { paused: true, reason: input.value }); }, 'تم إيقاف ' + a.name + '.'); };
                card.append(form); setTimeout(function () { input.focus(); }, 0);
            }
            if (settingsFormFor === a.key) {
                var settingsForm = make('form', undefined, 'settings-form');
                settingsForm.append(make('h4', 'خصائص ' + a.name));
                (a.settings || []).forEach(function (field) {
                    var wrap = make('div', undefined, 'settings-field');
                    var label = make('label', field.label); label.htmlFor = 'setting-' + a.key + '-' + field.key;
                    var input = make('input'); input.id = label.htmlFor; input.name = field.key; input.value = field.value;
                    input.type = field.type === 'hours' ? 'text' : 'number';
                    if (field.type === 'hours') input.placeholder = '10,16,21'; else { input.min = field.min; input.max = field.max; input.step = '1'; }
                    wrap.append(label, input, make('small', field.help || ''));
                    settingsForm.append(wrap);
                });
                var save = make('button', 'حفظ الخصائص', 'btn'); save.type = 'submit'; settingsForm.append(save);
                settingsForm.onsubmit = function (event) {
                    event.preventDefault();
                    var values = {}; (a.settings || []).forEach(function (field) { values[field.key] = settingsForm.elements[field.key].value; });
                    act(save, function () { return api('/api/v1/admin/agents/' + a.key + '/settings', 'PUT', { settings: values }); }, 'تم حفظ خصائص ' + a.name + '.');
                };
                card.append(settingsForm);
            }
            root.append(card);
        });
    }

    function taskCard(task) {
        var proposal = parseJson(task.proposal), evidence = parseJson(task.evidence);
        var box = make('article', undefined, 'task'), top = make('div', undefined, 'task-top'), heading = make('div');
        heading.append(make('h3', proposal.title || agentName(task.agent)), make('div', [agentName(task.agent), time(task.created_at), 'نسخة ' + (task.version || '—')].join(' · '), 'task-meta'));
        top.append(heading, make('span', TASK_STATUS[task.status] || task.status, 'pill' + (task.status === 'proposed' ? ' warn' : task.status === 'executed' ? ' ready' : task.status === 'rejected' ? ' bad' : '')));
        box.append(top);
        var summary = proposal.message || proposal.summary || proposal.text || proposal.title || task.task_key || '';
        if (summary) box.append(make('p', summary, 'task-summary'));
        var details = document.createElement('details'); details.append(make('summary', 'تفاصيل المهمة والأدلة'));
        details.append(make('div', 'المعرّف: ' + task.id + ' · المصدر: ' + (task.source_id || '—') + (task.approved_by ? ' · اعتمدها: ' + task.approved_by : ''), 'task-meta'));
        var tech = make('div', undefined, 'technical'), a = make('div'), b = make('div');
        a.append(make('h4', 'المدخلات / الأدلة'), make('pre', JSON.stringify(evidence, null, 2)));
        b.append(make('h4', 'مخرجات الوكيل'), make('pre', JSON.stringify(proposal, null, 2)));
        tech.append(a, b); details.append(tech); box.append(details);
        if (task.status === 'proposed') {
            var actions = make('div', undefined, 'row'); actions.style.marginTop = '12px';
            [['موافقة', 'approved', ''], ['رفض', 'rejected', 'danger']].forEach(function (d) {
                var button = make('button', d[0], 'btn ' + d[2]); button.type = 'button';
                button.onclick = function () { act(button, function () { return api('/api/v1/admin/agent-tasks/' + encodeURIComponent(task.id) + '/review', 'POST', { decision: d[1] }); }, d[1] === 'approved' ? 'تمت الموافقة.' : 'تم الرفض.'); };
                actions.append(button);
            });
            box.append(actions);
        }
        return box;
    }
    function renderTasks() {
        fillAgentSelect(el('taskAgent'), taskAgent, function (v) { taskAgent = v; renderTasks(); });
        el('taskFilter').value = taskStatus;
        var rows = tasks.filter(function (t) { return (taskAgent === 'all' || t.agent === taskAgent) && (taskStatus === 'all' || t.status === taskStatus); });
        var pending = rows.filter(function (t) { return t.status === 'proposed'; }).length;
        el('bulk').classList.toggle('hidden', taskAgent === 'all' || !pending);
        var root = el('tasks'); root.replaceChildren();
        if (!rows.length) { root.append(make('div', taskStatus === 'proposed' ? 'لا توجد مقترحات بانتظار المراجعة. 🎉' : 'لا توجد مهام مطابقة.', 'empty')); return; }
        rows.forEach(function (t) { root.append(taskCard(t)); });
    }

    function renderFilters() {
        var root = el('filters'); root.replaceChildren();
        FILTERS.forEach(function (f) {
            var b = make('button', f[1], 'chip'); b.type = 'button'; b.setAttribute('aria-pressed', String(f[0] === category));
            b.onclick = function () { category = f[0]; renderFilters(); loadFeed(); };
            root.append(b);
        });
    }
    async function loadFeed() {
        fillAgentSelect(el('feedAgent'), feedAgent, function (v) { feedAgent = v; loadFeed(); });
        var query = '/api/v1/admin/activity?limit=80&category=' + encodeURIComponent(category) + (feedAgent !== 'all' ? '&agent=' + encodeURIComponent(feedAgent) : '');
        var data = await api(query);
        var root = el('feed'); root.replaceChildren();
        if (!data.entries.length) { root.append(make('div', 'لا يوجد نشاط مطابق بعد. سيظهر هنا فور أن يعمل أي وكيل أو موظف.', 'empty')); return; }
        data.entries.forEach(function (e) {
            var item = make('article', undefined, 'item ' + e.tone), body = make('div');
            body.append(make('div', e.text, 'text'));
            var when = make('div', new Date(e.created_at).toLocaleString('ar-EG') + ' · ' + ago(e.created_at), 'when');
            when.append(make('span', e.category_label, 'cat')); body.append(when);
            item.append(make('div', e.icon, 'icon'), body); root.append(item);
        });
    }

    function renderQueue() {
        var age = operations.workerHeartbeatAgeMs;
        el('jobSummary').textContent = (operations.jobs || []).length
            ? operations.jobs.map(function (j) { return j.status + ': ' + j.count; }).join(' · ') + (age === null ? ' · لم تصل نبضة من العامل.' : ' · آخر نبضة منذ ' + Math.max(0, Math.round(age / 1000)) + ' ثانية.')
            : (age === null ? 'لا توجد نبضة من العامل ولا مهام مسجلة.' : 'لا توجد مهام معلقة حالياً. آخر نبضة منذ ' + Math.max(0, Math.round(age / 1000)) + ' ثانية.');
        var root = el('jobs'); root.replaceChildren();
        if (!jobs.length) { root.append(make('div', 'لا توجد مهام معلقة أو فاشلة حالياً.', 'empty')); return; }
        jobs.forEach(function (job) {
            var item = make('article', undefined, 'task'), top = make('div', undefined, 'task-top'), h = make('div');
            h.append(make('h3', job.type), make('div', 'المحاولات: ' + job.attempts + ' · الموعد: ' + time(job.available_at), 'task-meta'));
            top.append(h, make('span', job.status, 'pill' + (job.status === 'dead' ? ' bad' : ''))); item.append(top);
            if (job.last_error) item.append(make('p', 'تفاصيل الخطأ: ' + job.last_error, 'task-meta'));
            if (job.status === 'dead') {
                var retry = make('button', 'إعادة المهمة إلى الطابور', 'btn secondary'); retry.type = 'button'; retry.style.marginTop = '8px';
                retry.onclick = function () { act(retry, function () { return api('/api/v1/admin/jobs/' + encodeURIComponent(job.id) + '/retry', 'POST', {}); }, 'أُعيدت المهمة إلى الطابور.'); };
                item.append(retry);
            }
            root.append(item);
        });
    }

    async function loadOutbox() {
        var data = await api('/api/v1/admin/outbox' + (outboxStatus ? '?status=' + outboxStatus : ''));
        outboxRows = data.messages || [];
        var names = { whatsapp: 'واتساب', email: 'إيميل', messenger: 'ماسنجر', instagram: 'إنستجرام', telegram: 'تليجرام' };
        var labels = { queued: 'بانتظار الإرسال', sending: 'جارٍ الإرسال', sent: 'أُرسلت', failed: 'فشلت', cancelled: 'ملغاة' };
        var root = el('outbox'); root.replaceChildren();
        if (!outboxRows.length) { root.append(make('div', 'لا توجد رسائل صادرة بعد. ستظهر هنا بعد موافقتك على مقترحات المراسلة.', 'empty')); return; }
        outboxRows.forEach(function (m) {
            var box = make('article', undefined, 'task'), top = make('div', undefined, 'task-top'), h = make('div');
            h.append(make('h3', (names[m.channel] || m.channel) + ' → ' + m.recipient), make('div', (m.kind === 'reply' ? 'رد على عميل' : 'مراسلة') + ' · ' + time(m.created_at) + (m.sent_at ? ' · أُرسلت ' + time(m.sent_at) : ''), 'task-meta'));
            top.append(h, make('span', labels[m.status] || m.status, 'pill' + (m.status === 'sent' ? ' ready' : m.status === 'failed' ? ' bad' : m.status === 'queued' ? ' warn' : '')));
            box.append(top, make('p', m.body, 'task-summary'));
            if (m.last_error) box.append(make('p', 'السبب: ' + m.last_error, 'task-meta'));
            var actions = make('div', undefined, 'row'); actions.style.marginTop = '10px';
            if (m.status === 'queued' || m.status === 'failed') { var c = make('button', 'إلغاء الرسالة', 'btn danger'); c.type = 'button'; c.onclick = function () { act(c, function () { return api('/api/v1/admin/outbox/' + m.id + '/cancel', 'POST', {}); }, 'أُلغيت الرسالة.'); }; actions.append(c); }
            if (m.status === 'failed') { var r = make('button', 'إعادة المحاولة', 'btn secondary'); r.type = 'button'; r.onclick = function () { act(r, function () { return api('/api/v1/admin/outbox/' + m.id + '/retry', 'POST', {}); }, 'أُعيدت إلى الطابور.'); }; actions.append(r); }
            if (actions.children.length) box.append(actions);
            root.append(box);
        });
    }
    function showTab(name) {
        tab = name;
        ['agents', 'tasks', 'activity', 'outbox', 'queue'].forEach(function (key) {
            el('pane-' + key).classList.toggle('hidden', key !== name);
            el('tab-' + key).setAttribute('aria-selected', String(key === name));
        });
        if (location.hash !== '#' + name) history.replaceState(null, '', '#' + name);
        if (overview) { if (name === 'tasks') renderTasks(); if (name === 'outbox') loadOutbox().catch(function (e) { setNotice(e.message, true); }); if (name === 'activity') { renderFilters(); loadFeed().catch(function (e) { setNotice(e.message, true); }); } }
    }
    async function loadAll() {
        try {
            var session = await api('/api/store/admin/session');
            csrf = session.csrf || '';
            if (!session.authenticated || session.staff.role !== 'admin') { setNotice('سجّل الدخول بحساب المدير لإدارة الوكلاء.', true); return; }
            var results = await Promise.all([api('/api/v1/admin/agents/overview'), api('/api/v1/admin/agents'), api('/api/v1/admin/operations'), api('/api/v1/admin/jobs')]);
            overview = results[0]; tasks = results[1].tasks || []; operations = results[2]; jobs = results[3].jobs || [];
            renderMaster(); renderKpis(); renderAgents(); renderQueue();
            if (tab === 'tasks') renderTasks();
            if (tab === 'activity') await loadFeed();
            if (tab === 'outbox') await loadOutbox();
            if (el('notice').classList.contains('error') === false && /جارٍ/.test(el('notice').textContent)) el('notice').textContent = 'تم تحميل حالة الوكلاء.';
            el('live').className = 'live'; el('liveText').textContent = 'مباشر · آخر تحديث ' + new Date().toLocaleTimeString('ar-EG');
        } catch (error) {
            setNotice(error.message, true); el('live').className = 'live off'; el('liveText').textContent = 'انقطع الاتصال';
        }
    }

    document.querySelectorAll('.tab').forEach(function (b) { b.onclick = function () { showTab(b.dataset.tab); }; });
    el('runWorker').onclick = function () { act(el('runWorker'), function () { return api('/api/v1/admin/worker/run', 'POST', {}); }).finally(function () { el('runWorker').disabled = false; }); };
    el('outboxStatus').onchange = function (e) { outboxStatus = e.target.value; loadOutbox().catch(function (x) { setNotice(x.message, true); }); };
    el('taskFilter').onchange = function (e) { taskStatus = e.target.value; renderTasks(); };
    [['approveAll', 'approved', 'الموافقة على'], ['rejectAll', 'rejected', 'رفض']].forEach(function (d) {
        el(d[0]).onclick = function () {
            var count = tasks.filter(function (t) { return t.agent === taskAgent && t.status === 'proposed'; }).length;
            if (!confirm(d[2] + ' ' + count + ' مقترح من ' + agentName(taskAgent) + '؟')) return;
            act(el(d[0]), function () { return api('/api/v1/admin/agents/' + taskAgent + '/review-all', 'POST', { decision: d[1] }).then(function (r) { return { message: 'تمت مراجعة ' + r.reviewed + ' مقترح.' }; }); });
        };
    });
    var initial = (location.hash || '').slice(1);
    if (['tasks', 'activity', 'outbox', 'queue'].indexOf(initial) >= 0) { tab = initial; ['agents', 'tasks', 'activity', 'outbox', 'queue'].forEach(function (key) { el('pane-' + key).classList.toggle('hidden', key !== tab); el('tab-' + key).setAttribute('aria-selected', String(key === tab)); }); }
    loadAll();
    /* the proposals tab is not refreshed under the reader's hands */
    setInterval(function () { if (!document.hidden && !pauseFormFor && tab !== 'tasks') loadAll(); }, 8000);
})();
</script>
</body>
</html>`;
}
module.exports = { getAgentsHtml };
