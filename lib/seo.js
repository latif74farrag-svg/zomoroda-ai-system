// Search-engine helpers for the public storefront: canonical/Open Graph tags, JSON-LD, robots.txt, sitemap.xml.
const SITE_NAME = 'متجر الزمردة كوزماتيكس';
const LOGO_PATH = '/assets/zomoroda-store-logo.png';

// Staff and transactional areas that must never be indexed.
const PRIVATE_PREFIXES = [
    '/api/', '/store/admin', '/store/account', '/store/checkout', '/store/track',
    '/store/manager', '/store/agents', '/store/channels', '/store/campaigns', '/store/campaign-history',
    '/store/marketing', '/store/users', '/store/leads', '/store/tenders', '/store/affiliates',
    '/store/operations', '/store/purchasing', '/maps-scraper', '/webhooks/', '/unsubscribe'
];

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Prefer the configured public origin so a spoofed Host header cannot poison canonical URLs.
function baseUrl(req, env = process.env) {
    if (/^https:\/\//.test(env.BASE_URL || '')) return new URL(env.BASE_URL).origin;
    return `${req.protocol}://${req.get('host')}`;
}

const absolute = (base, value) => {
    if (!value) return null;
    try { return new URL(value, base).href; } catch (_) { return null; }
};

// `<` is escaped so product text can never close the script element.
const jsonLdTag = data => `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;

function isPrivatePath(pathname) {
    return PRIVATE_PREFIXES.some(prefix => pathname === prefix.replace(/\/$/, '') || pathname.startsWith(prefix));
}

function privateAreaHeaders(req, res, next) {
    if (isPrivatePath(req.path)) res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    next();
}

function headTags({ base, path, title, description, image, type = 'website', jsonLd = [] }) {
    const url = absolute(base, path);
    const picture = absolute(base, image || LOGO_PATH);
    const tags = [
        `<link rel="canonical" href="${escapeHtml(url)}">`,
        '<meta name="robots" content="index, follow, max-image-preview:large">',
        `<meta property="og:site_name" content="${escapeHtml(SITE_NAME)}">`,
        '<meta property="og:locale" content="ar_EG">',
        `<meta property="og:type" content="${escapeHtml(type)}">`,
        `<meta property="og:url" content="${escapeHtml(url)}">`,
        `<meta property="og:title" content="${escapeHtml(title)}">`,
        `<meta property="og:description" content="${escapeHtml(description)}">`,
        `<meta property="og:image" content="${escapeHtml(picture)}">`,
        '<meta name="twitter:card" content="summary_large_image">',
        `<meta name="twitter:title" content="${escapeHtml(title)}">`,
        `<meta name="twitter:description" content="${escapeHtml(description)}">`,
        `<meta name="twitter:image" content="${escapeHtml(picture)}">`,
        ...jsonLd.map(jsonLdTag)
    ];
    return tags.join('');
}

const organization = base => ({ '@context': 'https://schema.org', '@type': 'Organization', name: SITE_NAME, url: absolute(base, '/store'), logo: absolute(base, LOGO_PATH) });
const website = base => ({ '@context': 'https://schema.org', '@type': 'WebSite', name: SITE_NAME, url: absolute(base, '/store'), inLanguage: 'ar' });

function breadcrumbs(base, trail) {
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: trail.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.name, item: absolute(base, item.path) }))
    };
}

function productJsonLd(base, product, categoryName) {
    const data = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        sku: String(product.id),
        category: categoryName || undefined,
        url: absolute(base, `/store/product/${encodeURIComponent(product.id)}`),
        offers: {
            '@type': 'Offer',
            url: absolute(base, `/store/product/${encodeURIComponent(product.id)}`),
            priceCurrency: 'EGP',
            price: Number(product.price).toFixed(2),
            itemCondition: 'https://schema.org/NewCondition',
            availability: product.available_stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'
        }
    };
    const description = product.desc || product.description;
    if (description) data.description = description;
    if (product.brand) data.brand = { '@type': 'Brand', name: product.brand };
    const image = absolute(base, product.image_url);
    if (image) data.image = [image];
    return data;
}

function robotsTxt(base) {
    const rules = PRIVATE_PREFIXES.map(prefix => `Disallow: ${prefix}`).join('\n');
    return `User-agent: *\nAllow: /store\nAllow: /assets/\n${rules}\n\nSitemap: ${absolute(base, '/sitemap.xml')}\n`;
}

function sitemapXml(base, products, categoryKeys) {
    const xml = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);
    const urls = [
        '/store',
        ...categoryKeys.filter(key => key !== 'all').map(key => `/store?category=${encodeURIComponent(key)}`),
        ...products.map(product => `/store/product/${encodeURIComponent(product.id)}`)
    ];
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(path => `  <url><loc>${xml(absolute(base, path))}</loc></url>`).join('\n')}\n</urlset>\n`;
}

module.exports = { SITE_NAME, PRIVATE_PREFIXES, baseUrl, headTags, organization, website, breadcrumbs, productJsonLd, robotsTxt, sitemapXml, privateAreaHeaders, isPrivatePath };
