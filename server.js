const express = require('express');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// ==========================================
// 🏢 1. قراءة الملفات المجاورة والتهيئة التراكمية (Config Integration)
// ==========================================
let externalConfig = {};
try {
    if (fs.existsSync(path.join(__dirname, 'config.json'))) {
        const rawConfig = fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8');
        externalConfig = JSON.parse(rawConfig);
        console.log('✅ تم تحميل إعدادات config.json بنجاح.');
    }
} catch (e) {
    console.log('⚠️ ملاحظة: سيتم استخدام الثوابت المدمجة للتهيئة.');
}

const BUSINESS_IDENTITY = {
    name: externalConfig.companyName || "شركة الزمردة كوزماتيكس - التوريدات العامة والجملة",
    ownerName: "عبداللطيف فراج",
    targetRegions: "القاهرة والجيزة وباقي المحافظات",
    facebookPage: "https://www.facebook.com/profile.php?id=100090392977665",
    ronzaParentPage: "https://www.facebook.com/ronza.egypt", // صفحة رونزا الشركة الأم
    linkedinProfile: "https://www.linkedin.com/in/a-latif-farrag-0917b565/?isSelfProfile=true",
    instagramProfile: "https://www.instagram.com/abdellatif_farrag?mdxt=bXJqNW9uemV2cGw1",
    email: externalConfig.email || "a.farag@beautyhealtheg.com",
    whatsapp: externalConfig.whatsapp || "01010997511",
    telegram: externalConfig.telegram || "01006636688",
    keywords: [
        "منظف اطباق",
        "سائل اطباق يونو",
        "ملمع احذية",
        "معطر جو 460ملى",
        "معطر ارضيات 1 لتر",
        "معطر ارضيات 250 ملى",
        "رول مطبخ",
        "فوطه تركي",
        "فوطه صفراء",
        "فوطه نعناع",
        "فوطه تنشيف",
        "فوطه مطبخ تنشيف متعدد الاستخدام",
        "مناديل مبلله اطفال حديثى الولاده",
        "وايبس اطفال",
        "وايبس عائلي",
        "مناديل لافندر",
        "مناديل ورد",
        "مناديل جونسون", 
        "مزيل مكياج رونزا حمايه اكيد",
        "مناديل مبلله",
        "20 منديل",
        "40 منديل",
        "72 منديل",
        "120 منديل",
        "144 منديل",
        "160 منديل",
        "شغل من البيت للسيدات",
        "مندوبات مبيعات أونلاين",
        "ربات البيوت القاهرة والجيزة",
        "شركة الزمردة كوزماتيكس",
        "عروض الشهر الجملة",
        "خصومات التوريدات",
        "رونزا"
    ]
};

// خريطة روابط المنصات متضمنة صفحة رونزا الأم
const platformLinks = {
    "Facebook_Messenger": BUSINESS_IDENTITY.facebookPage,
    "Ronza_Parent_Page": BUSINESS_IDENTITY.ronzaParentPage,
    "Instagram": BUSINESS_IDENTITY.instagramProfile,
    "LinkedIn": BUSINESS_IDENTITY.linkedinProfile,
    "Telegram": `https://t.me/${BUSINESS_IDENTITY.telegram}`,
    "WhatsApp": `https://wa.me/2${BUSINESS_IDENTITY.whatsapp}`,
    "Email": `mailto:${BUSINESS_IDENTITY.email}`
};

// 5 صيغ رسائل متنوعة تماماً لحملات الواتساب تحمل نفس المعنى وباسم عبداللطيف فراج
const whatsappTemplates = [
    (cat) => `أهلاً بحضرتك معك ${BUSINESS_IDENTITY.ownerName} من شركة الزمردة كوزماتيكس للتوريدات. نقدم أحدث عروض الجملة لفئة (${cat}) في ${BUSINESS_IDENTITY.targetRegions}. هل تفضل استلام الكتالوج وقائمة الأسعار؟`,
    (cat) => `تحياتنا، معك ${BUSINESS_IDENTITY.ownerName} من الزمردة كوزماتيكس. نوفر توريدات مباشرة وعالية الجودة لمنتجات (${cat}) بأسعار جملة تنافسية. يسعدنا التواصل معكم لتلبية احتياجاتكم.`,
    (cat) => `مرحباً بحضرتك، معكم ${BUSINESS_IDENTITY.ownerName} عن شركة الزمردة كوزماتيكس. لدينا عروض حصرية على منتجات النظافة والعناية المخصصة لـ (${cat}). نتطلع لتعاون مثمر معكم.`,
    (cat) => `أهلاً بحضرتك، معك ${BUSINESS_IDENTITY.ownerName} (الزمردة كوزماتيكس). هل تبحث عن جودة عالية وأسعار جملة لـ (${cat}) في ${BUSINESS_IDENTITY.targetRegions}؟ نسعد بخدمتكم وتوفير الطلبات فوراً.`,
    (cat) => `تحية طيبة، معك ${BUSINESS_IDENTITY.ownerName} من شركة الزمردة كوزماتيكس للتوريدات العامة. يسعدنا استعراض قائمة منتجاتنا وعروض الشهر لـ (${cat}). نرحب باستفساراتكم دائماً.`
];

// ==========================================
// 🗄️ 2. تهيئة قاعدة البيانات والتداولات (Database Schema + Complete Column Integration)
// ==========================================
const db = new sqlite3.Database(path.join(__dirname, 'zomoroda_system.db'), (err) => {
    if (err) {
        console.error('❌ خطأ في قاعدة البيانات:', err.message);
    } else {
        console.log('✅ تم الاتصال بقاعدة البيانات الدائمة (zomoroda_system.db) بنجاح.');
    }
});

db.serialize(() => {
    // التحقق الفوري وإضافة العمود آلياً لمنع أي خطأ في الجداول القديمة
    db.run(`
        CREATE TABLE IF NOT EXISTS customers (
            user_id TEXT PRIMARY KEY,
            channel TEXT,
            category TEXT,
            stage TEXT,
            welcomed_before INTEGER DEFAULT 0,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (!err) {
            db.run(`ALTER TABLE customers ADD COLUMN welcomed_before INTEGER DEFAULT 0`, (alterErr) => {
                // تجاهل الخطأ في حال وجود العمود مسبقاً
            });
        }
    });

    db.run(`
        CREATE TABLE IF NOT EXISTS campaign_state (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            platform TEXT,
            category TEXT,
            last_processed_index INTEGER,
            total_recipients INTEGER,
            status TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            category TEXT,
            items_details TEXT,
            total_amount REAL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS manager_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            action_type TEXT,
            details TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS monthly_offers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            month_year TEXT,
            category TEXT,
            offer_title TEXT,
            offer_details TEXT,
            discount_percent REAL,
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS scheduled_posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            post_time TEXT,
            title TEXT,
            content TEXT,
            status TEXT DEFAULT 'READY',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
});

// ==========================================
// 🗂️ 3. أصول الفئات والأسعار والكتالوجات الحصرية (6 فئات كاملة)
// ==========================================
const categoryAssets = {
    "pharmacies": { 
        name: "صيادلة وصيدليات", 
        catalog: "رونزا_كتالوج_الصيدليات.pdf", 
        pricelist: "قائمة_اسعار_وكلاء_صيادله_10_2026.xlsx", 
        basePrice: 110 
    },
    "hypermarkets": { 
        name: "هيبر ماركت وتجار جملة", 
        catalog: "رونزا_كتالوج_الهيبرات_10_2026.pdf", 
        pricelist: "قائمة_اسعار_الهيبرات_10_2026_معدلة.xlsx", 
        basePrice: 95 
    },
    "hotels": { 
        name: "فنادق ومطاعم", 
        catalog: "كتالوج_الفنادق_بالأسعار.pdf", 
        pricelist: "ارقام تليفونات الفنادق.xlsx", 
        basePrice: 150 
    },
    "salons": { 
        name: "كوافير وحلاقين", 
        catalog: "كتالوج_الكوافير_والحلاقين_بدون_أسعار.pdf", 
        pricelist: "ارقام تليفونات Salon.xlsx", 
        basePrice: 120 
    },
    "distribution": { 
        name: "شركات التوزيع", 
        catalog: "رونزا_كتالوج_شركات_التوزيع_10_2026 (5).pdf", 
        pricelist: "قائمة_اسعار_شركات_التوزيع_10_2026_معدلة.xlsx", 
        basePrice: 85 
    },
    "housewives_team": { 
        name: "مندوبات ومشرفات من البيت (القاهرة والجيزة)", 
        catalog: "رونزا_كتالوج_الهيبرات_10_2026.pdf", 
        pricelist: "قائمة_اسعار_الهيبرات_10_2026_معدلة.xlsx", 
        basePrice: 90 
    }
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function getRandomInt(minSec, maxSec) { 
    return Math.floor(Math.random() * (maxSec - minSec + 1) + minSec) * 1000; 
}

// ==========================================
// 👔 4. محرك المدير العام (مع استثناء 24/7 لـ Facebook, Messenger, IG, Telegram, LinkedIn)
// ==========================================
const GeneralManager = {
    canRunOutreachCampaign: function(platform = "") {
        const isAlwaysAllowedPlatform = /Facebook|Messenger|Instagram|Telegram|LinkedIn|Ronza/i.test(platform);
        
        if (isAlwaysAllowedPlatform) {
            return { 
                allowed: true, 
                reason: `منصة [${platform}] مفعلة للعمل 24/7 على مدار الساعة طوال الأسبوع.` 
            };
        }

        const now = new Date();
        const dayOfWeek = now.getDay();
        const currentHour = now.getHours();

        if (dayOfWeek === 5) {
            return { 
                allowed: false, 
                reason: "اليوم عطلة رسمية (الجمعة) - الحملات متوقفة على المراسلات الخاصة لحماية الحسابات." 
            };
        }
        
        if (currentHour < 9 || currentHour >= 19) {
            return { 
                allowed: false, 
                reason: `خارج ساعات العمل الرسمية لهذه المنصة (الساعة الان: ${currentHour}:00). المواعيد المتاحة: من 9 ص لـ 7 م.` 
            };
        }
        
        return { 
            allowed: true, 
            reason: "ضمن ساعات العمل الرسمية للحملات (من 9 ص إلى 7 م)." 
        };
    },

    logDecision: function(actionType, details) {
        db.run(`INSERT INTO manager_logs (action_type, details) VALUES (?, ?)`, [actionType, details]);
        console.log(`👔 [المدير العام - ${actionType}]: ${details}`);
    },

    checkDailyAutoPosts: function() {
        const currentHour = new Date().getHours();
        
        if (currentHour === 10) {
            this.logDecision("AUTO_POST_PUBLISHED", "📱 نشر منشور الصباح آلياً على فيسبوك، لينكدإن، إنستجرام وتليجرام: معطرات وفوط النظافة (بدون أسعار).");
        } else if (currentHour === 16) {
            this.logDecision("AUTO_POST_PUBLISHED", "📱 نشر منشور العصر آلياً: الوايبس والمناديل المبللة للأطفال والعائلات (بدون أسعار).");
        } else if (currentHour === 21) {
            this.logDecision("AUTO_POST_PUBLISHED", "📱 نشر منشور المساء آلياً: فرصة الشغل من البيت بالعمولة والتوريدات الجملة (بدون أسعار).");
        }
    },

    checkMonthlyAndHolidayReminders: function() {
        const now = new Date();
        const dayOfMonth = now.getDate();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();

        if (dayOfMonth === 1) {
            this.logDecision("MONTHLY_OFFER_REMINDER", `🔔 تذكير بداية الشهر (${month}/${year}): يرجى تحديد ميزانية الحملات وعروض الخصم الخاصة بهذا الشهر.`);
        }

        if (month === 3 && dayOfMonth >= 14 && dayOfMonth <= 21) {
            this.logDecision("HOLIDAY_REMINDER", "🌸 تذكير موسم عيد الأم: يرجى تجهيز عروض خاصة على معطرات الجو والمنظفات والوايبس.");
        } else if (month === 12 && dayOfMonth >= 20) {
            this.logDecision("HOLIDAY_REMINDER", "🎄 تذكير موسم رأس السنة: يرجى إطلاق عروض الفنادق والمطاعم والهيبرات.");
        }
    },

    checkAndResumeWork: function() {
        this.checkMonthlyAndHolidayReminders();
        this.checkDailyAutoPosts();

        db.get(`SELECT * FROM campaign_state WHERE status = 'RUNNING' ORDER BY id DESC LIMIT 1`, (err, campaign) => {
            if (campaign) {
                const check = this.canRunOutreachCampaign(campaign.platform);
                if (check.allowed) {
                    this.logDecision("WORK_RESUMED", `استئناف الحملة لمنصة [${campaign.platform}] لفئة [${categoryAssets[campaign.category]?.name}]`);
                    runAutoCampaign(campaign.id, campaign.platform, campaign.category, campaign.total_recipients, campaign.last_processed_index);
                }
            }
        });
    }
};

// ==========================================
// 🚀 5. محرك الحملات الموجهة مع ضوابط أمان الواتساب (1-5 دقائق فاصل، واستراحة 8-12 دقيقة)
// ==========================================
async function runAutoCampaign(campaignId, platform, category, totalRecipients, startIndex = 0) {
    const targetAsset = categoryAssets[category] || categoryAssets['hypermarkets'];

    for (let i = startIndex + 1; i <= totalRecipients; i++) {
        const check = GeneralManager.canRunOutreachCampaign(platform);
        if (!check.allowed) {
            GeneralManager.logDecision("CAMPAIGN_PAUSED", `إيقاف مؤقت للحملة رقم (${campaignId}) عند العميل (${i - 1}) بسبب: ${check.reason}`);
            db.run(`UPDATE campaign_state SET last_processed_index = ? WHERE id = ?`, [i - 1, campaignId]);
            return;
        }

        const dummyCustomerId = `CUST_${category}_${i}`;
        const randomTemplateFunc = whatsappTemplates[Math.floor(Math.random() * whatsappTemplates.length)];
        const dynamicMsg = randomTemplateFunc(targetAsset.name);

        db.get(`SELECT user_id FROM customers WHERE user_id = ?`, [dummyCustomerId], async (err, row) => {
            if (!row) {
                console.log(`📤 [حملة ${BUSINESS_IDENTITY.targetRegions} - ${targetAsset.name}]: إرسال للعميل (${i}/${totalRecipients}) منصة [${platform}] - الرسالة: "${dynamicMsg}"`);
                db.run(`INSERT OR REPLACE INTO customers (user_id, channel, category, stage, welcomed_before) VALUES (?, ?, ?, 'WELCOMED', 1)`,
                    [dummyCustomerId, platform, category]);
            }
        });

        db.run(`UPDATE campaign_state SET last_processed_index = ? WHERE id = ?`, [i, campaignId]);

        // تطبيق قواعد أمان الواتساب الصارمة لعدم الحظر
        if (platform === 'WhatsApp') {
            // فاصل عشوائي متغير من دقيقة إلى 5 دقائق بين الرسائل
            const delayMs = getRandomInt(60, 300);
            await sleep(delayMs);

            // استراحة أمان إجبارية متغيرة من 8 إلى 12 دقيقة بعد كل 5 رسائل
            if (i > 0 && i % 5 === 0 && i < totalRecipients) {
                const restMs = getRandomInt(480, 720);
                GeneralManager.logDecision("WHATSAPP_REST", `⏸️ استراحة أمان إجبارية للواتساب (من 8 إلى 12 دقيقة) بعد إرسال 5 رسائل.`);
                await sleep(restMs);
            }
        } else {
            // سرعة مأمونة للمنصات الأخرى التي تعمل 24/7
            const fastMs = getRandomInt(10, 20);
            await sleep(fastMs);
        }
    }

    db.run(`UPDATE campaign_state SET status = 'COMPLETED' WHERE id = ?`, [campaignId]);
    GeneralManager.logDecision("CAMPAIGN_COMPLETED", `اكتملت حملة نطاق (${BUSINESS_IDENTITY.targetRegions}) رقم (${campaignId}) لفئة [${targetAsset.name}] عبر [${platform}] بنجاح.`);
}

// ==========================================
// 💬 6. نظام استقبال ورسائل العملاء والتصنيف والرد التفاعلي 24/7 (Lead Journey)
// ==========================================
function processIncomingInteraction(channel, senderId, userMsg, providedCategory, res) {
    db.get(`SELECT * FROM customers WHERE user_id = ?`, [senderId], (err, customer) => {
        if (err) {
            return res.status(500).json({ success: false, error: err.message });
        }

        let reply = "";

        const isHousewifeReq = /شغل|مندوب|منزل|بيت|سيدة|أمهات|عايزة أشتغل|عمولة|مشرفة/i.test(userMsg);
        const isPharmacies = /صيدل|صيدليه|دواء|علاج/i.test(userMsg);
        const isHypermarkets = /هيبر|ماركت|جملة|سوبر/i.test(userMsg);
        const isHotels = /فندق|مطعم|كافيه|قرية/i.test(userMsg);
        const isSalons = /كوافير|صالون|حلاق|تجميل/i.test(userMsg);
        const isDistribution = /توزيع|موزع|شرك/i.test(userMsg);
        const isPositive = /نعم|ايوه|تمام|موافق|ارسل|بعت|عايز|محتاج|ابعت|اه|الكتالوج|الاسعار|التفاصيل/i.test(userMsg);
        const isAskingPrice = /سعر|بكام|كام|الاسعار|الأسعار|تكلفة|عرض|عمولة|نسبة/i.test(userMsg);
        const orderMatch = userMsg.match(/طلب|عايز|محتاج|اوردر|كمية\s*(\d+)/i);

        if (!customer && !providedCategory) {
            if (isHousewifeReq) {
                reply = `أهلاً بحضرتكِ يا فندم معك ${BUSINESS_IDENTITY.ownerName} في فريق سيدات الزمردة كوزماتيكس 💎🏡.\n\nيسعدنا انضمامك معنا للعمل من البيت (${BUSINESS_IDENTITY.targetRegions}) كمندوبة ومسوقة بالعمولة مع إمكانية الترقية كمشرفة فريق لاحقاً!\n\n📄 إليك كتالوج المنتجات الأساسية لاستعراض الأصناف (مناديل مبللة، وايبس، معطرات، ومنظفات): http://localhost:5000/رونزا_كتالوج_الهيبرات_10_2026.pdf\n\nهل تودين البدء في مشاركة المنتجات مع معارفك واستقبال طلبات العروض؟`;
                db.run(`INSERT INTO customers (user_id, channel, category, stage, welcomed_before) VALUES (?, ?, 'housewives_team', 'CATALOG_SENT', 1)`,
                    [senderId, channel]);
            } else {
                reply = `أهلاً بحضرتك معك ${BUSINESS_IDENTITY.ownerName} في ${BUSINESS_IDENTITY.name} 💎.\n\n🎁 **عروض الشهر الحصرية:** خصومات تصل لـ 10% على طلبات التوريد بالجملة للفئات المعتمدة.\n\nلكي نرسل لك الكتالوج وعرض الأسعار المخصص لنشاطك، يرجى توضيح فئة عملك:\n1️⃣ صيدلية / صيادلة\n2️⃣ هيبر ماركت / تجار جملة\n3️⃣ فندق / مطعم\n4️⃣ كوافير / صالون\n5️⃣ شركة توزيع\n6️⃣ مندوبة مبيعات من البيت (ربات بيوت - القاهرة والجيزة)`;
                db.run(`INSERT INTO customers (user_id, channel, category, stage, welcomed_before) VALUES (?, ?, 'UNCLASSIFIED', 'AWAITING_CATEGORY', 1)`,
                    [senderId, channel]);
            }
        }
        else if ((customer && customer.stage === 'AWAITING_CATEGORY') || (!customer && providedCategory)) {
            let detectedCat = providedCategory || 'hypermarkets';
            
            if (isHousewifeReq || /مندوب|شغل|بيت/i.test(userMsg)) {
                detectedCat = 'housewives_team';
            } else if (isPharmacies) {
                detectedCat = 'pharmacies';
            } else if (isHypermarkets) {
                detectedCat = 'hypermarkets';
            } else if (isHotels) {
                detectedCat = 'hotels';
            } else if (isSalons) {
                detectedCat = 'salons';
            } else if (isDistribution) {
                detectedCat = 'distribution';
            }

            const asset = categoryAssets[detectedCat];
            reply = `أهلاً وسهلاً بحضرتك معنا! 🤝 تم تصنيف حسابكم ضمن فئة (${asset.name}) بإدارة ${BUSINESS_IDENTITY.ownerName}.\n\n📄 إليك الكتالوج المخصص المعتمد لفئتكم مع شارة عروض الشهر: http://localhost:5000/${asset.catalog}\n\nهل تود استلام قائمة الأسعار الرسمية والعروض المتاحة للكميات؟`;

            db.run(`INSERT OR REPLACE INTO customers (user_id, channel, category, stage, welcomed_before) VALUES (?, ?, ?, 'CATALOG_SENT', 1)`,
                [senderId, channel, detectedCat]);
        }
        else {
            const activeCategory = (customer && customer.category !== 'UNCLASSIFIED') ? customer.category : (providedCategory || 'hypermarkets');
            const asset = categoryAssets[activeCategory] || categoryAssets['hypermarkets'];

            if (customer.stage === 'WELCOMED' && (isPositive || isHousewifeReq)) {
                reply = `أهلاً بك! بناءً على طلبك، إليك الكتالوج المخصص المعتمد لفئة (${asset.name}):\n📄 رابط الكتالوج: http://localhost:5000/${asset.catalog}\n\nهل أرسل لك قائمة الأسعار وعروض الكميات المتاحة اليوم؟`;
                db.run(`UPDATE customers SET stage = 'CATALOG_SENT' WHERE user_id = ?`, [senderId]);
            }
            else if ((customer.stage === 'CATALOG_SENT' && isPositive) || isAskingPrice) {
                reply = `إليك قائمة الأسعار والعمولات المعتمدة لـ (${asset.name}) 💰:\n- قائمة أسعار الفئة: http://localhost:5000/${asset.pricelist}\n\nتفضل بتحديد الأصناف والكميات المطلوب توريدها وشحنها لمحافظات ${BUSINESS_IDENTITY.targetRegions}!`;
                db.run(`UPDATE customers SET stage = 'PRICES_SENT' WHERE user_id = ?`, [senderId]);
            }
            else if (orderMatch || customer.stage === 'PRICES_SENT') {
                const quantity = orderMatch && orderMatch[1] ? parseInt(orderMatch[1]) : 10;
                const totalCalc = quantity * asset.basePrice;
                reply = `شكرًا لتحديد الطلبية! 📦 تم احتساب قيمة الفاتورة المبدئية المخصصة لفئة (${asset.name}):\n- الكمية المطلوبة: ${quantity} قطعة\n- إجمالي الفاتورة: ${totalCalc} جنيه مصري.\n\nتم رفع الطلب لمسؤول المبيعات (${BUSINESS_IDENTITY.ownerName}) للتأكيد والتوريد.`;
                
                db.run(`INSERT INTO orders (user_id, category, items_details, total_amount) VALUES (?, ?, ?, ?)`,
                    [senderId, activeCategory, `الكمية: ${quantity}`, totalCalc]);
                db.run(`UPDATE customers SET stage = 'ORDER_CALCULATED' WHERE user_id = ?`, [senderId]);
            }
            else {
                reply = `أهلاً بك! تم تسجيل استفسارك ومتابعة طلبك في نظام الرد الآلي 24/7 مع إدارة مبيعات فئة (${asset.name}).`;
            }
        }

        return res.json({ success: true, reply, stage: customer ? customer.stage : 'NEW' });
    });
}

// ==========================================
// 🖥️ 7. لوحة التحكم المحدثة مع أزرار الانتقال المباشر لكل حملة وسطح المكتب
// ==========================================
app.get('/', (req, res) => {
    db.all(`SELECT * FROM manager_logs ORDER BY id DESC LIMIT 6`, [], (err, logs) => {
        let logsHtml = (logs || []).map(l => `<li style="margin-bottom: 6px;"><b>[${l.created_at}] - ${l.action_type}:</b> ${l.details}</li>`).join('');

        res.send(`
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
            <meta charset="UTF-8">
            <meta name="keywords" content="${BUSINESS_IDENTITY.keywords.join(', ')}">
            <meta name="description" content="شركة الزمردة كوزماتيكس بإدارة عبداللطيف فراج - توريدات مناديل مبللة، وايبس أطفال وعائلي، معطرات أرضيات وجو، فوط تركي، ومندوبات مبيعات من البيت في القاهرة والجيزة.">
            <title>شركة الزمردة كوزماتيكس | المنظومة الذكية للتوريدات والعروض</title>
            <style>
                body { 
                    font-family: 'Segoe UI', Tahoma, sans-serif; 
                    background: #f4f6f9; 
                    margin: 0; 
                    padding: 20px; 
                    text-align: center; 
                }
                .card { 
                    background: white; 
                    max-width: 900px; 
                    margin: 20px auto; 
                    padding: 25px; 
                    border-radius: 12px; 
                    box-shadow: 0 4px 15px rgba(0,0,0,0.1); 
                }
                h1 { 
                    color: #0b5ed7; 
                    margin-bottom: 5px; 
                }
                select, input, button { 
                    padding: 12px; 
                    margin: 10px; 
                    font-size: 15px; 
                    border-radius: 6px; 
                    border: 1px solid #ccc; 
                    width: 80%; 
                }
                button { 
                    background: #198754; 
                    color: white; 
                    font-weight: bold; 
                    cursor: pointer; 
                    border: none; 
                }
                button:hover { 
                    background: #157347; 
                }
                .btn-link {
                    display: inline-block;
                    padding: 10px 18px;
                    margin: 6px;
                    background: #0d6efd;
                    color: white;
                    text-decoration: none;
                    border-radius: 6px;
                    font-weight: bold;
                    font-size: 14px;
                }
                .btn-link:hover {
                    background: #0b5ed7;
                }
                .offer-box { 
                    background: #fff3cd; 
                    border: 1px solid #ffe69c; 
                    padding: 15px; 
                    border-radius: 8px; 
                    margin: 15px 0; 
                    text-align: right; 
                }
                .housewife-banner { 
                    background: #e8f4fd; 
                    border: 1px solid #b6d4fe; 
                    padding: 15px; 
                    border-radius: 8px; 
                    margin: 15px 0; 
                    text-align: right; 
                }
                .manager-box { 
                    background: #f8f9fa; 
                    border-right: 6px solid #0d6efd; 
                    padding: 15px; 
                    text-align: right; 
                    margin-top: 15px; 
                    border-radius: 6px; 
                }
                .status-badge { 
                    display: inline-block; 
                    padding: 6px 12px; 
                    border-radius: 15px; 
                    color: white; 
                    background: #198754; 
                    font-weight: bold; 
                }
            </style>
        </head>
        <body>
            <div class="card">
                <h1>💎 شركة الزمردة كوزماتيكس للتوريدات والجملة</h1>
                <p>إدارة: <b>${BUSINESS_IDENTITY.ownerName}</b> | إدارة الحملات الموجهة (عمل 24/7 على السوشيال ميديا)، المنشورات التلقائية، وقطاع المندوبات (نطاق: <b>${BUSINESS_IDENTITY.targetRegions}</b>)</p>

                <!-- أزرار الانتقال المباشر لكل القنوات وصفحة رونزا الأم -->
                <div style="background: #e9ecef; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <h3 style="margin-top: 0;">🔗 أزرار الوصول المباشر لمنصات الحملات والشركة الأم:</h3>
                    <a class="btn-link" style="background: #1877f2;" href="${BUSINESS_IDENTITY.facebookPage}" target="_blank">🌐 صفحة فيسبوك</a>
                    <a class="btn-link" style="background: #20c997;" href="${BUSINESS_IDENTITY.ronzaParentPage}" target="_blank">🌺 صفحة Ronza الأم</a>
                    <a class="btn-link" style="background: #e4405f;" href="${BUSINESS_IDENTITY.instagramProfile}" target="_blank">📸 إنستجرام</a>
                    <a class="btn-link" style="background: #0a66c2;" href="${BUSINESS_IDENTITY.linkedinProfile}" target="_blank">💼 لينكد إن</a>
                    <a class="btn-link" style="background: #24a1de;" href="https://t.me/${BUSINESS_IDENTITY.telegram}" target="_blank">✈️ قناتنا بالتليجرام</a>
                    <a class="btn-link" style="background: #25d366;" href="https://wa.me/2${BUSINESS_IDENTITY.whatsapp}" target="_blank">💬 واتساب المبيعات</a>
                    <a class="btn-link" style="background: #dc3545;" href="mailto:${BUSINESS_IDENTITY.email}" target="_blank">✉️ البريد الرسمي</a>
                </div>

                <div class="housewife-banner">
                    <h3>📢 النشر والحملات 24/7 (Facebook, Messenger, Instagram, Telegram, LinkedIn):</h3>
                    <p style="font-size: 14px; color: #333; margin: 0;">جميع منصات التواصل الاجتماعي مستثناة وتعمل على مدار <b>24 ساعة طوال 7 أيام في الأسبوع</b> لإطلاق الحملات واستقبال الرسائل والنشر التلقائي (3 منشورات/يوم بدون أسعار).</p>
                </div>

                <div class="offer-box">
                    <h3>🎁 إدارة عروض الشهر وتحديد الميزانية:</h3>
                    <form action="/api/offers/add" method="POST">
                        <label><b>تحديد عنوان عرض الشهر:</b></label><br>
                        <input type="text" name="offerTitle" placeholder="مثال: خصم 10% بمناسبة عروض الشهر / الأعياد" required><br>
                        <label><b>الفئة المستهدفة بالعرض:</b></label><br>
                        <select name="category">
                            <option value="all">جميع الفئات</option>
                            <option value="housewives_team">قطاع المندوبات والمشرفات من البيت</option>
                            <option value="pharmacies">صيادلة وصيدليات</option>
                            <option value="hypermarkets">هيبر ماركت وتجار جملة</option>
                            <option value="hotels">فنادق ومطاعم</option>
                            <option value="salons">كوافير وحلاقين</option>
                            <option value="distribution">شركات التوزيع</option>
                        </select><br>
                        <button type="submit" style="background: #ffc107; color: #000;">حفظ وتفعيل عرض الشهر 📌</button>
                    </form>
                </div>

                <div class="manager-box">
                    <h3>👔 قرارات وسجل تذكيرات المدير العام (${BUSINESS_IDENTITY.ownerName}):</h3>
                    <p><b>حالة السوشيال ميديا (24/7):</b> <span class="status-badge">🟢 تعمل 24/7 طوال الأسبوع بدون توقف</span></p>
                    <p><b>ضوابط الواتساب:</b> <span style="color: green; font-weight: bold;">🟢 (من 9ص لـ 7م، فاصل 1-5 د، استراحة 8-12 د كل 5 رسائل)</span></p>
                    <p><b>جدولة النشر التلقائي (3 منشورات/يوم):</b> <span style="color: green; font-weight: bold;">🟢 مفعل (10:00 ص، 4:00 م، 9:00 م)</span></p>
                    <hr>
                    <h4>📋 سجل تحركات وتنبيهات المدير العام اللحظي:</h4>
                    <ul style="font-size: 13px; font-family: monospace;">
                        ${logsHtml || '<li>جاري تسجيل القرارات والتذكيرات...</li>'}
                    </ul>
                </div>

                <hr>

                <h3>📢 إطلاق حملة موجهة لفئة محددة</h3>
                <form action="/api/campaign/start" method="POST">
                    <label><b>اختر المنصة:</b></label><br>
                    <select name="platform">
                        <option value="Facebook_Messenger">فيسبوك ماسنجر (24/7)</option>
                        <option value="Instagram">إنستجرام ديركت (24/7)</option>
                        <option value="LinkedIn">بروفايل لينكدإن (24/7)</option>
                        <option value="Telegram">تليجرام (24/7)</option>
                        <option value="WhatsApp">واتساب (أوقات العمل الرسمية ضوابط أمان)</option>
                        <option value="Email">البريد الإلكتروني (أوقات العمل الرسمية)</option>
                    </select><br>

                    <label><b>اختر الفئة المستهدفة:</b></label><br>
                    <select name="category">
                        <option value="housewives_team">قطاع المندوبات والمشرفات (ربات بيوت - القاهرة والجيزة)</option>
                        <option value="pharmacies">صيادلة وصيدليات</option>
                        <option value="hypermarkets">هيبر ماركت وتجار جملة</option>
                        <option value="hotels">فنادق ومطاعم</option>
                        <option value="salons">كوافير وحلاقين</option>
                        <option value="distribution">شركات التوزيع</option>
                    </select><br>

                    <label><b>عدد المستهدفين:</b></label><br>
                    <input type="number" name="totalRecipients" value="30" min="1" max="500"><br>

                    <button type="submit">بدء إرسال الحملة الموجهة ⚡</button>
                </form>

                <hr>

                <h3>🧪 محاكاة دخول عميل جديد أو مندوبة منزلية 24/7 (اختبار التفاعل والردود)</h3>
                <form action="/api/support/chat" method="POST">
                    <input type="text" name="senderId" placeholder="معرف المستخدم (مثال: FB_User_010)" required><br>
                    <input type="text" name="message" placeholder="رسالة المستخدم (مثال: تمام ابعتلي الكتالوج والأسعار وعايز كمية 20)" required><br>
                    <button type="submit" style="background: #0d6efd;">محاكاة الرد والتصنيف والعروض 🤖</button>
                </form>
            </div>
        </body>
        </html>
        `);
    });
});

app.post('/api/offers/add', (req, res) => {
    const { offerTitle, category } = req.body;
    const monthYear = `${new Date().getMonth() + 1}/${new Date().getFullYear()}`;

    db.run(`INSERT INTO monthly_offers (month_year, category, offer_title) VALUES (?, ?, ?)`,
        [monthYear, category, offerTitle], (err) => {
        if (err) return res.status(500).send("خطأ في إضافة العرض");
        GeneralManager.logDecision("OFFER_UPDATED", `تم حفظ عرض جديد لشهر (${monthYear}): "${offerTitle}" للفئة [${category}]`);
        res.send(`
        <div style="font-family: Tahoma; text-align: center; margin-top: 50px; direction: rtl;">
            <h2 style="color: green;">✅ تم حفظ وتفعيل عرض الشهر بنجاح!</h2>
            <br><br>
            <a href="/" style="display: inline-block; padding: 10px 20px; background: #0d6efd; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">العودة للوحة التحكم</a>
        </div>
        `);
    });
});

app.post('/api/campaign/start', (req, res) => {
    const { platform, category, totalRecipients } = req.body;
    const total = parseInt(totalRecipients) || 30;

    const check = GeneralManager.canRunOutreachCampaign(platform);
    if (!check.allowed) {
        return res.send(`
        <div style="font-family: Tahoma; text-align: center; margin-top: 50px; direction: rtl;">
            <h2 style="color: #d9534f;">⚠️ أوقَف المدير العام إطلاق الحملة!</h2>
            <p><b>السبب:</b> ${check.reason}</p>
            <br><br>
            <a href="/" style="display: inline-block; padding: 10px 20px; background: #0d6efd; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">العودة للوحة التحكم</a>
        </div>
        `);
    }

    const platformUrl = platformLinks[platform] || BUSINESS_IDENTITY.facebookPage;

    db.run(`INSERT INTO campaign_state (platform, category, last_processed_index, total_recipients, status) VALUES (?, ?, 0, ?, 'RUNNING')`,
        [platform, category, total], function(err) {
        if (err) return res.status(500).send("خطأ في تسجيل الحملة");
        const campaignId = this.lastID;
        GeneralManager.logDecision("CAMPAIGN_STARTED", `حملة جديدة موجهة لفئة [${categoryAssets[category]?.name}] عبر [${platform}] بإدارة ${BUSINESS_IDENTITY.ownerName}`);
        runAutoCampaign(campaignId, platform, category, total);
        res.send(`
        <div style="font-family: Tahoma; text-align: center; margin-top: 50px; direction: rtl;">
            <h2 style="color: green;">✅ تم بدء الحملة الموجهة بنجاح على منصة [${platform}]!</h2>
            <p style="font-size: 16px; color: #555;">الحملة تعمل الآن وتتفاعل آلياً في الخلفية باسم <b>${BUSINESS_IDENTITY.ownerName}</b>.</p>
            
            <div style="margin: 30px 0;">
                <a href="${platformUrl}" target="_blank" style="display: inline-block; padding: 12px 25px; background: #198754; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">🚀 فتح صفحة / رابط منصة [${platform}] الآن</a>
            </div>

            <a href="/" style="display: inline-block; padding: 10px 20px; background: #0d6efd; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">العودة للوحة التحكم</a>
        </div>
        `);
    });
});

app.post('/api/support/chat', (req, res) => {
    const { channel, senderId, message, category } = req.body;
    processIncomingInteraction(channel || 'Social_24_7', senderId, message, category, res);
});

const PORT = 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`================================================`);
    console.log(`💎 المنظومة الذكية المحدثة والتراكمية لشركة الزمردة كوزماتيكس (إدارة: ${BUSINESS_IDENTITY.ownerName})`);
    console.log(`🌐 رابط اللوحة : http://localhost:${PORT}`);
    console.log(`================================================`);
    GeneralManager.checkAndResumeWork();
});
// مجلد الميديا والفيديوهات الكرتونية للعرض على المتصفح
app.use('/media', express.static(path.join(__dirname, 'assets/media')));
app.use('/review_queue', express.static(path.join(__dirname, 'assets/review_queue')));

// 1. صفحة واجهة التحكم لمراجعة الفيديوهات والحملات قبل النشر
app.get('/review', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <title>لوحة مراجعة الحملات - الزمردة كوزماتيكس</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; text-align: center; }
            .container { max-width: 800px; background: white; margin: 0 auto; padding: 25px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
            h2 { color: #2c3e50; }
            .video-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-top: 20px; background: #fafafa; }
            video { width: 100%; max-height: 400px; border-radius: 8px; }
            .caption { margin: 15px 0; font-size: 16px; color: #333; font-weight: bold; }
            .btn { padding: 12px 25px; font-size: 16px; border: none; border-radius: 6px; cursor: pointer; margin: 5px; text-decoration: none; display: inline-block; }
            .btn-approve { background-color: #27ae60; color: white; }
            .btn-reject { background-color: #e74c3c; color: white; }
            .btn:hover { opacity: 0.9; }
        </style>
    </head>
    <body>
        <div class="container">
            <h2>🎬 طابور مراجعة الفيديوهات الكرتونية والحملات</h2>
            <p>يرجى معاينة المحتوى قبل الإذن بالنشـر التلقائي عـبر منصات السوشيال ميديا.</p>

            <div class="video-card">
                <video controls>
                    <source src="/review_queue/sample_cartoon.mp4" type="video/mp4">
                    متصفحك لا يدعم تشغيل الفيديو.
                </video>
                <div class="caption">
                    📝 النص الترويجي: "هل تبحثين عن فرصة عمل حقيقية وأنتِ في بيتك؟ انضمي الآن لبرنامج سفيرات الزمردة كوزماتيكس بعمولات مجزية وترقيات فورية! 🌸"
                </div>
                <div>
                    <button class="btn btn-approve" onclick="alert('✅ تم الاعتماد! جاري النشر التلقائي عبر فيسبوك وتيك توك وتيليجرام...')">✅ موافق واشرع في النشر</button>
                    <button class="btn btn-reject" onclick="alert('❌ تم رفض الفيديو، وسيتم إعادته لوكيل الإعلانات للتعديل.')">❌ طلب تعديل / رفض</button>
                </div>
            </div>
        </div>
    </body>
    </html>
    `);
});

// Local dev + Vercel export
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}
module.exports = app;
module.exports = app;
