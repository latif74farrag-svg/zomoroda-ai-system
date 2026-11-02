// Brings the storefront catalog in line with the November 2026 consumer price list.
// Each store product maps to one consumer-list barcode; the price, carton count and (where missing) photo come from it.
const fs = require('node:fs');
const path = require('node:path');

const BARCODE = {
    'off-120-boy': '6223014540094', 'off-72-x3': '6223014540100', 'off-protect-40-x3': '6223014540117', 'off-remover-25-x3': '6223014540124', 'off-pocket-15-x4': '6223014540254',
    'off-air-2': '6223014540131', 'off-towel-2': '6223014540148', 'off-noi-120-72': '6223014540162', 'off-protect-20-x3': '6223014540186', 'off-family-roll-2': '6223014540193',
    'baby-newborn-54': '6223014540711', 'baby-120': '6225000249967', 'baby-72': '6223014540995', 'baby-noi-120': '6223014540933', 'baby-noi-72': '6223014540971', 'baby-noi-lemon-40': '6225000300866',
    'pocket-ronza-15': '6224009893409', 'pocket-noi-10': '6223014540896', 'pocket-mint-piece': '6223014540810', 'pocket-mint-24': '6223014540926', 'pocket-shoe': '6223014540827',
    'care-aloe-25': '6223014540520', 'care-rose-25': '6223014540537', 'care-protect-20': '6224009893249', 'care-protect-40': '6224009893256',
    'home-air-460': '6224009893096', 'home-floor-1000': '6223014540353', 'home-floor-250': '622301450360', 'home-dish-650': '6223014540858',
    'tools-kitchen-3': '6224009893133', 'tools-yellow-20': '6224009893140', 'tools-glass-20': '6223014540179'
};
// The old boy/girl 2x120 offers are one offer in the new list, so the girl listing is retired and the boy listing renamed.
const RETIRED = ['off-120-girl'];
const RENAMED = { 'off-120-boy': 'عرض قطعتان رونزا 120 منديل' };
// Photos extracted from the November consumer catalog (image index in the PDF) for products that had none.
const NEW_IMAGES = { 'off-remover-25-x3': 4, 'off-air-2': 6, 'off-noi-120-72': 8, 'baby-noi-120': 21, 'baby-noi-72': 26, 'pocket-shoe': 41, 'care-aloe-25': 39, 'care-rose-25': 38, 'home-air-460': 31, 'home-floor-1000': 32, 'home-floor-250': 32, 'home-dish-650': 36, 'tools-yellow-20': 33 };

function plan(root, consumerItems) {
    const products = JSON.parse(fs.readFileSync(path.join(root, 'scripts', 'whacka_products.json'), 'utf8'));
    const byBarcode = new Map(consumerItems.map(item => [item.barcode, item]));
    const changes = [];
    const next = [];
    for (const product of products) {
        if (RETIRED.includes(product.id)) { changes.push({ id: product.id, action: 'retire' }); continue; }
        const item = byBarcode.get(BARCODE[product.id]);
        if (!item) throw new Error(`No November consumer price for ${product.id}`);
        const price = item.unit_minor / 100;
        const updated = { ...product, price, carton: item.units_per_carton ?? product.carton, ...(RENAMED[product.id] ? { name: RENAMED[product.id] } : {}) };
        changes.push({ id: product.id, action: 'update', name: updated.name, oldPrice: product.price, price, oldCarton: product.carton, carton: updated.carton });
        next.push(updated);
    }
    return { changes, next };
}

module.exports = { BARCODE, RETIRED, NEW_IMAGES, plan };
