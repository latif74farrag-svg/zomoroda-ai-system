function getManagerHtml() {
    return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="theme-color" content="#0b3d2e">
    <title>مركز الإدارة | الزمردة</title>
    <style>
        :root{color-scheme:light;--green:#0b3d2e;--green-2:#176b4a;--mint:#eaf4ed;--ink:#172b22;--muted:#62746a;--line:#e1e9e3;--surface:#fff;--bg:#f4f7f5;--gold:#a66b12;--shadow:0 12px 32px #123b2b0d}
        *{box-sizing:border-box}
        body{margin:0;background:var(--bg);color:var(--ink);font-family:Tahoma,Arial,sans-serif;line-height:1.6}
        a{color:inherit}
        a:focus-visible{outline:3px solid #e6b34c;outline-offset:3px}
        .topbar{background:var(--green);color:#fff}
        .topbar-inner{width:min(1180px,calc(100% - 36px));min-height:76px;margin:auto;display:flex;align-items:center;justify-content:space-between;gap:20px}
        .brand{display:flex;align-items:center;gap:12px;font-weight:800}
        .brand-mark{width:42px;height:42px;border-radius:13px;background:#1a7050;display:grid;place-items:center;font-size:23px}
        .brand small{display:block;color:#b9d8c8;font-size:12px;font-weight:500}
        nav{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
        nav a{padding:9px 12px;border-radius:9px;color:#e3f1e8;text-decoration:none;font-size:14px}
        nav a:hover,nav a[aria-current=page]{background:#ffffff1a;color:#fff}
        main{width:min(1180px,calc(100% - 36px));margin:34px auto 60px}
        .hero{position:relative;overflow:hidden;padding:32px;border-radius:22px;background:linear-gradient(120deg,#0b3d2e,#176b4a);color:white;box-shadow:0 18px 38px #123b2b20}
        .hero:after{content:"";position:absolute;width:270px;height:270px;border:1px solid #ffffff18;border-radius:50%;left:-70px;top:-150px;box-shadow:0 0 0 34px #ffffff08,0 0 0 70px #ffffff06}
        .eyebrow{font-size:13px;font-weight:700;color:#c5e7d2}
        h1{font-size:clamp(28px,4vw,40px);line-height:1.25;margin:8px 0}
        .hero p{max-width:700px;margin:0;color:#e1f0e7;line-height:1.9}
        .notice{margin:18px 0;padding:13px 16px;border:1px solid #d6e5d9;border-radius:12px;background:#edf6ef;color:#315d42}
        .notice.error{border-color:#f0d4c8;background:#fff2ec;color:#853d25}
        .section-heading{display:flex;align-items:end;justify-content:space-between;gap:12px;margin:30px 0 14px}
        .section-heading h2{margin:0;font-size:21px}
        .section-heading p{margin:4px 0 0;color:var(--muted);font-size:14px}
        .metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
        .metric{min-height:120px;padding:18px;background:var(--surface);border:1px solid var(--line);border-radius:16px;box-shadow:var(--shadow)}
        .metric-label{display:flex;align-items:center;justify-content:space-between;gap:10px;color:var(--muted);font-size:13px}
        .metric-icon{width:34px;height:34px;display:grid;place-items:center;border-radius:10px;background:var(--mint);font-size:17px}
        .metric-value{display:block;margin-top:8px;font-size:25px;line-height:1.3;font-weight:800;color:var(--green)}
        .metric-value.text{font-size:18px}
        .cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
        .card{display:flex;flex-direction:column;align-items:flex-start;min-height:230px;padding:22px;background:var(--surface);border:1px solid var(--line);border-radius:18px;box-shadow:var(--shadow);transition:transform .18s ease,border-color .18s ease}
        .card:hover{transform:translateY(-3px);border-color:#a9cbb4}
        .card-icon{width:46px;height:46px;display:grid;place-items:center;border-radius:14px;background:var(--mint);font-size:22px}
        .card h3{margin:15px 0 6px;font-size:18px}
        .card p{margin:0 0 18px;color:var(--muted);font-size:14px;line-height:1.8}
        .card-link{margin-top:auto;display:inline-flex;align-items:center;gap:7px;padding:10px 14px;border-radius:10px;background:var(--green-2);color:white;text-decoration:none;font-weight:700;font-size:14px}
        .card-link:hover{background:var(--green)}
        .store-section{margin-top:22px;padding:22px;background:#edf3ef;border:1px solid #dce8df;border-radius:18px}
        .store-head{display:flex;justify-content:space-between;align-items:center;gap:14px;margin-bottom:14px}
        .store-head h2{margin:0;font-size:19px}
        .store-head p{margin:4px 0 0;color:var(--muted);font-size:13px}
        .store-links{display:flex;gap:10px;flex-wrap:wrap}
        .store-link{padding:10px 14px;border:1px solid #cbdccf;border-radius:10px;background:white;color:var(--green);text-decoration:none;font-weight:700;font-size:14px}
        .store-link:hover{border-color:var(--green-2);background:#f8fcf9}
        .safety-note{margin-top:18px;color:var(--muted);font-size:13px}
        @media(max-width:850px){.metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.cards{grid-template-columns:1fr}}
        @media(max-width:600px){.topbar-inner{padding:14px 0;align-items:flex-start;flex-direction:column;gap:10px}nav{gap:2px}nav a{padding:8px}.hero{padding:24px 20px}.store-head{align-items:flex-start;flex-direction:column}.metric{min-height:108px;padding:15px}}
        @media(max-width:380px){.metrics{grid-template-columns:1fr}}
        @media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;transition:none!important}}
    </style>
</head>
<body>
    <header class="topbar">
        <div class="topbar-inner">
            <div class="brand"><span class="brand-mark" aria-hidden="true">✦</span><span>الزمردة<small>مركز الإدارة</small></span></div>
            <nav aria-label="التنقل الرئيسي">
                <a href="/store/manager" aria-current="page">الرئيسية</a>
                <a href="/store/agents">الوكلاء</a>
                <a href="/store/campaigns">الحملات</a>
                <a href="/store/channels">القنوات</a>
                <a href="/store/operations">عمليات المتجر</a>
            </nav>
        </div>
    </header>
    <main>
        <section class="hero">
            <div class="eyebrow">نظرة عامة على العمل</div>
            <h1 id="greeting">كل شيء واضح، من مكان واحد</h1>
            <p>تابع الوكلاء والحملات والقنوات من لوحة واحدة. اختر القسم المطلوب للانتقال مباشرة إلى أدواته وتفاصيله.</p>
        </section>
        <div id="notice" class="notice" role="status" aria-live="polite">جارٍ تحميل ملخص الإدارة…</div>
        <section aria-labelledby="overview-title">
            <div class="section-heading"><div><h2 id="overview-title">ملخص سريع</h2><p>مؤشرات الإدارة عند فتح هذه الصفحة</p></div></div>
            <div class="metrics">
                <article class="metric"><div class="metric-label"><span>مقترحات بانتظار المراجعة</span><span class="metric-icon" aria-hidden="true">✓</span></div><strong id="reviews" class="metric-value">—</strong></article>
                <article class="metric"><div class="metric-label"><span>حملات محفوظة</span><span class="metric-icon" aria-hidden="true">✉</span></div><strong id="campaigns" class="metric-value">—</strong></article>
                <article class="metric"><div class="metric-label"><span>منتجات منخفضة المخزون</span><span class="metric-icon" aria-hidden="true">▤</span></div><strong id="stock" class="metric-value">—</strong></article>
                <article class="metric"><div class="metric-label"><span>حالة العامل الخلفي</span><span class="metric-icon" aria-hidden="true">●</span></div><strong id="worker" class="metric-value text">—</strong></article>
            </div>
        </section>
        <section aria-labelledby="sections-title">
            <div class="section-heading"><div><h2 id="sections-title">أقسام الإدارة</h2><p>كل قسم لمسؤولية واضحة</p></div></div>
            <div class="cards">
                <article class="card"><span class="card-icon" aria-hidden="true">✦</span><h3>وكلاء الذكاء الاصطناعي</h3><p>تابع حالة الوكلاء وراجع المقترحات قبل اعتمادها. لا تُنفّذ الإجراءات الحساسة دون موافقة.</p><a class="card-link" href="/store/agents">فتح إدارة الوكلاء <span aria-hidden="true">←</span></a></article>
                <article class="card"><span class="card-icon" aria-hidden="true">▤</span><h3>الحملات التسويقية</h3><p>أنشئ المسودات واحفظها وراجع حالتها في مكتبة الحملات. استيراد الحملات القديمة متاح من رابط الأرشيف داخل المركز.</p><a class="card-link" href="/store/campaigns">فتح مكتبة الحملات <span aria-hidden="true">←</span></a></article>
                <article class="card"><span class="card-icon" aria-hidden="true">◎</span><h3>قنوات التواصل</h3><p>راجع معلومات التواصل وحالة جاهزية القنوات، مع التمييز بين الروابط والإرسال الفعلي.</p><a class="card-link" href="/store/channels">عرض القنوات <span aria-hidden="true">←</span></a></article>
            </div>
        </section>
        <section class="store-section" aria-labelledby="store-title">
            <div class="store-head"><div><h2 id="store-title">عمليات المتجر</h2><p>المخزون والطلبات وإعدادات المنتجات في مساحة منفصلة.</p></div></div>
            <div class="store-links"><a class="store-link" href="/store/operations">إدارة المخزون والطلبات</a><a class="store-link" href="/store/admin">إعدادات المتجر</a><a class="store-link" href="/store">عرض المتجر</a></div>
        </section>
        <p class="safety-note">مراجعة أو اعتماد مسودة الحملة لا يرسل رسائل تلقائياً؛ لا يوجد إرسال آلي مفعّل حالياً.</p>
    </main>
    <script>
        const el = id => document.getElementById(id);
        const showError = message => {
            el('notice').textContent = message;
            el('notice').classList.add('error');
        };
        async function api(url) {
            const response = await fetch(url, { credentials: 'same-origin' });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || 'تعذر تحميل بيانات الإدارة.');
            return data;
        }
        async function load() {
            try {
                const session = await api('/api/store/admin/session');
                if (!session.authenticated) {
                    showError('سجّل الدخول من صفحة إدارة المتجر لعرض ملخص الإدارة.');
                    return;
                }
                if (session.staff.role !== 'admin') {
                    showError('هذه الصفحة مخصصة لحساب المدير.');
                    return;
                }
                const [agents, campaigns, operations] = await Promise.all([
                    api('/api/v1/admin/agents'),
                    api('/api/v1/admin/marketing/campaigns'),
                    api('/api/v1/admin/operations')
                ]);
                el('greeting').textContent = 'أهلاً ' + session.staff.name + '، كل شيء واضح من مكان واحد';
                el('reviews').textContent = agents.tasks.filter(task => task.status === 'proposed').length;
                el('campaigns').textContent = campaigns.campaigns.length;
                el('stock').textContent = operations.lowStockProducts;
                const age = operations.workerHeartbeatAgeMs;
                const worker = age === null ? 'غير متصل' : age < 120000 ? 'متصل' : 'تحتاج متابعة';
                el('worker').textContent = worker;
                el('notice').textContent = 'تم تحميل ملخص الإدارة بنجاح.';
            } catch (error) {
                showError(error.message);
            }
        }
        load();
    </script>
</body>
</html>`;
}
module.exports = { getManagerHtml };
