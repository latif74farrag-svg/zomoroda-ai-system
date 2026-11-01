function getChannelsHtml(channelStatus = null) {
    const initialStatus = JSON.stringify(channelStatus)
        .replace(/</g, '\\u003c')
        .replace(/\u2028/g, '\\u2028')
        .replace(/\u2029/g, '\\u2029');
    return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="theme-color" content="#0b3d2e">
    <title>قنوات التواصل | الزمردة</title>
    <style>
        :root{--green:#0b3d2e;--green-2:#176b4a;--mint:#eaf4ed;--ink:#172b22;--muted:#62746a;--line:#e1e9e3;--surface:#fff;--bg:#f4f7f5;--gold:#80580f;--shadow:0 12px 32px #123b2b0d}
        *{box-sizing:border-box}
        body{margin:0;background:var(--bg);color:var(--ink);font-family:Tahoma,Arial,sans-serif;line-height:1.6}
        a{color:inherit}
        a:focus-visible,button:focus-visible{outline:3px solid #e6b34c;outline-offset:3px}
        .topbar{background:var(--green);color:white}
        .topbar-inner{width:min(1180px,calc(100% - 36px));min-height:76px;margin:auto;display:flex;align-items:center;justify-content:space-between;gap:20px}
        .brand{display:flex;align-items:center;gap:12px;font-weight:800}
        .brand-mark{width:42px;height:42px;border-radius:13px;background:#1a7050;display:grid;place-items:center;font-size:23px}
        .brand small{display:block;color:#b9d8c8;font-size:12px;font-weight:500}
        nav{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
        nav a{padding:9px 12px;border-radius:9px;color:#e3f1e8;text-decoration:none;font-size:14px}
        nav a:hover,nav a[aria-current=page]{background:#ffffff1a;color:white}
        main{width:min(1180px,calc(100% - 36px));margin:32px auto 60px}
        .hero{position:relative;overflow:hidden;padding:30px;border-radius:22px;background:linear-gradient(120deg,#0b3d2e,#176b4a);color:white;box-shadow:0 18px 38px #123b2b20}
        .eyebrow{font-size:13px;font-weight:700;color:#c5e7d2}
        h1{font-size:clamp(28px,4vw,38px);line-height:1.25;margin:8px 0}
        .hero p{max-width:760px;margin:0;color:#e1f0e7;line-height:1.9}
        .summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin:18px 0}
        .summary-card{padding:17px 19px;background:var(--surface);border:1px solid var(--line);border-radius:16px;box-shadow:var(--shadow)}
        .summary-label{display:block;color:var(--muted);font-size:13px}
        .summary-value{display:block;margin-top:5px;color:var(--green);font-size:19px;font-weight:800}
        .section-head{display:flex;align-items:end;justify-content:space-between;gap:14px;margin:30px 0 14px}
        .section-head h2{margin:0;font-size:21px}
        .section-head p{margin:4px 0 0;color:var(--muted);font-size:14px}
        .grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:15px}
        .channel{display:flex;flex-direction:column;min-height:235px;padding:20px;background:var(--surface);border:1px solid var(--line);border-radius:17px;box-shadow:var(--shadow)}
        .channel-top{display:flex;align-items:center;gap:12px}
        .channel-icon{width:46px;height:46px;display:grid;place-items:center;flex:none;border-radius:14px;background:var(--mint);color:var(--green);font-size:21px;font-weight:800}
        .channel h3{margin:0;font-size:17px}
        .purpose{margin:2px 0 0;color:var(--muted);font-size:13px}
        .badge{display:inline-flex;align-items:center;gap:7px;align-self:flex-start;margin-top:16px;padding:6px 10px;border-radius:99px;background:#fff3dc;color:var(--gold);font-size:12px;font-weight:700}
        .badge.ready{background:#e8f5eb;color:#23683e}
        .badge-dot{width:7px;height:7px;border-radius:50%;background:currentColor}
        .detail{margin:11px 0 15px;color:var(--muted);font-size:13px;line-height:1.8}
        .address{overflow-wrap:anywhere;margin:0 0 12px;color:#465d50;font-size:13px}
        .actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:auto}
        .open-link{display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:9px 13px;border-radius:10px;background:var(--green-2);color:white;text-decoration:none;font-size:13px;font-weight:700}
        .open-link:hover{background:var(--green)}
        .not-linked{font-size:12px;color:var(--muted)}
        .ai-panel{display:grid;grid-template-columns:1fr auto;align-items:center;gap:20px;margin-top:24px;padding:22px;background:white;border:1px solid var(--line);border-radius:17px;box-shadow:var(--shadow)}
        .ai-panel h2{margin:0;font-size:18px}
        .ai-panel p{margin:5px 0 0;color:var(--muted);font-size:14px;line-height:1.8}
        .ai-state{padding:8px 12px;border-radius:10px;background:#fff3dc;color:var(--gold);font-size:13px;font-weight:800;white-space:nowrap}
        .ai-state.ready{background:#e8f5eb;color:#23683e}
        .notice{margin:16px 0 0;padding:13px 15px;border:1px solid #d6e5d9;border-radius:12px;background:#edf6ef;color:#315d42;font-size:14px}
        .notice.error{border-color:#f0d4c8;background:#fff2ec;color:#853d25}
        .loading{grid-column:1/-1;padding:24px;background:white;border:1px solid var(--line);border-radius:15px;color:var(--muted);text-align:center}
        @media(max-width:850px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:650px){.topbar-inner{padding:14px 0;align-items:flex-start;flex-direction:column;gap:10px}nav{gap:2px}nav a{padding:8px}main{margin-top:22px}.hero{padding:23px 20px}.summary{grid-template-columns:1fr}.grid{grid-template-columns:1fr}.channel{min-height:0}.ai-panel{grid-template-columns:1fr;gap:12px}.ai-state{justify-self:start}}
        @media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;transition:none!important}}
    </style>
</head>
<body>
    <header class="topbar">
        <div class="topbar-inner">
            <div class="brand"><span class="brand-mark" aria-hidden="true">✦</span><span>الزمردة<small>إدارة قنوات التواصل</small></span></div>
            <nav aria-label="التنقل الرئيسي">
                <a href="/store/manager">الرئيسية</a>
                <a href="/store/agents">الوكلاء</a>
                <a href="/store/campaigns">الحملات</a>
                <a href="/store/channels" aria-current="page">القنوات</a>
                <a href="/store/operations">عمليات المتجر</a>
            </nav>
        </div>
    </header>
    <main>
        <section class="hero">
            <div class="eyebrow">حضور الشركة عبر المنصات</div>
            <h1>قنوات التواصل</h1>
            <p>اعرف أين يمكن للعملاء الوصول إلينا، وما إذا كان هناك موصل إرسال فعلي. رابط الصفحة أو البريد وحده لا يعني أن الإرسال الآلي متاح.</p>
        </section>
        <section class="summary" aria-label="ملخص القنوات">
            <article class="summary-card"><span class="summary-label">روابط تواصل متاحة</span><strong id="profiles" class="summary-value">—</strong></article>
            <article class="summary-card"><span class="summary-label">موصلات إرسال آلي</span><strong id="providers" class="summary-value">—</strong></article>
            <article class="summary-card"><span class="summary-label">آخر تحديث للحالة</span><strong id="updated" class="summary-value">بانتظار التحميل</strong></article>
        </section>
        <section aria-labelledby="channels-title">
            <div class="section-head"><div><h2 id="channels-title">صفحات الشركة ووسائل التواصل</h2><p>افتح القناة من بطاقتها؛ حالة الربط موضحة بشكل منفصل.</p></div></div>
            <div id="channels" class="grid" aria-live="polite"><div class="loading">جارٍ تحميل بيانات القنوات…</div></div>
        </section>
        <section class="ai-panel" aria-labelledby="ai-title">
            <div><h2 id="ai-title">جاهزية مساعد الدعم</h2><p id="support-detail">جارٍ التحقق من إعدادات المساعد…</p></div>
            <span id="support-state" class="ai-state">جارٍ التحقق</span>
        </section>
        <p id="notice" class="notice" role="status" aria-live="polite">يتم التحقق من صلاحية الوصول وتحميل الحالة.</p>
    </main>
    <script>
        const el = id => document.getElementById(id);
        const INITIAL_STATUS = ${initialStatus};
        const channelIcons = {whatsapp:'◉',email:'✉',messenger:'f',instagram:'◎',telegram:'➤',linkedin:'in',ronza:'✦'};
        function setNotice(message, error = false) {
            el('notice').textContent = message;
            el('notice').classList.toggle('error', error);
        }
        function renderChannels(channels) {
            const root = el('channels');
            root.replaceChildren();
            if (!channels.length) {
                const empty = document.createElement('p');
                empty.className = 'loading';
                empty.textContent = 'لا توجد قنوات مسجلة للعرض.';
                root.append(empty);
                return;
            }
            channels.forEach(channel => {
                const card = document.createElement('article');
                card.className = 'channel';
                const top = document.createElement('div');
                top.className = 'channel-top';
                const icon = document.createElement('span');
                icon.className = 'channel-icon';
                icon.setAttribute('aria-hidden', 'true');
                icon.textContent = channelIcons[channel.id] || '•';
                const heading = document.createElement('div');
                const name = document.createElement('h3');
                name.textContent = channel.name || 'قناة تواصل';
                const purpose = document.createElement('p');
                purpose.className = 'purpose';
                purpose.textContent = channel.purpose || '';
                heading.append(name, purpose);
                top.append(icon, heading);

                const linked = Boolean(channel.profileReady);
                const badge = document.createElement('span');
                badge.className = 'badge' + (channel.providerReady ? ' ready' : '');
                const dot = document.createElement('span');
                dot.className = 'badge-dot';
                dot.setAttribute('aria-hidden', 'true');
                const status = document.createElement('span');
                status.textContent = channel.providerReady ? 'الإرسال الآلي مرتبط' : linked ? 'رابط متاح — دون إرسال آلي' : 'يحتاج إلى إعداد';
                badge.append(dot, status);

                const detail = document.createElement('p');
                detail.className = 'detail';
                detail.textContent = channel.detail || '';
                card.append(top, badge);
                if (channel.address) {
                    const address = document.createElement('p');
                    address.className = 'address';
                    address.textContent = channel.address;
                    card.append(address);
                }
                card.append(detail);
                const actions = document.createElement('div');
                actions.className = 'actions';
                if (channel.href) {
                    const link = document.createElement('a');
                    link.className = 'open-link';
                    link.href = channel.href;
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                    link.textContent = 'فتح القناة';
                    actions.append(link);
                } else {
                    const unavailable = document.createElement('span');
                    unavailable.className = 'not-linked';
                    unavailable.textContent = 'لا يوجد رابط عام متاح';
                    actions.append(unavailable);
                }
                card.append(actions);
                root.append(card);
            });
        }
        function load() {
            if (!INITIAL_STATUS) {
                const gate = document.createElement('div');
                gate.className = 'loading';
                const text = document.createElement('p');
                text.textContent = 'القنوات وروابطها تظهر لحساب المدير فقط. سجّل الدخول ثم ارجع إلى هذه الصفحة.';
                const login = document.createElement('a');
                login.className = 'open-link';
                login.href = '/store/admin';
                login.textContent = 'تسجيل دخول المدير';
                gate.append(text, login);
                el('channels').replaceChildren(gate);
                el('profiles').textContent = '—';
                el('providers').textContent = '—';
                el('updated').textContent = 'غير متاح';
                el('support-state').textContent = 'يتطلب تسجيل الدخول';
                el('support-detail').textContent = 'سجّل الدخول بحساب المدير لعرض حالة مساعد الدعم والقنوات.';
                setNotice('سجّل الدخول إلى إدارة المتجر بصلاحية المدير لعرض هذه الصفحة.', true);
                return;
            }
            if (!Array.isArray(INITIAL_STATUS.channels)) {
                el('support-state').textContent = 'الحالة غير متاحة';
                el('support-detail').textContent = 'تعذر تحميل إعدادات القنوات من الخادم.';
                setNotice('استجابة حالة القنوات غير مكتملة.', true);
                return;
            }
            renderChannels(INITIAL_STATUS.channels);
            el('profiles').textContent = INITIAL_STATUS.channels.filter(channel => channel.profileReady).length + ' من ' + INITIAL_STATUS.channels.length;
            el('providers').textContent = INITIAL_STATUS.channels.filter(channel => channel.providerReady).length;
            el('updated').textContent = new Intl.DateTimeFormat('ar-EG', { hour: '2-digit', minute: '2-digit' }).format(new Date());
            const supportAi = INITIAL_STATUS.supportAi;
            if (supportAi && typeof supportAi.enabled === 'boolean') {
                el('support-state').textContent = supportAi.enabled ? 'مهيأ للمراجعة' : 'غير مفعّل';
                el('support-state').classList.toggle('ready', supportAi.enabled);
                el('support-detail').textContent = supportAi.message || 'المساعد ينشئ مسودات للمراجعة البشرية فقط.';
                setNotice('تم تحميل حالة القنوات بنجاح. لا يوجد إرسال آلي مفعّل من هذه الصفحة.');
            } else {
                el('support-state').textContent = 'الحالة غير متاحة';
                el('support-detail').textContent = 'لم تتوفر حالة مساعد الدعم من إعدادات الخادم.';
                setNotice('تم تحميل القنوات، لكن حالة مساعد الدعم غير متاحة.', true);
            }
        }
        load();
    </script>
</body>
</html>`;
}
module.exports = { getChannelsHtml };
