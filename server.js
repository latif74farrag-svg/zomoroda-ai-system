const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const { put: putBlob } = require('@vercel/blob');
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
const { getStoreAdminHtml } = require('./views/storeAdmin');
const { getStoreAccountHtml } = require('./views/storeAccount');
const { getStoreProductHtml } = require('./views/storeProduct');
const { STORE_PRODUCTS, CATEGORY_LABELS, getStoreProducts, getStoreProductById } = require('./products_config');
const storeData = require('./store_data');

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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        customer_id TEXT
    )
`);

const ADMIN_SESSION_TTL_SECONDS = 12 * 60 * 60;
const adminLoginAttempts = new Map();
const imageUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 4 * 1024 * 1024, files: 1 }
}).single('image');

function getAdminSessionSecret() {
    const secret = process.env.STORE_ADMIN_SESSION_SECRET || '';
    return secret.length >= 32 ? secret : null;
}

function createAdminSession(expiresAt, secret) {
    const signature = crypto.createHmac('sha256', secret).update(String(expiresAt)).digest('hex');
    return `${expiresAt}.${signature}`;
}

function isStoreAdminAuthenticated(req) {
    const secret = getAdminSessionSecret();
    if (!secret) return false;
    const sessionCookie = String(req.headers.cookie || '').split(';')
        .map(cookie => cookie.trim())
        .find(cookie => cookie.startsWith('zmr_store_admin='));
    if (!sessionCookie) return false;

    let token;
    try {
        token = decodeURIComponent(sessionCookie.slice('zmr_store_admin='.length));
    } catch (error) {
        return false;
    }
    const separator = token.indexOf('.');
    if (separator < 1) return false;
    const expiresAt = Number(token.slice(0, separator));
    const providedSignature = token.slice(separator + 1);
    if (!Number.isSafeInteger(expiresAt) || expiresAt <= Date.now() ||
        !/^[a-f0-9]{64}$/.test(providedSignature)) return false;
    const expectedSignature = createAdminSession(expiresAt, secret).split('.')[1];
    return crypto.timingSafeEqual(Buffer.from(providedSignature, 'hex'), Buffer.from(expectedSignature, 'hex'));
}

function requireStoreAdmin(req, res, next) {
    if (!isStoreAdminAuthenticated(req)) {
        return res.status(401).json({ success: false, error: 'سجّل الدخول لإدارة المتجر.' });
    }
    next();
}

let localCustomerSchema;
function ensureStoreCustomerStorage() {
    if (storeData.isStoreDatabaseConfigured()) return storeData.initializeStoreDatabase();
    if (IS_VERCEL) throw new Error('إعداد قاعدة بيانات حسابات المتجر الدائمة غير مكتمل.');
    if (!localCustomerSchema) {
        localCustomerSchema = new Promise((resolve, reject) => {
            db.run(`CREATE TABLE IF NOT EXISTS store_customers (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                phone TEXT NOT NULL UNIQUE,
                password_salt TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                session_version INTEGER NOT NULL DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, error => {
                if (error) return reject(error);
                db.all('PRAGMA table_info(store_orders)', (columnsError, columns) => {
                    if (columnsError) return reject(columnsError);
                    const addCustomerId = columns.some(column => column.name === 'customer_id')
                        ? Promise.resolve()
                        : localStoreRun('ALTER TABLE store_orders ADD COLUMN customer_id TEXT');
                    addCustomerId.then(() => localStoreAll('PRAGMA table_info(store_customers)'))
                        .then(customerColumns => customerColumns.some(column => column.name === 'session_version')
                            ? Promise.resolve()
                            : localStoreRun('ALTER TABLE store_customers ADD COLUMN session_version INTEGER NOT NULL DEFAULT 0'))
                        .then(resolve, reject);
                });
            });
        });
    }
    return localCustomerSchema;
}

function localStoreRun(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (error) {
            if (error) return reject(error);
            resolve(this);
        });
    });
}

function localStoreGet(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (error, row) => error ? reject(error) : resolve(row || null));
    });
}

function localStoreAll(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (error, rows) => error ? reject(error) : resolve(rows || []));
    });
}

function publicStoreCustomer(customer) {
    if (!customer) return null;
    return {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        created_at: customer.created_at
    };
}

async function findStoreCustomerByPhone(phone) {
    await ensureStoreCustomerStorage();
    if (storeData.isStoreDatabaseConfigured()) return storeData.getCustomerByPhone(phone);
    return localStoreGet(
        'SELECT id, name, phone, password_salt, password_hash, session_version, created_at FROM store_customers WHERE phone = ?',
        [phone]
    );
}

async function findStoreCustomerById(id) {
    await ensureStoreCustomerStorage();
    if (storeData.isStoreDatabaseConfigured()) return storeData.getCustomerById(id);
    return localStoreGet('SELECT id, name, phone, session_version, created_at FROM store_customers WHERE id = ?', [id]);
}

async function createStoreCustomer(customer) {
    await ensureStoreCustomerStorage();
    if (storeData.isStoreDatabaseConfigured()) return storeData.createCustomer(customer);
    await localStoreRun(
        'INSERT INTO store_customers (id, name, phone, password_salt, password_hash, session_version) VALUES (?, ?, ?, ?, ?, 0)',
        [customer.id, customer.name, customer.phone, customer.passwordSalt, customer.passwordHash]
    );
    return findStoreCustomerById(customer.id);
}

async function invalidateStoreCustomerSessions(id) {
    await ensureStoreCustomerStorage();
    if (storeData.isStoreDatabaseConfigured()) return storeData.invalidateCustomerSessions(id);
    await localStoreRun('UPDATE store_customers SET session_version = session_version + 1 WHERE id = ?', [id]);
}

async function findStoreCustomerOrders(customerId) {
    await ensureStoreCustomerStorage();
    if (storeData.isStoreDatabaseConfigured()) return storeData.getCustomerOrders(customerId);
    const orders = await localStoreAll(
        `SELECT order_number, status, total, created_at, items
         FROM store_orders WHERE customer_id = ? ORDER BY created_at DESC LIMIT 100`,
        [customerId]
    );
    return orders.map(order => ({ ...order, items: JSON.parse(order.items) }));
}

const CUSTOMER_SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
const customerAuthAttempts = new Map();
const scryptAsync = require('util').promisify(crypto.scrypt);
const CUSTOMER_PASSWORD_HASH_BYTES = 64;

function createCustomerSession(customerId, sessionVersion, expiresAt, secret) {
    const payload = Buffer.from(JSON.stringify({ id: customerId, ver: sessionVersion, exp: expiresAt })).toString('base64url');
    const signature = crypto.createHmac('sha256', secret).update(`store-customer:${payload}`).digest('hex');
    return `${payload}.${signature}`;
}

async function getStoreCustomerSession(req) {
    const secret = getAdminSessionSecret();
    if (!secret) return null;
    const cookie = String(req.headers.cookie || '').split(';')
        .map(value => value.trim())
        .find(value => value.startsWith('zmr_store_customer='));
    if (!cookie) return null;

    let token;
    try {
        token = decodeURIComponent(cookie.slice('zmr_store_customer='.length));
    } catch (error) {
        return null;
    }
    const separator = token.lastIndexOf('.');
    if (separator <= 0) return null;
    const payload = token.slice(0, separator);
    const signature = token.slice(separator + 1);
    if (!/^[a-f0-9]{64}$/.test(signature)) return null;
    const expected = crypto.createHmac('sha256', secret).update(`store-customer:${payload}`).digest();
    if (!crypto.timingSafeEqual(Buffer.from(signature, 'hex'), expected)) return null;

    let session;
    try {
        session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    } catch (error) {
        return null;
    }
    if (typeof session.id !== 'string' || !Number.isSafeInteger(session.exp) || session.exp <= Date.now()) return null;
    const customer = await findStoreCustomerById(session.id);
    return customer && Number(customer.session_version) === session.ver ? customer : null;
}

function setCustomerSessionCookie(req, res, customer) {
    const secret = getAdminSessionSecret();
    if (!secret) throw new Error('إعداد سر جلسة المتجر غير مكتمل.');
    const expiresAt = Date.now() + CUSTOMER_SESSION_TTL_SECONDS * 1000;
    const token = createCustomerSession(customer.id, Number(customer.session_version || 0), expiresAt, secret);
    const secure = IS_VERCEL || req.secure ? '; Secure' : '';
    res.setHeader('Set-Cookie', `zmr_store_customer=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${CUSTOMER_SESSION_TTL_SECONDS}${secure}`);
}

function customerAuthRateLimited(req, res) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const previous = customerAuthAttempts.get(ip);
    if (previous && previous.resetAt > now && previous.count >= 10) {
        res.status(429).json({ success: false, error: 'محاولات كثيرة. انتظر 15 دقيقة ثم أعد المحاولة.' });
        return true;
    }
    return false;
}

function recordCustomerAuthFailure(req) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const previous = customerAuthAttempts.get(ip);
    customerAuthAttempts.set(ip, previous && previous.resetAt > now
        ? { count: previous.count + 1, resetAt: previous.resetAt }
        : { count: 1, resetAt: now + 15 * 60 * 1000 });
}

function clearCustomerSessionCookie(req, res) {
    res.setHeader('Set-Cookie', 'zmr_store_customer=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' + (IS_VERCEL || req.secure ? '; Secure' : ''));
}

function storeAccountError(res, error) {
    console.error('❌ تعذر إكمال عملية حساب المتجر:', error.message);
    return res.status(503).json({ success: false, error: 'تعذر الوصول إلى حسابات المتجر حالياً. حاول مرة أخرى لاحقاً.' });
}

function storeAdminError(res, error, message = 'تعذر إكمال العملية. تحقق من إعدادات تخزين المتجر وحاول مرة أخرى.') {
    console.error('❌ خطأ في إدارة المتجر:', error.message);
    return res.status(503).json({ success: false, error: message });
}

function parseAdminProduct(body, id, existing = null) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const brand = typeof body.brand === 'string' ? body.brand.trim() : '';
    const unit = typeof body.unit === 'string' ? body.unit.trim() : '';
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    const category = typeof body.category === 'string' ? body.category : '';
    const price = body.price === '' || body.price === null || body.price === undefined ? NaN : Number(body.price);
    const carton = body.carton === null || body.carton === '' || body.carton === undefined ? null : Number(body.carton);
    const imageUrl = typeof body.image_url === 'string' ? body.image_url.trim() : '';
    const variants = Array.isArray(body.variants) ? body.variants.map(value => String(value).trim()).filter(Boolean) : [];
    const safeImageUrl = !imageUrl || (
        imageUrl.length <= 2048 &&
        (/^https:\/\/[^\s]+$/i.test(imageUrl) ||
            /^\/assets\/store-products\/[a-z0-9._/-]+\.(?:jpe?g|png|webp)$/i.test(imageUrl)) &&
        !imageUrl.includes('..')
    );

    if (!name || name.length > 160 || brand.length > 80 || unit.length > 80 || description.length > 1000 ||
        !Object.hasOwn(CATEGORY_LABELS, category) || !Number.isFinite(price) || price < 0 || price > 10000000 ||
        (carton !== null && (!Number.isInteger(carton) || carton < 1 || carton > 100000)) ||
        variants.length > 20 || variants.some(value => value.length > 80) || !safeImageUrl ||
        (body.variants !== undefined && !Array.isArray(body.variants)) ||
        (body.image_url !== undefined && typeof body.image_url !== 'string') ||
        (body.is_active !== undefined && typeof body.is_active !== 'boolean')) {
        return null;
    }

    return {
        id,
        name,
        brand,
        category,
        price,
        unit,
        carton,
        variants,
        description,
        image_url: imageUrl,
        is_active: body.is_active === undefined ? (existing?.is_active ?? true) : body.is_active === true
    };
}

app.get('/store/admin', (req, res) => {
    res.send(getStoreAdminHtml(CATEGORY_LABELS));
});

app.get('/api/store/admin/session', (req, res) => {
    res.json({
        success: true,
        authenticated: isStoreAdminAuthenticated(req),
        configured: Boolean(process.env.STORE_ADMIN_PASSWORD?.length >= 12 && getAdminSessionSecret() && storeData.isStoreDatabaseConfigured()),
        storageReady: storeData.isStoreDatabaseConfigured(),
        imageStorageReady: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
        setupMessage: 'لإدارة المتجر الدائمة على Vercel، افتح Vercel → Project → Settings → Environment Variables وأضف STORE_ADMIN_PASSWORD (12 حرفاً على الأقل) وSTORE_ADMIN_SESSION_SECRET (32 حرفاً عشوائياً على الأقل) وTURSO_DATABASE_URL وTURSO_AUTH_TOKEN، ثم أعد النشر. BLOB_READ_WRITE_TOKEN مطلوب فقط لرفع الصور.'
    });
});

app.post('/api/store/admin/login', (req, res) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const previousAttempts = adminLoginAttempts.get(ip);
    if (previousAttempts && previousAttempts.resetAt > now && previousAttempts.count >= 10) {
        return res.status(429).json({ success: false, error: 'محاولات دخول كثيرة. انتظر 15 دقيقة ثم أعد المحاولة.' });
    }

    const configuredPassword = process.env.STORE_ADMIN_PASSWORD || '';
    const sessionSecret = getAdminSessionSecret();
    const suppliedPassword = typeof req.body?.password === 'string' ? req.body.password : '';
    if (configuredPassword.length < 12 || !sessionSecret) {
        return res.status(503).json({ success: false, error: 'إعداد دخول الإدارة غير مكتمل. أضف متغيرات الإدارة في إعدادات Vercel.' });
    }

    const expected = crypto.createHash('sha256').update(configuredPassword).digest();
    const supplied = crypto.createHash('sha256').update(suppliedPassword).digest();
    if (!crypto.timingSafeEqual(expected, supplied)) {
        const attempts = previousAttempts && previousAttempts.resetAt > now
            ? { count: previousAttempts.count + 1, resetAt: previousAttempts.resetAt }
            : { count: 1, resetAt: now + 15 * 60 * 1000 };
        adminLoginAttempts.set(ip, attempts);
        return res.status(401).json({ success: false, error: 'كلمة المرور غير صحيحة.' });
    }

    adminLoginAttempts.delete(ip);
    const expiresAt = now + ADMIN_SESSION_TTL_SECONDS * 1000;
    const secure = IS_VERCEL || req.secure ? '; Secure' : '';
    res.setHeader('Set-Cookie', `zmr_store_admin=${createAdminSession(expiresAt, sessionSecret)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${ADMIN_SESSION_TTL_SECONDS}${secure}`);
    res.json({ success: true });
});

app.post('/api/store/admin/logout', (req, res) => {
    res.setHeader('Set-Cookie', 'zmr_store_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' + (IS_VERCEL || req.secure ? '; Secure' : ''));
    res.json({ success: true });
});

app.get('/store/account', (req, res) => {
    res.send(getStoreAccountHtml());
});

app.get('/api/store/customer/session', async (req, res) => {
    try {
        const customer = await getStoreCustomerSession(req);
        res.json({ success: true, authenticated: Boolean(customer), customer: publicStoreCustomer(customer) });
    } catch (error) {
        storeAccountError(res, error);
    }
});

app.post('/api/store/customer/register', async (req, res) => {
    if (customerAuthRateLimited(req, res)) return;
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const phone = typeof req.body?.phone === 'string' ? req.body.phone.replace(/\D/g, '') : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!name || name.length > 120 || !/^(010|011|012|015)\d{8}$/.test(phone) ||
        password.length < 8 || password.length > 128) {
        recordCustomerAuthFailure(req);
        return res.status(400).json({ success: false, error: 'أدخل اسماً صحيحاً ورقم هاتف مصرياً وكلمة مرور من 8 أحرف على الأقل.' });
    }
    if (!getAdminSessionSecret()) {
        return res.status(503).json({ success: false, error: 'إعداد جلسات المتجر غير مكتمل. أضف STORE_ADMIN_SESSION_SECRET إلى إعدادات الخادم.' });
    }

    try {
        const existing = await findStoreCustomerByPhone(phone);
        if (existing) {
            recordCustomerAuthFailure(req);
            return res.status(409).json({ success: false, error: 'يوجد حساب بهذا الرقم بالفعل. سجّل الدخول بدلاً من ذلك.' });
        }
        const passwordSalt = crypto.randomBytes(16).toString('hex');
        const passwordHash = (await scryptAsync(password, passwordSalt, CUSTOMER_PASSWORD_HASH_BYTES)).toString('hex');
        const customer = await createStoreCustomer({
            id: crypto.randomUUID(),
            name,
            phone,
            passwordSalt,
            passwordHash
        });
        if (!customer) throw new Error('تعذر تحميل الحساب بعد إنشائه.');
        customerAuthAttempts.delete(req.ip || req.socket.remoteAddress || 'unknown');
        setCustomerSessionCookie(req, res, customer);
        res.status(201).json({ success: true, customer: publicStoreCustomer(customer) });
    } catch (error) {
        if (/UNIQUE constraint failed: store_customers\.phone/i.test(error.message)) {
            recordCustomerAuthFailure(req);
            return res.status(409).json({ success: false, error: 'يوجد حساب بهذا الرقم بالفعل. سجّل الدخول بدلاً من ذلك.' });
        }
        storeAccountError(res, error);
    }
});

app.post('/api/store/customer/login', async (req, res) => {
    if (customerAuthRateLimited(req, res)) return;
    const phone = typeof req.body?.phone === 'string' ? req.body.phone.replace(/\D/g, '') : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!/^(010|011|012|015)\d{8}$/.test(phone) || password.length < 8 || password.length > 128) {
        recordCustomerAuthFailure(req);
        return res.status(401).json({ success: false, error: 'رقم الهاتف أو كلمة المرور غير صحيحة.' });
    }
    if (!getAdminSessionSecret()) {
        return res.status(503).json({ success: false, error: 'إعداد جلسات المتجر غير مكتمل. أضف STORE_ADMIN_SESSION_SECRET إلى إعدادات الخادم.' });
    }

    try {
        const customer = await findStoreCustomerByPhone(phone);
        const salt = customer?.password_salt || 'zomoroda-store-account-check';
        const storedHash = customer?.password_hash || '0'.repeat(CUSTOMER_PASSWORD_HASH_BYTES * 2);
        const suppliedHash = await scryptAsync(password, salt, CUSTOMER_PASSWORD_HASH_BYTES);
        const expectedHash = Buffer.from(storedHash, 'hex');
        if (!customer || expectedHash.length !== suppliedHash.length ||
            !crypto.timingSafeEqual(expectedHash, suppliedHash)) {
            recordCustomerAuthFailure(req);
            return res.status(401).json({ success: false, error: 'رقم الهاتف أو كلمة المرور غير صحيحة.' });
        }
        customerAuthAttempts.delete(req.ip || req.socket.remoteAddress || 'unknown');
        setCustomerSessionCookie(req, res, customer);
        res.json({ success: true, customer: publicStoreCustomer(customer) });
    } catch (error) {
        storeAccountError(res, error);
    }
});

app.post('/api/store/customer/logout', async (req, res) => {
    try {
        const customer = await getStoreCustomerSession(req);
        if (customer) await invalidateStoreCustomerSessions(customer.id);
        clearCustomerSessionCookie(req, res);
        res.json({ success: true });
    } catch (error) {
        storeAccountError(res, error);
    }
});

app.get('/api/store/customer/orders', async (req, res) => {
    try {
        const customer = await getStoreCustomerSession(req);
        if (!customer) return res.status(401).json({ success: false, error: 'سجّل الدخول لعرض طلباتك.' });
        const statusLabels = {
            pending: 'قيد المراجعة',
            confirmed: 'تم التأكيد',
            shipped: 'تم الشحن',
            delivered: 'تم التسليم',
            cancelled: 'تم إلغاء الطلب'
        };
        const orders = await findStoreCustomerOrders(customer.id);
        res.json({
            success: true,
            orders: orders.map(order => ({
                ...order,
                status_label: statusLabels[order.status] || order.status
            }))
        });
    } catch (error) {
        storeAccountError(res, error);
    }
});

app.get('/api/store/admin/products', requireStoreAdmin, async (req, res) => {
    try {
        const products = await storeData.getProducts({ includeInactive: true });
        res.json({ success: true, products });
    } catch (error) {
        storeAdminError(res, error);
    }
});

app.post('/api/store/admin/products', requireStoreAdmin, async (req, res) => {
    const id = `prd-${crypto.randomBytes(8).toString('hex')}`;
    const product = parseAdminProduct(req.body || {}, id);
    if (!product) return res.status(400).json({ success: false, error: 'راجع بيانات المنتج والسعر والتصنيف والصورة.' });
    try {
        const saved = await storeData.saveProduct(product);
        res.status(201).json({ success: true, product: saved, message: 'تمت إضافة المنتج.' });
    } catch (error) {
        storeAdminError(res, error);
    }
});

app.put('/api/store/admin/products/:id', requireStoreAdmin, async (req, res) => {
    try {
        const existing = await storeData.getProductById(req.params.id, { includeInactive: true });
        if (!existing) return res.status(404).json({ success: false, error: 'المنتج غير موجود.' });
        const product = parseAdminProduct(req.body || {}, req.params.id, existing);
        if (!product) return res.status(400).json({ success: false, error: 'راجع بيانات المنتج والسعر والتصنيف والصورة.' });
        const saved = await storeData.saveProduct(product);
        res.json({ success: true, product: saved, message: 'تم تحديث المنتج.' });
    } catch (error) {
        storeAdminError(res, error);
    }
});

app.patch('/api/store/admin/products/:id/visibility', requireStoreAdmin, async (req, res) => {
    if (typeof req.body?.active !== 'boolean') {
        return res.status(400).json({ success: false, error: 'قيمة ظهور المنتج غير صالحة.' });
    }
    try {
        const updated = await storeData.setProductActive(req.params.id, req.body.active);
        if (!updated) return res.status(404).json({ success: false, error: 'المنتج غير موجود.' });
        res.json({ success: true });
    } catch (error) {
        storeAdminError(res, error);
    }
});

app.post('/api/store/admin/images', requireStoreAdmin, (req, res, next) => {
    imageUpload(req, res, error => {
        if (error) {
            const tooLarge = error.code === 'LIMIT_FILE_SIZE';
            return res.status(tooLarge ? 413 : 400).json({
                success: false,
                error: tooLarge ? 'يجب ألا يتجاوز حجم الصورة 4 ميجابايت.' : 'تعذر قراءة الصورة المرفوعة.'
            });
        }
        next();
    });
}, async (req, res) => {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
        return res.status(503).json({ success: false, error: 'إعداد تخزين الصور غير مكتمل. أضف BLOB_READ_WRITE_TOKEN في Vercel.' });
    }
    const file = req.file;
    if (!file) return res.status(400).json({ success: false, error: 'اختر صورة للرفع.' });

    const imageTypes = [
        { mime: 'image/jpeg', extension: 'jpg', matches: buffer => buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff },
        { mime: 'image/png', extension: 'png', matches: buffer => buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) },
        { mime: 'image/webp', extension: 'webp', matches: buffer => buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP' }
    ];
    const imageType = imageTypes.find(type => type.mime === file.mimetype && type.matches(file.buffer));
    if (!imageType) return res.status(400).json({ success: false, error: 'الصورة يجب أن تكون JPG أو PNG أو WebP صالحة.' });

    try {
        const blob = await putBlob(`store-products/${crypto.randomBytes(16).toString('hex')}.${imageType.extension}`, file.buffer, {
            access: 'public',
            contentType: imageType.mime,
            addRandomSuffix: true,
            token: process.env.BLOB_READ_WRITE_TOKEN
        });
        res.status(201).json({ success: true, url: blob.url });
    } catch (error) {
        storeAdminError(res, error, 'فشل رفع الصورة. تحقق من إعداد Vercel Blob ثم حاول مرة أخرى.');
    }
});

app.get('/api/store/admin/orders', requireStoreAdmin, async (req, res) => {
    try {
        const orders = await storeData.getOrders({ status: req.query.status || 'all' });
        res.json({ success: true, orders });
    } catch (error) {
        storeAdminError(res, error);
    }
});

app.patch('/api/store/admin/orders/:orderNumber', requireStoreAdmin, async (req, res) => {
    const allowedStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
    const status = req.body?.status;
    if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ success: false, error: 'حالة الطلب غير صالحة.' });
    }
    try {
        const updated = await storeData.updateOrderStatus(req.params.orderNumber, status);
        if (!updated) return res.status(404).json({ success: false, error: 'الطلب غير موجود.' });
        res.json({ success: true });
    } catch (error) {
        storeAdminError(res, error);
    }
});

// 1. صفحة المتجر الرئيسية
app.get('/store', async (req, res) => {
    const category = req.query.category || 'all';
    try {
        const products = storeData.isStoreDatabaseConfigured()
            ? await storeData.getProducts({ category })
            : (category === 'all' ? STORE_PRODUCTS : getStoreProducts(category));
        res.send(getStoreHtml(products, CATEGORY_LABELS, category));
    } catch (error) {
        console.error('❌ تعذر تحميل منتجات المتجر:', error.message);
        res.status(503).send('تعذر تحميل كتالوج المتجر. تحقق من إعداد قاعدة بيانات المتجر ثم حاول مرة أخرى.');
    }
});

app.get('/store/product/:id', async (req, res) => {
    try {
        const product = storeData.isStoreDatabaseConfigured()
            ? await storeData.getProductById(req.params.id)
            : getStoreProductById(req.params.id);
        if (!product) return res.status(404).send('هذا المنتج غير موجود أو غير متاح حالياً. <a href="/store">العودة إلى المتجر</a>');
        res.send(getStoreProductHtml(product, CATEGORY_LABELS[product.category]));
    } catch (error) {
        console.error('❌ تعذر تحميل صفحة المنتج:', error.message);
        res.status(503).send('تعذر تحميل بيانات المنتج. تحقق من اتصال قاعدة بيانات المتجر ثم حاول مرة أخرى.');
    }
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
app.get('/api/store/products', async (req, res) => {
    const { category } = req.query;
    try {
        const products = storeData.isStoreDatabaseConfigured()
            ? await storeData.getProducts({ category })
            : (category && category !== 'all' ? getStoreProducts(category) : STORE_PRODUCTS);
        res.json({ success: true, count: products.length, categories: CATEGORY_LABELS, products });
    } catch (error) {
        storeAdminError(res, error, 'تعذر تحميل المنتجات حالياً.');
    }
});

// 4. API تفاصيل منتج واحد
app.get('/api/store/products/:id', async (req, res) => {
    let product;
    try {
        product = storeData.isStoreDatabaseConfigured()
            ? await storeData.getProductById(req.params.id)
            : getStoreProductById(req.params.id);
    } catch (error) {
        return storeAdminError(res, error, 'تعذر تحميل المنتج حالياً.');
    }
    if (!product) {
        return res.status(404).json({ success: false, error: 'المنتج غير موجود' });
    }
    res.json({ success: true, product });
});

// 5. API تسجيل طلب جديد
app.post('/api/store/orders', async (req, res) => {
    const { customer_name, customer_phone, customer_address, notes, items } = req.body || {};
    let customerName = typeof customer_name === 'string' ? customer_name.trim() : '';
    let customerPhone = typeof customer_phone === 'string' ? customer_phone.replace(/\D/g, '') : '';
    const customerAddress = typeof customer_address === 'string' ? customer_address.trim() : '';
    const customerNotes = typeof notes === 'string' ? notes.trim() : '';
    let customerId = null;
    try {
        const customer = await getStoreCustomerSession(req);
        if (customer) {
            customerName = customerName || customer.name;
            customerPhone = customer.phone;
            customerId = customer.id;
        }
    } catch (error) {
        return storeAccountError(res, error);
    }

    if (!customerName || customerName.length > 120 || !/^(010|011|012|015)\d{8}$/.test(customerPhone) ||
        !customerAddress || customerAddress.length > 500 || customerNotes.length > 500 ||
        !Array.isArray(items) || items.length === 0 || items.length > 50) {
        return res.status(400).json({ success: false, error: 'يرجى استكمال كافة البيانات الأساسية للطلب والسلة' });
    }
    if (IS_VERCEL && !storeData.isStoreDatabaseConfigured()) {
        return res.status(503).json({ success: false, error: 'إعداد قاعدة بيانات الطلبات الدائمة غير مكتمل.' });
    }
    try {
        await ensureStoreCustomerStorage();
    } catch (error) {
        return storeAccountError(res, error);
    }

    const requestedItems = new Map();
    for (const item of items) {
        const productId = typeof item?.id === 'string' ? item.id : '';
        const quantity = Number(item?.qty ?? item?.quantity);
        let product;
        try {
            product = storeData.isStoreDatabaseConfigured()
                ? await storeData.getProductById(productId)
                : getStoreProductById(productId);
        } catch (error) {
            return storeAdminError(res, error, 'تعذر التحقق من المنتجات والأسعار.');
        }
        if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
            return res.status(400).json({ success: false, error: 'يوجد منتج أو كمية غير صالحة في السلة' });
        }

        const combinedQuantity = (requestedItems.get(productId) || 0) + quantity;
        if (combinedQuantity > 99) {
            return res.status(400).json({ success: false, error: 'الحد الأقصى للكمية من المنتج الواحد هو 99' });
        }
        requestedItems.set(productId, combinedQuantity);
    }

    const orderItems = [];
    try {
        for (const [productId, quantity] of requestedItems) {
            const product = storeData.isStoreDatabaseConfigured()
                ? await storeData.getProductById(productId)
                : getStoreProductById(productId);
            if (!product) {
                return res.status(400).json({ success: false, error: 'أحد المنتجات لم يعد متاحاً. حدّث السلة ثم حاول مرة أخرى.' });
            }
            orderItems.push({
                id: product.id,
                name: product.name,
                price: Number(product.price),
                unit: product.unit,
                quantity,
                lineTotal: Number(product.price) * quantity
            });
        }
    } catch (error) {
        return storeAdminError(res, error, 'تعذر التحقق من المنتجات والأسعار.');
    }
    const grandTotal = orderItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const itemsJson = JSON.stringify(orderItems);
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const orderNumber = `ZMR-${todayStr}-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;

    if (storeData.isStoreDatabaseConfigured()) {
        try {
            await storeData.createOrder({
                orderNumber,
                customerName,
                customerPhone,
                customerAddress,
                notes: customerNotes,
                items: orderItems,
                total: grandTotal,
                customerId
            });
        } catch (error) {
            return storeAdminError(res, error, 'فشل في حفظ الطلب بقاعدة البيانات الدائمة.');
        }
        console.log(`🛒 طلب جديد بالمتجر: [${orderNumber}] - القيمة: ${grandTotal} ج.م`);
        res.json({ success: true, orderNumber, total: grandTotal, message: 'تم تسجيل الطلب بنجاح' });
        return;
    }

    db.run(
        `INSERT INTO store_orders (order_number, customer_name, customer_phone, customer_address, notes, items, total, payment_method, status, customer_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
        [orderNumber, customerName, customerPhone, customerAddress, customerNotes, itemsJson, grandTotal, 'cash', customerId],
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
async function findStoreOrder(phoneInput, orderNumberInput, res) {
    const phone = String(phoneInput || '').replace(/\D/g, '');
    const orderNumber = typeof orderNumberInput === 'string' ? orderNumberInput.trim().toUpperCase() : '';
    if (!/^(010|011|012|015)\d{8}$/.test(phone) || !/^ZMR-\d{8}-[A-F0-9]{16}$/.test(orderNumber)) {
        return res.status(400).json({ success: false, error: 'أدخل رقم هاتف ورقم طلب صحيحين.' });
    }

    if (IS_VERCEL && !storeData.isStoreDatabaseConfigured()) {
        return res.status(503).json({ success: false, error: 'إعداد قاعدة بيانات الطلبات الدائمة غير مكتمل.' });
    }
    if (storeData.isStoreDatabaseConfigured()) {
        try {
            const order = await storeData.getOrderForTracking(phone, orderNumber);
            if (!order) return res.status(404).json({ success: false, error: 'لم نعثر على طلب مطابق للبيانات المدخلة.' });
            return res.json({ success: true, order });
        } catch (error) {
            return storeAdminError(res, error, 'تعذر تحميل حالة الطلب.');
        }
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
