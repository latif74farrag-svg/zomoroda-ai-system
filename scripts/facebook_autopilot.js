/**
 * scripts/facebook_autopilot.js
 * محرك النشر التلقائي المستمر لصفحات فيسبوك (مملكة الماميز & Zomrda Store)
 * يعمل بشكل دوري ومنتظم مثل حملات الواتساب دون توقف.
 */

const fs = require('fs');
const path = require('path');
const { publishToPages, getConfiguredPages } = require('../lib/marketing/auto_publisher');

// تحميل متغيرات البيئة إن وجدت
try {
    if (typeof process.loadEnvFile === 'function') {
        process.loadEnvFile();
    }
} catch (e) {}

const LOG_FILE = path.join(__dirname, '..', 'facebook_autopilot_log.json');

// إعدادات التوقيت والفواصل
const CONFIG = {
    // ساعات النشر المسموحة (من 10 صباحاً إلى 10 مساءً)
    startHour: 10,
    endHour: 22,
    // الفاصل بين دورات الفحص (كل 10 دقائق يفحص هل حان موعد النشر)
    checkIntervalMinutes: 10,
    // الفاصل الأدنى بين منشور وآخر على نفس الصفحة (مثلاً كل 4 ساعات)
    minIntervalHours: 4,
};

// مكتبة المنشورات الموجهة لصفحة "مملكة الماميز" (العناية، الأطفال، التوفير، العمل من المنزل)
const MOMS_CAMPAIGN_POSTS = [
    {
        title: "مناديل رونزا - التوفير والعناية بالأطفال",
        message: `أكبر مشكلة في المناديل المبللة العادية إنها بتنشف بسرعة وخامتها خفيفة! ❌\n\nمع مناديل "رونزا" من شركة الزمردة كوزماتيكس، بنقدملك مناديل بطبقات سميكة فائقة النعومة والترطيب، خالية تماماً من الكحول ومناسبة لبشرة الأطفال الحساسة. 👶✨\n\nتوفير حقيقي في استهلاك البيت مع عروض التوصيل المباشر من المصنع لباب بيتك.\n\nسيبي تعليق بكلمة (رونزا) أو ابعتيلنا رسالة خاصة لمعرفة العروض الحالية! 👇`
    },
    {
        title: "فرصة العمل بالعمولة من البيت للماميز",
        message: `لكل مامي عايزة تزود دخلها وتبدأ مشروعها الخاص من البيت بدون رأس مال! 💡🌸\n\nشركة الزمردة كوزماتيكس بتقدملك فرصة العمل بالعمولة الفورية على منتجاتنا الأساسية (مناديل رونزا، المعطرات الفرنسية، فوط التنشيف).\n\n• عمولات مجزية وفورية مع كل طلب.\n• الشحن والتوصيل بيتم من خلالنا مباشرة لعملائك.\n• دعم ومتابعة خطوة بخطوة للبدء والنجاح.\n\nاكتبي (تفاصيل) في التعليقات أو راسلينا على الخاص وابدأي من النهارده! 🎀`
    },
    {
        title: "معطرات الجو الفرنسية - انتعاش يدوم للمنزل",
        message: `بيتك يستاهل انتعاش يدوم بالساعات برائحة فندقية فاخرة! 🌸🌿\n\nمعطرات الجو والأرضيات المركزة من شركة الزمردة بـ 13 عطر فرنسي مميز (لافندر، ياسمين، توت بري، عود ملكي...).\nثبات قوي وخامات آمنة تماماً للأطفال والبيوت.\n\nابعتيلنا كلمة (معطر) في رسالة خاصة ويوصلك الكتالوج بقائمة العطور وأسعار التوفير! ✨`
    },
    {
        title: "فوط التنشيف الصحية وفوط المطبخ القماش",
        message: `وفري نص ميزانية المناديل الورقية شهرياً! 💡\n\nفوط التنشيف الفردية الصحية وفوط المطبخ القماش القابلة للغسيل وإعادة الاستخدام من مصنع الزمردة كوزماتيكس.\nامتصاص فائق، نعومة عالية، وعمر استخدام طويل يحافظ على نظافة بيتك وتوفير مصروفك.\n\nتفضلي بمراسلتنا أو سيبي تعليق لمعرفة عروض الشحن للبيت! 🌿`
    }
];

// مكتبة المنشورات الموجهة لصفحة "Zomrda Store" (المتجر، المنتجات، العروض، التوريدات)
const STORE_CAMPAIGN_POSTS = [
    {
        title: "مناديل رونزا المبللة الفاخرة - Zomoroda Store",
        message: `الجودة العالية والنظافة الفائقة تبدأ باختيارك لمنتجات الزمردة! ✨\n\nنقدم لكم مناديل "رونزا" المبللة فائقة الامتصاص والنعومة، المصممة بعناية فائقة لتلائم الاستخدام اليومي والعائلي والمنشآت.\n\n• خالية من الكحول والبارابين.\n• مرطبة ومضادة للجفاف.\n• متوفرة بأحجام وعبوات متعددة تلبي كافة الاحتياجات.\n\nللطلب والاستفسار عن عروض التوصيل لجميع المحافظات، تواصلوا معنا عبر الرسائل الخاصة! 📦`
    },
    {
        title: "المعطرات الفندقية والمركزات الفاخرة",
        message: `امنح مكانك بصمة عطرية لا تُنسى! 🏨🌸\n\nتشكيلة المعطرات الفندقية والمركزات الفرنسية من شركة الزمردة كوزماتيكس (13 رائحة حصرية ثابته تدوم طويلاً).\n\nمناسبة للمنازل، الشركات، الكافيهات، والفنادق بتركيزات اقتصادية تقلل معدل الاستهلاك وتمنح أقصى انتعاش.\n\nتواصلوا معنا عبر رسائل الصفحة لطلب قائمة العطور والأسعار الخاصة! 💼`
    },
    {
        title: "خدمة Private Label للمنشآت والمطاعم",
        message: `عزز هوية علامتك التجارية مع خدمة البراند الخاص (Private Label)! ☕🍽️\n\nشركة الزمردة كوزماتيكس توفر للمطاعم، الكافيهات، والفنادق:\n• طباعة شعار منشأتكم على المناديل المبللة الفردية (Single Wipes) بأعلى دقة طباعة.\n• روائح فندقية فاخرة وخامات معقمة ومعتمدة.\n• فواتير رسمية وأسعار مصنع مباشرة.\n\nراسلونا الآن لطلب عينات مجانية ومعرفة تفاصيل التعاقد والتوريد! 🤝`
    }
];

function loadLog() {
    try {
        if (fs.existsSync(LOG_FILE)) {
            return JSON.parse(fs.readFileSync(LOG_FILE, 'utf-8'));
        }
    } catch (e) {}
    return { history: [] };
}

function saveLog(log) {
    try {
        fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2), 'utf-8');
    } catch (e) {
        console.error("فشل حفظ السجل:", e.message);
    }
}

function isWithinPublishHours() {
    const currentHour = new Date().getHours();
    return currentHour >= CONFIG.startHour && currentHour < CONFIG.endHour;
}

function getNextPostForPage(pageId, pool, history) {
    const pageHistory = history.filter(h => h.pageId === pageId);
    const publishedTitles = pageHistory.map(h => h.title);

    // ابحث عن منشور لم يتم نشره مؤخراً
    const unposted = pool.filter(p => !publishedTitles.includes(p.title));
    if (unposted.length > 0) {
        return unposted[0];
    }
    // إذا نشرت كلها، دور من البداية حسب الأقدم
    const lastPublishedIndex = pageHistory.length % pool.length;
    return pool[lastPublishedIndex];
}

function canPublishToPageNow(pageId, history) {
    const pageHistory = history.filter(h => h.pageId === pageId);
    if (pageHistory.length === 0) return true;

    const lastPost = pageHistory[pageHistory.length - 1];
    const lastTime = new Date(lastPost.publishedAt).getTime();
    const hoursSinceLast = (Date.now() - lastTime) / (1000 * 60 * 60);

    return hoursSinceLast >= CONFIG.minIntervalHours;
}

async function runAutopilotCycle() {
    console.log(`\n⏰ [${new Date().toLocaleTimeString('ar-EG')}]: فحص دوري للنشر التلقائي...`);

    if (!isWithinPublishHours()) {
        console.log(`⏸️ خارج ساعات النشر الرسمية (${CONFIG.startHour}:00 إلى ${CONFIG.endHour}:00). سيتم الاستئناف غداً صباحاً.`);
        return;
    }

    const pages = getConfiguredPages();
    if (pages.length === 0) {
        console.error("❌ لا توجد صفحات مهيأة في متغيرات البيئة.");
        return;
    }

    const log = loadLog();

    for (const page of pages) {
        const canPublish = canPublishToPageNow(page.pageId, log.history);
        if (!canPublish) {
            console.log(`⏳ [${page.name}]: تم النشر حديثاً، في انتظار مرور الحد الأدنى بين المنشورات (${CONFIG.minIntervalHours} ساعات).`);
            continue;
        }

        // اختيار مكتبة المحتوى المناسبة للصفحة
        const isMomsPage = page.name.includes("ماميز") || page.pageId === "1563158963537218";
        const pool = isMomsPage ? MOMS_CAMPAIGN_POSTS : STORE_CAMPAIGN_POSTS;
        const post = getNextPostForPage(page.pageId, pool, log.history);

        console.log(`🚀 [${page.name}]: جاري نشر المنشور: "${post.title}"...`);

        try {
            const results = await publishToPages({
                message: post.message,
                targetPageIds: [page.pageId]
            });

            const res = results[0];
            if (res && res.ok) {
                console.log(`✅ [${page.name}]: تم النشر بنجاح! رقم المنشور: ${res.postId}`);
                log.history.push({
                    pageId: page.pageId,
                    pageName: page.name,
                    title: post.title,
                    postId: res.postId,
                    publishedAt: new Date().toISOString()
                });
                saveLog(log);
            } else {
                console.error(`❌ [${page.name}]: فشل النشر:`, res ? res.error : "غير معروف");
            }
        } catch (err) {
            console.error(`❌ [${page.name}]: خطأ أثناء النشر:`, err.message);
        }

        // انتظار بسيط بين الصفحتين
        await new Promise(r => setTimeout(r, 5000));
    }
}

// تشغيل مستمر (Loop)
async function startContinuousAutopilot() {
    console.log("======================================================");
    console.log("🚀 تشغيل محرك النشر التلقائي المستمر لصفحات فيسبوك 🚀");
    console.log(`⏱️ ساعات العمل: من ${CONFIG.startHour}:00 إلى ${CONFIG.endHour}:00`);
    console.log(`🔄 النشر بمعدل منشور كل ${CONFIG.minIntervalHours} ساعات لكل صفحة`);
    console.log("======================================================");

    // تشغيل فوري للدورة الأولى
    await runAutopilotCycle();

    // ثم فحص دوري كل checkIntervalMinutes
    setInterval(async () => {
        try {
            await runAutopilotCycle();
        } catch (err) {
            console.error("خطأ في دورة النشر:", err.message);
        }
    }, CONFIG.checkIntervalMinutes * 60 * 1000);
}

if (require.main === module) {
    startContinuousAutopilot();
}

module.exports = { runAutopilotCycle, startContinuousAutopilot };
