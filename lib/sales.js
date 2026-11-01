const { transaction } = require('./storage');
const { classifySector, normalizeContact, setOptOut, SECTOR_LABELS } = require('./leads');

// Approved catalog and price-list files per sector. Pharmacies receive Ronza only; moms receive retail prices only.
const ASSETS = {
    pharmacies: { catalog: 'رونزا_كتالوج_الصيدليات.pdf', pricelist: 'قائمة_اسعار_وكلاء صيادله _10-2026.xlsx' },
    hypermarkets: { catalog: 'رونزا_كتالوج_الهيبرات_10-2026.pdf', pricelist: 'قائمة_اسعار_الهيبرات_10-2026_معدلة.xlsx' },
    distribution: { catalog: 'رونزا_كتالوج_شركات_التوزيع_10-2026 (5).pdf', pricelist: 'قائمة_اسعار_شركات_التوزيع_10-2026_معدلة.xlsx' },
    hotels: { catalog: 'كتالوج الفنادق و التوريدات.pdf', pricelist: 'اسعار الفنادق.pdf' },
    supplies: { catalog: 'كتالوج الفنادق و التوريدات.pdf', pricelist: 'اسعار الفنادق.pdf' },
    salon: { catalog: 'salon كتالوج .pdf', pricelist: 'اسعار salon.pdf' },
    moms: { catalog: 'رونزا_كتالوج_الجمهور صيادله.pdf', pricelist: 'اسعار  و كتالوج_المستهلك _بصور_منفصلة.pdf' },
    retail: { catalog: 'رونزا_كتالوج_الجمهور صيادله.pdf', pricelist: 'اسعار  و كتالوج_المستهلك _بصور_منفصلة.pdf' }
};
const PRODUCTS = [
    { id: 'ronza_wipes', name: 'مناديل مبللة رونزا', price: 35, unit: 'عبوة', words: ['رونزا', 'ronza'] },
    { id: 'yono_wipes', name: 'مناديل مبللة يونو', price: 30, unit: 'عبوة', words: ['يونو', 'yono'] },
    { id: 'kitchen_roll_cloth', name: 'فوط مطبخ قماش رول', price: 50, unit: 'رول', words: ['رول', 'فوط مطبخ'] },
    { id: 'single_use_towel', name: 'فوطة تنشيف مرة واحدة', price: 40, unit: 'باكت', words: ['تنشيف', 'فوطة', 'فوط'] },
    { id: 'air_floor_freshener', name: 'معطر جو وأرضيات', price: 60, unit: 'زجاجة', words: ['معطر'] },
    { id: 'dish_soap', name: 'سائل أطباق مركز', price: 25, unit: 'لتر', words: ['اطباق', 'أطباق', 'سائل'] },
    { id: 'private_label_wipes', name: 'منديل سنجل Private Label', price: 1.5, unit: 'منديل', words: ['برايفت', 'private', 'لوجو', 'شعار'] }
];
const ALLOWED = {
    pharmacies: ['ronza_wipes'],
    hotels: ['private_label_wipes', 'air_floor_freshener', 'single_use_towel'],
    supplies: ['private_label_wipes', 'air_floor_freshener', 'single_use_towel']
};
const OWNER = 'عبداللطيف فراج';
const STOP = /إيقاف|ايقاف|الغاء|إلغاء|توقف|مش عايز|غير مهتم|حذف/;
const POSITIVE = /نعم|ايوه|أيوه|تمام|موافق|ارسل|أرسل|ابعت|عايز|محتاج|اه|الكتالوج|كتالوج|التفاصيل|مهتم|ممكن/;
const PRICE = /سعر|بكام|كام|اسعار|أسعار|تكلفة|عرض|عمولة|نسبة/;
const ORDER = /طلب|اوردر|أوردر|كمية|\d+/;

function productsFor(sector) {
    const allowed = ALLOWED[sector];
    return allowed ? PRODUCTS.filter(product => allowed.includes(product.id)) : PRODUCTS;
}

// Quantity × price in piastres, only for products the sector may receive.
function buildInvoice(sector, message) {
    const allowed = productsFor(sector);
    const lines = [];
    const rejected = [];
    for (const product of PRODUCTS) {
        const pattern = new RegExp(`(\\d{1,5})\\s*(?:عبوة|عبوه|رول|باكت|زجاجة|لتر|كرتونة|منديل)?\\s*(?:من\\s*)?(?:${product.words.join('|')})`, 'i');
        const match = String(message).match(pattern);
        if (!match) continue;
        const quantity = Number(match[1]);
        if (!quantity || quantity > 10000) continue;
        if (!allowed.includes(product)) { rejected.push(product.name); continue; }
        lines.push({ product: product.name, quantity, unit: product.unit, unit_minor: Math.round(product.price * 100), total_minor: Math.round(product.price * 100) * quantity });
    }
    return { lines, rejected, total_minor: lines.reduce((sum, line) => sum + line.total_minor, 0) };
}

const money = minor => (minor / 100).toLocaleString('en-US', { maximumFractionDigits: 2 });

function categoryMenu() {
    return `أهلاً بحضرتك معك ${OWNER} من شركة الزمردة كوزماتيكس.\nلنرسل لك الكتالوج والأسعار المناسبة لنشاطك، من فضلك اختر:\n1) صيدلية أو وكيل\n2) هايبر ماركت أو تاجر جملة\n3) فندق أو مطعم\n4) كوافير أو صالون\n5) شركة توزيع\n6) مندوبة مبيعات من البيت`;
}

function pickSector(text) {
    const numbered = { 1: 'pharmacies', 2: 'hypermarkets', 3: 'hotels', 4: 'salon', 5: 'distribution', 6: 'moms' }[String(text).trim()];
    return numbered || classifySector(text);
}

// Pure decision step: given the lead's current stage and the message, returns the next stage and a staff-reviewable draft.
function decide({ lead, message }) {
    const text = String(message || '');
    if (STOP.test(text)) return { stage: 'opted_out', optOut: true, reply: 'تم إيقاف الرسائل لك نهائياً، نعتذر عن الإزعاج ونشكرك على وقتك.' };
    let sector = lead && lead.sector !== 'unknown' ? lead.sector : pickSector(text);
    const stage = lead ? lead.stage : 'new';
    if (!sector || sector === 'unknown') return { stage: 'awaiting_category', sector: 'unknown', reply: categoryMenu() };
    const label = SECTOR_LABELS[sector];
    const assets = ASSETS[sector] || ASSETS.hypermarkets;
    const invoice = ORDER.test(text) && stage !== 'new' && stage !== 'awaiting_category' ? buildInvoice(sector, text) : null;
    if (invoice && invoice.lines.length) {
        const rows = invoice.lines.map(line => `• ${line.product}: ${line.quantity} ${line.unit} × ${money(line.unit_minor)} = ${money(line.total_minor)} ج.م`).join('\n');
        const note = invoice.rejected.length ? `\nملاحظة: (${invoice.rejected.join('، ')}) غير متاحة لفئتكم.` : '';
        return { stage: 'order_inquired', sector, invoice, attachments: [], reply: `فاتورة مبدئية لفئة (${label}):\n${rows}\nالإجمالي: ${money(invoice.total_minor)} ج.م${note}\nتم رفع الطلب لمسؤول المبيعات ${OWNER} للتأكيد والتوريد.` };
    }
    if (stage === 'new' || stage === 'awaiting_category' || stage === 'welcomed') {
        const intro = sector === 'moms'
            ? `أهلاً بحضرتك، معك ${OWNER} في فريق سيدات الزمردة. يمكنك العمل من البيت كمندوبة بعمولة مع فرصة الترقية لمشرفة فريق.`
            : `أهلاً بحضرتك، معك ${OWNER}. صنّفنا نشاطكم ضمن فئة (${label}).`;
        return { stage: 'catalog_sent', sector, attachments: [{ type: 'catalog', file: assets.catalog }], reply: `${intro}\nنرسل لك الكتالوج المخصص لفئتكم. هل ترغب في قائمة الأسعار وعروض الكميات؟` };
    }
    if (PRICE.test(text) || (stage === 'catalog_sent' && POSITIVE.test(text))) {
        return { stage: 'prices_sent', sector, attachments: [{ type: 'pricelist', file: assets.pricelist }], reply: `هذه قائمة الأسعار المعتمدة لفئة (${label}). حدد لنا الأصناف والكميات المطلوبة وسنجهز لك الفاتورة.` };
    }
    return { stage, sector, attachments: [], reply: `تم تسجيل استفسارك وسيتواصل معك مسؤول مبيعات فئة (${label}).` };
}

// Persists the lead and returns the draft. Nothing is sent to the customer.
async function handleMessage(database, { senderId, message, channel = 'whatsapp' }, actor) {
    const contact = normalizeContact(senderId) || { key: String(senderId || '').trim().toLowerCase().slice(0, 80), channel };
    if (!contact.key) throw Object.assign(new Error('معرّف المرسل مطلوب.'), { status: 400 });
    const text = String(message || '').trim().slice(0, 1000);
    if (!text) throw Object.assign(new Error('الرسالة مطلوبة.'), { status: 400 });
    return transaction(database, async tx => {
        const lead = (await tx.execute({ sql: 'SELECT * FROM leads WHERE contact_key = ?', args: [contact.key] })).rows[0];
        const result = decide({ lead, message: text });
        const now = Date.now();
        await tx.execute({ sql: `INSERT INTO leads(id, contact_key, channel, name, sector, source, stage, created_at, updated_at) VALUES (?, ?, ?, '', ?, 'assistant', ?, ?, ?)
            ON CONFLICT(contact_key) DO UPDATE SET stage = excluded.stage, sector = CASE WHEN leads.sector = 'unknown' THEN excluded.sector ELSE leads.sector END, updated_at = excluded.updated_at`, args: [require('node:crypto').randomUUID(), contact.key, contact.channel, result.sector || 'unknown', result.stage, now, now] });
        if (result.optOut) await setOptOut(tx, contact.key);
        await require('./commerce').audit(tx, actor, 'sales.draft', 'lead', { stage: result.stage, sector: result.sector || null });
        return { draft: true, stage: result.stage, sector: result.sector || 'unknown', reply: result.reply, attachments: result.attachments || [], invoice: result.invoice || null };
    });
}

module.exports = { decide, handleMessage, buildInvoice, productsFor, ASSETS, PRODUCTS };
