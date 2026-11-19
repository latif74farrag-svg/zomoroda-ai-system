/**
 * hotels_supplies_campaign.js
 * حملة الواتساب الآمنة والموجهة بالصفة والقطاع
 * -------------------------------------------------------------
 * 1. الفاصل الزمني العشوائي: من 2 إلى 5 دقائق (120 إلى 300 ثانية)
 * 2. استراحة الأمان: 30 دقيقة بعد كل 5 رسائل
 * 3. تخصيص الخطاب: 10 صيغ احترافية مختلفة تحمل نفس المعنى وموجهة بالصفة
 *    (فندق، مطعم، شيف، مدير مشتريات، شركة، مركز طبي، صالون، تاجر جملة، توريدات عامة)
 * 4. ساعات العمل الرسمية: من 9:00 ص إلى 6:00 م فقط
 * 5. استعادة ذاتية فورية (Self-Healing) في حال أي انقطاع بالمتصفح
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const { getCatalogText } = require('../products_config');

const CONTACTED_FILE = path.join(__dirname, '..', 'contacted_numbers.json');
const BLACKLIST_FILE = path.join(__dirname, '..', 'blacklist.json');
const INBOUND_FILE   = path.join(__dirname, '..', 'inbound_inquiries.json');

// ─── 10 صيغ متغيرة وموجهة بحسب صفة الجهة ────────────────────────────────
function generatePersonalizedMessage(target, index = 0) {
    const rawName = (target.name || '').trim();
    const sector  = (target.sector || '').toLowerCase();
    const nameLower = rawName.toLowerCase();

    // استخراج الاسم النظيف بدون ألقاب مكررة
    const entityName = rawName || 'إدارتكم الموقرة';

    // 1. تحديد فئة الجهة بناءً على الاسم والتصنيف
    const isHotel      = /فندق|hotel|resort|منتجع|سياح|ضيافة/i.test(nameLower + ' ' + sector);
    const isRestaurant = /مطعم|كافيه|cafe|restaurant|مشويات|أكلات|وجبات/i.test(nameLower + ' ' + sector);
    const isChef       = /شيف|مطبخ|kitchen|chef|طهاة|حلواني/i.test(nameLower + ' ' + sector);
    const isProcurement= /مشتريات|توريد|تجهيزات|مشتري|purchasing|procurement/i.test(nameLower + ' ' + sector);
    const isMedical    = /مستشفى|عياد|طبي|مركز طبي|صيدل|معمل|hospital|clinic/i.test(nameLower + ' ' + sector);
    const isSalon      = /صالون|كوافير|تجميل|بيوتي|حلاق|salon|spa|مركز تجميل/i.test(nameLower + ' ' + sector);
    const isWholesale  = /جملة|توزيع|مخزن|مستودع|تجارة|trading|wholesale/i.test(nameLower + ' ' + sector);
    const isCorporate  = /شركة|مؤسسة|مكتب|جروب|group|company|للبترول|للهندسة|للمقاولات/i.test(nameLower + ' ' + sector);

    // 10 قوالب مصاغة ببراعة واحترافية:
    const TEMPLATES = [
        // 1. قالب الفنادق والمنتجعات (يركز على الـ Private Label والنزلاء)
        `تحياتنا لإدارة [اسم_الجهة] الموقرة،
معكم عبد اللطيف فراج من شركة الزمردة كوزماتيكس للتوريدات الفندقية.
يسعدنا تقديم أرقى حلول النظافة والضيافة لمنشأتكم، وخاصة خدمة المناديل الفردية المطبوع عليها شعار واسم فندقكم (Private Label) لتعزيز هوية علامتكم أمام النزلاء، بالإضافة لمعطرات الجو الفاخرة بـ 13 رائحة فرنسية، ومعطرات الأرضيات ورولات التنشيف الفندقية.
هل يناسبكم استلام الكتالوج الفندقي وقائمة أسعار التوريد؟ (أرسل: كتالوج أو نعم).`,

        // 2. قالب المطاعم والكافيهات (يركز على مناديل السفرة، رولات المطبخ، غسيل الأطباق)
        `أهلاً بحضراتكم في [اسم_الجهة]،
معكم عبد اللطيف فراج من الزمردة كوزماتيكس للتوريدات.
نوفر للمطاعم والكافيهات مستلزمات النظافة والضيافة اليومية بأعلى معايير الجودة:
مناديل مبللة فاخرة مع طباعة اللوجو الخاص بمطعمكم، رولات وفوط مطبخ مضلعة لامتصاص الدهون والزيوت بدون وبر، سائل غسيل أطباق مركز، ومعطرات هواء تدوم طويلاً لراحة زبائنكم.
يسعدنا إرسال قائمة عروض الجملة والكتالوج لحضرتكم بكلمة (كتالوج).`,

        // 3. قالب الشيفات ومسؤولي المطابخ (يركز على المتانة وسرعة الأداء والنظافة التامة)
        `تحية طيبة للشيف وفريق العمل في [اسم_الجهة]،
معكم عبد اللطيف فراج - الزمردة كوزماتيكس.
ندرك أهمية أدوات النظافة عالية التحمل داخل المطابخ الاحترافية؛ لذا نوفر لكم رولات المطبخ وفوط التنشيف التركية المقاومة للقطع والتفتت أثناء الطهي والتنظيف، وسوائل جلي الأطباق يونوي المركزة لإزالة أصعب الدهون، ومطهرات الأسطح المعتمدة.
إذا رغبتم في تجربة عينات مجانية أو استلام الكتالوج، يسعدنا تواصلكم بكلمة (كتالوج أو نعم).`,

        // 4. قالب مديري المشتريات والتوريدات (يركز على عروض الجملة، الفواتير، الاستقرار)
        `عناية السيد مدير المشتريات المحترم في [اسم_الجهة]،
تحية طيبة، معكم عبد اللطيف فراج (الزمردة كوزماتيكس للتوريدات العامة).
نتطلع لفتح خط تعاون تعاقدي معكم لتوريد منتجات العناية والنظافة للشركات والمنشآت بأسعار جملة تنافسية وفواتير ضريبية منتظمة:
معطرات جو 460 مل بـ 13 عطر مختلف، معطرات أرضيات مركزة 1 لتر و250 مل، رولات قماش تنشيف، ومناديل سنجل ومبللة.
نتشرف بمشاركتكم قائمة أسعار التوريدات لهذا الشهر بالرد بكلمة (كتالوج).`,

        // 5. قالب الشركات والمقرات الإدارية (يركز على بيئة العمل والمكاتب والاجتماعات)
        `أهلاً بحضراتكم في [اسم_الجهة]،
معكم عبد اللطيف فراج من شركة الزمردة كوزماتيكس.
نوفر حزمة توريدات متكاملة للمكاتب ومقرات الشركات لتهيئة بيئة عمل منعشة وراقية:
معطرات جو فرنسية لغرف الاجتماعات والمكاتب تدوم طويلاً، معطرات أرضيات للممرات، وفوط ورولات تنشيف متينة بدون وبر لمرافق الشركة.
يسعدنا تزويد إدارتكم بكتالوج المنتجات وعروض الشركات لهذا الشهر بالرد بـ (نعم أو كتالوج).`,

        // 6. قالب المنشآت الطبية والمستشفيات (يركز على الأمان، النقاء، ومنع العدوى)
        `السادة إدارة [اسم_الجهة] المحترمون،
معكم عبد اللطيف فراج من شركة الزمردة كوزماتيكس للتوريدات.
نوفر مستلزمات العناية والتعقيم المتوافقة مع معايير المنشآت الطبية:
مناديل وايبس ناعمة وعالية النقاء بحماية مؤكدة للبشرة، رولات وفوط تنشيف للاستخدام الفردي لضمان أعلى مستويات الأمان الصحي، ومعطرات هواء لطيفة لغرف الاستقبال والانتظار.
يسعدنا إرسال الكتالوج المعتمد وقائمة الأسعار بكلمة (كتالوج).`,

        // 7. قالب التميز والـ Private Label (يركز على صناعة علامة تجارية خاصة للعميل)
        `مرحباً بحضرتك، معكم عبد اللطيف فراج من الزمردة كوزماتيكس.
نختص بتصنيع وطباعة المناديل الفردية المعطرة والمعقمة باسم وشعار [اسم_الجهة] بأفضل خامات ملمس قطني تترك انطباعاً راقياً لدى عملائكم وزواركم، بالإضافة لمعطرات الجو والأرضيات عالية التركيز بأسعار مصنع مباشرة.
هل ترغبون بالاطلاع على نماذج أعمالنا وقائمة الأسعار؟ أرسلوا كلمة (كتالوج).`,

        // 8. قالب كبار تجار الجملة والموزعين (يركز على الشحنات وهوامش الربح)
        `تحياتنا لفريق العمل في [اسم_الجهة]،
معكم عبد اللطيف فراج من شركة الزمردة كوزماتيكس.
نوفر توريدات جملة كبرى بحمولات وشحنات سريعة لكافة المحافظات لمنتجات رونزا ويونو (مناديل وايبس، معطرات، رولات تنظيف، وسوائل أطباق) مع هوامش ربح ممتازة وتسهيلات لشركاء التوزيع والتوريدات.
هل نرسل لحضراتكم كشف أسعار كبار الموزعين؟ يسعدنا ردكم بـ (نعم أو كتالوج).`,

        // 9. قالب الصالونات ومراكز التجميل (يركز على فوط التنشيف ومزيل المكياج)
        `أهلاً بفريق وإدارة [اسم_الجهة]،
معكم عبد اللطيف فراج من الزمردة كوزماتيكس.
نوفر مستلزمات الصالونات ومراكز التجميل الأساسية بجودة ممتازة وأسعار جملة:
فوط تنشيف تركي للاستخدام الواحد لمنع العدوى، مناديل رونزا اللطيفة لإزالة المكياج بالألوفيرا والورد، مناديل معطرة فاخرة، ومعطرات جو فواحة تمنح مركزكم رائحة مميزة.
يسعدنا إرسال الكتالوج الخاص بالصالونات لحضرتكم بكلمة (كتالوج).`,

        // 10. قالب الشراكة التجارية العامة (صيغة مباشرة ومرنة ومقنعة)
        `تحية طيبة لحضرتك في [اسم_الجهة]،
معكم عبد اللطيف فراج من الزمردة كوزماتيكس للتوريدات العامة.
يسعدنا عرض خدماتنا في توريد منتجات النظافة والعناية الاستهلاكية عالية الجودة والمطابقة للمواصفات القياسية، مع توفير خصومات دورية وتوريد مباشر لجميع المحافظات.
للاطلاع على الكتالوج وصور المنتجات والعروض الحالية، نتشرف بردكم بكلمة (كتالوج أو نعم).
(للإلغاء في أي وقت: أرسل إيقاف).`
    ];

    let chosenText = '';

    // اختيار القالب الأنسب بحسب صفة الجهة
    if (isHotel) {
        chosenText = TEMPLATES[0];
    } else if (isRestaurant) {
        chosenText = TEMPLATES[1];
    } else if (isChef) {
        chosenText = TEMPLATES[2];
    } else if (isProcurement) {
        chosenText = TEMPLATES[3];
    } else if (isCorporate) {
        chosenText = TEMPLATES[4];
    } else if (isMedical) {
        chosenText = TEMPLATES[5];
    } else if (isSalon) {
        chosenText = TEMPLATES[8];
    } else if (isWholesale) {
        chosenText = TEMPLATES[7];
    } else {
        // تدوير الصيغ العامة بحسب الترتيب لضمان تنوع 100%
        const fallbackTemplates = [TEMPLATES[3], TEMPLATES[4], TEMPLATES[6], TEMPLATES[9]];
        chosenText = fallbackTemplates[index % fallbackTemplates.length];
    }

    // استبدال رمز [اسم_الجهة] بالاسم الحقيقي
    return chosenText.replace(/\[اسم_الجهة\]/g, entityName);
}

function getList(filePath) {
    try {
        if (fs.existsSync(filePath)) return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {}
    return [];
}

function saveList(filePath, list) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(list, null, 2), 'utf8');
    } catch (e) {}
}

// ─── إدارة سجل المراسلات وشرط الـ 30 يوماً ──────────────────────────────────
function loadContacted() {
    try {
        if (fs.existsSync(CONTACTED_FILE)) {
            const arr = JSON.parse(fs.readFileSync(CONTACTED_FILE, 'utf8'));
            const map = new Map();
            for (const item of arr) {
                if (typeof item === 'string') {
                    map.set(item, { chatId: item, lastSentDate: '1970-01-01T00:00:00.000Z' });
                } else if (item && item.chatId) {
                    map.set(item.chatId, item);
                }
            }
            return map;
        }
    } catch (e) {}
    return new Map();
}

function saveContacted(map) {
    try {
        const arr = Array.from(map.values());
        fs.writeFileSync(CONTACTED_FILE, JSON.stringify(arr, null, 2), 'utf8');
    } catch (e) {}
}

/**
 * فحص استحقاق العميل للرسالة الترحيبية:
 * 1. لا يُرسل له إذا كان في القائمة السوداء.
 * 2. إذا سبق مراسلته، لا تُرسل له رسالة ترحيبية أخرى إلا بعد مرور 30 يوماً بالتمام والكمال.
 */
function checkEligibility(chatId, contactedMap, blacklist) {
    if (blacklist.includes(chatId)) {
        return { allowed: false, reason: 'في القائمة السوداء' };
    }
    const record = contactedMap.get(chatId);
    if (!record) {
        return { allowed: true, isNew: true };
    }

    const lastDate = new Date(record.lastSentDate || 0);
    const diffMs = Date.now() - lastDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 30) {
        return { allowed: false, reason: `تمت مراسلته منذ ${diffDays} يوم (لا تجوز المراسلة إلا بعد مرور 30 يوماً)` };
    }

    return { allowed: true, isRecontact: true, diffDays };
}

function cleanPhone(raw) {
    if (!raw) return null;
    let s = String(raw).replace(/\D/g, '');
    if (s.startsWith('002')) s = s.slice(3);
    if (s.startsWith('20') && s.length === 12) return s + '@c.us';
    if (s.startsWith('01') && s.length === 11) return '2' + s + '@c.us';
    if (s.startsWith('1') && s.length === 10) return '20' + s + '@c.us';
    if (s.length >= 10) return (s.startsWith('20') ? s : '20' + s) + '@c.us';
    return null;
}

function isWorkingHours() {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    if (day === 5) return { allowed: false, reason: 'اليوم الجمعة (عطلة رسمية)' };
    if (hour < 9 || hour >= 18) return { allowed: false, reason: `خارج ساعات العمل (الساعة الآن: ${hour}:00)` };
    return { allowed: true };
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
// فاصل زمني عشوائي من 2 إلى 5 دقائق (120 إلى 300 ثانية)
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// إعداد عميل واتساب
const client = new Client({
    authStrategy: new LocalAuth({ dataPath: path.join(__dirname, '..', 'whatsapp_auth') }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-extensions'
        ]
    }
});

client.on('qr', qr => {
    console.log('⚡ مطلوب مسح كود QR:');
    qrcode.generate(qr, { small: true });
});

client.on('authenticated', () => console.log('✅ تم توثيق جلسة الواتساب بنجاح.'));

client.on('disconnected', reason => {
    console.log('⚠️ انقطع اتصال الواتساب:', reason, '-> جاري إعادة التشغيل التلقائي...');
    process.exit(1);
});

// ─── الاستجابة الفورية لرسائل واستفسارات العملاء الواردة 24/7 ────────────────
client.on('message', async msg => {
    try {
        if (!msg.body || msg.from.includes('@g.us') || msg.from.includes('@broadcast') || msg.from.includes('@newsletter') || msg.fromMe) return;

        const from = msg.from;
        const text = msg.body.trim();
        const lower = text.toLowerCase();

        console.log(`\n📩 رسالة واردة من عميل (${from}): "${text}"`);

        // حفظ سجل الوارد في inbound_inquiries.json لتوثيق جميع الطلبات
        try {
            const inbounds = getList(INBOUND_FILE);
            inbounds.push({ from, text, timestamp: new Date().toISOString() });
            saveList(INBOUND_FILE, inbounds);
        } catch (_) {}

        // 1. طلب إلغاء المراسلات (إيقاف) -> تنفيذ فوري وإضافة للقائمة السوداء
        const STOP = /إيقاف|ايقاف|الغاء|إلغاء|توقف|مش عايز|غير مهتم|حذف|stop|unsubscribe/i;
        if (STOP.test(lower)) {
            const blacklist = getList(BLACKLIST_FILE);
            if (!blacklist.includes(from)) {
                blacklist.push(from);
                saveList(BLACKLIST_FILE, blacklist);
            }
            await msg.reply('تم إيقاف المراسلات لحضرتك نهائياً، نعتذر عن أي إزعاج ونشكرك على وقتك.');
            console.log(`⛔ تم إلغاء اشتراك العميل وإضافته للقائمة السوداء: ${from}`);
            return;
        }

        // 2. طلب الكتالوج / الأسعار / العروض / رد العميل بـ (كتالوج أو نعم)
        const CATALOG_KEYWORDS = /كتالوج|كتالوجات|منتجات|اسعار|أسعار|تفاصيل|عروض|قائمة|نعم|ابعت|ارسل|ممكن|عايز اعرف|عايزين نعرف/i;
        if (CATALOG_KEYWORDS.test(lower)) {
            const contactedMap = loadContacted();
            const contactInfo = contactedMap.get(from);
            let category = 'hotels';
            if (contactInfo && /صيدل|طبي/i.test(contactInfo.sector || '')) {
                category = 'pharmacy';
            }
            const catalogText = getCatalogText(category);
            await msg.reply(catalogText);
            console.log(`📋 تم إرسال الكتالوج المخصص فوراً للعميل: ${from}`);
            return;
        }

        // 3. استفسار عن عمل / تسويق بالعمولة / ربات بيوت وماميز
        const JOB_KEYWORDS = /عمل|أونلاين|دخل|شغل|ماميز|مندوبة|عمولة|من البيت/i;
        if (JOB_KEYWORDS.test(lower)) {
            await msg.reply('أهلاً بكِ في عائلة "الزمردة كوزماتيكس"! 🌸\nنوفر فرص عمل حر من المنزل بعمولات تصاعدية ممتازة على منتجات العناية والورقيات والمعطرات.\nللتسجيل، يرجى تزويدنا بـ: (الاسم الثلاثي - المحافظة).');
            console.log(`🌸 تم إرسال تفاصيل العمل بالعمولة فوراً: ${from}`);
            return;
        }

        // 4. أي استفسار آخر أو طلب خاص من العميل -> الرد عليه في الحال باحترافية
        await msg.reply('أهلاً بحضرتك في الزمردة كوزماتيكس للتوريدات! 🌿\nتم استلام رسالتك باهتمام، وسيقوم مسؤول المبيعات والتوريدات بالرد على استفسارك ومتابعة طلبك في الحال.\nيسعدنا دائماً تواصلك وخدمتك.');
        console.log(`💬 تم الرد الفوري على استفسار/طلب العميل: ${from}`);

    } catch (err) {
        console.error('❌ خطأ في معالجة الرسالة الواردة:', err.message);
    }
});

client.on('ready', async () => {
    console.log('🚀 عميل الواتساب متصل وجاهز للعمل بالمحددات الجديدة!');
    console.log('⏱️ الفاصل الزمني المعتمد: من 2 إلى 5 دقائق عشوائياً بين كل رسالة.');
    console.log('🛡️ استراحة الأمان: 30 دقيقة بعد كل 5 رسائل.');
    console.log('📝 تخصيص الخطاب: مفعل بـ 10 صيغ متغيرة وموجهة بحسب صفة الجهة.');
    console.log('🔒 قاعدة الـ 30 يوماً: مفعلة بدقة (لا إعادة مراسلة ترحيبية إلا بعد مرور 30 يوماً).');
    console.log('⚡ الرد الفوري: مفعل 24/7 لأي استفسار أو تفاعل من العملاء.\n');
    await startHotelsSuppliesCampaign();
});

async function startHotelsSuppliesCampaign() {
    console.log('📋 فحص ملفات الحملة...');
    const files = [
        path.join(__dirname, '..', 'فنادق.xlsx'),
        path.join(__dirname, '..', 'توريدات.xlsx')
    ];

    let allTargets = [];
    files.forEach(f => {
        if (fs.existsSync(f)) {
            const wb = XLSX.readFile(f);
            const sheet = wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet);
            console.log(`  ✓ تم قراءة: ${path.basename(f)} (${rows.length} جهة)`);
            rows.forEach(r => {
                const phone = r['رقم الهاتف'] || r['هاتف (موبايل/واتساب)'] || r.Phone || r.Mobile;
                const name  = r['اسم الجهة / الشركة'] || r['اسم الجهة'] || r.Name || '';
                const sector= r['القطاع / التصنيف'] || r['القطاع'] || '';
                if (phone) allTargets.push({ name, sector, rawPhone: phone, file: path.basename(f) });
            });
        }
    });

    console.log(`📊 إجمالي الأرقام المستخرجة: ${allTargets.length}`);
    const contactedMap = loadContacted();
    const blacklist = getList(BLACKLIST_FILE);

    let sentInSession = 0;

    for (let i = 0; i < allTargets.length; i++) {
        const target = allTargets[i];
        const chatId = cleanPhone(target.rawPhone);

        if (!chatId) continue;

        // 1. تطبيق فحص الاستحقاق وشرط الـ 30 يوماً
        const eligibility = checkEligibility(chatId, contactedMap, blacklist);
        if (!eligibility.allowed) {
            continue; // تخطي الرقم لعدم اكتمال 30 يوماً أو وجوده بالقائمة السوداء
        }

        // 2. فحص ساعات العمل الرسمية (9:00 ص - 6:00 م)
        const check = isWorkingHours();
        if (!check.allowed) {
            console.log(`\n⏳ توقف مؤقت: ${check.reason}.`);
            console.log(`💡 سيتم انتظار حلول ساعات العمل الرسمية (9:00 ص - 6:00 م)...`);
            
            while (!isWorkingHours().allowed) {
                await sleep(60 * 1000);
            }
            console.log(`\n⏰ حلول موعد ساعات العمل الرسمية! إعادة تشغيل نظيفة للمتصفح عبر PM2...`);
            process.exit(1);
        }

        // 3. إنشاء الرسالة المخصصة بناءً على اسم وصفة الجهة
        const personalizedMessage = generatePersonalizedMessage(target, sentInSession);

        try {
            const isReg = await client.isRegisteredUser(chatId);
            if (isReg) {
                await client.sendMessage(chatId, personalizedMessage);
                
                // تسجيل وتحديث تاريخ الإرسال بالثانية لشرط الـ 30 يوماً
                contactedMap.set(chatId, {
                    chatId,
                    lastSentDate: new Date().toISOString(),
                    name: target.name,
                    sector: target.sector
                });
                saveContacted(contactedMap);
                sentInSession++;

                console.log(`\n✅ [رسالة ${sentInSession}] تم إرسالها بنجاح إلى:`);
                console.log(`   🏢 الجهة : ${target.name || '(غير محدد)'}`);
                console.log(`   📱 الرقم  : ${chatId}`);
                console.log(`   📄 الملف  : [${target.file}]`);
                console.log(`   ✉️ البداية: "${personalizedMessage.split('\n')[0].slice(0, 50)}..."`);

                // استراحة بعد كل 5 رسائل لمدة 30 دقيقة
                if (sentInSession > 0 && sentInSession % 5 === 0) {
                    const breakMinutes = 30;
                    console.log(`\n🛡️ [أمان الواتساب]: إتمام 5 رسائل بنجاح. بدء استراحة أمان لمدة ${breakMinutes} دقيقة لحماية الحساب تماماً...`);
                    await sleep(breakMinutes * 60 * 1000);
                    console.log(`🚀 انتهاء استراحة الأمان! استئناف الإرسال...`);
                } else {
                    // فاصل عشوائي متغيّر من 2 إلى 5 دقائق (120 إلى 300 ثانية)
                    const delaySec = getRandomInt(120, 300);
                    const minutes = (delaySec / 60).toFixed(1);
                    console.log(`⏳ فاصل أمان عشوائي: ${delaySec} ثانية (~${minutes} دقيقة) قبل الرسالة التالية...`);
                    await sleep(delaySec * 1000);
                }
            } else {
                console.log(`⚠️ الرقم ليس له حساب واتساب مسجل: ${chatId}`);
            }
        } catch (err) {
            console.error(`❌ خطأ أثناء الإرسال للرقم ${chatId}:`, err.message);
            
            if (err.message.includes('detached Frame') || err.message.includes('destroyed') || err.message.includes('Session closed')) {
                console.log('🔄 رصد انفصال المتصفح (Detached Frame). إعادة تشغيل المتصفح فوراً عبر PM2...');
                process.exit(1);
            }
            await sleep(10000);
        }
    }

    console.log(`\n🎉 اكتملت حملة الفنادق والتوريدات بالكامل! إجمالي المرسل في هذه الجلسة: ${sentInSession}`);
}

process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
    if (String(reason).includes('detached Frame') || String(reason).includes('destroyed')) {
        process.exit(1);
    }
});

client.initialize();
