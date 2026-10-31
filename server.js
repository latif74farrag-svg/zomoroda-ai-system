const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const initSqlJs = require('sql.js');
const app = express();
const { getDashboardHtml } = require('./views/dashboard');
const { getReviewHtml } = require('./views/review');
const { renderResultCard } = require('./views/resultCard');


// [تعديل] هل التشغيل على Vercel؟
const IS_VERCEL = !!process.env.VERCEL;

// [تعديل] الرابط الأساسي للموقع (بدل localhost) + دالة بناء رابط الملفات العربية
const BASE_URL = process.env.BASE_URL || 'https://zomoroda-ai-system.vercel.app';
const fileUrl = (name) => `${BASE_URL}/${encodeURIComponent(name)}`;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// [تعديل] حماية الملفات الحساسة من العرض العام (قاعدة البيانات، الإعدادات، الكود)
app.use((req, res, next) => {
    let p = '';
    try { p = decodeURIComponent(req.path).toLowerCase(); } catch (e) { return res.status(400).send('Bad Request'); }
    if (/\.(db|json|js|txt|env|md)$/.test(p) || p.includes('node_modules') || p.startsWith('/.git')) {
        return res.status(403).send('Forbidden');
    }
    next();
});

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
// 🗄️ 2. تهيئة قاعدة البيانات (sql.js بدل sqlite3 - بدون ملفات native)
// ==========================================
// [تعديل] على Vercel نظام الملفات للقراءة فقط ما عدا /tmp، فنستخدم /tmp (بيانات مؤقتة)
const dbPath = IS_VERCEL
    ? '/tmp/zomoroda_system.db'
    : path.join(__dirname, 'zomoroda_system.db');

// [تعديل] على Vercel ننسخ القاعدة الأصلية إلى /tmp لو موجودة ولم تنسخ من قبل
if (IS_VERCEL) {
    try {
        const originalDb = path.join(__dirname, 'zomoroda_system.db');
        if (fs.existsSync(originalDb) && !fs.existsSync(dbPath)) {
            fs.copyFileSync(originalDb, dbPath);
        }
    } catch (e) {
        console.log('⚠️ تعذر نسخ قاعدة البيانات إلى /tmp:', e.message);
    }
}

let sdb = null; // قاعدة بيانات sql.js (تعمل في الذاكرة ونحفظها في ملف)

const dbReady = (async () => {
    // قراءة ملف wasm صراحةً ليتم تضمينه عند النشر على Vercel
    const wasmBinary = fs.readFileSync(path.join(__dirname, 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'));
    const SQL = await initSqlJs({ wasmBinary });
    if (fs.existsSync(dbPath)) {
        try {
            sdb = new SQL.Database(fs.readFileSync(dbPath));
        } catch (e) {
            console.log('⚠️ ملف قاعدة البيانات تالف، سيتم إنشاء قاعدة جديدة:', e.message);
            sdb = new SQL.Database();
        }
    } else {
        sdb = new SQL.Database();
    }
    console.log('✅ تم تجهيز قاعدة البيانات (sql.js) بنجاح.');
})();

// حفظ القاعدة في الملف (مع تأخير بسيط لتجميع عدة عمليات)
let saveTimer = null;
function persist() {
    if (saveTimer) return;
    saveTimer = setTimeout(() => {
        saveTimer = null;
        try {
            fs.writeFileSync(dbPath, Buffer.from(sdb.export()));
        } catch (e) {
            console.log('⚠️ تعذر حفظ قاعدة البيانات:', e.message);
        }
    }, 300);
}

function normArgs(params, cb) {
    if (typeof params === 'function') { cb = params; params = []; }
    return [params || [], cb];
}

// واجهة مطابقة لـ sqlite3 حتى لا نغير باقي الكود
const db = {
    run(sql, params, cb) {
        [params, cb] = normArgs(params, cb);
        dbReady.then(() => {
            let err = null, ctx = {};
            try {
                sdb.run(sql, params);
                const idRes = sdb.exec('SELECT last_insert_rowid()');
                ctx = {
                    lastID: idRes[0].values[0][0],
                    changes: sdb.getRowsModified()
                };
                persist();
            } catch (e) {
                err = e;
            }
            if (cb) cb.call(ctx, err);
            else if (err) console.error('❌ خطأ SQL:', err.message);
        });
        return db;
    },
    get(sql, params, cb) {
        [params, cb] = normArgs(params, cb);
        dbReady.then(() => {
            let err = null, row;
            try {
                const stmt = sdb.prepare(sql);
                stmt.bind(params);
                if (stmt.step()) row = stmt.getAsObject();
                stmt.free();
            } catch (e) {
                err = e;
            }
            if (cb) cb(err, row);
        });
        return db;
    },
    all(sql, params, cb) {
        [params, cb] = normArgs(params, cb);
        dbReady.then(() => {
            let err = null;
            const rows = [];
            try {
                const stmt = sdb.prepare(sql);
                stmt.bind(params);
                while (stmt.step()) rows.push(stmt.getAsObject());
                stmt.free();
            } catch (e) {
                err = e;
            }
            if (cb) cb(err, rows);
        });
        return db;
    },
    serialize(fn) { if (fn) fn(); }
};

// ==========================================
// 🗄️ إنشاء الجداول (Database Schema)
// ==========================================
db.serialize(() => {
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
            db.run(`ALTER TABLE customers ADD COLUMN welcomed_before INTEGER DEFAULT 0`, () => {
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
// [تعديل] أسماء الملفات مطابقة لما هو مرفوع فعلياً على GitHub
const categoryAssets = {
    "pharmacies": {
        name: "صيادلة وصيدليات",
        catalog: "رونزا_كتالوج_الصيدليات.pdf",
        pricelist: "قائمة_اسعار_وكلاء صيادله _10-2026.xlsx",
        basePrice: 110
    },
    "hypermarkets": {
        name: "هيبر ماركت وتجار جملة",
        catalog: "رونزا_كتالوج_الهيبرات_10-2026.pdf",
        pricelist: "قائمة_اسعار_الهيبرات_10-2026_معدلة.xlsx",
        basePrice: 95
    },
    "hotels": {
        name: "فنادق ومطاعم",
        catalog: "كتالوج الفنادق و التوريدات.pdf",
        pricelist: "اسعار الفنادق.pdf",
        basePrice: 150
    },
    "salons": {
        name: "كوافير وحلاقين",
        catalog: "salon كتالوج .pdf",
        pricelist: "اسعار salon.pdf",
        basePrice: 120
    },
    "distribution": {
        name: "شركات التوزيع",
        catalog: "رونزا_كتالوج_شركات_التوزيع_10-2026 (5).pdf",
        pricelist: "قائمة_اسعار_شركات_التوزيع_10-2026_معدلة.xlsx",
        basePrice: 85
    },
    "housewives_team": {
        name: "مندوبات ومشرفات من البيت (القاهرة والجيزة)",
        catalog: "رونزا_كتالوج_الهيبرات_10-2026.pdf",
        pricelist: "قائمة_اسعار_الهيبرات_10-2026_معدلة.xlsx",
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
    canRunOutreachCampaign: function (platform = "") {
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

    logDecision: function (actionType, details) {
        db.run(`INSERT INTO manager_logs (action_type, details) VALUES (?, ?)`, [actionType, details]);
        console.log(`👔 [المدير العام - ${actionType}]: ${details}`);
    },

    checkDailyAutoPosts: function () {
        const currentHour = new Date().getHours();

        if (currentHour === 10) {
            this.logDecision("AUTO_POST_PUBLISHED", "📱 نشر منشور الصباح آلياً على فيسبوك، لينكدإن، إنستجرام وتليجرام: معطرات وفوط النظافة (بدون أسعار).");
        } else if (currentHour === 16) {
            this.logDecision("AUTO_POST_PUBLISHED", "📱 نشر منشور العصر آلياً: الوايبس والمناديل المبللة للأطفال والعائلات (بدون أسعار).");
        } else if (currentHour === 21) {
            this.logDecision("AUTO_POST_PUBLISHED", "📱 نشر منشور المساء آلياً: فرصة الشغل من البيت بالعمولة والتوريدات الجملة (بدون أسعار).");
        }
    },

    checkMonthlyAndHolidayReminders: function () {
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

    checkAndResumeWork: function () {
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
                reply = `أهلاً بحضرتكِ يا فندم معك ${BUSINESS_IDENTITY.ownerName} في فريق سيدات الزمردة كوزماتيكس 💎🏡.\n\nيسعدنا انضمامك معنا للعمل من البيت (${BUSINESS_IDENTITY.targetRegions}) كمندوبة ومسوقة بالعمولة مع إمكانية الترقية كمشرفة فريق لاحقاً!\n\n📄 إليك كتالوج المنتجات الأساسية لاستعراض الأصناف (مناديل مبللة، وايبس، معطرات، ومنظفات): ${fileUrl('رونزا_كتالوج_الهيبرات_10-2026.pdf')}\n\nهل تودين البدء في مشاركة المنتجات مع معارفك واستقبال طلبات العروض؟`;
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
            reply = `أهلاً وسهلاً بحضرتك معنا! 🤝 تم تصنيف حسابكم ضمن فئة (${asset.name}) بإدارة ${BUSINESS_IDENTITY.ownerName}.\n\n📄 إليك الكتالوج المخصص المعتمد لفئتكم مع شارة عروض الشهر: ${fileUrl(asset.catalog)}\n\nهل تود استلام قائمة الأسعار الرسمية والعروض المتاحة للكميات؟`;

            db.run(`INSERT OR REPLACE INTO customers (user_id, channel, category, stage, welcomed_before) VALUES (?, ?, ?, 'CATALOG_SENT', 1)`,
                [senderId, channel, detectedCat]);
        }
        else {
            const activeCategory = (customer && customer.category !== 'UNCLASSIFIED') ? customer.category : (providedCategory || 'hypermarkets');
            const asset = categoryAssets[activeCategory] || categoryAssets['hypermarkets'];

            if (customer.stage === 'WELCOMED' && (isPositive || isHousewifeReq)) {
                reply = `أهلاً بك! بناءً على طلبك، إليك الكتالوج المخصص المعتمد لفئة (${asset.name}):\n📄 رابط الكتالوج: ${fileUrl(asset.catalog)}\n\nهل أرسل لك قائمة الأسعار وعروض الكميات المتاحة اليوم؟`;
                db.run(`UPDATE customers SET stage = 'CATALOG_SENT' WHERE user_id = ?`, [senderId]);
            }
            else if ((customer.stage === 'CATALOG_SENT' && isPositive) || isAskingPrice) {
                reply = `إليك قائمة الأسعار والعمولات المعتمدة لـ (${asset.name}) 💰:\n- قائمة أسعار الفئة: ${fileUrl(asset.pricelist)}\n\nتفضل بتحديد الأصناف والكميات المطلوب توريدها وشحنها لمحافظات ${BUSINESS_IDENTITY.targetRegions}!`;
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
// 🖥️ 7. لوحة التحكم المحدثة والعصرية بتصميم الزمردة الراقي
// ==========================================
app.get('/', (req, res) => {
    db.all(`SELECT * FROM manager_logs ORDER BY id DESC LIMIT 10`, [], (err, logs) => {
        db.all(`SELECT * FROM monthly_offers ORDER BY id DESC LIMIT 6`, [], (err2, offers) => {
            db.get(`SELECT COUNT(*) as total_customers FROM customers`, [], (err3, custRow) => {
                db.get(`SELECT COUNT(*) as total_orders FROM orders`, [], (err4, orderRow) => {
                    const totalCust = (custRow && custRow.total_customers) || 0;
                    const totalOrders = (orderRow && orderRow.total_orders) || 0;

                    const html = getDashboardHtml({
                        BUSINESS_IDENTITY,
                        categoryAssets,
                        fileUrl,
                        logs: logs || [],
                        offers: offers || [],
                        totalCust,
                        totalOrders
                    });
                    res.send(html);
                });
            });
        });
    });
});

app.post('/api/offers/add', (req, res) => {
    const { offerTitle, category } = req.body;
    const monthYear = `${new Date().getMonth() + 1}/${new Date().getFullYear()}`;

    db.run(`INSERT INTO monthly_offers (month_year, category, offer_title) VALUES (?, ?, ?)`,
        [monthYear, category, offerTitle], (err) => {
            if (err) return res.status(500).send("خطأ في إضافة العرض");
            GeneralManager.logDecision("OFFER_UPDATED", `تم حفظ وتفعيل عرض شهر (${monthYear}): "${offerTitle}" للفئة [${category}]`);

            renderResultCard(res, {
                title: "تم تفعيل عرض الشهر بنجاح!",
                message: `تم اعتماد العرض الترويجي: <b>"${offerTitle}"</b> بنجاح ومزامنته مع نظام الردود الآلي لشهر (${monthYear}).`,
                isSuccess: true
            });
        });
});

app.post('/api/campaign/start', (req, res) => {
    const { platform, category, totalRecipients } = req.body;
    const total = parseInt(totalRecipients) || 30;

    if (IS_VERCEL && platform === 'WhatsApp') {
        return renderResultCard(res, {
            title: "تنبيه خاص بحملات الواتساب",
            message: "حملات الواتساب تعمل حصرياً من الجهاز الرئيسي لضمان بقاء جلسة Baileys واستقرار اتصال الهاتف.",
            isSuccess: false
        });
    }

    const check = GeneralManager.canRunOutreachCampaign(platform);
    if (!check.allowed) {
        return renderResultCard(res, {
            title: "أوقف المدير العام إطلاق الحملة مؤقتاً",
            message: `<b>سبب الإيقاف الأمني:</b> ${check.reason}`,
            isSuccess: false
        });
    }

    const platformUrl = platformLinks[platform] || BUSINESS_IDENTITY.facebookPage;
    const catName = categoryAssets[category]?.name || category;

    db.run(`INSERT INTO campaign_state (platform, category, last_processed_index, total_recipients, status) VALUES (?, ?, 0, ?, 'RUNNING')`,
        [platform, category, total], function (err) {
            if (err) return res.status(500).send("خطأ في تسجيل الحملة");
            const campaignId = this.lastID;
            GeneralManager.logDecision("CAMPAIGN_STARTED", `حملة جديدة موجهة لفئة [${catName}] عبر [${platform}] بإدارة ${BUSINESS_IDENTITY.ownerName}`);
            runAutoCampaign(campaignId, platform, category, total);

            renderResultCard(res, {
                title: "تم بدء الحملة الموجهة بنجاح!",
                message: `الحملة الموجهة لقطاع <b>[${catName}]</b> عبر منصة <b>[${platform}]</b> تعمل الآن في الخلفية وتتفاعل باسم <b>${BUSINESS_IDENTITY.ownerName}</b>.`,
                isSuccess: true,
                platformUrl: platformUrl,
                platformName: platform
            });
        });
});

app.post('/api/support/chat', (req, res) => {
    const { channel, senderId, message, category } = req.body;
    processIncomingInteraction(channel || 'Social_24_7', senderId, message, category, res);
});

// ==========================================
// 🎬 8. مجلد الميديا وصفحة مراجعة الفيديوهات
// ==========================================
app.use('/media', express.static(path.join(__dirname, 'assets/media')));
app.use('/review_queue', express.static(path.join(__dirname, 'assets/review_queue')));

// صفحة واجهة التحكم لمراجعة الفيديوهات والحملات قبل النشر بتصميم راقي
app.get('/review', (req, res) => {
    const html = getReviewHtml({ BUSINESS_IDENTITY });
    res.send(html);
});

// ==========================================
// 🛒 8.5 مسارات المتجر الإلكتروني (E-Commerce Storefront)
// ==========================================
const { getStoreHtml } = require('./views/store');
const { getCheckoutHtml } = require('./views/checkout');
const { getOrderTrackingHtml } = require('./views/orderTracking');
const { STORE_PRODUCTS, CATEGORY_LABELS, getStoreProducts, getStoreProductById } = require('./products_config');

// إنشاء جدول طلبات المتجر إن لم يكن موجوداً
db.run(`
    CREATE TABLE IF NOT EXISTS store_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_number TEXT UNIQUE,
        customer_name TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        customer_address TEXT NOT NULL,
        notes TEXT,
        items TEXT NOT NULL,
        total REAL NOT NULL,
        payment_method TEXT DEFAULT 'cash',
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

// 1. صفحة المتجر الرئيسية
app.get('/store', (req, res) => {
    const category = req.query.category || 'all';
    const products = category === 'all' ? STORE_PRODUCTS : getStoreProducts(category);
    const html = getStoreHtml(products, CATEGORY_LABELS, category);
    res.send(html);
});

// 2. صفحة إتمام الطلب (Checkout)
app.get('/store/checkout', (req, res) => {
    const html = getCheckoutHtml(BUSINESS_IDENTITY.whatsapp);
    res.send(html);
});

app.get('/store/track', (req, res) => {
    const html = getOrderTrackingHtml();
    res.send(html);
});

// 3. API قائمة المنتجات
app.get('/api/store/products', (req, res) => {
    const { category } = req.query;
    const products = category && category !== 'all' ? getStoreProducts(category) : STORE_PRODUCTS;
    res.json({
        success: true,
        count: products.length,
        categories: CATEGORY_LABELS,
        products
    });
});

// 4. API تفاصيل منتج واحد
app.get('/api/store/products/:id', (req, res) => {
    const product = getStoreProductById(req.params.id);
    if (!product) {
        return res.status(404).json({ success: false, error: 'المنتج غير موجود' });
    }
    res.json({ success: true, product });
});

// 5. API تسجيل طلب جديد
app.post('/api/store/orders', (req, res) => {
    const { customer_name, customer_phone, customer_address, notes, items } = req.body || {};
    const customerName = typeof customer_name === 'string' ? customer_name.trim() : '';
    const customerPhone = typeof customer_phone === 'string' ? customer_phone.replace(/\D/g, '') : '';
    const customerAddress = typeof customer_address === 'string' ? customer_address.trim() : '';
    const customerNotes = typeof notes === 'string' ? notes.trim() : '';

    if (!customerName || customerName.length > 120 || !/^(010|011|012|015)\d{8}$/.test(customerPhone) ||
        !customerAddress || customerAddress.length > 500 || customerNotes.length > 500 ||
        !Array.isArray(items) || items.length === 0 || items.length > 50) {
        return res.status(400).json({ success: false, error: 'يرجى استكمال كافة البيانات الأساسية للطلب والسلة' });
    }

    const requestedItems = new Map();
    for (const item of items) {
        const productId = typeof item?.id === 'string' ? item.id : '';
        const quantity = Number(item?.qty ?? item?.quantity);
        const product = getStoreProductById(productId);
        if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
            return res.status(400).json({ success: false, error: 'يوجد منتج أو كمية غير صالحة في السلة' });
        }

        const combinedQuantity = (requestedItems.get(productId) || 0) + quantity;
        if (combinedQuantity > 99) {
            return res.status(400).json({ success: false, error: 'الحد الأقصى للكمية من المنتج الواحد هو 99' });
        }
        requestedItems.set(productId, combinedQuantity);
    }

    const orderItems = Array.from(requestedItems, ([productId, quantity]) => {
        const product = getStoreProductById(productId);
        return {
            id: product.id,
            name: product.name,
            price: Number(product.price),
            unit: product.unit,
            quantity,
            lineTotal: Number(product.price) * quantity
        };
    });
    const grandTotal = orderItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const itemsJson = JSON.stringify(orderItems);
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const orderNumber = `ZMR-${todayStr}-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;

    db.run(
        `INSERT INTO store_orders (order_number, customer_name, customer_phone, customer_address, notes, items, total, payment_method, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [orderNumber, customerName, customerPhone, customerAddress, customerNotes, itemsJson, grandTotal, 'cash'],
        function (err) {
            if (err) {
                console.error('❌ خطأ في تسجيل طلب المتجر:', err.message);
                return res.status(500).json({ success: false, error: 'فشل في حفظ الطلب بقاعدة البيانات' });
            }

            console.log(`🛒 طلب جديد بالمتجر: [${orderNumber}] - القيمة: ${grandTotal} ج.م`);
            GeneralManager.logDecision('STORE_ORDER_CREATED', `طلب متجر جديد ${orderNumber} بإجمالي ${grandTotal.toFixed(2)} ج.م.`);

            res.json({
                success: true,
                orderNumber,
                total: grandTotal,
                message: 'تم تسجيل الطلب بنجاح'
            });
        }
    );
});

// 6. API تتبع الطلب باستخدام رقم الطلب ورقم الهاتف
function findStoreOrder(phoneInput, orderNumberInput, res) {
    const phone = String(phoneInput || '').replace(/\D/g, '');
    const orderNumber = typeof orderNumberInput === 'string' ? orderNumberInput.trim().toUpperCase() : '';
    if (!/^(010|011|012|015)\d{8}$/.test(phone) || !/^ZMR-\d{8}-[A-F0-9]{16}$/.test(orderNumber)) {
        return res.status(400).json({ success: false, error: 'أدخل رقم هاتف ورقم طلب صحيحين.' });
    }

    db.get(
        `SELECT order_number, status, total, created_at, items
         FROM store_orders WHERE customer_phone = ? AND order_number = ?`,
        [phone, orderNumber],
        (err, order) => {
            if (err) {
                console.error('❌ تعذر جلب حالة طلب المتجر:', err.message);
                return res.status(500).json({ success: false, error: 'تعذر تحميل حالة الطلب.' });
            }
            if (!order) return res.status(404).json({ success: false, error: 'لم نعثر على طلب مطابق للبيانات المدخلة.' });

            try {
                order.items = JSON.parse(order.items);
            } catch (parseError) {
                console.error('❌ تعذر قراءة تفاصيل طلب المتجر:', parseError.message);
                return res.status(500).json({ success: false, error: 'تعذر تحميل تفاصيل الطلب.' });
            }
            res.json({ success: true, order });
        }
    );
}

app.post('/api/store/orders/track', (req, res) => {
    findStoreOrder(req.body?.phone, req.body?.order_number, res);
});

app.get('/api/store/orders/:phone', (req, res) => {
    findStoreOrder(req.params.phone, req.query.order_number, res);
});

// ==========================================
// 🔌 9. تشغيل السيرفر
// [تعديل] دمج الـ listen المكرر في مكان واحد، ولا يعمل على Vercel
// ==========================================
const PORT = process.env.PORT || 5000;

if (!IS_VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`================================================`);
        console.log(`💎 المنظومة الذكية المحدثة والتراكمية لشركة الزمردة كوزماتيكس (إدارة: ${BUSINESS_IDENTITY.ownerName})`);
        console.log(`🌐 رابط اللوحة : http://localhost:${PORT}`);
        console.log(`================================================`);
        GeneralManager.checkAndResumeWork();
    });
}

// [تعديل] تصدير واحد فقط (كان مكرراً) - مطلوب لـ Vercel
module.exports = app;
