// Free intake path: staff upload JSON or CSV exports from Noon, Amazon or any manual source. No paid API is needed.
const { fail } = require('../commerce');

function parseJson(text) {
    let data;
    try { data = JSON.parse(text); } catch (_) { fail(400, 'ملف JSON غير صالح.'); }
    const orders = Array.isArray(data) ? data : data?.orders;
    if (!Array.isArray(orders)) fail(400, 'يجب أن يحتوي الملف على قائمة طلبات.');
    return orders;
}

function splitCsv(text) {
    const rows = [];
    let row = [], cell = '', quoted = false;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (quoted) {
            if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
            else if (ch === '"') quoted = false;
            else cell += ch;
        } else if (ch === '"') quoted = true;
        else if (ch === ',') { row.push(cell); cell = ''; }
        else if (ch === '\n' || ch === '\r') {
            if (ch === '\r' && text[i + 1] === '\n') i++;
            row.push(cell); cell = '';
            if (row.some(value => value.trim())) rows.push(row);
            row = [];
        } else cell += ch;
    }
    row.push(cell);
    if (row.some(value => value.trim())) rows.push(row);
    return rows;
}

// One CSV row per order line. Header: external_id,customer_name,customer_phone,customer_address,payment,placed_at,sku,qty,unit_price
function parseCsv(text) {
    const rows = splitCsv(String(text || '').replace(/^﻿/, ''));
    if (rows.length < 2) fail(400, 'ملف CSV فارغ.');
    const header = rows[0].map(name => name.trim().toLowerCase());
    for (const required of ['external_id', 'customer_name', 'customer_phone', 'customer_address', 'sku', 'qty', 'unit_price']) if (!header.includes(required)) fail(400, `عمود مفقود في الملف: ${required}`);
    const orders = new Map();
    for (const cells of rows.slice(1)) {
        const record = Object.fromEntries(header.map((name, index) => [name, (cells[index] ?? '').trim()]));
        const id = record.external_id;
        if (!orders.has(id)) orders.set(id, { external_id: id, customer_name: record.customer_name, customer_phone: record.customer_phone, customer_address: record.customer_address, payment: record.payment === 'cod' ? 'cod' : (record.payment || 'prepaid'), placed_at: record.placed_at || undefined, lines: [] });
        orders.get(id).lines.push({ sku: record.sku, qty: Number(record.qty), unit_price: record.unit_price });
    }
    return [...orders.values()];
}
module.exports = { parseJson, parseCsv, splitCsv };
