// Contract for every sales channel. Adapters (Shopify, staff-uploaded Noon/Amazon exports, manual) all produce the same flat
// shape, which is validated here once and stored in channel_orders before any agent looks at it.
//   { external_id, customer_name, customer_phone, customer_address, payment: 'cod'|'prepaid', placed_at?,
//     lines: [{ sku, qty, unit_minor | unit_price }] }
const crypto = require('node:crypto');
const { fail } = require('../commerce');

const CHANNELS = ['shopify', 'amazon', 'noon', 'manual'];

function localPhone(value) {
    let digits = String(value ?? '').replace(/\D/g, '').replace(/^00/, '');
    if (/^20\d{10}$/.test(digits)) digits = '0' + digits.slice(2);
    else if (/^1\d{9}$/.test(digits)) digits = '0' + digits;
    return digits;
}
function priceMinor(line) {
    if (line.unit_minor !== undefined) return line.unit_minor;
    const amount = Math.round(Number(line.unit_price) * 100);
    return Number.isFinite(amount) ? amount : NaN;
}

function validateOrder(channel, raw) {
    if (!CHANNELS.includes(channel)) fail(400, 'قناة بيع غير معروفة.');
    const externalId = String(raw?.external_id ?? '').trim();
    if (!/^[A-Za-z0-9._:#-]{1,80}$/.test(externalId)) fail(400, 'رقم الطلب الخارجي غير صالح.');
    const name = String(raw.customer_name || '').trim().slice(0, 120);
    const phone = localPhone(raw.customer_phone);
    const address = String(raw.customer_address || '').trim().slice(0, 500);
    if (!name || !/^(010|011|012|015)\d{8}$/.test(phone) || address.length < 5) fail(400, `بيانات العميل غير صالحة في الطلب ${externalId}.`);
    if (!Array.isArray(raw.lines) || !raw.lines.length || raw.lines.length > 50) fail(400, `بنود الطلب ${externalId} غير صالحة.`);
    const lines = raw.lines.map(line => {
        const sku = String(line?.sku ?? '').trim();
        const qty = Number(line?.qty);
        const unit = priceMinor(line || {});
        if (!/^.{1,80}$/.test(sku) || !Number.isInteger(qty) || qty < 1 || qty > 99 || !Number.isSafeInteger(unit) || unit < 0 || unit > 100000000) fail(400, `بند غير صالح في الطلب ${externalId}.`);
        return { external_sku: sku, qty, unit_minor: unit };
    });
    const placed = raw.placed_at ? Date.parse(raw.placed_at) : NaN;
    return {
        channel, external_id: externalId, customer: { name, phone, address }, lines,
        payment: raw.payment === 'cod' ? 'cod' : 'prepaid', // anything that is not clearly cash on delivery needs manual payment handling
        placed_at: Number.isFinite(placed) ? placed : null
    };
}
function hashOrder(order) {
    return crypto.createHash('sha256').update(JSON.stringify({ c: order.customer, l: order.lines, p: order.payment })).digest('hex');
}
module.exports = { CHANNELS, validateOrder, hashOrder, localPhone };
