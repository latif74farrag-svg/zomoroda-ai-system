const NAV = [
    { key: 'manager', href: '/store/manager', label: 'الرئيسية' },
    { key: 'campaigns', href: '/store/campaigns', label: 'الحملات' },
    { key: 'history', href: '/store/campaign-history', label: 'أرشيف الحملات' },
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
