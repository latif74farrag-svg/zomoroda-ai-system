// Sector price lists (one table, one list per buyer type). Importing a list replaces it entirely, so older prices never linger.
const { transaction } = require('./storage');
const { fail, audit } = require('./commerce');

const LISTS = {
    agents: 'الوكلاء (سعر الوكيل)', pharmacies: 'الصيادلة (سعر الصيدلي)', hypermarkets: 'الهايبرات وتجار الجملة', distribution: 'شركات التوزيع',
    hotels: 'الفنادق والمطاعم والشركات', salon: 'الصالونات والكوافير', consumer: 'المستهلك / الماميز والسفراء'
};
const LIST_FOR_SECTOR = { pharmacies: 'pharmacies', hypermarkets: 'hypermarkets', distribution: 'distribution', hotels: 'hotels', supplies: 'hotels', salon: 'salon', moms: 'consumer', retail: 'consumer' };

const minor = value => (value === null || value === undefined || value === '' || !Number.isFinite(Number(value))) ? null : Math.round(Number(value) * 100);

// Arabic search form: one spelling per letter family, no diacritics.
function fold(text) {
    return String(text || '').toLowerCase().replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/\s+/g, ' ').trim();
}

function validateItem(item) {
    if (!item.name || !item.itemKey || !LISTS[item.list]) fail(400, 'صنف غير صالح في قائمة الأسعار.');
    for (const key of ['unit_minor', 'carton_minor', 'unit_tax_minor', 'carton_tax_minor', 'consumer_minor']) {
        const value = item[key];
        if (value !== null && value !== undefined && (!Number.isSafeInteger(value) || value < 0 || value > 100000000)) fail(400, `سعر غير صالح للصنف ${item.name}.`);
    }
}

async function replaceList(database, list, period, items, source, actor) {
    if (!LISTS[list]) fail(400, 'قائمة أسعار غير معروفة.');
    if (!items.length || items.length > 2000) fail(400, 'عدد الأصناف غير صالح.');
    const seen = new Map();
    for (const item of items) { validateItem({ ...item, list }); seen.set(item.itemKey, item); }
    const unique = [...seen.values()];
    return transaction(database, async tx => {
        const removed = Number((await tx.execute({ sql: 'DELETE FROM price_list_items WHERE list = ?', args: [list] })).rowsAffected);
        const now = Date.now();
        for (const item of unique) {
            await tx.execute({
                sql: `INSERT INTO price_list_items(list, item_key, period, barcode, name, brand, category, pack, units_per_carton, unit_minor, carton_minor, unit_tax_minor, carton_tax_minor, consumer_minor, source, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                args: [list, item.itemKey, period, item.barcode || null, item.name, item.brand || '', item.category || '', item.pack || '', item.units_per_carton ?? null, item.unit_minor ?? null, item.carton_minor ?? null, item.unit_tax_minor ?? null, item.carton_tax_minor ?? null, item.consumer_minor ?? null, source, now]
            });
        }
        const result = { list, period, added: unique.length, duplicatesInFile: items.length - unique.length, replaced: removed };
        if (actor) await audit(tx, actor, 'pricelist.replaced', list, result);
        return result;
    });
}

async function listItems(database, list, { search, limit = 300 } = {}) {
    if (!LISTS[list]) fail(400, 'قائمة أسعار غير معروفة.');
    const rows = (await database.execute({ sql: 'SELECT * FROM price_list_items WHERE list = ? ORDER BY category, name', args: [list] })).rows;
    const needle = fold(search);
    return rows.filter(row => !needle || fold(`${row.name} ${row.brand} ${row.barcode || ''}`).includes(needle)).slice(0, Math.min(Number(limit) || 300, 500));
}

async function overview(database) {
    const rows = (await database.execute('SELECT list, COUNT(*) AS items, MAX(period) AS period, MAX(updated_at) AS updated_at FROM price_list_items GROUP BY list')).rows;
    return Object.entries(LISTS).map(([list, label]) => { const row = rows.find(item => item.list === list); return { list, label, items: row ? row.items : 0, period: row ? row.period : null, updatedAt: row ? Number(row.updated_at) : null }; });
}

// Finds the item a customer is asking for inside one sector's list: every word of the request must appear in the item name.
function findItem(items, request) {
    const words = fold(request).split(' ').filter(word => word.length >= 2);
    if (!words.length) return null;
    const scored = items.map(item => ({ item, haystack: fold(`${item.name} ${item.brand} ${item.pack}`) })).filter(entry => words.every(word => entry.haystack.includes(word)));
    return scored.length ? scored.sort((a, b) => a.haystack.length - b.haystack.length)[0].item : null;
}

async function itemsForSector(database, sector) {
    const list = LIST_FOR_SECTOR[sector];
    return list ? (await database.execute({ sql: 'SELECT * FROM price_list_items WHERE list = ?', args: [list] })).rows : [];
}

module.exports = { LISTS, LIST_FOR_SECTOR, minor, fold, replaceList, listItems, overview, findItem, itemsForSector };
