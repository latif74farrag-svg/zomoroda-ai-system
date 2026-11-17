/**
 * hotels_supplies_campaign.js
 * حملة الواتساب الآمنة لقطاع الفنادق وشركات التوريدات
 * - تعمل حصراً في ساعات العمل الرسمية (9:00 ص - 6:00 م)
 * - فاصل زمني آمن بين كل رسالة وأخرى (60 - 180 ثانية)
 * - استراحة أمان 30 دقيقة بعد كل 5 رسائل
 * - فحص دقيق لمنع تكرار المراسلة خلال 30 يوماً
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const CONTACTED_FILE = path.join(__dirname, '..', 'contacted_numbers.json');
const BLACKLIST_FILE = path.join(__dirname, '..', 'blacklist.json');

// صيغة الرسالة الترحيبية الاحترافية لقطاع الفنادق والتوريدات
const WELCOME_MESSAGE = `أهلاً بحضرتك، معك عبد اللطيف فراج من شركة الزمردة كوزماتيكس للتوريدات العامة.

نوفر توريدات مباشرة وعالية الجودة للفنادق والمطاعم والشركات:
🌿 مناديل سنجل فردية مع إمكانية طباعة شعار واسم الفندق/المنشأة (Private Label).
🌿 معطرات جو متطورة بـ 13 رائحة فرنسية وعربية (عبوات 460 مل).
🌿 معطرات أرضيات مركزة سعة 1 لتر و 250 مل.
🌿 فوط ورولات تنشيف تنظيف فائقة الامتصاص بدون وبرة.
🌿 سائل غسيل أطباق يونوي المركز.

للإطلاع على كتالوج الفنادق والتوريدات وقائمة الأسعار المخصصة، يُرجى الرد بكلمة (كتالوج) أو (نعم).
(للإلغاء أرسل: إيقاف).`;

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
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// إعداد عميل واتساب
const client = new Client({
    authStrategy: new LocalAuth({ dataPath: path.join(__dirname, '..', 'whatsapp_auth') }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    }
});

client.on('qr', qr => {
    console.log('\n=============================================================');
    console.log('⚡ يرجى مسح رمز QR التالي من تطبيق واتساب (الأجهزة المرتبطة):');
    console.log('=============================================================\n');
    qrcode.generate(qr, { small: true });
});

client.on('authenticated', () => console.log('✅ تم تسجيل الدخول بنجاح وحفظ جلسة الواتساب.'));
client.on('ready', async () => {
    console.log('🚀 عميل الواتساب جاهز ومتصل بالكامل!');
    await startHotelsSuppliesCampaign();
});

async function startHotelsSuppliesCampaign() {
    console.log('\n📋 فحص ملفات الحملة...');
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
                const name = r['اسم الجهة / الشركة'] || r['اسم الجهة'] || r.Name || 'السادة إدارة المشتريات والتوريدات';
                if (phone) allTargets.push({ name, rawPhone: phone, file: path.basename(f) });
            });
        }
    });

    console.log(`📊 إجمالي الأرقام المستخرجة: ${allTargets.length}`);
    const contacted = getList(CONTACTED_FILE);
    const blacklist = getList(BLACKLIST_FILE);

    let sentInSession = 0;

    for (let i = 0; i < allTargets.length; i++) {
        const target = allTargets[i];
        const chatId = cleanPhone(target.rawPhone);

        if (!chatId) continue;
        if (blacklist.includes(chatId)) {
            console.log(`⏭️ [تجاهل]: الرقم في القائمة السوداء: ${chatId}`);
            continue;
        }
        if (contacted.includes(chatId)) {
            continue; // تمت مراسلته مسبقاً
        }

        // فحص ساعات العمل
        const check = isWorkingHours();
        if (!check.allowed) {
            console.log(`\n⏳ توقف مؤقت: ${check.reason}.`);
            console.log(`💡 سيعاود النظام المحاولة تلقائياً خلال ساعات العمل الرسمية (9:00 ص - 6:00 م).`);
            
            // انتظار حتى الساعة 9 صباحاً إذا كان خارج أوقات العمل
            while (!isWorkingHours().allowed) {
                await sleep(60 * 1000); // فحص كل دقيقة
            }
            console.log(`\n⏰ حلول موعد ساعات العمل الرسمية! استئناف الحملة الآن...`);
        }

        try {
            const isReg = await client.isRegisteredUser(chatId);
            if (isReg) {
                await client.sendMessage(chatId, WELCOME_MESSAGE);
                contacted.push(chatId);
                saveList(CONTACTED_FILE, contacted);
                sentInSession++;

                console.log(`✅ [إرسال ${sentInSession}] تم بنجاح إلى: ${target.name} (${chatId}) من ملف [${target.file}]`);

                // استراحة بعد كل 5 رسائل لمدة 30 دقيقة
                if (sentInSession > 0 && sentInSession % 5 === 0) {
                    const breakMinutes = 30;
                    console.log(`\n🛡️ [أمان الواتساب]: إتمام 5 رسائل بنجاح. بدء استراحة أمان لمدة ${breakMinutes} دقيقة لحماية الحساب...`);
                    await sleep(breakMinutes * 60 * 1000);
                    console.log(`🚀 انتهاء استراحة الأمان! استئناف الإرسال...`);
                } else {
                    // فاصل عشوائي بين 60 إلى 150 ثانية بين كل رسالة وأخرى
                    const delaySec = getRandomInt(60, 150);
                    console.log(`⏳ فاصل أمان عشوائي: ${delaySec} ثانية...`);
                    await sleep(delaySec * 1000);
                }
            } else {
                console.log(`⚠️ الرقم ليس له حساب واتساب مسجل: ${chatId}`);
            }
        } catch (err) {
            console.error(`❌ خطأ أثناء الإرسال للرقم ${chatId}:`, err.message);
            await sleep(15000);
        }
    }

    console.log(`\n🎉 اكتملت حملة الفنادق والتوريدات بالكامل! إجمالي المرسل في هذه الجلسة: ${sentInSession}`);
}

client.initialize();
