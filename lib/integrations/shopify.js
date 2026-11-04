// Shopify Admin REST adapter. Free to use (it only reads an existing store) and disabled unless both variables are set.
const { fail } = require('../commerce');

function configured(env = process.env) {
    return Boolean(env.SHOPIFY_STORE_DOMAIN && env.SHOPIFY_ADMIN_TOKEN);
}
function normalize(order) {
    const address = order.shipping_address || {};
    const cod = (order.payment_gateway_names || []).some(name => /cash|cod/i.test(name));
    return {
        external_id: String(order.id),
        customer_name: address.name || [order.customer?.first_name, order.customer?.last_name].filter(Boolean).join(' '),
        customer_phone: address.phone || order.phone || order.customer?.phone || '',
        customer_address: [address.address1, address.address2, address.city].filter(Boolean).join(', '),
        payment: cod ? 'cod' : 'prepaid',
        placed_at: order.created_at,
        lines: (order.line_items || []).map(item => ({ sku: item.sku || String(item.variant_id || item.product_id || ''), qty: item.quantity, unit_price: item.price }))
    };
}
// `fetcher` is injected so tests never touch the network.
async function fetchOrders(env, sinceMs, fetcher = fetch) {
    if (!configured(env)) fail(503, 'Shopify is not configured');
    if (!/^[a-z0-9-]+\.myshopify\.com$/i.test(env.SHOPIFY_STORE_DOMAIN)) fail(503, 'Invalid Shopify store domain');
    const version = env.SHOPIFY_API_VERSION || '2025-01';
    const url = `https://${env.SHOPIFY_STORE_DOMAIN}/admin/api/${version}/orders.json?status=any&limit=250&created_at_min=${encodeURIComponent(new Date(sinceMs).toISOString())}`;
    const response = await fetcher(url, { signal: AbortSignal.timeout(20000), headers: { 'X-Shopify-Access-Token': env.SHOPIFY_ADMIN_TOKEN, Accept: 'application/json' } });
    if (!response.ok) fail(503, 'Shopify unavailable');
    const data = await response.json();
    return (data.orders || []).map(normalize);
}
module.exports = { configured, normalize, fetchOrders };
