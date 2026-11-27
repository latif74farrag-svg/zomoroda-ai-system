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
        .notice:empty{display:none}.notice{margin:0 0 14px;padding:11px 14px;border:1px solid #d6e5d9;border-radius:12px;background:#edf6ef;color:#315d42;font-size:14px}
        .notice.error{border-color:#f0d4c8;background:#fff2ec;color:#853d25}
        .master{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;padding:16px 18px;border-radius:16px;border:1px solid #a7f3d0;background:#ecfdf5;margin-bottom:14px}
        .master.stopped{border-color:#fcd34d;background:#fffbeb}
        .master h2{color:inherit;font-size:16px}.master p{margin:2px 0 0;font-size:13.5px;color:var(--muted)}
        .kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(125px,1fr));gap:12px;margin-bottom:14px}
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
        .tone-ok{color:#059669}.tone-warn{color:#d97706}.tone-info{color:#2563eb}.item .icon{font-size:12px;flex:none;width:28px;text-align:center}
        .item .text{font-size:14.5px;font-weight:600;overflow-wrap:anywhere}.item .when{font-size:12px;color:#64748b}
        .cat{display:inline-block;background:#e2e8f0;color:#334155;border-radius:6px;padding:0 7px;margin-inline-start:6px;font-size:11px;font-weight:700}
        .empty{text-align:center;padding:22px;color:var(--muted);background:#f8fafc;border:1px dashed var(--line);border-radius:12px;font-size:14px}
        .hidden{display:none!important}
        .attention{margin-bottom:14px}.attention .row{margin-top:10px}.attention .btn{white-space:normal;text-align:right}
        .agent-tools{display:flex;gap:10px;align-items:end;flex-wrap:wrap;margin-bottom:14px}.agent-tools label{display:grid;gap:4px;font-size:13px;font-weight:700;flex:1;min-width:180px}.agent-tools input{width:100%;border:1.5px solid #cbd5e1;border-radius:10px;padding:8px 11px}.agent-tools select{width:100%}.agent-tools p{margin:0;font-size:13px;color:var(--muted)}
        .diagnosis{margin:10px 0;padding:9px 12px;border-radius:10px;background:#f8fafc;font-size:13px;color:var(--muted)}
        .commander{margin-bottom:14px}.commander form{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.commander input{flex:1;min-width:220px;border:1.5px solid #cbd5e1;border-radius:10px;padding:9px 12px}.commander-output{margin:12px 0 0;padding:12px;border-radius:10px;background:#f0fdf4;white-space:pre-wrap}
        .hero{display:flex;align-items:center;gap:18px;flex-wrap:wrap;padding:22px 24px;border-radius:20px;color:#fff;background:linear-gradient(135deg,#064e3b 0%,#047857 55%,#10b981 120%);margin-bottom:14px;box-shadow:0 10px 30px -12px rgba(6,78,59,.55)}
        .hero.stopped{background:linear-gradient(135deg,#78350f,#b45309 60%,#f59e0b 130%)}
        .hero .ring{width:84px;height:84px;flex:none;border-radius:50%;display:grid;place-items:center;background:conic-gradient(#fff var(--pct,0%),rgba(255,255,255,.22) 0);position:relative}
        .hero .ring::after{content:'';position:absolute;inset:8px;border-radius:50%;background:#065f46}.hero.stopped .ring::after{background:#92400e}
        .hero .ring b{position:relative;z-index:1;font-size:21px;font-weight:800}
        .hero h2{color:#fff;font-size:22px;margin:0}.hero p{margin:3px 0 0;opacity:.9;font-size:14px}
        .hero .grow{flex:1;min-width:230px}.hero .row{margin-inline-start:auto}
        .hero .btn{background:#fff;color:var(--green);box-shadow:0 2px 8px rgba(0,0,0,.15)}.hero .btn:hover{background:#ecfdf5}
        .hero .btn.ghost{background:rgba(255,255,255,.16);color:#fff;box-shadow:none}.hero .btn.ghost:hover{background:rgba(255,255,255,.28)}
        .hero .btn.big{padding:12px 22px;font-size:15px}
        .agent{transition:transform .15s,box-shadow .15s}.agent:hover{transform:translateY(-2px);box-shadow:0 12px 24px -14px rgba(15,23,42,.35)}
        .avatar{width:42px;height:42px;flex:none;display:grid;place-items:center;font-size:22px;border-radius:12px;background:#ecfdf5}
        .agent.paused .avatar,.agent.stopped .avatar{background:#fef3c7;filter:grayscale(.4)}
        .dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-inline-end:6px;background:#94a3b8}.state.active .dot{background:#16a34a;animation:pulse 1.6s infinite}.state.paused .dot,.state.stopped .dot{background:#f59e0b}
        .spark{display:flex;align-items:flex-end;gap:2px;height:30px;margin:2px 0 10px}.spark i{flex:1;min-height:2px;border-radius:2px;background:#d1fae5}.spark i.on{background:#10b981}.spark-cap{display:flex;justify-content:space-between;font-size:11px;color:#94a3b8;margin:-8px 0 10px}
        .results{margin:0 0 12px;padding:0;list-style:none;display:grid;gap:5px}
        .results li{display:flex;gap:8px;align-items:flex-start;font-size:12.8px;background:#f8fafc;border-radius:9px;padding:6px 10px}
        .results li span.t{flex:1;overflow-wrap:anywhere}.results li small{color:#94a3b8;white-space:nowrap}
        .results .pill{font-size:11px;padding:1px 8px}.results-empty{font-size:12.5px;color:#94a3b8;margin:0 0 12px}
        .more{margin-top:8px;border-top:0;padding-top:0}.more summary{font-size:12.5px;color:var(--muted)}.more .row{margin-top:8px}
        .adv{margin-bottom:14px}.adv>summary{font-weight:800;color:var(--green);padding:10px 4px}
        .login-cta{display:inline-block;margin-top:8px;background:var(--green2);color:#fff;text-decoration:none;font-weight:800;border-radius:10px;padding:8px 16px}
        .toast{position:fixed;bottom:18px;inset-inline-start:18px;max-width:min(420px,calc(100% - 36px));background:#0f172a;color:#fff;padding:12px 16px;border-radius:12px;font-size:14px;box-shadow:0 12px 30px rgba(0,0,0,.3);z-index:50;white-space:pre-wrap}
        .layout{display:grid;grid-template-columns:minmax(0,1fr) 330px;gap:16px;align-items:start}
        .main-col{min-width:0}
        .aside{position:sticky;top:12px;background:#fff;border:1px solid var(--line);border-radius:16px;padding:16px;max-height:calc(100vh - 24px);overflow:auto}
        .aside h2{font-size:16px}.aside .aside-h{margin:16px 0 6px;font-size:13px;color:var(--muted)}
        .mini{border:1px solid var(--line);border-radius:12px;padding:10px 12px;margin:8px 0;background:#fff}
        .mini-head{display:flex;align-items:center;gap:7px;font-size:13px}.mini-head small{margin-inline-start:auto;color:#94a3b8}.mini-ico{font-size:17px}
        .mini-text{margin:5px 0 8px;font-size:13px;color:#334155;overflow-wrap:anywhere}
        .mini .btn{padding:5px 12px;font-size:12.5px}
        .mini.done{background:#f8fafc;border-style:dashed}.mini.done .mini-text{margin:3px 0 0}
        .runres{border:2px solid #a7f3d0;background:#f0fdf4;border-radius:16px;padding:16px 18px;margin-bottom:14px}
        .runres.none{border-color:var(--line);background:#fff}
        .runres-top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.runres h2{font-size:16px}.runres p{margin:4px 0 0;font-size:13.5px;color:#334155;white-space:pre-wrap}
        .view-toggle{display:inline-flex;border:1.5px solid #cbd5e1;border-radius:10px;overflow:hidden}.view-toggle button{border:0;background:#fff;padding:7px 12px;cursor:pointer;font-weight:700;font-size:13px;color:var(--muted)}.view-toggle button[aria-pressed=true]{background:var(--green);color:#fff}
        .tbl{width:100%;border-collapse:collapse;font-size:13.5px;background:#fff;border:1px solid var(--line);border-radius:14px;overflow:hidden}
        .tbl th{background:#f8fafc;text-align:right;padding:10px 12px;font-size:12px;color:var(--muted);font-weight:800;border-bottom:1px solid var(--line)}
        .tbl td{padding:9px 12px;border-bottom:1px solid #f1f5f9;vertical-align:middle}.tbl tr:last-child td{border-bottom:0}.tbl tr:hover td{background:#f8fafc}
        .tbl .nm{display:flex;align-items:center;gap:9px;font-weight:800}.tbl .nm .avatar{width:32px;height:32px;font-size:17px}
        .tbl .num{text-align:center;font-weight:800}.tbl .num.warn{color:var(--amber)}.tbl .num.bad{color:var(--red)}
        .tbl-wrap{grid-column:1/-1;overflow-x:auto}
        @media(max-width:1100px){.layout{grid-template-columns:1fr}.aside{position:static;max-height:none;order:-1}}
        @media(prefers-reduced-motion:reduce){.live i{animation:none}}
        @media(max-width:600px){.grid{grid-template-columns:1fr}.technical{grid-template-columns:1fr}.stats{grid-template-columns:repeat(3,1fr)}h1{font-size:22px}}
        .cm-workspace{margin:18px 0;padding:18px;border:1px solid #cbd5e1;border-top:5px solid #194f7d;background:#fff;border-radius:10px}
        .cm-workspace h2{color:#194f7d}.cm-workspace form{padding:14px;background:#deece9}.cm-workspace label{display:inline-flex;flex-direction:column;gap:5px;margin:6px;vertical-align:top;max-width:100%}
        .cm-workspace input,.cm-workspace select,.cm-workspace textarea{padding:8px;border:1px solid #94a3b8;border-radius:6px;max-width:100%;font:inherit;background:#fff}.cm-workspace textarea{min-width:240px;min-height:80px}
        .cm-scroll{overflow-x:auto}.cm-workspace td,.cm-workspace th{padding:9px;text-align:right;border-bottom:1px solid #cbd5e1}.cm-workspace td button{margin:3px}.cm-workspace pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f1f5f9;padding:12px;max-height:400px;overflow:auto}.cm-workspace [hidden]{display:none}
    </style>
</head>
<body>
<main>
    <div class="head">
        <div><h1>فريق الوكلاء</h1><p class="sub">شغّل أي وكيل بضغطة، وشاهد ما أنجزه. الوكلاء يقترحون فقط؛ لا يُنفَّذ شيء حساس دون موافقتك.</p></div>
        <span id="live" class="live off"><i></i><span id="liveText">جارٍ الاتصال…</span></span>
    </div>
    <div id="notice" class="notice" role="status" aria-live="polite">جارٍ التحميل…</div>

    <div class="layout"><div class="main-col">
    <section id="master" class="hero" aria-label="التحكم الشامل"></section>
    <details class="panel adv"><summary>أدوات متقدمة: مساعد الإدارة ومعالجة المهام</summary>
    <section class="commander" aria-labelledby="commanderTitle">
        <h2 id="commanderTitle">مساعد الإدارة</h2>
        <p class="sub">اسأل عن حالة الوكلاء، سبب قلة النشاط، الموافقات، الأخطاء أو إعداد الربط. الإجابة تعتمد على بيانات النظام الحالية.</p>
        <form id="commanderForm"><label class="hidden" for="commanderQuestion">سؤالك</label><input id="commanderQuestion" maxlength="300" required placeholder="مثلاً: ليه وكيلين بس شغالين؟"><button id="commanderAsk" class="btn" type="submit">اسأل</button></form>
        <p id="commanderAnswer" class="commander-output hidden" role="status" aria-live="polite"></p>
    </section>
    <section class="cm-workspace" aria-labelledby="cm-title">
        <h2 id="cm-title">AI COMMANDER · مركز المهام</h2>
        <p>وزّع العمل، راجع القرارات، وتابع نتيجة كل مهمة ودليلها.</p>
        <form id="cm-form">
            <label>العمل المطلوب<select id="cm-type" required></select></label>
            <div id="cm-fields"></div>
            <label>الأولوية<select name="priority"><option value="0">عادية</option><option value="5">مرتفعة</option><option value="10">عاجلة</option></select></label>
            <label>معرف المهمة السابقة (اختياري)<input name="dependsOn" maxlength="80" placeholder="تنتظر هذه المهمة اكتمال السابقة"></label>
            <p id="cm-policy"></p><button class="btn" id="cm-submit" type="submit">إنشاء المهمة</button>
        </form>
        <p id="cm-notice" role="status" aria-live="polite"></p>
        <p class="sub">فعّل الوكيل من بطاقته، ثم استخدم «معالجة المهام الآن» أو خدمة التشغيل لمعالجة الطابور. لا تعني إضافة مهمة أنها نُفذت.</p>
        <button class="btn" id="cm-refresh" type="button">تحديث المهام والقوائم</button>
        <p id="cm-summary"></p>
        <div class="cm-scroll"><table data-no-filter><thead><tr><th>المهمة</th><th>الوكيل</th><th>الحالة</th><th>المحاولات</th><th>موعد التنفيذ بالقاهرة</th><th>الإجراءات</th></tr></thead><tbody id="cm-rows"></tbody></table></div>
        <div id="cm-detail" hidden tabindex="-1"></div>
    </section>
    <div style="margin-top:14px"><p id="workerDetails" class="sub"></p><button id="runWorker" type="button" class="btn">معالجة المهام الآن</button><p class="sub">يعالج مهمة واحدة والرسائل المعتمدة المؤهلة للإرسال. يمكن إعادة التشغيل بعد دقيقة.</p></div>
    <p class="legend" style="margin-top:12px"><span><b>نشط</b> = نفّذ إجراءً خلال 24 ساعة</span><span><b>جاهز</b> = مفعّل وينتظر مهاماً</span><span><b>موقوف</b> = أوقفته أنت</span><span><b>إيقاف شامل</b> = كل الوكلاء متوقفون</span></p>
    </details>
    <section id="integrationPanel" class="panel hidden" style="margin-bottom:14px" aria-label="إعدادات ربط المنصات"></section>

    <section class="kpis" aria-label="ملخص">
        <div class="kpi"><span>وكلاء مفعّلون</span><strong id="kEnabled">—</strong></div>
        <div class="kpi"><span>لهم نشاط مسجّل (24 ساعة)</span><strong id="kActive">—</strong></div>
        <div class="kpi"><span>مقترحات بانتظار مراجعتك</span><strong id="kPending">—</strong></div>
        <div class="kpi" id="kFailBox"><span>أخطاء وإجراءات محظورة (24 ساعة)</span><strong id="kFail">—</strong></div>
        <div class="kpi"><span>وكلاء موقوفون</span><strong id="kPaused">—</strong></div>
        <div class="kpi"><span>معالجة المهام</span><strong id="kWorker">—</strong></div>
    </section>
    <section class="panel attention" aria-labelledby="attentionTitle">
        <h2 id="attentionTitle">ما الذي يحتاج انتباهك؟</h2>
        <p id="stateExplanation" class="sub">جارٍ قراءة حالة الوكلاء…</p>
        <div id="attentionActions" class="row"></div>
    </section>

    <section id="runResult" class="runres hidden" aria-live="polite"></section>
    <div class="tabs" role="tablist" aria-label="أقسام الصفحة">
        <button class="tab" role="tab" id="tab-agents" data-tab="agents" aria-selected="true">الوكلاء</button>
        <button class="tab" role="tab" id="tab-tasks" data-tab="tasks" aria-selected="false">النتائج والمقترحات<span class="count hidden" id="pendingBadge">0</span></button>
        <button class="tab" role="tab" id="tab-activity" data-tab="activity" aria-selected="false">النشاط المباشر</button>
        <button class="tab" role="tab" id="tab-outbox" data-tab="outbox" aria-selected="false">الصادر</button>
        <button class="tab" role="tab" id="tab-queue" data-tab="queue" aria-selected="false">الطابور</button>
    </div>

    <section id="pane-agents">
        <div class="panel agent-tools">
            <label for="agentSearch">ابحث عن وكيل<input id="agentSearch" type="search" placeholder="اسم الوكيل أو وظيفته" maxlength="120"></label>
            <label for="agentState">عرض الوكلاء<select id="agentState"><option value="all">كل الوكلاء</option><option value="enabled">مفعّلون</option><option value="active">لهم نشاط خلال 24 ساعة</option><option value="ready">جاهزون وينتظرون مهاماً</option><option value="paused">موقوفون</option><option value="setup">ينقصهم إعداد الربط</option><option value="review">لديهم مقترحات للمراجعة</option><option value="errors">لديهم أخطاء أو حظر</option></select></label>
            <p id="agentCount" role="status" aria-live="polite"></p>
            <div class="view-toggle" role="group" aria-label="طريقة العرض"><button type="button" id="viewCards" aria-pressed="true">بطاقات</button><button type="button" id="viewTable" aria-pressed="false">جدول</button></div>
        </div>
        <div id="agentGrid" class="grid"></div>
    </section>

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
</div><aside id="aside" class="aside" aria-label="بانتظار قرارك"></aside></div>
</main>
<script src="/assets/commander.js"></script>
<script>
(function () {
    var csrf = '';
    var editingIntegrations = false;
    var overview = null, tasks = [], jobs = [], operations = null;
    var agentSearch = '', agentState = 'all';
    var outboxRows = [], outboxStatus = '', tab = 'agents', taskAgent = 'all', taskStatus = 'all', feedAgent = 'all', category = 'all', pauseFormFor = null, settingsFormFor = null;
    var el = function (id) { return document.getElementById(id); };
    var STATE = { active: 'نشط', ready: 'جاهز', paused: 'موقوف', stopped: 'إيقاف شامل' };
    var TASK_STATUS = { proposed: 'بانتظار المراجعة', approved: 'تمت الموافقة — بانتظار التنفيذ', executed: 'تم التنفيذ', rejected: 'مرفوض' };
    var FILTERS = [['all','الكل'],['whatsapp','واتساب'],['search','البحث'],['agents','الوكلاء'],['marketing','التسويق'],['orders','الطلبات'],['inventory','المخزون'],['catalog','المنتجات'],['staff','الفريق']];

    function nameInitial(name) { return String(name || '?').trim().charAt(0); }
    var RESULT_STATUS = { proposed: ['بانتظار مراجعتك', 'warn'], approved: ['معتمد', ''], executed: ['تم', 'ready'], rejected: ['مرفوض', 'bad'] };
    function toast(msg) { var t = make('div', msg, 'toast'); t.setAttribute('role', 'status'); document.body.append(t); setTimeout(function () { t.remove(); }, 6000); }
    var viewMode = 'cards', lastRun = null;
    try { viewMode = localStorage.getItem('zmr_agents_view') === 'table' ? 'table' : 'cards'; } catch (e) { /* storage unavailable: default view */ }
    function taskTitle(t) { var p = parseJson(t.proposal); return String(p.title || p.message || p.summary || p.text || p.tool || t.task_key || 'مقترح'); }
    function miniTask(t) {
        var box = make('div', undefined, 'mini' + (t.status === 'proposed' ? '' : ' done')), head = make('div', undefined, 'mini-head');
        head.append(make('span', nameInitial(agentName(t.agent)), 'mini-ico'), make('b', agentName(t.agent)), make('small', ago(Number(t.created_at))));
        box.append(head, make('p', taskTitle(t).slice(0, 200), 'mini-text'));
        if (t.status === 'proposed') {
            var row = make('div', undefined, 'row');
            [['موافقة', 'approved', ''], ['رفض', 'rejected', 'danger']].forEach(function (d) {
                var b = make('button', d[0], 'btn ' + d[2]); b.type = 'button';
                b.onclick = function () { act(b, function () { return api('/api/v1/admin/agent-tasks/' + encodeURIComponent(t.id) + '/review', 'POST', { decision: d[1] }); }, d[1] === 'approved' ? 'تمت الموافقة.' : 'تم الرفض.'); };
                row.append(b);
            });
            box.append(row);
        }
        return box;
    }
    function renderAside() {
        var root = el('aside'); root.replaceChildren();
        var pending = tasks.filter(function (t) { return t.status === 'proposed'; });
        root.append(make('h2', 'بانتظار قرارك'), make('p', pending.length ? pending.length + ' مقترح يحتاج موافقتك أو رفضك.' : 'لا شيء ينتظرك الآن ', 'sub'));
        pending.slice(0, 6).forEach(function (t) { root.append(miniTask(t)); });
        if (pending.length > 6) { var all = make('button', 'عرض الكل (' + pending.length + ')', 'btn secondary'); all.type = 'button'; all.onclick = function () { taskAgent = 'all'; taskStatus = 'proposed'; showTab('tasks'); }; root.append(all); }
        var done = tasks.filter(function (t) { return t.status === 'executed'; }).slice(0, 4);
        if (done.length) { root.append(make('h3', 'آخر ما تم تنفيذه', 'aside-h')); done.forEach(function (t) { root.append(miniTask(t)); }); }
    }
    function renderRunResult() {
        var root = el('runResult');
        if (!lastRun) { root.classList.add('hidden'); return; }
        var fresh = tasks.filter(function (t) { return (lastRun.agent === 'all' || t.agent === lastRun.agent) && Number(t.created_at) >= lastRun.since - 2000; });
        var pending = fresh.filter(function (t) { return t.status === 'proposed'; });
        root.replaceChildren(); root.classList.remove('hidden'); root.classList.toggle('none', !fresh.length);
        var top = make('div', undefined, 'runres-top'), text = make('div');
        text.append(make('h2', (lastRun.agent === 'all' ? 'نتيجة تشغيل كل الوكلاء' : 'نتيجة تشغيل ' + agentName(lastRun.agent))), make('p', lastRun.message));
        var close = make('button', '', 'btn secondary'); close.type = 'button'; close.setAttribute('aria-label', 'إغلاق'); close.onclick = function () { lastRun = null; renderRunResult(); };
        top.append(text, close); root.append(top);
        pending.slice(0, 3).forEach(function (t) { root.append(miniTask(t)); });
        if (pending.length > 3) root.append(make('p', 'و ' + (pending.length - 3) + ' مقترح آخر في الجانب وتبويب النتائج.', 'sub'));
        if (lastRun.fresh) { lastRun.fresh = false; root.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
    }
    function doRun(a, option, button) {
        button.textContent = '⏳ جارٍ العمل…';
        var t0 = Date.now();
        act(button, function () { return api('/api/v1/admin/agents/' + a.key + '/run', 'POST', { option: option.key }).then(function (r) { lastRun = { agent: a.key, message: r.message, since: r.since || t0, fresh: true }; return r; }); });
    }
    function renderTable(rows, root) {
        var wrap = make('div', undefined, 'tbl-wrap'), table = make('table', undefined, 'tbl'), head = make('tr');
        ['الوكيل', 'الحالة', 'آخر نشاط', 'إجراءات 24س', 'بانتظارك', 'أخطاء', ''].forEach(function (h) { head.append(make('th', h)); });
        table.append(head);
        rows.forEach(function (a) {
            var tr = make('tr'), nm = make('td'), name = make('div', undefined, 'nm');
            name.append(make('div', nameInitial(a.name), 'avatar'), make('span', a.name)); nm.append(name);
            var st = make('td'), badge = make('span', undefined, 'state ' + a.state); badge.append(make('span', undefined, 'dot'), document.createTextNode(STATE[a.state])); st.append(badge);
            var act1 = make('td'), first = (a.runs || [])[0];
            if (first) { var b = make('button', first.label, 'btn'); b.type = 'button'; b.disabled = a.state === 'paused' || a.state === 'stopped'; b.onclick = function () { doRun(a, first, b); }; act1.append(b); }
            else act1.append(make('span', a.kind === 'standalone' ? 'خدمة مستقلة' : 'تلقائي', 'meta'));
            tr.append(nm, st, make('td', ago(a.last_at)), make('td', String(a.actions_24h), 'num'), make('td', String(a.tasks.proposed), 'num' + (a.tasks.proposed ? ' warn' : '')), make('td', String(a.failures_24h), 'num' + (a.failures_24h ? ' bad' : '')), act1);
            table.append(tr);
        });
        wrap.append(table); root.append(wrap);
    }
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
        root.replaceChildren(); root.className = 'hero' + (g.paused ? ' stopped' : '');
        var onCount = overview.agents.filter(function (a) { return !g.paused && !a.paused; }).length, total = overview.agents.length;
        var ring = make('div', undefined, 'ring'); ring.style.setProperty('--pct', Math.round(onCount / total * 100) + '%'); ring.append(make('b', onCount + '/' + total)); ring.setAttribute('role', 'img'); ring.setAttribute('aria-label', onCount + ' من ' + total + ' وكلاء يعملون');
        var text = make('div', undefined, 'grow');
        var workerOk = operations.worker ? operations.worker.healthy : (overview.summary.worker_heartbeat_age_ms !== null && overview.summary.worker_heartbeat_age_ms < 120000);
        text.append(make('h2', g.paused ? 'الوكلاء متوقفون الآن — اضغط «ابدأ التشغيل»' : onCount === total ? 'كل الوكلاء يعملون' : '▶ ' + onCount + ' من ' + total + ' وكلاء يعملون'));
        text.append(make('p', g.paused
            ? 'لا يعالج أي وكيل مهاماً جديدة ولا يرسل واتساب. لا يُحذف شيء من الطابور.' + (g.paused_reason ? ' السبب: ' + g.paused_reason + '.' : '') + (g.paused_at ? ' منذ ' + ago(g.paused_at) + '.' : '')
            : (workerOk ? 'المحرّك يعمل ويفحص المهام تلقائياً.' : 'المحرّك لم يعمل مؤخراً؛ اضغط «شغّل الوكلاء الآن» أو أعد تشغيل الخادم.') + ' ' + overview.summary.pending_review + ' مقترح ينتظر مراجعتك.'));
        var button = make('button', g.paused ? 'ابدأ تشغيل الوكلاء' : 'إيقاف الجميع', g.paused ? 'btn big' : 'btn ghost');
        button.type = 'button';
        button.onclick = function () {
            if (!g.paused && !confirm('إيقاف كل الوكلاء الآن؟ لن تُعالج مهام جديدة ولن يُرسل واتساب حتى تعيد التشغيل.')) return;
            act(button, function () { return api('/api/v1/admin/agents/global', 'PATCH', { paused: !g.paused, reason: g.paused ? '' : 'إيقاف طارئ من الصفحة' }); }, g.paused ? 'تم تشغيل الوكلاء.' : 'تم إيقاف جميع الوكلاء.');
        };
        var fire = make('button', 'شغّل الوكلاء الآن', 'btn big'); fire.type = 'button'; fire.disabled = g.paused;
        fire.title = g.paused ? 'فعّل التشغيل العام أولاً.' : 'يفحص البيانات المتاحة ويحترم إيقاف كل وكيل والموافقات.';
        fire.onclick = function () { fire.textContent = '⏳ جارٍ التشغيل…'; var t0 = Date.now(); act(fire, function () { return api('/api/v1/admin/agents/run-all', 'POST', {}).then(function (r) { lastRun = { agent: 'all', message: r.message || 'تم التشغيل.', since: t0, fresh: true }; return { message: 'تم تشغيل الوكلاء. النتائج تظهر في البطاقات أدناه.' }; }); }); };
        var actions = make('div', undefined, 'row'); if (g.paused) actions.append(button); else actions.append(fire, button);
        root.append(ring, text, actions);
    }
    function renderKpis() {
        var s = overview.summary, age = s.worker_heartbeat_age_ms;
        el('kEnabled').textContent = overview.agents.filter(function (a) { return !overview.global.paused && !a.paused; }).length + ' من ' + s.total;
        el('kActive').textContent = overview.agents.filter(function (a) { return a.actions_24h > 0; }).length + ' من ' + s.total;
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
    function needsSetup(a) { return a.setup && !a.setup.ok; }
    function renderAttention() {
        var s = overview.summary, root = el('attentionActions'); root.replaceChildren();
        var missing = overview.agents.filter(needsSetup).length;
        el('stateExplanation').textContent = overview.global.paused
            ? 'الإيقاف الشامل مفعّل. عدد الوكلاء ذوي النشاط السابق لا يعني أنهم يعملون الآن.'
            : overview.agents.filter(function (a) { return a.actions_24h > 0; }).length + ' من ' + s.total + ' لهم نشاط مسجّل خلال 24 ساعة. الوكيل المفعّل قد ينتظر طلباً أو رسالة أو موعد تشغيل؛ النشاط المسجّل لا يثبت نجاح التنفيذ أو اتصال الخدمة.';
        function shortcut(text, fn, cls) { var b = make('button', text, 'btn ' + (cls || 'secondary')); b.type = 'button'; b.onclick = fn; root.append(b); }
        if (s.pending_review) shortcut('مراجعة ' + s.pending_review + ' مقترح', function () { taskAgent = 'all'; taskStatus = 'proposed'; showTab('tasks'); });
        if (missing) shortcut(missing + ' وكلاء ينقصهم إعداد الربط', function () { filterAgents('setup'); }, 'warn');
        if (s.failures_24h) shortcut('عرض الوكلاء ذوي الأخطاء أو الحظر', function () { filterAgents('errors'); }, 'danger');
        if (s.dead_jobs) shortcut('فحص ' + s.dead_jobs + ' مهام استنفدت المحاولات', function () { showTab('queue'); }, 'danger');
        if (!root.children.length) root.append(make('p', 'لا توجد مقترحات معلّقة أو نواقص ربط أو أخطاء مسجّلة في هذا الملخص.', 'sub'));
    }
    function filterAgents(value) { agentState = value; agentSearch = ''; el('agentSearch').value = ''; el('agentState').value = value; showTab('agents'); renderAgents(); el('agentState').focus(); }
    function diagnosis(a) {
        if (overview.global.paused) return 'متوقف بسبب الإيقاف الشامل. أي نشاط ظاهر يخص الفترة السابقة.';
        if (a.paused) return 'أُوقف هذا الوكيل يدوياً. استأنفه من زر تشغيل الوكيل عندما تحتاجه.';
        if (needsSetup(a)) return a.setup.text;
        if (a.failures_24h) return 'يوجد خطأ أو إجراء محظور خلال 24 ساعة. افتح نشاطه لمعرفة التفاصيل.';
        if (a.tasks.proposed) return 'ينتظر مراجعتك لـ ' + a.tasks.proposed + ' مقترح. افتح المقترحات للاطلاع على الأدلة.';
        if (a.tasks.approved) return 'لديه ' + a.tasks.approved + ' مهمة معتمدة بانتظار التنفيذ. راجع حالة المعالجة والطابور.';
        if (a.state === 'active') return 'له نشاط مسجّل خلال 24 ساعة. يمكنك فتح نشاطه لمعرفة النتيجة.';
        return a.kind === 'standalone' ? 'مفعّل في لوحة التحكم؛ تشغيله الفعلي يحتاج خدمته المستقلة. عدم وجود نشاط لا يثبت اتصالها.' : 'مفعّل وينتظر حدثاً مناسباً أو موعد تشغيل. عدم وجود نشاط حديث لا يعني أنه معطّل.';
    }
    function stat(value, label, cls) { var d = make('div', undefined, 'stat' + (cls ? ' ' + cls : '')); d.append(make('b', String(value)), make('small', label)); return d; }
    async function openIntegrations() {
        editingIntegrations = true;
        var root = el('integrationPanel'); root.classList.remove('hidden'); root.replaceChildren(make('p', 'جارٍ تحميل إعدادات الربط…'));
        try {
            var data = await api('/api/v1/admin/integrations');
            root.replaceChildren(make('h2', 'إعدادات Meta وتليجرام'));
            root.append(make('p', 'المفاتيح تُحفظ مشفرة ولا تُعرض بعد الحفظ. اترك الحقل فارغاً للاحتفاظ بالمفتاح الحالي. حذف نسخة الموقع يعيد استخدام قيمة بيئة الخادم إن وُجدت.', 'sub'));
            if (!data.encryptionReady) root.append(make('p', 'يلزم إعداد STAFF_MFA_KEY ثابت في الخادم مرة واحدة قبل حفظ المفاتيح.', 'why'));
            var form = make('form', undefined, 'settings-form');
            data.fields.forEach(function (field) {
                var wrap = make('div', undefined, 'settings-field');
                var label = make('label', field.label); label.htmlFor = 'integration-' + field.key;
                var input = make('input'); input.id = label.htmlFor; input.name = field.key; input.type = 'password'; input.autocomplete = 'new-password'; input.maxLength = 8192;
                input.placeholder = field.configured ? 'محفوظ — اكتب فقط لتغييره' : 'أدخل المفتاح';
                wrap.append(label, input, make('small', field.source === 'website' ? 'المصدر: إعدادات الموقع' : field.source === 'environment' ? 'المصدر: بيئة الخادم' : 'لم يُضبط بعد'));
                if (field.key === 'TELEGRAM_WEBHOOK_SECRET' || field.key === 'META_VERIFY_TOKEN') {
                    var generate = make('button', 'توليد رمز جديد', 'btn secondary'); generate.type = 'button';
                    generate.onclick = function () { input.value = Array.from(crypto.getRandomValues(new Uint8Array(24))).map(function (n) { return n.toString(16).padStart(2, '0'); }).join(''); input.type = 'text'; };
                    wrap.append(generate);
                }
                if (field.source === 'website') {
                    var removeLabel = make('label', 'حذف نسخة الموقع '), remove = make('input'); remove.type = 'checkbox'; remove.name = 'remove-' + field.key; removeLabel.append(remove); wrap.append(removeLabel);
                }
                form.append(wrap);
            });
            var save = make('button', 'حفظ مفاتيح الربط', 'btn'); save.type = 'submit'; save.disabled = !data.encryptionReady; form.append(save);
            form.onsubmit = async function (event) {
                event.preventDefault(); save.disabled = true;
                var values = {}, remove = [];
                data.fields.forEach(function (field) {
                    var input = form.elements[field.key]; if (input.value.trim()) values[field.key] = input.value.trim();
                    var checkbox = form.elements['remove-' + field.key]; if (checkbox && checkbox.checked) remove.push(field.key);
                });
                try { await api('/api/v1/admin/integrations', 'PUT', { values: values, remove: remove }); form.reset(); await openIntegrations(); await loadAll(); setNotice('تم حفظ المفاتيح. إعدادات الربط تُستخدم فوراً دون إعادة نشر.'); }
                catch (error) { setNotice(error.message, true); save.disabled = false; }
            };
            root.append(form);
            root.append(make('p', 'Meta: افتح إعدادات Webhooks في تطبيق Meta، واستخدم الرابط التالي ونفس رمز التحقق الذي حفظته هنا. اشترك في أحداث الرسائل للصفحة أو الحساب وامنح التطبيق الصلاحيات المطلوبة.', 'sub'));
            root.append(make('p', data.webhookBaseUrl ? data.webhookBaseUrl + '/webhooks/meta' : 'يلزم ضبط BASE_URL بعنوان HTTPS العام في بيئة الخادم.', 'meta'));
            root.append(make('p', 'تليجرام: أنشئ البوت لدى BotFather، ثم احفظ التوكن ورمز الحماية هنا، وبعدها اضغط تسجيل الربط.', 'sub'));
            var row = make('div', undefined, 'row'), register = make('button', 'تسجيل ربط تليجرام', 'btn secondary'), close = make('button', 'إغلاق الإعدادات', 'btn secondary'); register.type = close.type = 'button';
            register.onclick = function () { act(register, function () { return api('/api/v1/admin/integrations/telegram/register', 'POST', {}); }).finally(function () { register.disabled = false; }); };
            close.onclick = function () { editingIntegrations = false; root.replaceChildren(); root.classList.add('hidden'); };
            row.append(register, close); root.append(row); root.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (error) { editingIntegrations = false; root.replaceChildren(make('p', error.message, 'why')); }
    }
    function renderAgents() {
        var root = el('agentGrid'); root.replaceChildren();
        var query = agentSearch.trim().toLocaleLowerCase('ar');
        var rows = overview.agents.filter(function (a) {
            if (query && (a.name + ' ' + a.about + ' ' + a.key).toLocaleLowerCase('ar').indexOf(query) < 0) return false;
            if (agentState === 'enabled') return !overview.global.paused && !a.paused;
            if (agentState === 'active') return a.actions_24h > 0;
            if (agentState === 'paused') return a.state === 'paused' || a.state === 'stopped';
            if (agentState === 'setup') return needsSetup(a);
            if (agentState === 'review') return a.tasks.proposed > 0;
            if (agentState === 'errors') return a.failures_24h > 0;
            return agentState === 'all' || a.state === agentState;
        });
        el('agentCount').textContent = 'عرض ' + rows.length + ' من ' + overview.agents.length + ' وكيل';
        if (!rows.length) root.append(make('p', 'لا يوجد وكلاء مطابقون. غيّر البحث أو اختر كل الوكلاء.', 'empty'));
        if (viewMode === 'table' && rows.length) { renderTable(rows, root); return; }
        rows.forEach(function (a) {
            var card = make('article', undefined, 'agent ' + a.state);
            var top = make('div', undefined, 'agent-top');
            var title = make('div', undefined, 'row'); title.style.flexWrap = 'nowrap'; title.append(make('div', nameInitial(a.name), 'avatar'), make('h3', a.name));
            var badge = make('span', undefined, 'state ' + a.state); badge.append(make('span', undefined, 'dot'), document.createTextNode(STATE[a.state]));
            top.append(title, badge);
            card.append(top, make('p', a.about, 'about'));
            var spark = make('div', undefined, 'spark'); spark.setAttribute('role', 'img'); spark.setAttribute('aria-label', 'نشاط آخر 24 ساعة: ' + a.actions_24h + ' إجراء');
            var peak = Math.max.apply(null, a.hourly.concat([1]));
            a.hourly.forEach(function (n) { var bar = make('i', undefined, n ? 'on' : ''); bar.style.height = Math.max(8, Math.round(n / peak * 100)) + '%'; bar.title = n + ' إجراء'; spark.append(bar); });
            var cap = make('div', undefined, 'spark-cap'); cap.append(make('span', 'قبل 24 ساعة'), make('span', 'الآن'));
            card.append(spark, cap);
            if (a.recent && a.recent.length) {
                var list = make('ul', undefined, 'results');
                a.recent.forEach(function (r) { var st = RESULT_STATUS[r.status] || [r.status, '']; var li = make('li'); li.append(make('span', st[0], 'pill ' + st[1]), make('span', r.title || 'مقترح بدون عنوان', 't'), make('small', ago(r.at))); list.append(li); });
                card.append(list);
            } else card.append(make('p', 'لا نتائج بعد. اضغط «شغّل الآن» ليبدأ العمل.', 'results-empty'));
            if (a.paused && a.paused_reason) card.append(make('p', 'سبب الإيقاف: ' + a.paused_reason + (a.paused_at ? ' · ' + ago(a.paused_at) : ''), 'why'));
            if (a.setup) card.append(make('p', (a.setup.ok ? '' : '') + a.setup.text, 'setup ' + (a.setup.ok ? 'ok' : 'no')));
            card.append(make('p', diagnosis(a), 'diagnosis'));
            var stats = make('div', undefined, 'stats');
            stats.append(stat(a.tasks.proposed, 'بانتظار مراجعتك', a.tasks.proposed ? 'warn' : ''), stat(a.actions_24h, 'إجراءات 24 ساعة'), stat(a.failures_24h, 'أخطاء 24 ساعة', a.failures_24h ? 'bad' : ''));
            card.append(stats, make('p', 'آخر نشاط: ' + ago(a.last_at) + ' · نُفّذ: ' + a.tasks.executed + ' · رُفض: ' + a.tasks.rejected, 'meta'));
            if (a.outbox) card.append(make('p', 'في الصادر: ' + a.outbox.queued + ' · أُرسلت (24 ساعة): ' + a.outbox.sent_24h + ' · فاشلة: ' + a.outbox.failed, 'meta'));
            var row = make('div', undefined, 'row'), more = make('div', undefined, 'row');
            var toggle = make('button', a.paused ? 'تشغيل الوكيل' : 'إيقاف مؤقت', 'btn ' + (a.paused ? '' : 'warn')); toggle.type = 'button';
            toggle.onclick = function () {
                if (a.paused) act(toggle, function () { return api('/api/v1/admin/agents/' + a.key, 'PATCH', { paused: false }); }, 'تم تشغيل ' + a.name + '.');
                else { pauseFormFor = pauseFormFor === a.key ? null : a.key; renderAgents(); }
            };
            if (a.key === 'social') {
                var connect = make('button', 'ربط Meta وتليجرام', 'btn secondary'); connect.type = 'button'; connect.onclick = openIntegrations; row.append(connect);
            }
            if (a.key === 'whatsapp') {
                card.append(make('p', 'واتساب الحالي يحتاج خدمة جلسات مستقلة تعمل باستمرار لإصدار رمز QR. حفظ إعدادات من الموقع أو تشغيل Cron لا ينشئ جلسة. الربط دون خدمة QR يحتاج تكامل WhatsApp Cloud API منفصلاً.', 'sub'));
            }
            (a.runs || []).forEach(function (option, index) {
                var run = make('button', '' + option.label, index === 0 ? 'btn' : 'btn secondary'); run.type = 'button';
                run.disabled = a.state === 'paused' || a.state === 'stopped'; run.title = run.disabled ? 'شغّل الوكيل أولاً.' : '';
                run.onclick = function () { doRun(a, option, run); };
                row.append(run);
            });
            if (!(a.runs || []).length && a.kind === 'queue') row.append(make('span', 'يعمل تلقائياً عند وصول طلب أو رسالة.', 'meta'));
            if (a.kind === 'standalone') row.append(make('span', 'خدمة مستقلة: تعمل من خدمتها الخاصة.', 'meta'));
            var review = make('button', a.tasks.proposed ? 'مراجعة المقترحات (' + a.tasks.proposed + ')' : 'المقترحات', 'btn secondary'); review.type = 'button';
            review.onclick = function () { taskAgent = a.key; taskStatus = a.tasks.proposed ? 'proposed' : 'all'; showTab('tasks'); };
            var feed = make('button', 'نشاطه', 'btn secondary'); feed.type = 'button';
            feed.onclick = function () { feedAgent = a.key; showTab('activity'); };
            var settings = make('button', 'خصائص الوكيل', 'btn secondary'); settings.type = 'button';
            settings.onclick = function () { settingsFormFor = settingsFormFor === a.key ? null : a.key; pauseFormFor = null; renderAgents(); };
            row.prepend(review);
            more.append(feed, settings, toggle);
            var moreBox = document.createElement('details'); moreBox.className = 'more'; moreBox.append(make('summary', 'المزيد: النشاط، الخصائص، الإيقاف')); moreBox.append(more);
            if (pauseFormFor === a.key || settingsFormFor === a.key) moreBox.open = true;
            card.append(row, moreBox);
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
        if (!rows.length) { root.append(make('div', taskStatus === 'proposed' ? 'لا توجد مقترحات بانتظار المراجعة. ' : 'لا توجد مهام مطابقة.', 'empty')); return; }
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
            item.append(make('div', '●', 'icon tone-' + (e.tone || 'info')), body); root.append(item);
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
            if (!session.authenticated || session.staff.role !== 'admin') { setNotice('سجّل الدخول بحساب المدير لإدارة الوكلاء.', true); if (!el('loginCta')) { var cta = make('a', 'الدخول بالبريد وكلمة المرور ←', 'login-cta'); cta.id = 'loginCta'; cta.href = '/store/admin'; el('notice').after(cta); } return; }
            var results = await Promise.all([api('/api/v1/admin/agents/overview'), api('/api/v1/admin/agents'), api('/api/v1/admin/operations'), api('/api/v1/admin/jobs')]);
            overview = results[0]; tasks = results[1].tasks || []; operations = results[2]; jobs = results[3].jobs || [];
            if (window.ZomorodaCommander && !window.commanderLoaded) { await window.ZomorodaCommander.load(csrf); window.commanderLoaded = true; }
            renderMaster(); renderKpis(); renderAttention(); renderAgents(); renderQueue(); renderAside(); renderRunResult();
            if (tab === 'tasks') renderTasks();
            if (tab === 'activity') await loadFeed();
            if (tab === 'outbox') await loadOutbox();
            if (el('notice').classList.contains('error') === false && /جارٍ/.test(el('notice').textContent)) el('notice').textContent = '';
            el('live').className = 'live'; el('liveText').textContent = 'مباشر · آخر تحديث ' + new Date().toLocaleTimeString('ar-EG');
        } catch (error) {
            setNotice(error.message, true); el('live').className = 'live off'; el('liveText').textContent = 'انقطع الاتصال';
        }
    }

    document.querySelectorAll('.tab').forEach(function (b) { b.onclick = function () { showTab(b.dataset.tab); }; });
    el('commanderForm').onsubmit = async function (event) {
        event.preventDefault();
        var button = el('commanderAsk'), output = el('commanderAnswer');
        button.disabled = true; output.classList.remove('hidden'); output.textContent = 'جارٍ قراءة حالة النظام…';
        try { output.textContent = (await api('/api/v1/admin/commander/ask', 'POST', { question: el('commanderQuestion').value })).answer; }
        catch (error) { output.textContent = error.message; }
        finally { button.disabled = false; }
    };
    function setView(mode) { viewMode = mode; try { localStorage.setItem('zmr_agents_view', mode); } catch (e) { /* ignore */ } el('viewCards').setAttribute('aria-pressed', String(mode === 'cards')); el('viewTable').setAttribute('aria-pressed', String(mode === 'table')); if (overview) renderAgents(); }
    el('viewCards').onclick = function () { setView('cards'); }; el('viewTable').onclick = function () { setView('table'); }; setView(viewMode);
    el('agentSearch').oninput = function (e) { agentSearch = e.target.value; renderAgents(); };
    el('agentState').onchange = function (e) { agentState = e.target.value; renderAgents(); };
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
    setInterval(function () { if (!document.hidden && !pauseFormFor && !settingsFormFor && !editingIntegrations && tab !== 'tasks') loadAll(); }, 8000);
})();
</script>
</body>
</html>`;
}
module.exports = { getAgentsHtml };
