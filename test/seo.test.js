const { test } = require('node:test');
const assert = require('node:assert/strict');
const seo = require('../lib/seo');

const req = { protocol: 'http', get: () => 'evil.example' };

test('base URL prefers the configured https origin over the Host header', () => {
    assert.equal(seo.baseUrl(req, { BASE_URL: 'https://shop.example/some/path' }), 'https://shop.example');
    assert.equal(seo.baseUrl(req, {}), 'http://evil.example');
});

test('head tags carry canonical, Open Graph and escaped JSON-LD', () => {
    const html = seo.headTags({
        base: 'https://shop.example', path: '/store/product/a-1', title: 'a "b" <c>', description: 'd', image: '/assets/x.png',
        jsonLd: [{ name: '</script><script>alert(1)</script>' }]
    });
    assert.match(html, /<link rel="canonical" href="https:\/\/shop\.example\/store\/product\/a-1">/);
    assert.match(html, /og:image" content="https:\/\/shop\.example\/assets\/x\.png"/);
    assert.ok(html.includes('a &quot;b&quot; &lt;c&gt;'));
    assert.equal(html.match(/<script/g).length, 1, 'JSON-LD must not be able to close its script tag');
});

test('product JSON-LD reflects price, stock and optional fields only when present', () => {
    const inStock = seo.productJsonLd('https://shop.example', { id: 'p 1', name: 'منديل', price: 12.5, available_stock: 3, brand: 'رونزا', image_url: '/a.png' }, 'مناديل');
    assert.equal(inStock.offers.price, '12.50');
    assert.equal(inStock.offers.priceCurrency, 'EGP');
    assert.equal(inStock.offers.availability, 'https://schema.org/InStock');
    assert.equal(inStock.offers.url, 'https://shop.example/store/product/p%201');
    assert.equal(inStock.brand.name, 'رونزا');
    const bare = seo.productJsonLd('https://shop.example', { id: 'p2', name: 'x', price: 1, available_stock: 0 });
    assert.equal(bare.offers.availability, 'https://schema.org/OutOfStock');
    assert.ok(!('image' in bare) && !('brand' in bare) && !('description' in bare));
});

test('robots.txt hides private areas and sitemap lists public pages only', () => {
    const robots = seo.robotsTxt('https://shop.example');
    for (const prefix of ['/api/', '/store/admin', '/store/checkout', '/store/purchasing']) assert.ok(robots.includes(`Disallow: ${prefix}`), prefix);
    assert.ok(robots.includes('Sitemap: https://shop.example/sitemap.xml'));
    const xml = seo.sitemapXml('https://shop.example', [{ id: 'a&b' }], ['all', 'wipes']);
    assert.ok(xml.includes('<loc>https://shop.example/store</loc>'));
    assert.ok(xml.includes('<loc>https://shop.example/store?category=wipes</loc>'));
    assert.ok(xml.includes('/store/product/a%26b'));
    assert.ok(!xml.includes('category=all'));
    assert.ok(seo.isPrivatePath('/store/admin') && seo.isPrivatePath('/api/store/products') && !seo.isPrivatePath('/store/product/x') && !seo.isPrivatePath('/store'));
});
