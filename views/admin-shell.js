// Grouped module navigation (Odoo/ERPNext-style): one sidebar of business areas instead of a flat link row.
const GROUPS = [
    { label: 'نظرة عامة', items: [
        { key: 'manager', href: '/store/manager', label: 'الرئيسية', icon: 'home' }
    ] },
    { label: 'المبيعات', items: [
        { key: 'admin', href: '/store/admin', label: 'المنتجات والطلبات', icon: 'cart' },
        { key: 'leads', href: '/store/leads', label: 'العملاء', icon: 'users' },
        { key: 'tenders', href: '/store/tenders', label: 'المناقصات', icon: 'doc' },
        { key: 'affiliates', href: '/store/affiliates', label: 'الماميز', icon: 'network' }
    ] },
    { label: 'المخزون والمشتريات', items: [
        { key: 'operations', href: '/store/operations', label: 'المخزون والعمليات', icon: 'box' },
        { key: 'purchasing', href: '/store/purchasing', label: 'المشتريات', icon: 'receipt' }
    ] },
    { label: 'التسويق', items: [
        { key: 'campaigns', href: '/store/campaigns', label: 'الحملات', icon: 'megaphone' },
        { key: 'history', href: '/store/campaign-history', label: 'سجل الحملات', icon: 'clock' },
        { key: 'channels', href: '/store/channels', label: 'القنوات', icon: 'link' }
    ] },
    { label: 'الذكاء الاصطناعي', items: [
        { key: 'agents', href: '/store/agents', label: 'إدارة الوكلاء', icon: 'bot' }
    ] },
    { label: 'الإعدادات', items: [
        { key: 'users', href: '/store/users', label: 'المستخدمون', icon: 'settings' }
    ] }
];

const ICONS = {"home":"<path d=\"M3 11l9-8 9 8\"/><path d=\"M5 10v10h14V10\"/>","cart":"<path d=\"M6 6h15l-2 9H8L6 6zm0 0L5 3H2\"/><circle cx=\"9\" cy=\"20\" r=\"1.5\"/><circle cx=\"18\" cy=\"20\" r=\"1.5\"/>","users":"<circle cx=\"9\" cy=\"8\" r=\"3.5\"/><path d=\"M2 20c0-3.5 3-6 7-6s7 2.5 7 6\"/><path d=\"M16 5a3.5 3.5 0 010 7M18 14c2.5.5 4 2.5 4 6\"/>","doc":"<path d=\"M6 3h9l4 4v14H6z\"/><path d=\"M14 3v5h5M9 13h7M9 17h7\"/>","network":"<circle cx=\"12\" cy=\"5\" r=\"2.5\"/><circle cx=\"5\" cy=\"19\" r=\"2.5\"/><circle cx=\"19\" cy=\"19\" r=\"2.5\"/><path d=\"M12 7.5v4M12 11.5L5 16.5M12 11.5l7 5\"/>","box":"<path d=\"M21 8l-9-5-9 5v8l9 5 9-5V8z\"/><path d=\"M3 8l9 5 9-5M12 13v8\"/>","receipt":"<path d=\"M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z\"/><path d=\"M9 8h6M9 12h6\"/>","megaphone":"<path d=\"M3 10v4h4l8 5V5L7 10H3z\"/><path d=\"M18 9a4 4 0 010 6\"/>","clock":"<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 7v5l3 2\"/>","link":"<path d=\"M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1\"/><path d=\"M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1\"/>","bot":"<rect x=\"4\" y=\"8\" width=\"16\" height=\"11\" rx=\"3\"/><path d=\"M12 4v4M9 13h.01M15 13h.01M9 16h6\"/>","settings":"<circle cx=\"12\" cy=\"12\" r=\"3\"/><path d=\"M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2\"/>","gem":"<path d=\"M6 3h12l4 6-10 12L2 9z\"/><path d=\"M2 9h20M9 3l3 6 3-6M12 21L9 9M12 21l3-12\"/>","menu":"<path d=\"M4 6h16M4 12h16M4 18h16\"/>"};
const svg = (name, size = 18) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
const NAV = GROUPS.flatMap(group => group.items);

const css = `
body[data-zs-shell]{max-width:none!important;margin:0!important;padding:0!important}
.zs-app{display:flex;min-height:100vh;direction:rtl;text-align:right;font-family:'Cairo',Tahoma,Arial,sans-serif}
.zs-app *{box-sizing:border-box}
.zs-main{flex:1;min-width:0}
.zs-skip{position:absolute;inset-inline-start:12px;top:-60px;z-index:100;background:#fbbf24;color:#022c22;padding:8px 14px;border-radius:8px;font-weight:800;text-decoration:none}
.zs-skip:focus{top:10px}
.zs-sidebar{width:256px;flex:none;background:#064e3b;color:#d1fae5;position:sticky;top:0;height:100vh;overflow-y:auto;scrollbar-width:thin;display:flex;flex-direction:column;z-index:60}
.zs-brand{display:flex;align-items:center;gap:10px;color:#fff;text-decoration:none;font-weight:800;font-size:18px;padding:18px 18px 14px;white-space:nowrap}
.zs-mark{width:40px;height:40px;border-radius:10px;background:#10b981;color:#022c22;display:grid;place-items:center}
.zs-brand small{display:block;font-size:11px;font-weight:600;color:#a7f3d0;line-height:1.2}
.zs-nav{padding:4px 10px 18px;flex:1}
.zs-group{margin-top:14px}
.zs-group-title{padding:0 10px 6px;font-size:11.5px;font-weight:800;color:#6ee7b7;letter-spacing:.02em}
.zs-nav a{display:flex;align-items:center;gap:10px;padding:9px 10px;margin-bottom:2px;border-radius:10px;color:#d1fae5;text-decoration:none;font-size:14px;font-weight:700;transition:background .15s}
.zs-nav a:hover{background:#ffffff1a;color:#fff}
.zs-nav a[aria-current=page]{background:#ecfdf5;color:#064e3b}
.zs-ico{width:22px;display:grid;place-items:center;flex:none;opacity:.9}
.zs-sidefoot{padding:12px 14px 16px;border-top:1px solid #ffffff22;display:grid;gap:6px}
.zs-sidefoot a{padding:8px 12px;border:1px solid #ffffff33;border-radius:10px;color:#fff;text-decoration:none;font-size:13px;font-weight:700;text-align:center}
.zs-sidefoot a:hover{background:#ffffff1a}
.zs-sidebar a:focus-visible,.zs-menu:focus-visible{outline:3px solid #fbbf24;outline-offset:2px}
.zs-topbar{display:flex;align-items:center;gap:12px;min-height:52px;padding:0 20px;background:#fff;border-bottom:1px solid #e2e8f0;font-size:13.5px;color:#475569}
.zs-crumb b{color:#064e3b;font-weight:800}
.zs-crumb span{margin:0 6px;color:#94a3b8}
.zs-menu{display:none;border:1px solid #cbd5e1;background:#fff;color:#065f46;border-radius:10px;padding:6px 12px;font-size:18px;cursor:pointer;line-height:1}
.zs-menu:hover{background:#ecfdf5;color:#065f46}
.zs-scrim{display:none}
.zs-page{font-family:'Cairo',Tahoma,Arial,sans-serif;background:#f1f5f9;color:#0f172a;min-height:100vh;margin:0;line-height:1.7}
.zs-page *{box-sizing:border-box;font-family:inherit}
.zs-wrap{width:min(1240px,calc(100% - 32px));margin:auto;padding:24px 0 56px}
.zs-head h1{font-size:26px;font-weight:800;color:#064e3b}
.zs-head p{color:#475569;font-size:14px;margin-bottom:18px}
.zs-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-bottom:20px}
.zs-kpi{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:16px 18px}
.zs-kpi span{display:block;font-size:13px;color:#475569}
.zs-kpi strong{font-size:24px;font-weight:800;color:#064e3b}
.zs-panel{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:22px;margin-bottom:20px}
.zs-panel h2{font-size:18px;font-weight:800;color:#064e3b;margin-bottom:4px}
.zs-panel>.zs-sub{font-size:13.5px;color:#475569;margin-bottom:14px}
.zs-grid2{display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:start}
.zs-table{width:100%;border-collapse:collapse;font-size:14px}
.zs-table th,.zs-table td{text-align:right;padding:9px 10px;border-bottom:1px solid #e2e8f0}
.zs-table th{font-size:12.5px;color:#475569;font-weight:700}
.zs-scroll{overflow-x:auto}
.zs-form{display:grid;gap:10px}
.zs-form label{font-size:13px;font-weight:700}
.zs-form input,.zs-form select,.zs-form textarea{width:100%;padding:10px 12px;border:1.5px solid #cbd5e1;border-radius:10px;font-size:14px;background:#fff}
.zs-form textarea{min-height:90px;resize:vertical}
.zs-btn{display:inline-flex;align-items:center;justify-content:center;padding:10px 18px;border:0;border-radius:10px;background:#047857;color:#fff;font-weight:800;font-size:14px;cursor:pointer}
.zs-btn:hover{background:#064e3b}
.zs-note{margin-bottom:16px;padding:11px 14px;border:1px solid #d6e5d9;border-radius:12px;background:#edf6ef;color:#315d42;font-size:14px}
.zs-note:empty{display:none}
.zs-note.error{border-color:#f0d4c8;background:#fff2ec;color:#853d25}
.zs-chip{display:inline-block;padding:3px 10px;border-radius:12px;background:#ecfdf5;color:#047857;font-size:12px;font-weight:700;margin:2px}
.zs-chip.warn{background:#fffbeb;color:#b45309}
.zs-empty{text-align:center;padding:18px;color:#475569;background:#f8fafc;border:1px dashed #e2e8f0;border-radius:12px;font-size:14px}
.zs-draft{white-space:pre-line;padding:12px 14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;font-size:14px}
.zs-tpl{padding:10px 12px;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:8px;font-size:13.5px}
.zs-tablebar{display:flex;align-items:center;gap:12px;margin:0 0 10px}
.zs-tablebar[hidden],tr[hidden]{display:none!important}
.zs-tablebar input{flex:1;max-width:340px;min-height:40px;padding:8px 12px;border:1.5px solid #cbd5e1;border-radius:10px;font-size:14px;background:#fff}
.zs-tablebar input:focus{outline:3px solid #a7f3d0;border-color:#047857}
.zs-tablebar span{font-size:13px;color:#475569}
td.zs-badge{font-weight:800;font-size:13px}
td.zs-badge-good{color:#047857}td.zs-badge-warn{color:#b45309}td.zs-badge-bad{color:#b91c1c}td.zs-badge-neutral{color:#334155}
td.zs-badge::before{content:'';display:inline-block;width:8px;height:8px;border-radius:50%;margin-inline-end:7px;background:currentColor}
@media(max-width:860px){.zs-grid2{grid-template-columns:1fr}}
@media(max-width:900px){
.zs-menu{display:inline-block}
.zs-sidebar{position:fixed;top:0;bottom:0;inset-inline-start:0;height:100%;transform:translateX(100%);transition:transform .2s;box-shadow:-8px 0 30px #022c2266;visibility:hidden;pointer-events:none}
.zs-app.zs-open .zs-sidebar{transform:none;visibility:visible;pointer-events:auto}
.zs-app.zs-open .zs-scrim{display:block;position:fixed;inset:0;background:#02201855;z-index:55;border:0}
.zs-topbar{padding:0 14px}
}
@media(prefers-reduced-motion:reduce){.zs-sidebar{transition:none}}
`;

// Records which admin page staff open and what they search for (shown on the activity page).
const TRACKER = `<script>(function(){var csrf='';function send(b){if(!csrf)return;fetch('/api/v1/admin/activity/track',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify(b)}).catch(function(){})}
fetch('/api/store/admin/session',{credentials:'same-origin'}).then(function(r){return r.json()}).then(function(s){if(!s.authenticated)return;csrf=s.csrf||'';send({kind:'page_view',page:location.pathname});
var t;document.addEventListener('input',function(e){var i=e.target;if(!i||!/search|بحث/i.test((i.id||'')+(i.name||'')+(i.type||'')))return;clearTimeout(t);t=setTimeout(function(){var q=(i.value||'').trim();if(q.length>1)send({kind:'search',page:location.pathname,query:q})},1500)})}).catch(function(){})})();</script>`;

// Mobile drawer toggle for the sidebar.
const DRAWER = `<script>(function(){var app=document.querySelector('.zs-app'),btn=document.querySelector('.zs-menu'),scrim=document.querySelector('.zs-scrim');if(!app||!btn)return;function set(o){app.classList.toggle('zs-open',o);btn.setAttribute('aria-expanded',String(o))}btn.addEventListener('click',function(){set(!app.classList.contains('zs-open'))});if(scrim)scrim.addEventListener('click',function(){set(false)});document.addEventListener('keydown',function(e){if(e.key==='Escape')set(false)})})();</script>`;

function sidebar(active) {
    const groups = GROUPS.map(group => {
        const links = group.items.map(item => `<a href="${item.href}"${item.key === active ? ' aria-current="page"' : ''}><span class="zs-ico" aria-hidden="true">${svg(item.icon)}</span>${item.label}</a>`).join('');
        return `<div class="zs-group" role="group" aria-label="${group.label}"><div class="zs-group-title">${group.label}</div>${links}</div>`;
    }).join('');
    return `<aside class="zs-sidebar" id="zsSidebar" role="banner"><a class="zs-brand" href="/store/manager"><span class="zs-mark" aria-hidden="true">${svg('gem', 22)}</span><span>الزمردة<small>مركز الإدارة</small></span></a><div class="zs-nav" role="navigation" aria-label="التنقل الرئيسي">${groups}</div><div class="zs-sidefoot"><a href="/store">عرض المتجر</a></div></aside>`;
}

function topbar(active) {
    const group = GROUPS.find(g => g.items.some(item => item.key === active));
    const page = group?.items.find(item => item.key === active);
    const crumb = page ? `<span class="zs-crumb">${group.label}<span aria-hidden="true">›</span><b>${page.label}</b></span>` : '<span class="zs-crumb"><b>مركز الإدارة</b></span>';
    return `<div class="zs-topbar"><button type="button" class="zs-menu" aria-label="القائمة" aria-controls="zsSidebar" aria-expanded="false">${svg('menu', 20)}</button>${crumb}</div>`;
}

// Kept for callers that only need the navigation markup.
function header(active) {
    return sidebar(active);
}

const FONT = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">';

// Replaces a page's own header/nav with the shared shell without touching the page body.
function wrap(html, active) {
    let out = html.replace(/<header[\s\S]*?<\/header>/, '').replace(/<h1>عمليات الزمردة<\/h1><nav>[\s\S]*?<\/nav>/, '<h1>عمليات الزمردة</h1>');
    out = out.replace('</head>', () => `${FONT}<style>${css}</style></head>`);
    out = out.replace('</body>', () => `</div></div><script src="/assets/admin-tables.js" defer></script>${TRACKER}${DRAWER}</body>`);
    return out.replace(/<body([^>]*)>/, (match, attrs) => `<body${attrs} data-zs-shell><div class="zs-app"><a class="zs-skip" href="#zsMain">انتقل إلى المحتوى</a>${sidebar(active)}<button type="button" class="zs-scrim" aria-label="إغلاق القائمة" tabindex="-1"></button><div class="zs-main" id="zsMain">${topbar(active)}`);
}

module.exports = { NAV, GROUPS, css, header, wrap, FONT };
