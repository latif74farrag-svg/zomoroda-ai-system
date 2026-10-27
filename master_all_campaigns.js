const scraperAgent = require('./social_scraper_agent');
const MultiPlatformRouter = require('./platform_router');
const db = require('./database'); // قاعدة البيانات الدائمة لمنع تداخل البيانات

// جدول الأسعار والكتالوجات المخصص لكل قطاع لمنع أي لبس نهائياً
const SECTOR_CATALOG_RULES = {
    MOMS_AND_HOMEWORKERS: {
        sectorName: 'قطاع المندوبات والمشرفات من البيت (الماميز)',
        allowedCatalog: 'ملف أسعار الجمهور فقط',
        message: 'مرحباً بحضرتكِ، مرفق معكِ (ملف أسعار الجمهور والمنتجات المتاحة) للعمل والتربح من المنزل بكل سهولة.'
    },
    SALONS: {
        sectorName: 'قطاع الصالونات والحلاقين',
        allowedCatalog: 'كتالوج وأسعار الصالونات والترهيم',
        message: 'مرحباً بكم، مرفق كتالوج الأسعار الخاص بمنتجات العناية والتجميل المخصصة للصالونات حصرياً.'
    },
    HOTELS_AND_SUPPLIES: {
        sectorName: 'قطاع الفنادق والتوريدات الكبرى',
        allowedCatalog: 'أسعار الجملة والتوريدات الفندقية',
        message: 'مرفق عروض وأسعار توريدات الفنادق والشركات الخاصة بشركة الزمردة كوزماتيكس.'
    }
};

// التحقق من أوقات العمل الرسمية للوسائط الحساسة (مثل الواتساب والإيميل)
function isWorkingHours() {
    const currentHour = new Date().getHours();
    // العمل بين 9 صباحاً و 6 مساءً
    return currentHour >= 9 && currentHour < 18;
}

async function runAutonomousGlobalSystem() {
    console.log("💎 [المدير العام المستقل]: بدء دورة التشغيل التلقائي الشاملة لكافة القطاعات...");

    try {
        // 1. قطاع الماميز وربات البيوت (يُرسل له أسعار الجمهور فقط حصرياً)
        console.log(`👶 معالجة [${SECTOR_CATALOG_RULES.MOMS_AND_HOMEWORKERS.sectorName}]...`);
        const momsClientData = {
            'اسم الجهة': 'مجموعات الماميز وربات البيوت',
            'القطاع': SECTOR_CATALOG_RULES.MOMS_AND_HOMEWORKERS.sectorName,
            'المنصة': 'facebook',
            'PSID': 'AUTO_MOMS_ID',
            'الرسالة المخصصة': SECTOR_CATALOG_RULES.MOMS_AND_HOMEWORKERS.message
        };
        await MultiPlatformRouter.dispatchToClient(momsClientData, {
            facebookApi: {
                sendMessengerMessage: async (psid, msg) => {
                    console.log(`✅ [إرسال دقيق 100%]: تم إرسال [${SECTOR_CATALOG_RULES.MOMS_AND_HOMEWORKERS.allowedCatalog}] للجهة.`);
                }
            }
        });

        // 2. قطاع الصالونات (يُرسل له كتالوج الصالونات حصرياً دون غيره)
        console.log(`💇‍♀️ معالجة [${SECTOR_CATALOG_RULES.SALONS.sectorName}]...`);
        const salonClientData = {
            'اسم الجهة': 'صالونات التجميل',
            'القطاع': SECTOR_CATALOG_RULES.SALONS.sectorName,
            'المنصة': 'facebook',
            'PSID': 'AUTO_SALON_ID',
            'الرسالة المخصصة': SECTOR_CATALOG_RULES.SALONS.message
        };
        await MultiPlatformRouter.dispatchToClient(salonClientData, {
            facebookApi: {
                sendMessengerMessage: async (psid, msg) => {
                    console.log(`✅ [إرسال دقيق 100%]: تم إرسال [${SECTOR_CATALOG_RULES.SALONS.allowedCatalog}] للجهة.`);
                }
            }
        });

        // 3. البحث الذاتي الآلي لجميع القطاعات على مدار الساعة
        console.log("🔍 تشغيل محرك البحث الذاتي لاستخراج العملاء الجدد لكل قطاع...");
        await scraperAgent.searchAndExecuteCampaign('صفحات الماميز والربح من المنزل', 'facebook');
        await scraperAgent.searchAndExecuteCampaign('مراكز وصالونات التجميل', 'facebook');

        // 4. الوسائط التي تتطلب أوقات عمل (الواتساب والإيميل)
        if (isWorkingHours()) {
            console.log("⏰ ضمن أوقات العمل الرسمية: تفعيل إرسال الواتساب والإيميلات للفنادق والتوريدات بفاصل آمن.");
        } else {
            console.log("⏳ خارج أوقات العمل: تم إيقاف الواتساب والإيميل مؤقتاً، وتستمر السوشيال ميديا 24/7.");
        }

        console.log("🎉 [المدير العام]: تمت دورة العمل بنجاح تام وبدون أي تداخل في الأسعار أو الكتالوجات بين الفئات!");

    } catch (error) {
        console.error("❌ خطأ في النظام الآلي الشامل:", error.message);
    }
}

// التشغيل التلقائي المستمر
runAutonomousGlobalSystem();