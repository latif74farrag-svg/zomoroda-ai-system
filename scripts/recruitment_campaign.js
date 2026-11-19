/**
 * recruitment_campaign.js
 * حملة التوظيف لمديري ومسؤولي مبيعات جنوب الصعيد
 * - الملف: مديرو_جنوب_الصعيد.xlsx
 * - الوظائف: مدير مبيعات للجنوب - مشرف مبيعات - أوردر تيكر
 * - الشروط: خبرة سنتين على الأقل في الكوزماتيكس / الورقيات / المنظفات
 * - الشركة: شركة بيوتي هيلث للصناعات المتطورة (منتجات رونزا ويونو)
 * - رقم التقديم: 01006636688
 * - محددات الأمان:
 *   1. فاصل زمني عشوائي من 2 إلى 5 دقائق بين كل رسالة
 *   2. استراحة أمان 30 دقيقة بعد كل 5 رسائل
 *   3. 10 صيغ مختلفة وموجهة بالاسم والمحافظة
 *   4. استمرار الإرسال حتى إنهاء كافة أرقام المجموعة (استثناء ساعات العمل المسائية)
 *   5. استعادة ذاتية فورية في حال أي انقطاع
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const EXCEL_FILE     = path.join(__dirname, '..', 'مديرو_جنوب_الصعيد.xlsx');
const CONTACTED_FILE = path.join(__dirname, '..', 'contacted_numbers.json');
const BLACKLIST_FILE = path.join(__dirname, '..', 'blacklist.json');
const QR_HTML_PATH   = path.join(__dirname, '..', 'assets', 'whatsapp-qr.html');

// ⛔ قفل التوقف المؤقت بطلب المستخدم: موقوف تماماً حتى الأحد 22-11-2026 الساعة 9:00 صباحاً
const RESUME_DATE = new Date('2026-11-22T09:00:00+02:00').getTime();
if (Date.now() < RESUME_DATE) {
    console.log('⛔ [توقف أمان إلزامي]: حملة التوظيف موقوفة تماماً بطلبك حتى صباح الأحد 22-11-2026.');
    process.exit(0);
}

// ─── 10 صيغ متغيرة للتوظيف ──────────────────────────────────────────────────
function generateRecruitmentMessage(target, index = 0) {
    const rawName = (target.name || '').trim();
    const city    = (target.city || '').trim();

    let salutation = '';
    if (rawName && rawName !== '—' && !rawName.includes('اسم عائلة')) {
        salutation = `أستاذ ${rawName} المحترم`;
    } else if (city && city !== '—') {
        salutation = `لكل الزملاء الكرام في ${city}`;
    } else {
        salutation = `لحضرتكم الكريمة`;
    }

    const TEMPLATES = [
        // 1
        `تحية طيبة [الاسم_المخصص]،
معكم إدارة الموارد البشرية والتوظيف بشركة بيوتي هيلث للصناعات المتطورة (منتجات رونزا ويونو - مناديل مبللة).
نظراً للتوسعات الجديدة، نعلن عن فتح باب التعيين بكبرى قطاعات جنوب الصعيد:
1. مدير مبيعات للجنوب
2. مشرف مبيعات
3. أوردر تيكر (Order Taker)
- يشترط خبرة سنتين على الأقل في قطاع (الكوزماتيكس / الورقيات / المنظفات).
- مميزات مجزية ورواتب وعمولات ممتازة.
للتقديم: يُرجى إرسال السيرة الذاتية (C.V) على رقم الواتساب: 01006636688`,

        // 2
        `أهلاً بحضرتك [الاسم_المخصص]،
فرصة عمل ممتازة من شركة بيوتي هيلث للصناعات المتطورة (العلامة التجارية: مناديل رونزا ويونو المبللة).
مطلوب كفاءات مبيعات لمنطقة جنوب الصعيد:
• مدير مبيعات لمنطقة الجنوب
• مشرف مبيعات
• أوردر تيكر
الشروط: خبرة لا تقل عن سنتين في مجال المنظفات، الورقيات، أو مستحضرات التجميل (الكوزماتيكس).
في حال الرغبة بالانضمام أو ترشيح زميل، يُرجى إرسال الـ C.V على الواتساب المخصص: 01006636688`,

        // 3
        `تحياتنا وتقديرنا لحضرتك [الاسم_المخصص]،
تعلن شركة بيوتي هيلث للصناعات المتطورة (الرائدة في تصنيع مناديل رونزا ويونو) عن حاجتها لضم كوادر بيعية متميزة:
- مدير مبيعات للجنوب
- مشرف مبيعات
- أوردر تيكر
المتطلبات: خبرة عملية سابقة (سنتين كحد أدنى) في قطاع الكوزماتيكس أو الورقيات أو المنظفات.
نرجو من الراغبين في التقديم إرسال السيرة الذاتية عبر واتساب: 01006636688`,

        // 4
        `مرحباً بحضرتك [الاسم_المخصص]،
توسع جديد لفريق مبيعات شركة بيوتي هيلث للصناعات المتطورة (منتجات رونزا ويونو للمناديل المبللة).
مطلوب فوراً لجنوب الصعيد:
١. مدير مبيعات للجنوب
٢. مشرف مبيعات
٣. مندوب مبيعات / أوردر تيكر
الشرط الأساسي: خبرة لا تقل عن عامين في تسويق وتوزيع الورقيات، المنظفات، أو الكوزماتيكس.
لإرسال السيرة الذاتية والاطلاع على المزايا، يرجى التواصل عبر الواتساب: 01006636688`,

        // 5
        `أهلاً بالزميل العزيز [الاسم_المخصص]،
من شركة بيوتي هيلث للصناعات المتطورة (مناديل مبللة: رونزا - يونو).
نبحث عن قادة ومحترفي مبيعات للانضمام لأسرة العمل بجنوب الصعيد في الوظائف التالية:
- مدير مبيعات للجنوب
- مشرف مبيعات
- أوردر تيكر
(يشترط وجود خبرة لا تقل عن سنتين بقطاع المنظفات أو الورقيات أو مستحضرات التجميل).
يسعدنا استقبال السيرة الذاتية (C.V) لحضرتكم عبر واتساب رقم: 01006636688`,

        // 6
        `تحية طيبة لحضرتك [الاسم_المخصص]،
إعلان توظيف رسمي - شركة بيوتي هيلث للصناعات المتطورة (مصنع مناديل رونزا ويونو المبللة).
تعلن الشركة عن فتح باب التقدم للوظائف الشاغرة بمنطقة جنوب الصعيد:
1. مدير مبيعات لقطاع الجنوب
2. مشرف مبيعات
3. أوردر تيكر
الشروط المطلوبة: خبرة سنتين على الأقل في قطاعات (الكوزماتيكس / المنظفات / الورقيات).
برجاء التكرم بإرسال السيرة الذاتية (C.V) على واتساب: 01006636688`,

        // 7
        `أهلاً بحضرتك [الاسم_المخصص]،
يسر شركة بيوتي هيلث للصناعات المتطورة (منتجات رونزا ويونو للمناديل المبللة) الإعلان عن شواغر وظيفية بمحافظات جنوب الصعيد:
• مطلوب مدير مبيعات للجنوب
• مطلوب مشرف مبيعات
• مطلوب أوردر تيكر
يشترط خبرة سنتين كحد أدنى في مجالات: الكوزماتيكس، الورقيات، أو المنظفات.
بيئة عمل احترافية ورواتب وبدلات مجزية.
للتقديم الفوري: أرسل الـ C.V على واتساب: 01006636688`,

        // 8
        `عناية السيد الفاضل [الاسم_المخصص]،
تحية طيبة، معكم شركة بيوتي هيلث للصناعات المتطورة (رونزا ويونو - مناديل مبللة).
في إطار التوسع البيعي بجنوب الصعيد، نطلب للتعيين:
- مدير مبيعات للجنوب
- مشرف مبيعات
- مسؤول تلقي وتدوين الطلبات (Order Taker)
الشرط المعتمد: خبرة سنتين فما فوق في قطاع المنظفات والورقيات ومستحضرات التجميل.
لإرسال السيرة الذاتية والمقابلة، نرجو التواصل عبر واتساب: 01006636688`,

        // 9
        `أهلاً بحضرتك [الاسم_المخصص]،
فرصة مهنية واعدة مع شركة بيوتي هيلث للصناعات المتطورة (العلامات الرائدة: رونزا - يونو).
مطلوب كفاءات بيعية لجنوب الصعيد:
1/ مدير مبيعات للجنوب
2/ مشرف مبيعات
3/ أوردر تيكر
المؤهلات المطلوبة: خبرة عملية سنتين على الأقل في شركات الكوزماتيكس أو الورقيات أو المنظفات.
ننتظر سيرتكم الذاتية (C.V) على رقم الواتساب: 01006636688`,

        // 10
        `تحية احترام وتقدير لحضرتك [الاسم_المخصص]،
شركة بيوتي هيلث للصناعات المتطورة (منتجات رونزا ويونو للمناديل المبللة) تطلب للتعيين الفوري بمحافظات جنوب الصعيد:
- مدير مبيعات للجنوب
- مشرف مبيعات
- أوردر تيكر (Order Taker)
يشترط خبرة سنتين على الأقل في قطاع (الورقيات / المنظفات / الكوزماتيكس).
للمهتمين بالانضمام لفريقنا، نرجو إرسال الـ C.V على واتساب التوظيف: 01006636688
(شاكرين وقتكم وحسن تعاونكم)`
    ];

    const chosenText = TEMPLATES[index % TEMPLATES.length];
    return chosenText.replace(/\[الاسم_المخصص\]/g, salutation);
}

// ─── دوال السجلات والأمان ──────────────────────────────────────────────────
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
        fs.writeFileSync(CONTACTED_FILE, JSON.stringify(Array.from(map.values()), null, 2), 'utf8');
    } catch (e) {}
}

function cleanPhone(raw) {
    if (!raw) return null;
    let s = String(raw).replace(/\D/g, '');
    if (s.startsWith('002')) s = s.slice(3);
    if (s.startsWith('20') && s.length === 12) return s + '@c.us';
    if (s.startsWith('01') && s.length === 11) return '2' + s + '@c.us';
    if (s.startsWith('1') && s.length === 10) return '20' + s + '@c.us';
    if (s.length === 11 && s.startsWith('01')) return '2' + s + '@c.us';
    return null;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
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

    const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qr)}`;
    const htmlContent = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="refresh" content="20">
    <title>ربط واتساب - الزمردة</title>
    <style>
        body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: white; }
        .card { background: #1e293b; padding: 25px; border-radius: 16px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
        img { border-radius: 12px; margin-top: 15px; }
    </style>
</head>
<body>
    <div class="card">
        <h2>📲 امسح كود الواتساب</h2>
        <p>واتساب > الأجهزة المرتبطة > ربط جهاز</p>
        <img src="${qrImgUrl}" width="200" height="200" alt="WhatsApp QR Code">
    </div>
</body>
</html>`;
    try { fs.writeFileSync(QR_HTML_PATH, htmlContent); } catch (_) {}
});

client.on('authenticated', () => console.log('✅ تم توثيق جلسة الواتساب بنجاح.'));

client.on('disconnected', reason => {
    console.log('⚠️ انقطع اتصال الواتساب:', reason, '-> جاري إعادة التشغيل التلقائي...');
    process.exit(1);
});

// الرد الفوري على أي استفسار يرد من المتقدمين
client.on('message', async msg => {
    try {
        if (!msg.body || msg.from.includes('@g.us') || msg.fromMe) return;
        const text = msg.body.trim().toLowerCase();
        console.log(`📩 رد وارد من المرشح (${msg.from}): "${msg.body}"`);

        const STOP = /إيقاف|ايقاف|الغاء|إلغاء|توقف|مش عايز|غير مهتم|حذف|stop|unsubscribe/i;
        if (STOP.test(text)) {
            const blacklist = getList(BLACKLIST_FILE);
            if (!blacklist.includes(msg.from)) {
                blacklist.push(msg.from);
                saveList(BLACKLIST_FILE, blacklist);
            }
            await msg.reply('تم إيقاف المراسلات لحضرتك نهائياً، نعتذر عن الإزعاج.');
            return;
        }

        await msg.reply('أهلاً بحضرتك! تم استلام رسالتك باهتمام، ويُرجى إرسال السيرة الذاتية (C.V) مباشرة على رقم الواتساب المخصص للتوظيف: 01006636688 وسيتم التواصل معك لتحديد المقابلة. بالتوفيق!');
    } catch (_) {}
});

client.on('ready', async () => {
    console.log('🚀 عميل الواتساب متصل وجاهز لبدء حملة التوظيف لجنوب الصعيد!');
    console.log('⏱️ الفاصل الزمني: 2 إلى 5 دقائق عشوائياً بين كل رسالة.');
    console.log('🛡️ استراحة الأمان: 30 دقيقة بعد كل 5 رسائل.');
    console.log('📝 10 صيغ متغيرة وموجهة بحسب الاسم والمحافظة.');
    console.log('🌙 استثناء توقف المساء: مفعل لهذه المجموعة حتى انتهاء القائمة.\n');
    await startRecruitmentCampaign();
});

async function startRecruitmentCampaign() {
    if (!fs.existsSync(EXCEL_FILE)) {
        console.error('❌ ملف مديرو_جنوب_الصعيد.xlsx غير موجود!');
        return;
    }

    const wb = XLSX.readFile(EXCEL_FILE);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);
    console.log(`📋 تم قراءة الملف: مديرو_جنوب_الصعيد.xlsx (${rows.length} صف)`);

    const validTargets = [];
    rows.forEach(r => {
        const rawPhone = r['رقم الموبايل / واتساب'];
        const name     = (r['الاسم'] || '').trim();
        const city     = (r['العنوان (المحافظة)'] || '').trim();
        const chatId   = cleanPhone(rawPhone);

        if (chatId) {
            validTargets.push({ name, city, rawPhone, chatId });
        } else if (rawPhone) {
            console.log(`⚠️ رقم غير صالح أو ناقص تم استبعاده: "${rawPhone}" (${name})`);
        }
    });

    console.log(`📊 إجمالي الأرقام الصالحة للإرسال: ${validTargets.length}`);

    const contactedMap = loadContacted();
    const blacklist = getList(BLACKLIST_FILE);

    let sentInSession = 0;

    for (let i = 0; i < validTargets.length; i++) {
        const target = validTargets[i];
        const chatId = target.chatId;

        if (blacklist.includes(chatId)) {
            console.log(`⏭️ [تجاهل]: الرقم في القائمة السوداء: ${chatId}`);
            continue;
        }

        // فحص شرط الـ 30 يوماً
        const record = contactedMap.get(chatId);
        if (record) {
            const diffDays = Math.floor((Date.now() - new Date(record.lastSentDate || 0).getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays < 30) {
                console.log(`⏭️ [تخطي]: ${target.name} (${chatId}) تمت مراسلته منذ ${diffDays} يوم.`);
                continue;
            }
        }

        // إنشاء الرسالة المخصصة
        const message = generateRecruitmentMessage(target, sentInSession);

        try {
            const isReg = await client.isRegisteredUser(chatId);
            if (isReg) {
                await client.sendMessage(chatId, message);
                
                // تحديث السجل
                contactedMap.set(chatId, {
                    chatId,
                    lastSentDate: new Date().toISOString(),
                    name: target.name,
                    category: 'Recruitment - Upper Egypt'
                });
                saveContacted(contactedMap);
                sentInSession++;

                console.log(`\n✅ [إرسال ${sentInSession}/${validTargets.length}] تم بنجاح إلى:`);
                console.log(`   👤 الاسم : ${target.name || '(بدون اسم)'}`);
                console.log(`   📍 المحافظة: ${target.city || '(غير محددة)'}`);
                console.log(`   📱 الرقم  : ${chatId}`);
                console.log(`   ✉️ البداية: "${message.split('\n')[0].slice(0, 50)}..."`);

                // استراحة أمان 30 دقيقة بعد كل 5 رسائل
                if (sentInSession > 0 && sentInSession % 5 === 0 && sentInSession < validTargets.length) {
                    const breakMinutes = 30;
                    console.log(`\n🛡️ [أمان الواتساب]: إتمام 5 رسائل بنجاح. بدء استراحة أمان لمدة ${breakMinutes} دقيقة لحماية الحساب...`);
                    await sleep(breakMinutes * 60 * 1000);
                    console.log(`🚀 انتهاء استراحة الأمان! استئناف الإرسال لباقي المرشحين...`);
                } else if (sentInSession < validTargets.length) {
                    // فاصل عشوائي من 2 إلى 5 دقائق (120 إلى 300 ثانية)
                    const delaySec = getRandomInt(120, 300);
                    const minutes = (delaySec / 60).toFixed(1);
                    console.log(`⏳ فاصل أمان عشوائي: ${delaySec} ثانية (~${minutes} دقيقة) قبل الرسالة التالية...`);
                    await sleep(delaySec * 1000);
                }
            } else {
                console.log(`⚠️ الرقم ليس له حساب واتساب مسجل: ${chatId} (${target.name})`);
            }
        } catch (err) {
            console.error(`❌ خطأ أثناء الإرسال للرقم ${chatId}:`, err.message);
            if (err.message.includes('detached Frame') || err.message.includes('destroyed') || err.message.includes('Session closed')) {
                console.log('🔄 رصد انفصال المتصفح. إعادة تشغيل نظيفة عبر PM2...');
                process.exit(1);
            }
            await sleep(10000);
        }
    }

    console.log(`\n🎉 اكتملت حملة التوظيف لمديري جنوب الصعيد بالكامل! إجمالي المرسل: ${sentInSession}`);
}

process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
    if (String(reason).includes('detached Frame') || String(reason).includes('destroyed')) {
        process.exit(1);
    }
});

client.initialize();
