/**
 * hotels_supplies_campaign.js
 * حملة الواتساب الآمنة والموجهة بالصفة والقطاع
 * -------------------------------------------------------------
 * 1. الفاصل الزمني العشوائي: من 2 إلى 5 دقائق (120 إلى 300 ثانية) بين كل رسالة وأخرى
 * 2. استراحة الأمان: من 20 إلى 30 دقيقة متغيرة بعد كل 5 رسائل
 * 3. الرد الآلي الذكي: من 1 إلى 4 دقائق بأوقات العمل، ومن 3 إلى 8 دقائق خارجها
 * 4. تخصيص الخطاب: 10 صيغ احترافية مختلفة تحمل نفس المعنى وموجهة بالصفة
 * 5. ساعات العمل الرسمية: متغيرة عشوائياً صباحاً ومساءً (9 ص إلى 6 م)
 * 6. استعادة ذاتية فورية (Self-Healing) في حال أي انقطاع بالمتصفح
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const { getCatalogText } = require('../products_config');

const sleep = ms => new Promise(r => setTimeout(r, ms));
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ─── جدول سلم الإحماء التلقائي والسرعة القصوى الآمنة (Automated Warm-up Ladder) ───
// ثوابت الأمان الصارمة:
// - استراحة كل 5 رسائل حتماً وبشكل عشوائي بين 20 إلى 30 دقيقة
// - الفاصل بين الرسائل داخل المجموعة بين 2 إلى 5 دقائق (120 إلى 300 ثانية)
// - الأسقف اليومية مضاعفات الـ 5 لإنهاء المجموعات بأمان
const MONTHLY_WORK_PROFILES = {
    // ═══════════════ الأسبوع الأول (مرحلة التعافي الآمنة: 25 - 35 رسالة/يوم) ═══════════════
    1: {
        0: { dayName: 'الأحد', startHour: 9, startMinuteMin: 15, startMinuteMax: 30, endHour: 17, endMinute: 30, dailyTargetCap: 25, msgIntervalSecMin: 120, msgIntervalSecMax: 280, batchSize: 5, breakMinutesMin: 20, breakMinutesMax: 30 },
        1: { dayName: 'الإثنين', startHour: 9, startMinuteMin: 5, startMinuteMax: 20, endHour: 17, endMinute: 50, dailyTargetCap: 35, msgIntervalSecMin: 120, msgIntervalSecMax: 240, batchSize: 5, breakMinutesMin: 20, breakMinutesMax: 28 },
        2: { dayName: 'الثلاثاء', startHour: 9, startMinuteMin: 25, startMinuteMax: 45, endHour: 17, endMinute: 20, dailyTargetCap: 25, msgIntervalSecMin: 140, msgIntervalSecMax: 300, batchSize: 5, breakMinutesMin: 22, breakMinutesMax: 30 },
        3: { dayName: 'الأربعاء', startHour: 9, startMinuteMin: 10, startMinuteMax: 25, endHour: 17, endMinute: 45, dailyTargetCap: 35, msgIntervalSecMin: 120, msgIntervalSecMax: 260, batchSize: 5, breakMinutesMin: 20, breakMinutesMax: 29 },
        4: { dayName: 'الخميس', startHour: 9, startMinuteMin: 20, startMinuteMax: 35, endHour: 16, endMinute: 50, dailyTargetCap: 30, msgIntervalSecMin: 130, msgIntervalSecMax: 290, batchSize: 5, breakMinutesMin: 21, breakMinutesMax: 30 }
    },
    // ═══════════════ الأسبوع الثاني (مرحلة اكتساب الثقة: 40 - 50 رسالة/يوم) ═══════════════
    2: {
        0: { dayName: 'الأحد', startHour: 9, startMinuteMin: 12, startMinuteMax: 28, endHour: 17, endMinute: 35, dailyTargetCap: 40, msgIntervalSecMin: 120, msgIntervalSecMax: 270, batchSize: 5, breakMinutesMin: 20, breakMinutesMax: 28 },
        1: { dayName: 'الإثنين', startHour: 9, startMinuteMin: 6, startMinuteMax: 18, endHour: 17, endMinute: 50, dailyTargetCap: 50, msgIntervalSecMin: 120, msgIntervalSecMax: 240, batchSize: 5, breakMinutesMin: 20, breakMinutesMax: 27 },
        2: { dayName: 'الثلاثاء', startHour: 9, startMinuteMin: 20, startMinuteMax: 38, endHour: 17, endMinute: 25, dailyTargetCap: 40, msgIntervalSecMin: 130, msgIntervalSecMax: 290, batchSize: 5, breakMinutesMin: 22, breakMinutesMax: 30 },
        3: { dayName: 'الأربعاء', startHour: 9, startMinuteMin: 8, startMinuteMax: 22, endHour: 17, endMinute: 45, dailyTargetCap: 50, msgIntervalSecMin: 120, msgIntervalSecMax: 250, batchSize: 5, breakMinutesMin: 20, breakMinutesMax: 28 },
        4: { dayName: 'الخميس', startHour: 9, startMinuteMin: 15, startMinuteMax: 30, endHour: 16, endMinute: 55, dailyTargetCap: 45, msgIntervalSecMin: 125, msgIntervalSecMax: 280, batchSize: 5, breakMinutesMin: 21, breakMinutesMax: 29 }
    },
    // ═══════════════ الأسبوع الثالث (مرحلة التوسع النشط: 50 - 60 رسالة/يوم) ═══════════════
    3: {
        0: { dayName: 'الأحد', startHour: 9, startMinuteMin: 10, startMinuteMax: 25, endHour: 17, endMinute: 40, dailyTargetCap: 50, msgIntervalSecMin: 120, msgIntervalSecMax: 260, batchSize: 5, breakMinutesMin: 20, breakMinutesMax: 28 },
        1: { dayName: 'الإثنين', startHour: 9, startMinuteMin: 5, startMinuteMax: 16, endHour: 17, endMinute: 55, dailyTargetCap: 60, msgIntervalSecMin: 120, msgIntervalSecMax: 240, batchSize: 5, breakMinutesMin: 20, breakMinutesMax: 26 },
        2: { dayName: 'الثلاثاء', startHour: 9, startMinuteMin: 18, startMinuteMax: 32, endHour: 17, endMinute: 30, dailyTargetCap: 50, msgIntervalSecMin: 125, msgIntervalSecMax: 280, batchSize: 5, breakMinutesMin: 22, breakMinutesMax: 30 },
        3: { dayName: 'الأربعاء', startHour: 9, startMinuteMin: 7, startMinuteMax: 20, endHour: 17, endMinute: 50, dailyTargetCap: 60, msgIntervalSecMin: 120, msgIntervalSecMax: 250, batchSize: 5, breakMinutesMin: 20, breakMinutesMax: 27 },
        4: { dayName: 'الخميس', startHour: 9, startMinuteMin: 14, startMinuteMax: 28, endHour: 17, endMinute: 0,  dailyTargetCap: 55, msgIntervalSecMin: 120, msgIntervalSecMax: 270, batchSize: 5, breakMinutesMin: 21, breakMinutesMax: 29 }
    },
    // ═══════════════ الأسبوع الرابع فصاعداً (السرعة القصوى المستقرة: 55 - 65 رسالة/يوم) ══════════
    4: {
        0: { dayName: 'الأحد', startHour: 9, startMinuteMin: 8, startMinuteMax: 22, endHour: 17, endMinute: 45, dailyTargetCap: 55, msgIntervalSecMin: 120, msgIntervalSecMax: 250, batchSize: 5, breakMinutesMin: 20, breakMinutesMax: 27 },
        1: { dayName: 'الإثنين', startHour: 9, startMinuteMin: 4, startMinuteMax: 15, endHour: 17, endMinute: 55, dailyTargetCap: 65, msgIntervalSecMin: 120, msgIntervalSecMax: 230, batchSize: 5, breakMinutesMin: 20, breakMinutesMax: 26 },
        2: { dayName: 'الثلاثاء', startHour: 9, startMinuteMin: 15, startMinuteMax: 28, endHour: 17, endMinute: 35, dailyTargetCap: 55, msgIntervalSecMin: 125, msgIntervalSecMax: 270, batchSize: 5, breakMinutesMin: 21, breakMinutesMax: 29 },
        3: { dayName: 'الأربعاء', startHour: 9, startMinuteMin: 6, startMinuteMax: 18, endHour: 17, endMinute: 50, dailyTargetCap: 65, msgIntervalSecMin: 120, msgIntervalSecMax: 240, batchSize: 5, breakMinutesMin: 20, breakMinutesMax: 27 },
        4: { dayName: 'الخميس', startHour: 9, startMinuteMin: 12, startMinuteMax: 26, endHour: 17, endMinute: 5,  dailyTargetCap: 60, msgIntervalSecMin: 120, msgIntervalSecMax: 260, batchSize: 5, breakMinutesMin: 20, breakMinutesMax: 28 }
    }
};

// تاريخ بدء الإحماء التدريجي (من يوم الأحد 22-11-2026 بعد فك تقييد الـ 24 ساعة)
const WARMUP_START_DATE = new Date('2026-11-22T00:00:00+02:00').getTime();

function getCurrentWarmupWeek(date = new Date()) {
    const elapsedDays = Math.max(0, Math.floor((date.getTime() - WARMUP_START_DATE) / (1000 * 60 * 60 * 24)));
    if (elapsedDays < 7) return 1; // الأسبوع 1: مرحلة التعافي الآمنة (28-36 رسالة/يوم)
    if (elapsedDays < 14) return 2; // الأسبوع 2: مرحلة اكتساب الثقة (45-55 رسالة/يوم)
    if (elapsedDays < 21) return 3; // الأسبوع 3: مرحلة التوسع النشط (60-72 رسالة/يوم)
    return 4; // الأسبوع 4 فصاعداً: السرعة القصوى المستقرة (75-85 رسالة/يوم)
}

function getDailyProfile() {
    const now = new Date();
    const day = now.getDay();
    const week = getCurrentWarmupWeek(now);
    
    if (MONTHLY_WORK_PROFILES[week] && MONTHLY_WORK_PROFILES[week][day]) {
        const profile = MONTHLY_WORK_PROFILES[week][day];
        const stageLabels = {
            1: 'مرحلة التعافي الآمنة',
            2: 'مرحلة اكتساب الثقة',
            3: 'مرحلة التوسع النشط',
            4: 'السرعة القصوى المستقرة'
        };
        return {
            ...profile,
            weekNumber: week,
            stageName: stageLabels[week] || 'مرحلة مستقرة',
            fullLabel: `${profile.dayName} (الأسبوع ${week}: ${stageLabels[week] || ''})`
        };
    }
    return null;
}

let todayStartMinute = null;
let lastRecordedDay = -1;

function getTodayDynamicStartMinute(profile) {
    const currentDay = new Date().getDay();
    if (lastRecordedDay !== currentDay || todayStartMinute === null) {
        todayStartMinute = getRandomInt(profile.startMinuteMin, profile.startMinuteMax);
        lastRecordedDay = currentDay;
    }
    return todayStartMinute;
}

const CONTACTED_FILE = path.join(__dirname, '..', 'contacted_numbers.json');
const BLACKLIST_FILE = path.join(__dirname, '..', 'blacklist.json');
const INBOUND_FILE   = path.join(__dirname, '..', 'inbound_inquiries.json');
const AUTO_REPLY_LOG = path.join(__dirname, '..', 'auto_reply_log.json');

// فحص عدم تكرار الرد الآلي لنفس الرقم خلال 24 ساعة لمنع أي إزعاج
function canAutoReply(from) {
    try {
        const list = getList(AUTO_REPLY_LOG);
        const item = list.find(x => x.from === from);
        if (!item) return true;
        const diffHours = (Date.now() - new Date(item.lastReplyTime).getTime()) / (1000 * 60 * 60);
        return diffHours >= 24; // رد آلي واحد فقط كل 24 ساعة
    } catch (_) {
        return true;
    }
}

function markAutoReplied(from, type) {
    try {
        let list = getList(AUTO_REPLY_LOG);
        list = list.filter(x => x.from !== from);
        list.push({ from, type, lastReplyTime: new Date().toISOString() });
        saveList(AUTO_REPLY_LOG, list);
    } catch (_) {}
}

// ─── دالة فحص عدد الرسائل المرسلة اليوم لسقف الأمان ─────────────────────────
function getSentCountToday(contactedMap) {
    const todayStr = new Date().toISOString().slice(0, 10);
    let count = 0;
    for (const record of contactedMap.values()) {
        if (record && record.lastSentDate && record.lastSentDate.startsWith(todayStr)) {
            count++;
        }
    }
    return count;
}

// ─── محاكاة السلوك البشري الطبيعي (رؤية الرسالة + الكتابة قبل الإرسال) ───────
async function sendWithHumanPresence(chatId, text) {
    try {
        const chat = await client.getChatById(chatId);
        if (chat) {
            await chat.sendSeen();
            await sleep(getRandomInt(2000, 4000));
            await chat.sendStateTyping();
            await sleep(getRandomInt(4000, 8000));
            await chat.clearState();
        }
    } catch (_) {}
    return await client.sendMessage(chatId, text);
}

// ─── حساب التأخير البشري الذكي قبل الرد الآلي ───────────────────────────────
// أثناء وقت العمل: من 1 إلى 4 دقائق (60 إلى 240 ثانية)
// خارج أوقات العمل: من 3 إلى 8 دقائق (180 إلى 480 ثانية)
function getHumanDelayMs() {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    const isWorkHours = (day !== 5 && day !== 6 && hour >= 9 && hour < 18);

    if (isWorkHours) {
        return getRandomInt(60, 240) * 1000;
    } else {
        return getRandomInt(180, 480) * 1000;
    }
}

async function sendHumanDelayedReply(msg, replyText, from, type) {
    // قفل التكرار فوراً لمنع أي رد ثانٍ لو أرسل العميل رسائل متتالية أثناء فترة التأخير
    markAutoReplied(from, type);

    const delayMs = getHumanDelayMs();
    const delayMin = (delayMs / 60000).toFixed(1);
    console.log(`⏳ [تأخير بشري ذكي]: سيتم إرسال الرد (${type}) إلى (${from}) بعد ${delayMin} دقيقة لمحاكاة الرد الطبيعي...`);

    await sleep(delayMs);
    try {
        const chat = await msg.getChat();
        if (chat) {
            await chat.sendSeen();
            await sleep(getRandomInt(1500, 3000));
            await chat.sendStateTyping();
            await sleep(getRandomInt(4000, 7000));
            await chat.clearState();
        }
        await msg.reply(replyText);
        console.log(`✅ [تم إرسال الرد الطبيعي (${type})]: إلى (${from}) بعد تأخير ${delayMin} دقيقة.`);
    } catch (err) {
        console.error(`❌ تعذر إرسال الرد إلى (${from}):`, err.message);
    }
}

// ─── 10 صيغ متغيرة وموجهة بحسب صفة وقطاع الجهة لضمان تنوع تام 100% ─────────────
const HOTEL_TEMPLATES = [
    // 1. صيغة الهوية والـ Private Label وطباعة اللوجو
    `تحياتنا لإدارة [اسم_الجهة] الموقرة،
معكم عبد اللطيف فراج من شركة الزمردة كوزماتيكس للتوريدات الفندقية.
نختص بتقديم خدمة طباعة شعار فندقكم الموقر على المناديل الفردية الفاخرة (Private Label) لتعزيز انطباع النزلاء بعلامتكم الراقية، مع توفير معطرات الجو الفندقية برائحة تدوم طويلاً، ورولات التنشيف عالية الامتصاص.
هل يناسبكم استلام الكتالوج الفندقي مع كشف أسعار التوريد؟ (أرسل: كتالوج أو نعم).`,

    // 2. صيغة استقرار خط التوريد وأسعار المصنع المباشرة
    `السادة مسؤولو إدارة الضيافة والتوريد في [اسم_الجهة] المحترمون،
تحية طيبة، معكم عبد اللطيف فراج (الزمردة كوزماتيكس).
نهدف لبناء شراكة توريد منتظمة تضمن عدم انقطاع مستلزمات النظافة والورقيات عن فندقكم، بأسعار جملة مباشرة من المصنع وفواتير ضريبية معتمدة، مع الالتزام التام بمواعيد التسليم الدورية لمستلزمات الغرف ومرافق الفندق.
نتشرف بمشاركتكم قائمة عروض الجملة والكتالوج بالرد بكلمة (كتالوج).`,

    // 3. صيغة المعطرات الفرنسية الـ 13 للأجنحة والمصاعد
    `أهلاً بفريق العمل وإدارة [اسم_الجهة]،
معكم عبد اللطيف فراج من شركة الزمردة كوزماتيكس.
نصنع الفارق في تجربة نزلاء فندقكم عبر حزمة معطرات الجو والأرضيات الفندقية الفاخرة المكونة من 13 عطراً فرنسياً منعشاً وثابتاً للردهات والمصاعد والأجنحة، إلى جانب فوط التنشيف بدون وبر ومناديل السنجل المعقمة.
يسعدنا تزويد إدارتكم بكتالوج العطور والمنتجات الفندقية لهذا الشهر بكلمة (كتالوج).`,

    // 4. صيغة باقة الإشراف الداخلي ونظافة المرافق Housekeeping
    `عناية إدارة الإشراف الداخلي والمشتريات في [اسم_الجهة] الموقرة،
تحياتنا لكم، معكم عبد اللطيف فراج من الزمردة كوزماتيكس.
نوفر حزمة تشغيلية متكاملة لأقسام Housekeeping بالفنادق: رولات وفوط تنشيف تركية فائقة التحمل ومقاومة للتفتت، سوائل جلي الأطباق المركزة للمطابخ، ومعطرات مركزة للأرضيات والممرات تمنح المنشأة بريقاً وانتعاشاً دائماً.
هل نرسل لحضراتكم كشف مواصفات التوريد وعروض الأسعار؟ (يسعدنا ردكم بـ كتالوج أو نعم).`,

    // 5. صيغة مستلزمات الضيوف VIP والوايبس الفاخر
    `السادة إدارة الفندق الكرام في [اسم_الجهة]،
تحية طيبة، معكم عبد اللطيف فراج - الزمردة كوزماتيكس.
نقدم لنزلائكم وضيوف الـ VIP لمسة ضيافة شخصية استثنائية: مناديل وايبس رونزا الناعمة بحجم الجيب بخلاصة الألوفيرا، مناديل السفرة الفاخرة لمطاعم الفندق، ومعطرات فواحة لأجنحة كبار الزوار تترك انطباعاً بالفخامة والاهتمام بأدق التفاصيل.
نتشرف بإرسال الكتالوج الخاص بضيافة الفنادق بالرد بكلمة (كتالوج).`,

    // 6. صيغة توفير تكاليف التشغيل والتسهيلات التعاقدية
    `تحياتنا لإدارة المشتريات والحسابات في [اسم_الجهة]،
معكم عبد اللطيف فراج من شركة الزمردة كوزماتيكس.
نساعد إدارتكم في تقليل تكاليف التشغيل الشهرية لمستلزمات النظافة والورقيات بنسبة تصل إلى 20% مع الحفاظ على أعلى معايير الجودة الفندقية، وتوفير تسهيلات سداد وعروض كميات مجزية لقطاع الفنادق.
للاطلاع على دراسة التوفير وقائمة الأسعار، نرحب بردكم بكلمة (كتالوج).`,

    // 7. صيغة معايير التعقيم الفندقي المعتمد ومنع العدوى
    `السادة القائمون على إدارة [اسم_الجهة] الموقرون،
تحية تقدير، معكم عبد اللطيف فراج من الزمردة كوزماتيكس للتوريدات.
نلبي أعلى معايير الصحة والسلامة الفندقية بتوفير فوط ورولات استخدام فردي تمنع انتقال العدوى في مطاعم ومرافق الفندق، مع منظفات ومعقمات معتمدة خالية من المواد الضارة وذات فعالية تنظيف وتطهير فائقة.
يسعدنا موافاتكم بالملف التعريفي والأسعار بالرد بكلمة (كتالوج).`,

    // 8. صيغة توريد قاعات الحفلات ومطاعم الفندق F&B
    `أهلاً بإدارة الأغذية والمشروبات والضيافة في [اسم_الجهة]،
معكم عبد اللطيف فراج من الزمردة كوزماتيكس.
نتولى تجهيز قاعات الأفراح والمطاعم الفندقية بحلول توريد راقية: مناديل سفرة مطبوعة عالية الامتصاص، رولات مطابخ متعددة الطبقات تمتص الشحوم بكفاءة، ومعطرات هواء تحافظ على أجواء مبهجة ونظيفة طوال الفعاليات.
إذا رغبتم في تجربة عينات مجانية أو الاطلاع على الكتالوج، نتشرف بردكم بـ (نعم أو كتالوج).`,

    // 9. صيغة طلب عينات تجريبية مجانية للفحص المخبري
    `تحية طيبة لحضراتكم في [اسم_الجهة] الموقرة،
معكم عبد اللطيف فراج - شركة الزمردة كوزماتيكس.
ثقةً منا في جودة منتجاتنا الفندقية، يسعدنا التنسيق لإرسال عينات تجريبية مجانية لفندقكم لتجربة الخامات وفحص كفاءة المعطرات والورقيات عملياً قبل بدء أي توريد أو التزام تعاقدي.
لتنسيق إرسال العينات والكتالوج، ننتظر تفاعلكم بكلمة (كتالوج أو نعم).`,

    // 10. صيغة الشراكة الاستراتيجية المباشرة للتوريد الفندقي
    `عناية السيد المسؤول المحترم في إدارة [اسم_الجهة]،
طاب يومكم، معكم عبد اللطيف فراج من الزمردة كوزماتيكس للتوريدات العامة والفندقية.
يسعدنا انضمام فندقكم المتميز لقائمة شركائنا في قطاع السياحة والضيافة، حيث نقدم لكم دعماً تشغيلياً على مدار الساعة وتوريداً فورياً لكافة مستلزمات النظافة والعناية بأسعار منافسة وجودة قياسية.
يسعدنا جداً تواصلكم واستلام الكتالوج بكلمة (كتالوج).`
];

const SUPPLIES_TEMPLATES = [
    // 1. صيغة التعاقدات العامة ومديري المشتريات
    `عناية السيد مدير المشتريات والتوريدات في [اسم_الجهة]،
تحية طيبة، معكم عبد اللطيف فراج (شركة الزمردة كوزماتيكس للتوريدات).
نتطلع لفتح خط تعاون تعاقدي معكم لتوريد منتجات العناية والنظافة ومستلزمات التشغيل بأسعار جملة تنافسية وفواتير ضريبية معتمدة:
معطرات جو 460 مل بـ 13 عطر فرنسي، معطرات أرضيات مركزة، رولات قماش تنشيف، ومناديل سنجل ومبللة.
نتشرف بمشاركتكم قائمة أسعار التوريدات لهذا الشهر بالرد بكلمة (كتالوج).`,

    // 2. صيغة الشركات والمقرات الإدارية وبيئة العمل
    `أهلاً بحضراتكم في [اسم_الجهة]،
معكم عبد اللطيف فراج من شركة الزمردة كوزماتيكس.
نوفر حزمة توريدات متكاملة للمكاتب ومقرات الشركات لتهيئة بيئة عمل منعشة وراقية:
معطرات جو فرنسية لغرف الاجتماعات والمكاتب تدوم طويلاً، معطرات أرضيات للممرات، وفوط ورولات تنشيف متينة بدون وبر لمرافق الشركة.
يسعدنا تزويد إدارتكم بكتالوج المنتجات وعروض الشركات لهذا الشهر بالرد بـ (نعم أو كتالوج).`,

    // 3. صيغة إدارة المرافق وخدمات النظافة Facility Management
    `السادة مسؤولو إدارة المرافق والخدمات في [اسم_الجهة]،
تحياتنا لكم، معكم عبد اللطيف فراج من الزمردة كوزماتيكس.
نوفر لحضراتكم كافة مستلزمات إدارة المرافق (Facility Management) من منظفات ومعطرات ورولات تجفيف فائقة الامتصاص مصممة للمساحات الواسعة والمباني الإدارية، بجداول توريد دقيقة ومنتظمة.
هل ترغبون في مراجعة كشف المنتجات وقائمة الأسعار؟ أرسلوا كلمة (كتالوج).`,

    // 4. صيغة كبار تجار الجملة والموزعين
    `تحياتنا لفريق العمل في [اسم_الجهة]،
معكم عبد اللطيف فراج من شركة الزمردة كوزماتيكس.
نوفر توريدات جملة كبرى بحمولات وشحنات سريعة لكافة المحافظات لمنتجات رونزا ويونو (مناديل وايبس، معطرات، رولات تنظيف، وسوائل أطباق) مع هوامش ربح ممتازة وتسهيلات لشركاء التوزيع والتوريدات.
هل نرسل لحضراتكم كشف أسعار كبار الموزعين؟ يسعدنا ردكم بـ (نعم أو كتالوج).`,

    // 5. صيغة الشراكة التجارية المباشرة والتوريد المعتمد
    `تحية طيبة لحضرتك في [اسم_الجهة]،
معكم عبد اللطيف فراج من الزمردة كوزماتيكس للتوريدات العامة.
يسعدنا عرض خدماتنا في توريد منتجات النظافة والعناية الاستهلاكية عالية الجودة والمطابقة للمواصفات القياسية، مع توفير خصومات دورية وتوريد مباشر لجميع المحافظات.
للاطلاع على الكتالوج وصور المنتجات والعروض الحالية، نتشرف بردكم بكلمة (كتالوج أو نعم).`,

    // 6. صيغة تجهيز المنشآت والمواقع بالورقيات والمعقمات
    `إلى إدارة التشغيل والتجهيزات في [اسم_الجهة] الموقرة،
طاب يومكم، معكم عبد اللطيف فراج من الزمردة كوزماتيكس.
يسرنا تلبية احتياجات منشأتكم من مستلزمات الورقيات والمطهرات وحلول التعقيم اليومية بخامات متينة واقتصادية، مع إمكانية توفير كميات دورية ثابتة تلائم حجم أعمالكم.
يسعدنا موافاتكم بالأسعار والعروض المتاحة فور ردكم بـ (كتالوج).`,

    // 7. صيغة فواتير ضريبية وأسعار جملة من المصنع
    `السادة إدارة المشتريات والحسابات في [اسم_الجهة]،
تحية طيبة، معكم عبد اللطيف فراج من شركة الزمردة كوزماتيكس.
نقدم لكم ميزة التوريد المباشر من المصنع بدون وسيط مع فواتير إلكترونية ضريبية معتمدة، وخصومات تصاعدية على طلبيات التوريد الكبرى لمعطرات الجو والأرضيات وفوط التجفيف.
لطلب نسخة من لائحة أسعار التوريد، يرجى الرد بكلمة (كتالوج).`,

    // 8. صيغة توريد المطابخ وسوائل الجلي والرولات الصناعية
    `تحية تقدير لإدارة التجهيزات والمطابخ في [اسم_الجهة]،
معكم عبد اللطيف فراج من الزمردة كوزماتيكس.
نوفر لمنشأتكم رولات قماشية وصناعية متينة لامتصاص الزيوت والتنظيف الشاق، بالإضافة إلى سوائل تنظيف الصحون والأسطح المركزة ذات القوة الفائقة وبأحجام اقتصادية موفرة.
نتشرف بطلبكم للكتالوج وعروض الأسعار بكلمة (كتالوج أو نعم).`,

    // 9. صيغة العينات المجانية للشركات والمؤسسات
    `أهلاً بفريق العمل في [اسم_الجهة]،
معكم عبد اللطيف فراج - شركة الزمردة كوزماتيكس.
يسعدنا أن نقدم لمنشأتكم عينات تجريبية مجانية من معطرات الجو الفرنسية ورولات التنشيف لمعاينة الجودة الفائقة على أرض الواقع قبل التعاقد.
لتنسيق إرسال العينات والكتالوج، نرحب بردكم الكريم بكلمة (كتالوج).`,

    // 10. صيغة التعاون الاستراتيجي السنوي
    `عناية الإدارة العامة والمشتريات في [اسم_الجهة] الموقرة،
تحياتنا الخالصة، معكم عبد اللطيف فراج من الزمردة كوزماتيكس للتوريدات العامة.
يسعدنا تقديم عروض عقود التوريد السنوية المستقرة لمستلزمات النظافة والعناية مع تثبيت الأسعار وتقديم مزايا حصرية لشركائنا المؤسسيين.
للاطلاع على نموذج التعاقد والكتالوج، تفضلوا بالرد بكلمة (كتالوج).`
];

const RESTAURANT_TEMPLATES = [
    `أهلاً بحضراتكم في [اسم_الجهة]،
معكم عبد اللطيف فراج من الزمردة كوزماتيكس للتوريدات.
نوفر للمطاعم والكافيهات مستلزمات النظافة والضيافة اليومية بأعلى معايير الجودة:
مناديل مبللة فاخرة مع طباعة اللوجو الخاص بمطعمكم، رولات وفوط مطبخ مضلعة لامتصاص الدهون والزيوت بدون وبر، سائل غسيل أطباق مركز، ومعطرات هواء تدوم طويلاً لراحة زبائنكم.
يسعدنا إرسال قائمة عروض الجملة والكتالوج لحضرتكم بكلمة (كتالوج).`,

    `تحية طيبة للشيف وفريق العمل في [اسم_الجهة]،
معكم عبد اللطيف فراج - الزمردة كوزماتيكس.
ندرك أهمية أدوات النظافة عالية التحمل داخل المطابخ الاحترافية؛ لذا نوفر لكم رولات المطبخ وفوط التنشيف التركية المقاومة للقطع والتفتت أثناء الطهي والتنظيف، وسوائل جلي الأطباق يونوي المركزة لإزالة أصعب الدهون، ومطهرات الأسطح المعتمدة.
إذا رغبتم في تجربة عينات مجانية أو استلام الكتالوج، يسعدنا تواصلكم بكلمة (كتالوج أو نعم).`,

    `إلى إدارة مطاعم وضيافة [اسم_الجهة] المحترمين،
معكم عبد اللطيف فراج من الزمردة كوزماتيكس.
نختص بتوريد مناديل السفرة الفاخرة المطبوعة بهوية مطعمكم، ورولات النظافة المتينة لمناطق التحضير، مع معطرات جو فرنسية تجعل تجربة رواد مطعمكم لا تُنسى.
يسعدنا موافاتكم بالأسعار ونماذج الطباعة بكلمة (كتالوج).`
];

const MEDICAL_TEMPLATES = [
    `السادة إدارة [اسم_الجهة] المحترمون،
معكم عبد اللطيف فراج من شركة الزمردة كوزماتيكس للتوريدات.
نوفر مستلزمات العناية والتعقيم المتوافقة مع معايير المنشآت الطبية:
مناديل وايبس ناعمة وعالية النقاء بحماية مؤكدة للبشرة، رولات وفوط تنشيف للاستخدام الفردي لضمان أعلى مستويات الأمان الصحي، ومعطرات هواء لطيفة لغرف الاستقبال والانتظار.
يسعدنا إرسال الكتالوج المعتمد وقائمة الأسعار بكلمة (كتالوج).`,

    `تحية تقدير لإدارة المشتريات الطبية في [اسم_الجهة]،
معكم عبد اللطيف فراج من الزمردة كوزماتيكس.
نقدم لكم حلول توريد صحية وآمنة: رولات تنشيف للمختبرات والعيادات لا تترك وبراً، مناديل معقمة، ومطهرات أسطح عالية الفعالية مطابقة للمواصفات القياسية.
للاطلاع على الكتالوج وقائمة الأسعار الطبية، نتشرف بردكم بـ (كتالوج).`
];

const SALON_TEMPLATES = [
    `أهلاً بفريق وإدارة [اسم_الجهة]،
معكم عبد اللطيف فراج من الزمردة كوزماتيكس.
نوفر مستلزمات الصالونات ومراكز التجميل الأساسية بجودة ممتازة وأسعار جملة:
فوط تنشيف تركي للاستخدام الواحد لمنع العدوى، مناديل رونزا اللطيفة لإزالة المكياج بالألوفيرا والورد، مناديل معطرة فاخرة، ومعطرات جو فواحة تمنح مركزكم رائحة مميزة.
يسعدنا إرسال الكتالوج الخاص بالصالونات لحضرتكم بكلمة (كتالوج).`
];

// ─── توليد الرسالة المتغيرة بدقة بحسب القطاع والترتيب التراكمي لمنع أي تكرار ────
function generatePersonalizedMessage(target, index = 0) {
    const rawName = (target.name || '').trim();
    const sector  = (target.sector || '').toLowerCase();
    const nameLower = rawName.toLowerCase();

    // استخراج الاسم النظيف بدون ألقاب مكررة
    const entityName = rawName || 'إدارتكم الموقرة';

    // تحديد فئة الجهة بدقة
    const isHotel      = /فندق|hotel|resort|منتجع|سياح|ضيافة/i.test(nameLower + ' ' + sector);
    const isRestaurant = /مطعم|كافيه|cafe|restaurant|مشويات|أكلات|وجبات|شيف|مطبخ|kitchen|chef/i.test(nameLower + ' ' + sector);
    const isMedical    = /مستشفى|عياد|طبي|مركز طبي|صيدل|معمل|hospital|clinic/i.test(nameLower + ' ' + sector);
    const isSalon      = /صالون|كوافير|تجميل|بيوتي|حلاق|salon|spa|مركز تجميل/i.test(nameLower + ' ' + sector);

    let chosenText = '';

    // تدوير الصيغ (Rotation) بحسب الترتيب (index % length) لضمان اختلاف 100% بين كل رسالة والأخرى
    if (isHotel) {
        chosenText = HOTEL_TEMPLATES[index % HOTEL_TEMPLATES.length];
    } else if (isRestaurant) {
        chosenText = RESTAURANT_TEMPLATES[index % RESTAURANT_TEMPLATES.length];
    } else if (isMedical) {
        chosenText = MEDICAL_TEMPLATES[index % MEDICAL_TEMPLATES.length];
    } else if (isSalon) {
        chosenText = SALON_TEMPLATES[index % SALON_TEMPLATES.length];
    } else {
        // قطاع التوريدات والشركات والمشتريات العامة
        chosenText = SUPPLIES_TEMPLATES[index % SUPPLIES_TEMPLATES.length];
    }

    // استبدال رمز [اسم_الجهة] بالاسم الحقيقي وإرفاق خيار الإلغاء المحترم
    let finalMsg = chosenText.replace(/\[اسم_الجهة\]/g, entityName);
    if (!finalMsg.includes('إيقاف') && !finalMsg.includes('ايقاف')) {
        finalMsg += '\n\n(للإلغاء في أي وقت: أرسل إيقاف)';
    }
    return finalMsg;
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
    if (day === 5 || day === 6) {
        return { allowed: false, reason: 'اليوم عطلة نهاية الأسبوع (الجمعة أو السبت)' };
    }

    const profile = getDailyProfile();
    if (!profile) {
        return { allowed: false, reason: 'خارج جدول أيام العمل الرسمية' };
    }

    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const startMin = getTodayDynamicStartMinute(profile);

    // التحقق من بدء وقت العمل المتغير لهذا اليوم
    if (currentHour < profile.startHour || (currentHour === profile.startHour && currentMinute < startMin)) {
        return { 
            allowed: false, 
            reason: `قبل موعد بدء عمل اليوم (${profile.dayName}: الساعة ${profile.startHour}:${String(startMin).padStart(2, '0')} ص)` 
        };
    }

    // التحقق من انتهاء وقت العمل المتغير لهذا اليوم
    if (currentHour > profile.endHour || (currentHour === profile.endHour && currentMinute >= profile.endMinute)) {
        return { 
            allowed: false, 
            reason: `بعد موعد انتهاء عمل اليوم (${profile.dayName}: الساعة ${profile.endHour}:${String(profile.endMinute).padStart(2, '0')})` 
        };
    }

    return { allowed: true, profile };
}

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

    const qrHtml = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="refresh" content="15">
    <title>ربط واتساب - الزمردة</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: white; }
        .card { background: #1e293b; padding: 30px; border-radius: 16px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.6); max-width: 400px; }
        img { border-radius: 12px; margin: 15px 0; background: white; padding: 10px; }
        .hint { color: #94a3b8; font-size: 14px; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="card">
        <h2>📱 امسح كود الواتساب للربط</h2>
        <p>افتح واتساب في هاتفك &gt; الأجهزة المرتبطة &gt; ربط جهاز</p>
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qr)}" width="250" height="250" alt="WhatsApp QR Code">
        <p class="hint">يتم تحديث الكود تلقائياً كل 15 ثانية حتى يتم الربط</p>
    </div>
</body>
</html>`;
    try {
        fs.writeFileSync(path.join(__dirname, '..', 'assets', 'whatsapp-qr.html'), qrHtml, 'utf8');
    } catch (_) {}
});

client.on('authenticated', () => {
    console.log('✅ تم توثيق جلسة الواتساب بنجاح.');
    const okHtml = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="UTF-8"><title>تم الربط بنجاح</title><style>body { font-family: 'Segoe UI', sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #0f172a; color: #4ade80; text-align: center; margin: 0; }</style></head>
<body><div style="background:#1e293b;padding:30px;border-radius:16px;"><h1>✅ تم ربط الواتساب بنجاح!</h1><p style="color:#e2e8f0;">الخدمة متصلة وتعمل الآن بأعلى معايير الأمان ومكافحة الحظر.</p></div></body></html>`;
    try {
        fs.writeFileSync(path.join(__dirname, '..', 'assets', 'whatsapp-qr.html'), okHtml, 'utf8');
    } catch (_) {}
});

client.on('disconnected', reason => {
    console.log('⚠️ انقطع اتصال الواتساب:', reason);
    if (reason === 'LOGOUT') {
        console.log('🧹 تنظيف الجلسة المنتهية لتوليد كود QR جديد عند إعادة التشغيل...');
        try {
            fs.rmSync(path.join(__dirname, '..', 'whatsapp_auth'), { recursive: true, force: true });
        } catch (_) {}
    }
    process.exit(1);
});

// ─── الاستجابة الذكية لرسائل العملاء (بشروط صارمة لمنع التكرار والإزعاج) ─────────
client.on('message', async msg => {
    try {
        // تجاهل الرسائل الفارغة، الجروبات، الحالات الإخبارية، ورسائلنا الشخصية
        if (!msg.body || msg.from.includes('@g.us') || msg.from.includes('@broadcast') || msg.from.includes('@newsletter') || msg.fromMe) return;

        const from = msg.from;
        const text = msg.body.trim();
        const lower = text.toLowerCase();

        // 1. تجاهل أي رسائل تاريخية قديمة مر عليها أكثر من دقيقتين (لتفادي الرد التلقائي المتراكم عند فتح البرنامج)
        const msgTimestamp = (msg.timestamp || 0) * 1000;
        const ageSeconds = Math.floor((Date.now() - msgTimestamp) / 1000);
        if (ageSeconds > 120) {
            return;
        }

        console.log(`\n📩 رسالة واردة حديثة من (${from}): "${text}"`);

        // حفظ الوارد في السجل
        try {
            const inbounds = getList(INBOUND_FILE);
            inbounds.push({ from, text, timestamp: new Date().toISOString() });
            saveList(INBOUND_FILE, inbounds);
        } catch (_) {}

        // 2. طلب إلغاء المراسلات (إيقاف) -> تنفيذ فوري
        const STOP = /^(إيقاف|ايقاف|الغاء|إلغاء|توقف|مش عايز|غير مهتم|حذف|stop|unsubscribe)$/i;
        if (STOP.test(lower)) {
            const blacklist = getList(BLACKLIST_FILE);
            if (!blacklist.includes(from)) {
                blacklist.push(from);
                saveList(BLACKLIST_FILE, blacklist);
            }
            if (canAutoReply(from)) {
                await msg.reply('تم إيقاف المراسلات لحضرتك نهائياً، نعتذر عن أي إزعاج ونشكرك على وقتك.');
                markAutoReplied(from, 'stop');
            }
            console.log(`⛔ تم إلغاء اشتراك العميل بنجاح: ${from}`);
            return;
        }

        // فحص حد التكرار: إذا تم الرد الآلي على هذا الرقم خلال آخر 24 ساعة، لا نرد عليه آلياً مرة أخرى لمنع الإزعاج
        if (!canAutoReply(from)) {
            console.log(`⏭️ [تخطي الرد الآلي]: تم الرد الآلي على (${from}) مؤخراً. يترك للمحادثة اليدوية.`);
            return;
        }

        // 3. طلبات التوظيف والسير الذاتية (C.V)
        const RECRUIT_KEYWORDS = /cv|سيرة ذاتية|سي في|سيره ذاتيه|وظيفة|وظائف|تقديم|مدير مبيعات|مشرف مبيعات|أوردر تيكر|order taker|\.pdf/i;
        if (RECRUIT_KEYWORDS.test(lower)) {
            const recruitReply = 'أهلاً بحضرتك، شكراً لاهتمامك بالانضمام لفريق شركة بيوتي هيلث للصناعات المتطورة (رونزا ويونو). تم استلام بياناتك وسيرتك الذاتية باهتمام، وسيتم مراجعتها من قِبل إدارة الموارد البشرية والتوظيف والتواصل معك لتحديد المقابلة. بالتوفيق!';
            await sendHumanDelayedReply(msg, recruitReply, from, 'recruitment');
            return;
        }

        // 4. طلب الكتالوج الصريح لقطاع التوريدات والفنادق
        const CATALOG_KEYWORDS = /^(كتالوج|كتالوجات|الكتالوج|اسعار|أسعار|الاسعار|الأسعار|عايز كتالوج|ابعتلي الكتالوج|ممكن الكتالوج|قائمة الأسعار|عروض الجملة)$/i;
        if (CATALOG_KEYWORDS.test(lower)) {
            const contactedMap = loadContacted();
            const contactInfo = contactedMap.get(from);
            let category = 'hotels';
            if (contactInfo && /صيدل|طبي/i.test(contactInfo.sector || '')) {
                category = 'pharmacy';
            }
            const catalogText = getCatalogText(category);
            await sendHumanDelayedReply(msg, catalogText, from, 'catalog');
            return;
        }

        // 5. استفسار صريح عن عمل الماميز والعمولة
        const MOMS_KEYWORDS = /شغل من البيت|شغل الماميز|تسويق بالعمولة|عايزة اشتغل من البيت/i;
        if (MOMS_KEYWORDS.test(lower)) {
            const momsReply = 'أهلاً بكِ في عائلة "الزمردة كوزماتيكس"! 🌸\nنوفر فرص عمل حر من المنزل بعمولات تصاعدية ممتازة على منتجات العناية والورقيات والمعطرات.\nللتسجيل، يرجى تزويدنا بـ: (الاسم الثلاثي - المحافظة).';
            await sendHumanDelayedReply(msg, momsReply, from, 'moms');
            return;
        }

        // 6. الأحاديث الشخصية (صباح الخير، الأصدقاء، المعارف، الزملاء، الاستفسارات العامة):
        // صمت تام بنسبة 100%، لا رد آلي تجنباً للخلط والإحراج، ويترك للرد الشخصي الطبيعي من الهاتف.
        console.log(`🤫 رسالة عامة/شخصية من (${from}) -> لا رد آلي (تُترك للمحادثة الشخصية الطبيعية).`);

    } catch (err) {
        console.error('❌ خطأ في معالجة الرسالة الواردة:', err.message);
    }
});

let isCampaignRunning = false;

client.on('ready', async () => {
    console.log('🚀 عميل الواتساب متصل وجاهز للعمل بالمحددات الصارمة الجديدة!');
    console.log('⏱️ الفاصل الزمني المعتمد: من 2 إلى 5 دقائق (120-300 ثانية) متغيرة عشوائياً بين كل رسالة وأخرى.');
    console.log('🛡️ استراحة الأمان: من 20 إلى 30 دقيقة متغيرة حتماً بعد كل 5 رسائل طوال اليوم.');
    console.log('🤖 الرد الآلي الذكي: من 1 إلى 4 دقائق بأوقات العمل، ومن 3 إلى 8 دقائق خارجها.');
    console.log('📝 تخصيص الخطاب: مفعل بـ 10 صيغ متغيرة تماماً وتدور تسلسلياً لمنع تكرار أي رسالة.');
    console.log('🔒 قاعدة الـ 30 يوماً: مفعلة بدقة (لا إعادة مراسلة ترحيبية إلا بعد مرور 30 يوماً).');
    console.log('⚡ الاستقبال والردود: مفعل 24/7 لأي تفاعل أو استفسار.\n');

    if (isCampaignRunning) {
        console.log('⚠️ [حماية التكرار]: الحملة قيد التشغيل بالفعل — تم منع أي تشغيل موازي أو إرسال مزدوج.');
        return;
    }
    isCampaignRunning = true;
    await startHotelsSuppliesCampaign();
});

async function startHotelsSuppliesCampaign() {
    console.log('📋 فحص ملفات الحملة وتجميع جهات الاتصال...');
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

    // 🛡️ تصفية واستبعاد أي أرقام مكررة بين ملفي الفنادق والتوريدات نهائياً
    const seenPhones = new Set();
    const uniqueTargets = [];
    for (const t of allTargets) {
        const cleaned = cleanPhone(t.rawPhone);
        if (cleaned && !seenPhones.has(cleaned)) {
            seenPhones.add(cleaned);
            uniqueTargets.push({ ...t, cleanedPhone: cleaned });
        }
    }
    allTargets = uniqueTargets;
    console.log(`📊 إجمالي الأرقام المستخرجة بعد استبعاد التكرار: ${allTargets.length}`);

    const blacklist = getList(BLACKLIST_FILE);
    let sentInSession = 0;

    for (let i = 0; i < allTargets.length; i++) {
        const profile = getDailyProfile();
        const currentDailyCap = profile ? profile.dailyTargetCap : 12;

        // 0. فحص سقف الأمان اليومي المتغير (Daily Target Cap)
        const contactedMap = loadContacted();
        const sentToday = getSentCountToday(contactedMap);
        if (sentToday >= currentDailyCap) {
            console.log(`\n🛑 [سقف أمان يوم ${profile ? profile.dayName : 'اليوم'}]: تم إرسال ${sentToday} رسائل (الحد المحدد لليوم: ${currentDailyCap} رسالة).`);
            console.log(`🛡️ توقف الإرسال الخارجي لباقي اليوم لكسر النمط الثابت وحماية الرقم، مع بقاء الواتساب متصلاً 24/7 للردود.`);
            console.log(`⏰ سيتم فحص استئناف الحملة الخارجية غداً صباحاً ببروفايل اليوم الجديد...`);
            await sleep(60 * 60 * 1000); // انتظر ساعة ثم أعد الفحص
            i--; // أعد المحاولة مع نفس الهدف غداً
            continue;
        }

        const target = allTargets[i];
        const chatId = target.cleanedPhone || cleanPhone(target.rawPhone);

        if (!chatId) continue;

        // 1. تطبيق فحص الاستحقاق وشرط الـ 30 يوماً
        const eligibility = checkEligibility(chatId, contactedMap, blacklist);
        if (!eligibility.allowed) {
            continue; // تخطي الرقم لعدم اكتمال 30 يوماً أو وجوده بالقائمة السوداء
        }

        // 2. فحص ساعات العمل المحددة والمتغيرة لليوم
        const check = isWorkingHours();
        if (!check.allowed) {
            console.log(`\n⏳ توقف مؤقت: ${check.reason}.`);
            console.log(`💡 سيتم انتظار حلول ساعات العمل المخصصة لليوم...`);
            
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
                // إرسال الرسالة مع محاكاة كتابة طبيعية (Presence + Typing)
                await sendWithHumanPresence(chatId, personalizedMessage);
                
                // تسجيل وتحديث تاريخ الإرسال بالثانية لشرط الـ 30 يوماً
                contactedMap.set(chatId, {
                    chatId,
                    lastSentDate: new Date().toISOString(),
                    name: target.name,
                    sector: target.sector
                });
                saveContacted(contactedMap);
                sentInSession++;

                console.log(`\n✅ [رسالة ${sentInSession} في الجلسة | ${getSentCountToday(contactedMap)}/${currentDailyCap} اليوم - ${profile ? profile.fullLabel : ''}] تم إرسالها بنجاح إلى:`);
                console.log(`   🏢 الجهة : ${target.name || '(غير محدد)'}`);
                console.log(`   📱 الرقم  : ${chatId}`);
                console.log(`   📄 الملف  : [${target.file}]`);
                console.log(`   ✉️ البداية: "${personalizedMessage.split('\n')[0].slice(0, 50)}..."`);

                // فحص الحاجة لاستراحة الأمان الكبرى (كل 5 رسائل إجبارياً لمدة 20 إلى 30 دقيقة متغيرة)
                const currentBatchSize = (profile && profile.batchSize) ? profile.batchSize : 5;
                if (sentInSession > 0 && sentInSession % currentBatchSize === 0) {
                    const breakMinutes = (profile && profile.breakMinutesMin && profile.breakMinutesMax) 
                        ? getRandomInt(profile.breakMinutesMin, profile.breakMinutesMax) 
                        : getRandomInt(20, 30);
                    console.log(`\n🛡️ [استراحة أمان - ${profile ? profile.fullLabel : ''}]: إتمام 5 رسائل (المجموعة كاملة). بدء استراحة متغيرة لمدة ${breakMinutes} دقيقة لحماية الحساب وكسر أي نمط...`);
                    await sleep(breakMinutes * 60 * 1000);
                    console.log(`🚀 انتهاء استراحة الأمان! استئناف الإرسال بفاصل طبيعي...`);
                } else {
                    // فاصل عشوائي متغيّر بين كل رسالة وأخرى من 2 إلى 5 دقائق (120 إلى 300 ثانية)
                    const minSec = (profile && profile.msgIntervalSecMin) ? profile.msgIntervalSecMin : 120;
                    const maxSec = (profile && profile.msgIntervalSecMax) ? profile.msgIntervalSecMax : 300;
                    const delaySec = getRandomInt(minSec, maxSec);
                    const minutes = (delaySec / 60).toFixed(1);
                    console.log(`⏳ فاصل أمان متغيّر بين الرسائل (${profile ? profile.fullLabel : ''}): ${delaySec} ثانية (~${minutes} دقيقة) قبل الرسالة التالية...`);
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
