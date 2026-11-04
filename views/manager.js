const SECTORS = [
    { name: 'الصيدليات والوكلاء', badge: 'مناديل رونزا فقط', strict: true, desc: 'مناديل رونزا حصراً. يُمنع إرسال أي منتج آخر لحماية هوامش الوكلاء.', price: 'متوسط الوحدة: 110 ج.م' },
    { name: 'الهايبرات وتجار الجملة', badge: 'جملة موسعة', desc: 'مناديل رونزا ويونو، معطرات جو وأرضيات، وفوط مطبخ رول قماش.', price: 'متوسط الوحدة: 95 ج.م' },
    { name: 'شركات التوزيع والمخازن', badge: 'كميات كبرى', desc: 'كافة خطوط الإنتاج بكميات وشحنات كبرى بأسعار الموزعين.', price: 'متوسط الوحدة: 95 ج.م' },
    { name: 'الفنادق والتوريدات الكبرى', badge: 'Private Label', strict: true, desc: 'شعار الفندق على المنديل السنجل، مع معطرات وفوط تنشيف مرة واحدة.', price: 'متوسط الوحدة: 200 ج.م' },
    { name: 'الصالونات ومراكز التجميل', badge: 'فوط ومعطرات', desc: 'فوط تنشيف مرة واحدة ومناديل معطرة ومعطرات فواحة.', price: 'متوسط الوحدة: 150 ج.م' },
    { name: 'الماميز ومندوبو المبيعات وسفراء الزمردة', badge: 'كتالوج المستهلك + عمولة', desc: 'جروبات الماميز والمندوبون والسفراء بنظام العمولة يُرسل لهم كتالوج المستهلك فقط بأسعار الجمهور، مع شجرة العمولات وترقية المشرفات.', price: 'أسعار قطاعي' }
];

const sectorCards = SECTORS.map(s => `<article class="sector"><div class="sector-head"><h3>${s.name}</h3><span class="tag${s.strict ? ' tag-strict' : ''}">${s.badge}</span></div><p>${s.desc}</p><strong>${s.price}</strong></article>`).join('');

function getManagerHtml() {
    return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="theme-color" content="#064e3b">
    <title>مركز الإدارة | الزمردة</title>
    <style>
        :root{--primary:#064e3b;--emerald:#10b981;--mint:#ecfdf5;--gold:#d97706;--ink:#0f172a;--muted:#475569;--line:#e2e8f0;--bg:#f1f5f9;--shadow:0 10px 25px -5px #00000012,0 8px 10px -6px #0000000a}
        *{box-sizing:border-box;margin:0;padding:0;font-family:'Cairo',Tahoma,Arial,sans-serif}
        body{background:var(--bg);color:var(--ink);min-height:100vh;line-height:1.7}
        a{color:inherit}
        .wrap{width:min(1240px,calc(100% - 32px));margin:auto}
        .hero{background:linear-gradient(135deg,#022c22,#064e3b 60%,#065f46);color:#fff;padding:26px 0 20px}
        .hero h1{font-size:26px;font-weight:800;line-height:1.3}
        .hero p{color:#a7f3d0;font-size:14px}
        .ticker{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px;margin-top:16px}
        .pill{display:flex;align-items:center;gap:10px;padding:9px 13px;border-radius:12px;background:#ffffff14;border:1px solid #ffffff1f;font-size:12.5px;color:#f0fdf4}
        .dot{width:10px;height:10px;border-radius:50%;background:var(--emerald);flex:none}
        .dot.warn{background:#f59e0b}.dot.off{background:#94a3b8}
        main{padding:24px 0 56px}
        .notice{margin-bottom:18px;padding:12px 16px;border:1px solid #d6e5d9;border-radius:12px;background:#edf6ef;color:#315d42;font-size:14px}
        .notice.error{border-color:#f0d4c8;background:#fff2ec;color:#853d25}
        .notice a{font-weight:800}
        .kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:16px;margin-bottom:22px}
        .kpi{display:flex;align-items:center;gap:16px;padding:20px;background:#fff;border:1px solid var(--line);border-radius:14px;box-shadow:var(--shadow)}
        .kpi-icon{width:50px;height:50px;border-radius:14px;display:grid;place-items:center;font-size:23px;flex:none}
        .kpi h4{font-size:13px;color:var(--muted);font-weight:600}
        .kpi strong{display:block;font-size:26px;font-weight:800;line-height:1.2}
        .kpi strong.text{font-size:19px}
        .two{display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:start}
        .panel{background:#fff;border:1px solid var(--line);border-radius:16px;padding:24px;box-shadow:var(--shadow);margin-bottom:20px}
        .panel h2,details.panel summary{font-size:18px;font-weight:800;color:var(--primary)}
        .panel>p{font-size:13.5px;color:var(--muted);margin:2px 0 16px}
        details.panel summary{cursor:pointer}
        details.panel[open] summary{margin-bottom:4px}
        .todo{list-style:none;display:flex;flex-direction:column;gap:10px}
        .todo li{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 14px;background:#f8fafc;border-radius:12px;border-right:4px solid var(--emerald);font-size:14px;font-weight:600}
        .todo li.warn{border-right-color:var(--gold)}
        .todo li.empty{border-right:0}
        .todo a{font-size:13px;font-weight:800;color:var(--primary);white-space:nowrap}
        .timeline{display:flex;flex-direction:column;gap:10px}
        .entry{display:flex;gap:12px;align-items:flex-start;padding:12px 14px;background:#f8fafc;border-radius:12px;border-right:4px solid var(--emerald)}
        .entry-icon{font-size:20px;width:28px;text-align:center;flex:none}
        .entry-meta{font-size:11.5px;color:var(--muted)}
        .entry-text{font-size:13.5px;font-weight:600;overflow-wrap:anywhere}
        .empty{text-align:center;padding:20px;color:var(--muted);font-size:14px;background:#f8fafc;border:1px dashed var(--line);border-radius:12px}
        .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px}
        .sector{padding:16px;border:2px solid var(--line);border-radius:14px}
        .sector-head{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px}
        .sector h3{font-size:15px;font-weight:800;color:var(--primary)}
        .sector p{font-size:13px;color:var(--muted);margin-bottom:6px}
        .sector strong{font-size:13px}
        .tag{font-size:11px;font-weight:700;padding:3px 9px;border-radius:12px;background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0;white-space:nowrap}
        .tag-strict{background:#fef2f2;color:#dc2626;border-color:#fecaca}
        .rule{margin-top:14px;padding:13px 15px;background:#fffbeb;border:1px solid #fde68a;border-radius:12px;font-size:13.5px;color:#78350f}
        @media(max-width:860px){.two{grid-template-columns:1fr}}
        @media(max-width:600px){.panel{padding:18px}.kpis{grid-template-columns:1fr 1fr}.kpi{padding:14px;gap:10px}.kpi-icon{width:40px;height:40px}}
        @media(max-width:380px){.kpis{grid-template-columns:1fr}}
    </style>
</head>
<body>
    <section class="hero"><div class="wrap">
        <h1 id="greeting">مركز الإدارة</h1>
        <p>الحالة الآن وما يحتاج قرارك، من مكان واحد.</p>
        <div class="ticker" aria-label="حالة النظام">
            <div class="pill"><span class="dot off" id="dot-worker"></span><span><b>العامل الخلفي:</b> <span id="worker-pill">—</span></span></div>
            <div class="pill"><span class="dot warn"></span><span><b>واتساب والإيميل:</b> 9 ص – 6 م، استراحة 30 دقيقة كل 5 رسائل</span></div>
            <div class="pill"><span class="dot off"></span><span><b>الإرسال الآلي:</b> غير مفعّل، الحملات مسودات للمراجعة</span></div>
        </div>
    </div></section>
    <main class="wrap">
        <div id="notice" class="notice" role="status" aria-live="polite">جارٍ تحميل ملخص الإدارة…</div>
        <section class="kpis" aria-label="مؤشرات سريعة">
            <article class="kpi"><div class="kpi-icon" style="background:#ecfdf5;color:#059669" aria-hidden="true">✓</div><div><h4>مقترحات بانتظار المراجعة</h4><strong id="reviews">—</strong></div></article>
            <article class="kpi"><div class="kpi-icon" style="background:#fffbeb;color:#d97706" aria-hidden="true">✉</div><div><h4>مسودات حملات جديدة</h4><strong id="campaigns">—</strong></div></article>
            <article class="kpi"><div class="kpi-icon" style="background:#f5f3ff;color:#7c3aed" aria-hidden="true">🗂</div><div><h4>حملات مستوردة من النظام القديم</h4><strong id="legacy">—</strong></div></article>
            <article class="kpi"><div class="kpi-icon" style="background:#eff6ff;color:#2563eb" aria-hidden="true">▤</div><div><h4>منتجات منخفضة المخزون</h4><strong id="stock">—</strong></div></article>
        </section>
        <div class="two">
            <section class="panel" aria-labelledby="attn-h">
                <h2 id="attn-h">يحتاج انتباهك</h2><p>أمور مفتوحة تنتظر قراراً أو متابعة.</p>
                <ul id="attention" class="todo"><li class="empty">جارٍ التحميل…</li></ul>
            </section>
            <section class="panel" aria-labelledby="log-h">
                <h2 id="log-h">آخر الإجراءات</h2><p>آخر 8 إجراءات في النظام. <a href="/store/activity">عرض النشاط المباشر ←</a></p>
                <div id="timeline" class="timeline"><div class="empty">سجّل الدخول بحساب المدير لعرض السجل.</div></div>
            </section>
        </div>
        <details class="panel">
            <summary>القطاعات الستة وقواعد العزل</summary>
            <p>لا يُرسل كتالوج أو سعر قطاع إلى قطاع آخر، حمايةً للهوامش.</p>
            <div class="cards">${sectorCards}</div>
            <div class="rule">قاعدة الأمان: يمر 30 يوماً كاملة قبل مراسلة أي رقم أو إيميل مرة ثانية، ويتوقف أي رقم طلب الإيقاف نهائياً.</div>
        </details>
    </main>
    <script>
        const el = id => document.getElementById(id);
        const notice = (message, error) => {
            el('notice').textContent = message;
            el('notice').classList.toggle('error', Boolean(error));
        };
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
        function renderAttention(items) {
            const root = el('attention');
            root.replaceChildren();
            if (!items.length) {
                const empty = document.createElement('li');
                empty.className = 'empty';
                empty.textContent = 'لا شيء يحتاج انتباهك الآن.';
                root.append(empty);
                return;
            }
            items.forEach(item => {
                const li = document.createElement('li');
                if (item.warn) li.className = 'warn';
                const text = document.createElement('span');
                text.textContent = item.text;
                const link = document.createElement('a');
                link.href = item.href;
                link.textContent = 'فتح ←';
                li.append(text, link);
                root.append(li);
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
                action.className = 'entry-icon';
                action.textContent = e.icon || '•';
                const body = document.createElement('div');
                const meta = document.createElement('div');
                meta.className = 'entry-meta';
                meta.textContent = new Date(Number(e.created_at)).toLocaleString('ar-EG');
                const text = document.createElement('div');
                text.className = 'entry-text';
                text.textContent = e.text || e.action;
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
                el('greeting').textContent = 'أهلاً ' + session.staff.name;
                const [agents, campaigns, operations, audit, legacy] = await Promise.all([
                    api('/api/v1/admin/agents'),
                    api('/api/v1/admin/marketing/campaigns'),
                    api('/api/v1/admin/operations'),
                    api('/api/v1/admin/audit'),
                    api('/api/v1/admin/legacy/campaigns')
                ]);
                const pending = agents.tasks.filter(task => task.status === 'proposed').length;
                el('reviews').textContent = pending;
                el('campaigns').textContent = campaigns.campaigns.length;
                el('stock').textContent = operations.lowStockProducts;
                el('legacy').textContent = legacy.summary.campaign_state;
                const age = operations.workerHeartbeatAgeMs;
                const state = age === null ? 'غير متصل' : age < 120000 ? 'متصل' : 'تحتاج متابعة';
                el('worker-pill').textContent = state;
                el('dot-worker').className = 'dot' + (age === null ? ' off' : age < 120000 ? '' : ' warn');
                const items = [];
                if (pending) items.push({ text: pending + ' مقترحات بانتظار مراجعتك', href: '/store/agents', warn: true });
                if (operations.lowStockProducts) items.push({ text: operations.lowStockProducts + ' منتجات مخزونها منخفض', href: '/store/operations', warn: true });
                if (age !== null && age >= 120000) items.push({ text: 'العامل الخلفي ' + state, href: '/store/operations', warn: true });
                if (!campaigns.campaigns.length) items.push({ text: legacy.summary.campaign_state ? 'لا مسودات جديدة. الحملات القديمة محفوظة في الأرشيف' : 'لا توجد حملات بعد', href: legacy.summary.campaign_state ? '/store/campaign-history' : '/store/campaigns' });
                renderAttention(items);
                renderLog(audit.entries.slice(0, 8));
                notice('تم تحميل ملخص الإدارة.');
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
