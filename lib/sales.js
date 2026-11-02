const crypto = require('node:crypto');
const { transaction } = require('./storage');
const { audit } = require('./commerce');
const { classifySector, normalizeContact, setOptOut, SECTOR_LABELS } = require('./leads');
const { findItem, itemsForSector, fold } = require('./price-lists');

const CONSUMER = 'اسعار و كتالوج المستهلك_نوفمبر_2026.pdf';
// November 2026 catalogs and price lists per sector. Moms, sales reps and Zomoroda ambassadors (commission) always get the consumer catalog.
const ASSETS = {
    pharmacies: { catalog: 'رونزا_كتالوج_الصيدليات_نوفمبر_2026.pdf', pricelist: 'قائمه اسعار الصيادله 11-2026.xlsx' },
    agents: { catalog: 'رونزا_كتالوج_الوكلاء_صيادله_نوفمبر_2026.pdf', pricelist: 'قائمة اسعار وكلاء صيادله  11-2026.xlsx' },
    hypermarkets: { catalog: 'كتالوج_الهيبرات_11-2026.pdf', pricelist: 'قائمة_أسعار_الهيبرات_11-2026.xlsx' },
    distribution: { catalog: 'رونزا_كتالوج_شركات_التوزيع_10-2026 (5).pdf', pricelist: 'قائمة اسعار  شركات التوزيع 11-2026.xlsx' },
    hotels: { catalog: 'كتالوج_الفنادق_11-2026.pdf', pricelist: 'اسعار_الفنادق_11-2026.xlsx' },
    supplies: { catalog: 'كتالوج_الفنادق_11-2026.pdf', pricelist: 'اسعار_الفنادق_11-2026.xlsx' },
    salon: { catalog: 'كتالوج_الصالون_11-2026.pdf', pricelist: 'اسعار_الصالون_11-2026.xlsx' },
    moms: { catalog: CONSUMER, pricelist: CONSUMER },
    retail: { catalog: CONSUMER, pricelist: CONSUMER }
};
const PRICE_NOTE = { moms: 'الأسعار شاملة الضريبة.', retail: 'الأسعار شاملة الضريبة.', hypermarkets: 'الأسعار قبل الضريبة.', distribution: 'الأسعار قبل الضريبة.', pharmacies: 'الأسعار قبل الضريبة.', agents: 'الأسعار قبل الضريبة.' };
const OWNER = 'عبداللطيف فراج';
const STOP = /إيقاف|ايقاف|الغاء|إلغاء|توقف|مش عايز|غير مهتم|حذف/;
const POSITIVE = /نعم|ايوه|أيوه|تمام|موافق|ارسل|أرسل|ابعت|عايز|محتاج|اه|الكتالوج|كتالوج|التفاصيل|مهتم|ممكن/;
const PRICE = /سعر|بكام|كام|اسعار|أسعار|تكلفة|عرض|عمولة|نسبة/;
const ORDER = /طلب|اوردر|أوردر|كمية|\d+/;
const AGENT = /وكيل|وكلاء|مذخر|مكتب علمي|شركة أدوية|شركات الأدوية/;
const UNIT_WORDS = '(?:كرتونة|كراتين|كرتونه|عبوة|عبوات|عبوه|قطعة|قطع|قطعه|رول|باكت|زجاجة|لتر|منديل)';

const money = minor => (minor / 100).toLocaleString('en-US', { maximumFractionDigits: 2 });
const listKey = (sector, text) => (sector === 'pharmacies' && AGENT.test(text) ? 'agents' : sector);

// "50 رونزا 120 ولد" or "رونزا 120 ولد 50" → { quantity, request, carton }. Fragments are split on "و" / commas.
function parseRequests(message) {
    const out = [];
    for (const fragment of String(message).split(/\s+و\s*|[,،\n]+/)) {
        const text = fragment.trim();
        const lead = text.match(new RegExp(`(?:^|\\s)(\\d{1,5})\\s*(${UNIT_WORDS})?\\s*(?:من\\s+)?([^\\d].{1,60})$`));
        const tail = text.match(new RegExp(`^(.{2,60}?)\\s+(\\d{1,5})\\s*(${UNIT_WORDS})?$`));
        const picked = lead ? { quantity: Number(lead[1]), unit: lead[2], request: lead[3] } : tail ? { quantity: Number(tail[2]), unit: tail[3], request: tail[1] } : null;
        if (picked && picked.quantity > 0 && picked.quantity <= 10000) out.push({ quantity: picked.quantity, carton: /كرتون|كراتين/.test(picked.unit || ''), request: picked.request.replace(new RegExp(UNIT_WORDS, 'g'), '').trim() });
    }
    return out;
}

// Quantity × price in piastres from the sector's own November price list. Items outside that list are reported, never priced.
function buildInvoice(items, message) {
    const lines = [];
    const rejected = [];
    for (const { quantity, carton, request } of parseRequests(message)) {
        if (!fold(request)) continue;
        const item = findItem(items, request);
        const price = item ? (carton ? item.carton_minor : item.unit_minor) : null;
        if (!item || !price) { rejected.push(request); continue; }
        lines.push({ product: item.name, quantity, unit: carton ? 'كرتونة' : 'قطعة', unit_minor: price, total_minor: price * quantity, barcode: item.barcode || null });
    }
    return { lines, rejected, total_minor: lines.reduce((sum, line) => sum + line.total_minor, 0) };
}

function categoryMenu() {
    return `أهلاً بحضرتك معك ${OWNER} من شركة الزمردة كوزماتيكس.\nلنرسل لك الكتالوج والأسعار المناسبة لنشاطك، من فضلك اختر:\n1) صيدلية أو وكيل\n2) هايبر ماركت أو تاجر جملة\n3) فندق أو مطعم\n4) كوافير أو صالون\n5) شركة توزيع\n6) ماميز أو مندوبة مبيعات أو سفيرة الزمردة (بالعمولة)`;
}

function pickSector(text) {
    return { 1: 'pharmacies', 2: 'hypermarkets', 3: 'hotels', 4: 'salon', 5: 'distribution', 6: 'moms' }[String(text).trim()] || classifySector(text);
}

// Pure decision step: the lead's stage, the message and the sector's price list in, a staff-reviewable draft out.
function decide({ lead, message, items = [], forceSector = null }) {
    const text = String(message || '');
    if (STOP.test(text)) return { stage: 'opted_out', optOut: true, reply: 'تم إيقاف الرسائل لك نهائياً، نعتذر عن الإزعاج ونشكرك على وقتك.' };
    const sector = forceSector || (lead && lead.sector !== 'unknown' ? lead.sector : pickSector(text));
    const stage = lead ? lead.stage : 'new';
    if (!sector || sector === 'unknown') return { stage: 'awaiting_category', sector: 'unknown', reply: categoryMenu() };
    const label = SECTOR_LABELS[sector];
    const assets = ASSETS[listKey(sector, text)] || ASSETS.hypermarkets;
    const invoice = ORDER.test(text) && stage !== 'new' && stage !== 'awaiting_category' ? buildInvoice(items, text) : null;
    if (invoice && invoice.lines.length) {
        const rows = invoice.lines.map(line => `• ${line.product}: ${line.quantity} ${line.unit} × ${money(line.unit_minor)} = ${money(line.total_minor)} ج.م`).join('\n');
        const note = invoice.rejected.length ? `\nلم نجد في قائمة فئتكم: ${invoice.rejected.join('، ')}.` : '';
        return { stage: 'order_inquired', sector, invoice, attachments: [], reply: `فاتورة مبدئية لفئة (${label}):\n${rows}\nالإجمالي: ${money(invoice.total_minor)} ج.م. ${PRICE_NOTE[sector] || ''}${note}\nتم رفع الطلب لمسؤول المبيعات ${OWNER} للتأكيد والتوريد.` };
    }
    if (stage === 'new' || stage === 'awaiting_category' || stage === 'welcomed') {
        const intro = sector === 'moms' || sector === 'retail'
            ? `أهلاً بحضرتك، معك ${OWNER} في فريق الزمردة. يمكنك العمل كمندوبة أو سفيرة بعمولة مع فرصة الترقية لمشرفة فريق.`
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
        const affiliate = (await tx.execute({ sql: 'SELECT 1 FROM affiliates WHERE phone = ?', args: [contact.key] })).rows.length > 0;
        const known = affiliate ? 'moms' : null;
        const sector = known || (lead && lead.sector !== 'unknown' ? lead.sector : pickSector(text));
        const list = listKey(sector, text);
        const items = list === 'agents' ? (await tx.execute("SELECT * FROM price_list_items WHERE list = 'agents'")).rows : await itemsForSector(tx, sector);
        const result = decide({ lead, message: text, items, forceSector: known });
        const now = Date.now();
        await tx.execute({ sql: `INSERT INTO leads(id, contact_key, channel, name, sector, source, stage, created_at, updated_at) VALUES (?, ?, ?, '', ?, 'assistant', ?, ?, ?)
            ON CONFLICT(contact_key) DO UPDATE SET stage = excluded.stage, sector = CASE WHEN leads.sector = 'unknown' THEN excluded.sector ELSE leads.sector END, updated_at = excluded.updated_at`, args: [crypto.randomUUID(), contact.key, contact.channel, result.sector || 'unknown', result.stage, now, now] });
        if (result.optOut) await setOptOut(tx, contact.key);
        await audit(tx, actor, 'sales.draft', 'lead', { stage: result.stage, sector: result.sector || null, affiliate });
        return { draft: true, stage: result.stage, sector: result.sector || 'unknown', reply: result.reply, attachments: result.attachments || [], invoice: result.invoice || null };
    });
}

module.exports = { decide, handleMessage, buildInvoice, parseRequests, ASSETS, CONSUMER };
