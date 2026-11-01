// Reads the November 2026 price-list workbooks into price_list_items rows (lib/price-lists.js).
const fs = require('node:fs');
const path = require('node:path');
const { minor } = require('../lib/price-lists');

const PERIOD = '2026-11';
// Each list: workbook file, sheet (0 = first) and the header text of every column we use.
const SOURCES = {
    hypermarkets: { file: 'قائمة_أسعار_الهيبرات_11-2026.xlsx', cols: { barcode: 'الباركود', name: 'اسم الصنف', brand: 'العلامة', units: 'العدد بالكرتونة', carton: 'سعر الكرتونة قبل الضريبة', unit: 'سعر القطعة قبل الضريبة', cartonTax: 'سعر الكرتونة بعد الضريبة', unitTax: 'سعر القطعة بعد الضريبة', consumer: 'سعر المستهلك' } },
    distribution: { file: 'قائمة اسعار  شركات التوزيع 11-2026.xlsx', cols: { barcode: 'الباركود', name: 'اسم الصنف', brand: 'العلامة', category: 'الفئة', units: 'العدد بالكرتونة', carton: 'سعر الكرتونة قبل الضريبة', unit: 'سعر القطعة قبل الضريبة', cartonTax: 'سعر الكرتونة بعد الضريبة', unitTax: 'سعر القطعة بعد الضريبة' } },
    pharmacies: { file: 'قائمه اسعار الصيادله 11-2026.xlsx', brand: 'Ronza', cols: { barcode: 'الباركود', name: 'اسم الصنف (عربي)', category: 'الفئة', units: 'التعبئة بالكرتونة', unit: 'سعر الصيدلي (قبل الضريبة)', carton: 'إجمالي كرتونة الصيدلي', consumer: 'سعر الجمهور (شامل الضريبة)' } },
    agents: { file: 'قائمة اسعار وكلاء صيادله  11-2026.xlsx', brand: 'Ronza', cols: { barcode: 'الباركود', name: 'اسم الصنف (عربي)', category: 'الفئة', units: 'التعبئة بالكرتونة', unit: 'سعر الوكيل (قبل الضريبة)', carton: 'إجمالي كرتونة الوكيل', consumer: 'سعر الجمهور (شامل الضريبة)' } },
    hotels: { file: 'اسعار_الفنادق_11-2026.xlsx', cols: { name: 'الصنف', brand: 'العلامة', pack: 'العبوة', units: 'العدد بالكرتونة', unit: 'سعر القطعة', carton: 'سعر الكرتونة' } },
    salon: { file: 'اسعار_الصالون_11-2026.xlsx', cols: { name: 'الصنف', brand: 'العلامة', pack: 'العبوة', units: 'العدد بالكرتونة', unit: 'سعر القطعة', carton: 'سعر الكرتونة' } }
};

// Carton counts corrected where the item name and the printed catalog agree against the sheet column.
const UNIT_FIXES = { hypermarkets: { 6225000300866: 36 } };

function inferCategory(name) {
    const text = String(name);
    if (/عرض/.test(text)) return 'عروض';
    if (/مزيل مكياج/.test(text)) return 'مزيل مكياج';
    if (/معطر/.test(text)) return 'معطرات';
    if (/رول|فوط|قماش|فوطه|فوطة/.test(text)) return 'فوط وقماش تنظيف';
    if (/منظف|اطباق|أطباق/.test(text)) return 'منظفات';
    if (/احذية|أحذية/.test(text)) return 'تنظيف الأحذية';
    return 'مناديل مبللة';
}

function sheetRows(file) {
    const XLSX = require('xlsx');
    const workbook = XLSX.readFile(file);
    return XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, blankrows: false, defval: null });
}

function readList(dir, list) {
    const source = SOURCES[list];
    const rows = sheetRows(path.join(dir, source.file));
    const headerAt = rows.findIndex(row => row.some(cell => String(cell || '').trim() === source.cols.name));
    if (headerAt < 0) throw new Error(`${source.file}: header row not found`);
    const header = rows[headerAt].map(cell => String(cell || '').trim());
    const col = key => (source.cols[key] ? header.indexOf(source.cols[key]) : -1);
    for (const key of Object.keys(source.cols)) if (col(key) < 0) throw new Error(`${source.file}: column "${source.cols[key]}" missing`);
    const get = (row, key) => (col(key) < 0 ? null : row[col(key)]);
    const items = [];
    for (const row of rows.slice(headerAt + 1)) {
        const name = String(get(row, 'name') || '').trim();
        if (!name || !Number.isFinite(Number(row[0]))) continue;
        const barcode = get(row, 'barcode') ? String(get(row, 'barcode')).trim() : null;
        const pack = String(get(row, 'pack') || '').trim();
        items.push({
            itemKey: barcode ? `${barcode}` : `${name}|${pack}`, barcode, name, brand: String(get(row, 'brand') || source.brand || '').trim(), category: String(get(row, 'category') || inferCategory(name)).trim(), pack,
            units_per_carton: Number.isFinite(Number(get(row, 'units'))) ? Number(get(row, 'units')) : null,
            unit_minor: minor(get(row, 'unit')), carton_minor: minor(get(row, 'carton')), unit_tax_minor: minor(get(row, 'unitTax')), carton_tax_minor: minor(get(row, 'cartonTax')),
            consumer_minor: minor(get(row, 'consumer'))
        });
    }
    const fixes = UNIT_FIXES[list] || {};
    return items.map(item => {
        const units = fixes[item.barcode];
        if (!units || units === item.units_per_carton) return item;
        const perPiece = carton => (carton ? Math.round(carton / units) : null);
        return { ...item, units_per_carton: units, unit_minor: perPiece(item.carton_minor), unit_tax_minor: perPiece(item.carton_tax_minor), warning: `عدد الكرتونة صُحّح من ${item.units_per_carton} إلى ${units} (حسب اسم الصنف وكتالوج المستهلك)` };
    });
}

// The consumer list is the hypermarket sheet's "consumer price" column rounded to whole pounds, exactly as the printed consumer catalog shows it.
function consumerFromHypermarkets(items) {
    return items.filter(item => item.consumer_minor).map(item => {
        const whole = Math.round(item.consumer_minor / 100) * 100;
        return { ...item, itemKey: item.itemKey, unit_minor: whole, consumer_minor: whole, carton_minor: item.units_per_carton ? whole * item.units_per_carton : null, unit_tax_minor: null, carton_tax_minor: null };
    });
}

function collectPriceLists(dir) {
    const lists = {};
    for (const list of Object.keys(SOURCES)) lists[list] = { items: readList(dir, list), source: SOURCES[list].file };
    lists.consumer = { items: consumerFromHypermarkets(lists.hypermarkets.items), source: `${SOURCES.hypermarkets.file} (سعر المستهلك مقرّباً، مطابق لكتالوج المستهلك نوفمبر 2026)` };
    return lists;
}

module.exports = { PERIOD, SOURCES, collectPriceLists, inferCategory };
