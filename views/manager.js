const SECTORS = [
    { name: 'الصيدليات والوكلاء', badge: 'مناديل رونزا فقط', exclusive: true, desc: 'يُرسل لهم مناديل رونزا حصراً. يُمنع إرسال أي منتج آخر لحماية هوامش الوكلاء.', price: 'متوسط الوحدة: 110 ج.م' },
    { name: 'الهايبرات وتجار الجملة', badge: 'جملة موسعة', desc: 'مناديل رونزا ويونو، معطرات جو وأرضيات، وفوط مطبخ رول قماش.', price: 'متوسط الوحدة: 95 ج.م' },
    { name: 'شركات التوزيع والمخازن', badge: 'كميات كبرى', desc: 'كافة خطوط الإنتاج بكميات وشحنات كبرى بأسعار الموزعين.', price: 'متوسط الوحدة: 95 ج.م' },
    { name: 'الفنادق والتوريدات الكبرى', badge: 'Private Label', exclusive: true, desc: 'طباعة شعار الفندق على المنديل السنجل، مع معطرات وفوط تنشيف مرة واحدة.', price: 'متوسط الوحدة: 200 ج.م' },
    { name: 'الصالونات ومراكز التجميل', badge: 'فوط ومعطرات', desc: 'فوط تنشيف مرة واحدة ومناديل معطرة ومعطرات فواحة.', price: 'متوسط الوحدة: 150 ج.م' },
    { name: 'الماميز وربات البيوت', badge: 'قطاعي + عمولة', desc: 'أسعار الجمهور حصراً مع شجرة العمولات وترقية المشرفات.', price: 'أسعار قطاعي' }
];

const sectorCards = SECTORS.map(s => `<article class="sector"><div class="sector-head"><h3>${s.name}</h3><span class="tag${s.exclusive ? ' tag-strict' : ''}">${s.badge}</span></div><p>${s.desc}</p><strong>${s.price}</strong></article>`).join('');

function getManagerHtml() {
    return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="theme-color" content="#064e3b">
    <title>مركز الإدارة | الزمردة</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
    <style>
        :root{--primary:#064e3b;--primary-dark:#022c22;--emerald:#10b981;--mint:#ecfdf5;--gold:#d97706;--ink:#0f172a;--muted:#475569;--line:#e2e8f0;--bg:#f1f5f9;--surface:#fff;--shadow:0 10px 25px -5px #00000012,0 8px 10px -6px #0000000a}
        *{box-sizing:border-box;margin:0;padding:0;font-family:'Cairo',Tahoma,Arial,sans-serif}
        body{background:var(--bg);color:var(--ink);min-height:100vh;line-height:1.7}
        a{color:inherit}
        a:focus-visible,button:focus-visible{outline:3px solid #e6b34c;outline-offset:3px}
        .top{background:linear-gradient(135deg,var(--primary-dark),var(--primary) 60%,#065f46);color:#fff;border-bottom:2px solid #10b9814d;box-shadow:0 4px 20px #064e3b40}
        .wrap{width:min(1240px,calc(100% - 36px));margin:auto}
        .brand-row{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;padding:22px 0 14px}
        .brand{display:flex;align-items:center;gap:14px}
        .logo{width:54px;height:54px;border-radius:16px;background:linear-gradient(135deg,#10b981,#059669);display:grid;place-items:center;font-size:28px;border:2px solid #ffffff40;box-shadow:0 0 20px #10b98166}
        .brand h1{font-size:22px;font-weight:800}
        .brand p{font-size:13px;color:#a7f3d0}
        .who{background:#ffffff1f;border:1px solid #ffffff33;border-radius:30px;padding:7px 16px;font-size:14px;font-weight:700;color:#fef3c7}
        .ticker{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px;padding-bottom:18px}
        .pill{display:flex;align-items:center;gap:10px;padding:9px 13px;border-radius:12px;background:#ffffff14;border:1px solid #ffffff1f;font-size:12.5px;color:#f0fdf4}
        .dot{width:10px;height:10px;border-radius:50%;background:var(--emerald);flex:none}
        .dot.warn{background:#f59e0b}.dot.off{background:#94a3b8}
        .pages{background:#fff;border-bottom:1px solid var(--line)}
        .pages .wrap{display:flex;align-items:center;gap:8px;overflow-x:auto;padding:10px 0}
        .pages a{padding:8px 14px;border-radius:20px;text-decoration:none;font-size:13.5px;font-weight:700;white-space:nowrap;color:var(--muted)}
        .pages a:hover{background:var(--mint);color:var(--primary)}
        .pages a[aria-current=page]{background:var(--primary);color:#fff}
        .ribbon{background:#fff;border-bottom:1px solid var(--line)}
        .ribbon .wrap{display:flex;align-items:center;gap:10px;overflow-x:auto;padding:10px 0}
        .ribbon b{font-size:13px;color:var(--muted);white-space:nowrap}
        .chip{display:inline-flex;gap:6px;align-items:center;padding:7px 14px;border-radius:20px;color:#fff;text-decoration:none;font-size:13px;font-weight:700;white-space:nowrap;transition:transform .2s}
        .chip:hover{transform:translateY(-2px)}
        .c-whatsapp{background:#25d366}.c-email{background:#ea4335}.c-messenger{background:#1877f2}.c-instagram{background:linear-gradient(45deg,#f09433,#dc2743,#bc1888)}.c-telegram{background:#229ed9}.c-linkedin{background:#0a66c2}.c-ronza{background:#059669}
        .ribbon .none{font-size:13px;color:var(--muted)}
        main{padding:24px 0 56px}
        .notice{margin-bottom:18px;padding:12px 16px;border:1px solid #d6e5d9;border-radius:12px;background:#edf6ef;color:#315d42;font-size:14px}
        .notice.error{border-color:#f0d4c8;background:#fff2ec;color:#853d25}
        .notice a{font-weight:800}
        .kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-bottom:24px}
        .kpi{display:flex;align-items:center;gap:16px;padding:20px;background:var(--surface);border:1px solid var(--line);border-radius:14px;box-shadow:var(--shadow)}
        .kpi-icon{width:52px;height:52px;border-radius:14px;display:grid;place-items:center;font-size:24px;flex:none}
        .kpi h4{font-size:13px;color:var(--muted);font-weight:600}
        .kpi strong{display:block;font-size:26px;font-weight:800;line-height:1.2}
        .kpi strong.text{font-size:19px}
        .tabs{display:flex;gap:8px;border-bottom:2px solid var(--line);margin-bottom:24px;overflow-x:auto}
        .tab{background:none;border:none;padding:12px 20px;font-size:15px;font-weight:700;color:var(--muted);cursor:pointer;white-space:nowrap;border-radius:8px 8px 0 0}
        .tab:hover{color:var(--primary);background:#064e3b0a}
        .tab[aria-selected=true]{color:var(--primary);background:#fff;border-bottom:3px solid var(--emerald)}
        .pane{display:none}.pane.active{display:block;animation:fade .25s ease}
        @keyframes fade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        .panel{background:#fff;border:1px solid var(--line);border-radius:16px;padding:26px;box-shadow:var(--shadow);margin-bottom:24px}
        .panel h2{font-size:18px;font-weight:800;color:var(--primary)}
        .panel>p{font-size:13.5px;color:var(--muted);margin:2px 0 18px;padding-bottom:12px;border-bottom:1px solid var(--line)}
        .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px}
        .card{display:flex;flex-direction:column;align-items:flex-start;padding:22px;border:2px solid var(--line);border-radius:14px;background:#fdfdfd;transition:.2s}
        .card:hover{border-color:var(--emerald);background:var(--mint);transform:translateY(-2px)}
        .card-icon{width:46px;height:46px;border-radius:14px;background:var(--mint);display:grid;place-items:center;font-size:22px}
        .card h3{margin:12px 0 4px;font-size:17px;color:var(--primary)}
        .card p{margin-bottom:16px;font-size:13.5px;color:var(--muted)}
        .btn{margin-top:auto;display:inline-flex;gap:8px;align-items:center;padding:10px 18px;border-radius:12px;background:linear-gradient(135deg,#059669,#047857);color:#fff;text-decoration:none;font-weight:800;font-size:14px;box-shadow:0 4px 14px #05966959}
        .btn:hover{transform:translateY(-2px)}
        .btn.ghost{background:#fff;color:var(--primary);border:1px solid #cbdccf;box-shadow:none}
        .links{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}
        .sector{padding:18px;border:2px solid var(--line);border-radius:14px;background:#fdfdfd}
        .sector-head{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px}
        .sector h3{font-size:15px;font-weight:800;color:var(--primary)}
        .sector p{font-size:13px;color:var(--muted);margin-bottom:8px}
        .sector strong{font-size:13px}
        .tag{font-size:11px;font-weight:700;padding:3px 9px;border-radius:12px;background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0;white-space:nowrap}
        .tag-strict{background:#fef2f2;color:#dc2626;border-color:#fecaca}
        .rule{margin-top:16px;padding:14px 16px;background:#fffbeb;border:1px solid #fde68a;border-radius:12px;font-size:13.5px;color:#78350f}
        .timeline{display:flex;flex-direction:column;gap:12px}
        .entry{display:flex;gap:14px;align-items:flex-start;padding:13px 16px;background:#f8fafc;border-radius:12px;border-right:4px solid var(--emerald)}
        .entry-action{background:var(--ink);color:#f8fafc;font-size:11px;font-weight:700;padding:3px 10px;border-radius:6px;white-space:nowrap;direction:ltr}
        .entry-meta{font-size:11.5px;color:var(--muted)}
        .entry-text{font-size:13.5px;font-weight:600;overflow-wrap:anywhere}
        .empty{text-align:center;padding:24px;color:var(--muted);font-size:14px;background:#f8fafc;border:1px dashed var(--line);border-radius:12px}
        footer{background:var(--ink);color:#94a3b8;padding:22px 0;text-align:center;font-size:13px}
        @media(max-width:600px){.panel{padding:18px}.kpis{grid-template-columns:1fr 1fr}.kpi{padding:14px;gap:10px}.kpi-icon{width:42px;height:42px}}
        @media(max-width:380px){.kpis{grid-template-columns:1fr}}
        @media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
    </style>
</head>
<body>
    <header class="top">
        <div class="wrap">
            <div class="brand-row">
                <div class="brand"><div class="logo" aria-hidden="true">💎</div><div><h1>الزمردة كوزماتيكس</h1><p>مركز الإدارة والتسويق المشرف عليه</p></div></div>
                <div class="who" id="who">المؤسس والمدير العام: عبداللطيف فراج</div>
            </div>
            <div class="ticker" aria-label="حالة النظام">
                <div class="pill"><span class="dot off" id="dot-worker"></span><span><b>العامل الخلفي:</b> <span id="worker-pill">—</span></span></div>
                <div class="pill"><span class="dot"></span><span><b>درع الأمان:</b> فاصل 30 يوماً بين الرسائل لكل رقم</span></div>
                <div class="pill"><span class="dot warn"></span><span><b>واتساب والإيميل:</b> 9 ص – 6 م، واستراحة 30 دقيقة كل 5 رسائل</span></div>
                <div class="pill"><span class="dot off"></span><span><b>الإرسال الآلي:</b> غير مفعّل؛ الحملات مسودات للمراجعة</span></div>
            </div>
        </div>
    </header>
    <div class="pages"><div class="wrap" role="navigation" aria-label="التنقل الرئيسي">
        <a href="/store/manager" aria-current="page">الرئيسية</a>
        <a href="/store/agents">الوكلاء</a>
        <a href="/store/campaigns">الحملات</a>
        <a href="/store/campaign-history">أرشيف الحملات</a>
        <a href="/store/channels">القنوات</a>
        <a href="/store/operations">عمليات المتجر</a>
    </div></div>
    <div class="ribbon"><div class="wrap" id="ribbon"><b>⚡ القنوات:</b><span class="none">تظهر روابط القنوات بعد تسجيل دخول المدير.</span></div></div>
    <main class="wrap">
        <div id="notice" class="notice" role="status" aria-live="polite">جارٍ تحميل ملخص الإدارة…</div>
        <section class="kpis" aria-label="مؤشرات سريعة">
            <article class="kpi"><div class="kpi-icon" style="background:#ecfdf5;color:#059669" aria-hidden="true">✓</div><div><h4>مقترحات بانتظار المراجعة</h4><strong id="reviews">—</strong></div></article>
            <article class="kpi"><div class="kpi-icon" style="background:#fffbeb;color:#d97706" aria-hidden="true">✉</div><div><h4>حملات محفوظة</h4><strong id="campaigns">—</strong></div></article>
            <article class="kpi"><div class="kpi-icon" style="background:#eff6ff;color:#2563eb" aria-hidden="true">▤</div><div><h4>منتجات منخفضة المخزون</h4><strong id="stock">—</strong></div></article>
            <article class="kpi"><div class="kpi-icon" style="background:#f5f3ff;color:#7c3aed" aria-hidden="true">◎</div><div><h4>قنوات بروابط متاحة</h4><strong id="channels-count" class="text">—</strong></div></article>
        </section>
        <div class="tabs" role="tablist" aria-label="أقسام مركز الإدارة">
            <button class="tab" role="tab" id="t-overview" aria-controls="overview" aria-selected="true" data-tab="overview">🚀 أقسام الإدارة</button>
            <button class="tab" role="tab" id="t-sectors" aria-controls="sectors" aria-selected="false" data-tab="sectors">📦 القطاعات والكتالوجات</button>
            <button class="tab" role="tab" id="t-log" aria-controls="log" aria-selected="false" data-tab="log">👔 سجل الإجراءات</button>
        </div>
        <section id="overview" class="pane active" role="tabpanel" aria-labelledby="t-overview">
            <div class="panel">
                <h2>أقسام الإدارة</h2><p>كل قسم لمسؤولية واضحة. لا تُنفّذ الإجراءات الحساسة دون موافقتك.</p>
                <div class="cards">
                    <article class="card"><span class="card-icon" aria-hidden="true">✦</span><h3>وكلاء الذكاء الاصطناعي</h3><p>تابع حالة الوكلاء وراجع المقترحات قبل اعتمادها.</p><a class="btn" href="/store/agents">فتح إدارة الوكلاء <span aria-hidden="true">←</span></a></article>
                    <article class="card"><span class="card-icon" aria-hidden="true">▤</span><h3>الحملات التسويقية</h3><p>أنشئ المسودات واحفظها وراجع حالتها. مراجعة المسودة لا ترسل رسائل.</p><a class="btn" href="/store/campaigns">فتح مكتبة الحملات <span aria-hidden="true">←</span></a></article>
                    <article class="card"><span class="card-icon" aria-hidden="true">🗂</span><h3>أرشيف الحملات القديمة</h3><p>سجل الحملات والعروض ومنع التكرار المستورد من النظام القديم.</p><a class="btn" href="/store/campaign-history">فتح الأرشيف <span aria-hidden="true">←</span></a></article>
                    <article class="card"><span class="card-icon" aria-hidden="true">◎</span><h3>قنوات التواصل</h3><p>روابط القنوات وجاهزية الربط، مع التمييز بين الرابط والإرسال الفعلي.</p><a class="btn" href="/store/channels">عرض القنوات <span aria-hidden="true">←</span></a></article>
                </div>
                <div class="links"><a class="btn ghost" href="/store/operations">إدارة المخزون والطلبات</a><a class="btn ghost" href="/store/admin">إعدادات المتجر</a><a class="btn ghost" href="/store">عرض المتجر</a></div>
            </div>
        </section>
        <section id="sectors" class="pane" role="tabpanel" aria-labelledby="t-sectors">
            <div class="panel">
                <h2>القطاعات الستة وقواعد العزل</h2><p>لا يُرسل كتالوج أو سعر قطاع إلى قطاع آخر، حمايةً للهوامش.</p>
                <div class="cards">${sectorCards}</div>
                <div class="rule">قاعدة الأمان: يمر 30 يوماً كاملة قبل مراسلة أي رقم أو إيميل مرة ثانية، ويتوقف أي رقم طلب الإيقاف نهائياً.</div>
            </div>
        </section>
        <section id="log" class="pane" role="tabpanel" aria-labelledby="t-log">
            <div class="panel">
                <h2>سجل الإجراءات الإدارية</h2><p>آخر 20 إجراءً موثقاً في النظام.</p>
                <div id="timeline" class="timeline"><div class="empty">سجّل الدخول بحساب المدير لعرض السجل.</div></div>
            </div>
        </section>
    </main>
    <footer><div class="wrap">الزمردة كوزماتيكس · إدارة عبداللطيف فراج · القاهرة والجيزة وباقي المحافظات</div></footer>
    <script>
        const el = id => document.getElementById(id);
        const notice = (message, error) => {
            el('notice').textContent = message;
            el('notice').classList.toggle('error', Boolean(error));
        };
        document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.setAttribute('aria-selected', String(t === tab)));
            document.querySelectorAll('.pane').forEach(p => p.classList.toggle('active', p.id === tab.dataset.tab));
        }));
        async function api(url) {
            const response = await fetch(url, { credentials: 'same-origin' });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || 'تعذر تحميل بيانات الإدارة.');
            return data;
        }
        function loginNotice(text) {
            const box = el('notice');
            box.classList.add('error');
            box.textContent = text + ' ';
            const link = document.createElement('a');
            link.href = '/store/admin';
            link.textContent = 'تسجيل الدخول';
            box.append(link);
        }
        function renderRibbon(channels) {
            const root = el('ribbon');
            root.replaceChildren();
            const label = document.createElement('b');
            label.textContent = '⚡ القنوات:';
            root.append(label);
            channels.filter(c => c.href).forEach(c => {
                const a = document.createElement('a');
                a.className = 'chip c-' + c.id;
                a.href = c.href;
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
                a.textContent = c.name;
                root.append(a);
            });
        }
        function renderLog(entries) {
            const root = el('timeline');
            root.replaceChildren();
            if (!entries.length) {
                const empty = document.createElement('div');
                empty.className = 'empty';
                empty.textContent = 'لا توجد إجراءات مسجلة بعد.';
                root.append(empty);
                return;
            }
            entries.forEach(e => {
                const row = document.createElement('div');
                row.className = 'entry';
                const action = document.createElement('span');
                action.className = 'entry-action';
                action.textContent = e.action;
                const body = document.createElement('div');
                const meta = document.createElement('div');
                meta.className = 'entry-meta';
                meta.textContent = new Date(Number(e.created_at)).toLocaleString('ar-EG');
                const text = document.createElement('div');
                text.className = 'entry-text';
                text.textContent = e.resource;
                body.append(meta, text);
                row.append(action, body);
                root.append(row);
            });
        }
        async function load() {
            try {
                const session = await api('/api/store/admin/session');
                if (!session.authenticated) return loginNotice('سجّل الدخول لعرض ملخص الإدارة.');
                if (session.staff.role !== 'admin') return notice('هذه الصفحة مخصصة لحساب المدير.', true);
                el('who').textContent = session.staff.name + ' · مدير';
                const [agents, campaigns, operations, channels, audit] = await Promise.all([
                    api('/api/v1/admin/agents'),
                    api('/api/v1/admin/marketing/campaigns'),
                    api('/api/v1/admin/operations'),
                    api('/api/v1/admin/channels'),
                    api('/api/v1/admin/audit')
                ]);
                el('reviews').textContent = agents.tasks.filter(task => task.status === 'proposed').length;
                el('campaigns').textContent = campaigns.campaigns.length;
                el('stock').textContent = operations.lowStockProducts;
                const age = operations.workerHeartbeatAgeMs;
                const state = age === null ? 'غير متصل' : age < 120000 ? 'متصل' : 'تحتاج متابعة';
                el('worker-pill').textContent = state;
                el('dot-worker').className = 'dot' + (age === null ? ' off' : age < 120000 ? '' : ' warn');
                const linked = channels.channels.filter(c => c.profileReady);
                el('channels-count').textContent = linked.length + ' من ' + channels.channels.length;
                renderRibbon(channels.channels);
                renderLog(audit.entries.slice(0, 20));
                notice('تم تحميل ملخص الإدارة بنجاح.');
            } catch (error) {
                notice(error.message, true);
            }
        }
        load();
    </script>
</body>
</html>`;
}
module.exports = { getManagerHtml };
