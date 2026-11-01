const NAV = [
    { key: 'manager', href: '/store/manager', label: 'الرئيسية' },
    { key: 'campaigns', href: '/store/campaigns', label: 'الحملات' },
    { key: 'leads', href: '/store/leads', label: 'العملاء' },
    { key: 'affiliates', href: '/store/affiliates', label: 'الماميز' },
    { key: 'agents', href: '/store/agents', label: 'الوكلاء' },
    { key: 'channels', href: '/store/channels', label: 'القنوات' },
    { key: 'operations', href: '/store/operations', label: 'المتجر والمخزون' }
];

const css = `
.zs-top{position:sticky;top:0;z-index:50;background:#064e3b;color:#fff;box-shadow:0 2px 14px #022c2255;font-family:'Cairo',Tahoma,Arial,sans-serif;direction:rtl;text-align:right}
.zs-bar{width:min(1240px,calc(100% - 32px));margin:auto;display:flex;align-items:center;gap:18px;min-height:64px}
.zs-brand{display:flex;align-items:center;gap:10px;color:#fff;text-decoration:none;font-weight:800;font-size:17px;white-space:nowrap}
.zs-mark{width:38px;height:38px;border-radius:12px;background:linear-gradient(135deg,#10b981,#059669);display:grid;place-items:center;font-size:19px}
.zs-brand small{display:block;font-size:11px;font-weight:600;color:#a7f3d0;line-height:1.2}
.zs-nav{display:flex;align-items:center;gap:4px;flex:1;overflow-x:auto;scrollbar-width:none;padding:6px 0}
.zs-nav::-webkit-scrollbar{display:none}
.zs-nav a{padding:8px 13px;border-radius:10px;color:#d1fae5;text-decoration:none;font-size:14px;font-weight:700;white-space:nowrap;transition:background .15s}
.zs-nav a:hover{background:#ffffff1a;color:#fff}
.zs-nav a[aria-current=page]{background:#fff;color:#064e3b}
.zs-side{display:flex;align-items:center;gap:10px;margin-inline-start:auto}
.zs-side a{padding:7px 13px;border:1px solid #ffffff40;border-radius:10px;color:#fff;text-decoration:none;font-size:13px;font-weight:700;white-space:nowrap}
.zs-side a:hover{background:#ffffff1a}
.zs-top a:focus-visible{outline:3px solid #fbbf24;outline-offset:2px}
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
.zs-note.error{border-color:#f0d4c8;background:#fff2ec;color:#853d25}
.zs-chip{display:inline-block;padding:3px 10px;border-radius:12px;background:#ecfdf5;color:#047857;font-size:12px;font-weight:700;margin:2px}
.zs-chip.warn{background:#fffbeb;color:#b45309}
.zs-empty{text-align:center;padding:18px;color:#475569;background:#f8fafc;border:1px dashed #e2e8f0;border-radius:12px;font-size:14px}
.zs-draft{white-space:pre-line;padding:12px 14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;font-size:14px}
.zs-tpl{padding:10px 12px;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:8px;font-size:13.5px}
@media(max-width:860px){.zs-grid2{grid-template-columns:1fr}}
@media(max-width:760px){.zs-bar{flex-wrap:wrap;gap:0;padding-top:8px}.zs-side{order:2}.zs-nav{order:3;flex-basis:100%;padding:4px 0 8px}.zs-brand small{display:none}}
`;

function header(active) {
    const links = NAV.map(item => `<a href="${item.href}"${item.key === active ? ' aria-current="page"' : ''}>${item.label}</a>`).join('');
    return `<div class="zs-top" role="banner"><div class="zs-bar"><a class="zs-brand" href="/store/manager"><span class="zs-mark" aria-hidden="true">💎</span><span>الزمردة<small>مركز الإدارة</small></span></a><div class="zs-nav" role="navigation" aria-label="التنقل الرئيسي">${links}</div><div class="zs-side"><a href="/store/admin">الحساب</a><a href="/store">المتجر ↗</a></div></div></div>`;
}

const FONT = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">';

// Replaces a page's own header/nav with the shared one without touching the page body.
function wrap(html, active) {
    let out = html.replace(/<header[\s\S]*?<\/header>/, '').replace(/<h1>عمليات الزمردة<\/h1><nav>[\s\S]*?<\/nav>/, '<h1>عمليات الزمردة</h1>');
    out = out.replace('</head>', `${FONT}<style>${css}</style></head>`);
    return out.replace(/<body([^>]*)>/, `<body$1>${header(active)}`);
}

module.exports = { NAV, css, header, wrap, FONT };
