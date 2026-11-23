/**
 * scripts/facebook_browser_publisher.js
 * أداة أتمتة المتصفح للنشر الذكي والآمن على فيسبوك والمجموعات
 * شركة الزمردة كوزماتيكس
 * -------------------------------------------------------------
 * الاستخدام:
 * node scripts/facebook_browser_publisher.js --login         (فتح المتصفح لحفظ جلسة تسجيل الدخول)
 * node scripts/facebook_browser_publisher.js --status        (فحص حالة الجلسة هل مسجلة دخول أم لا)
 * node scripts/facebook_browser_publisher.js --publish-one   (نشر تجريبي لمنشور واحد في مجموعة واحدة)
 * node scripts/facebook_browser_publisher.js --publish-today (بدء جدول نشر اليوم مع فواصل مكافحة الحظر)
 */

const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SESSION_DIR = path.join(__dirname, '..', 'facebook_browser_session');
const SCHEDULE_FILE = path.join(__dirname, '..', 'facebook_posts_schedule.json');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// مقدمات وخواتم عشوائية لمكافحة الحظر وتغيير بصمة النص
const INTROS = [
    'تحياتنا الطيبة لجميع الأعضاء والزملاء الكرام،\n\n',
    'سلام الله عليكم جميعاً وأسعد الله أوقاتكم بكل خير،\n\n',
    'أهلاً بحضراتكم ومرحباً بكل الشركاء في هذا الجروب المحترم،\n\n',
    'يسعدنا التواصل ومشاركة هذا العرض المميز مع حضراتكم،\n\n',
    'لكل المهتمين بالجودة العالية وتوفير تكاليف التشغيل،\n\n'
];

const OUTROS = [
    '\n\nللاستفسار أو طلب الكتالوج، يسعدنا تواصلكم عبر الرسائل الخاصة.',
    '\n\nالتوريد متاح لكافة المحافظات بفواتير رسمية وعينات مجانية للمنشآت.',
    '\n\nتفضلوا بالتعليق بكلمة (تفاصيل) أو مراسلتنا لمعرفة كامل المميزات.',
    '\n\nيسعدنا الرد على جميع استفساراتكم وترتيب شحنات التجربة.',
    '\n\nشركة الزمردة كوزماتيكس — شريككم المعتمد للنظافة والانتعاش.'
];

class FacebookBrowserPublisher {
    constructor() {
        this.browser = null;
        this.page = null;
    }

    async launchBrowser(headless = false) {
        if (!fs.existsSync(SESSION_DIR)) {
            fs.mkdirSync(SESSION_DIR, { recursive: true });
        }

        console.log(`🌐 جاري تشغيل متصفح كروم المباشر (Session: facebook_browser_session)...`);
        this.browser = await puppeteer.launch({
            executablePath: CHROME_PATH,
            userDataDir: SESSION_DIR,
            headless: headless,
            defaultViewport: null,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--disable-notifications',
                '--start-maximized'
            ]
        });

        const pages = await this.browser.pages();
        this.page = pages.length > 0 ? pages[0] : await this.browser.newPage();
        
        // منع كشف أداة الأتمتة
        await this.page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        });

        return this.page;
    }

    async closeBrowser() {
        if (this.browser) {
            try {
                await this.browser.close();
            } catch (_) {}
            this.browser = null;
            this.page = null;
        }
    }

    /**
     * فحص هل الحساب مسجل دخول حالياً في فيسبوك
     */
    async checkLoginStatus() {
        await this.page.goto('https://www.facebook.com', { waitUntil: 'networkidle2', timeout: 45000 }).catch(() => {});
        await sleep(3000);

        const isLoginPage = await this.page.evaluate(() => {
            const emailInput = document.querySelector('input#email, input[name="email"]');
            const passInput = document.querySelector('input#pass, input[name="pass"]');
            return !!(emailInput && passInput);
        });

        const hasFeed = await this.page.evaluate(() => {
            const feed = document.querySelector('div[role="feed"], div[role="main"], div[aria-label="Facebook"]');
            const searchInput = document.querySelector('input[type="search"], input[aria-label*="بحث"], input[aria-label*="Search"]');
            return !!(feed || searchInput);
        });

        return {
            isLoggedIn: !isLoginPage && hasFeed,
            url: this.page.url()
        };
    }

    /**
     * جلسة تسجيل الدخول التفاعلية (تنتظر قيام المستخدم بتسجيل الدخول)
     */
    async waitForUserLogin(maxMinutes = 10) {
        console.log(`\n======================================================`);
        console.log(`🔑 نافذة المتصفح مفتوحة الآن أمامك على شاشة الكمبيوتر.`);
        console.log(`يرجى تسجيل الدخول لحساب فيسبوك المعتمد (زمرده أو ماميز).`);
        console.log(`سيتم حفظ الجلسة تلقائياً في النظام ولن تحتاج لتسجيل الدخول مجدداً.`);
        console.log(`======================================================\n`);

        const startTime = Date.now();
        const maxTimeMs = maxMinutes * 60 * 1000;

        while (Date.now() - startTime < maxTimeMs) {
            const status = await this.checkLoginStatus();
            if (status.isLoggedIn) {
                console.log(`\n🎉 تم اكتشاف تسجيل الدخول بنجاح! تم حفظ الجلسة بنجاح.`);
                return true;
            }
            console.log(`⏳ في انتظار إتمام تسجيل الدخول على المتصفح... (${Math.round((Date.now() - startTime)/1000)} ثانية)`);
            await sleep(5000);
        }

        console.log(`⚠️ انتهت مهلة الانتظار (${maxMinutes} دقائق) قبل إتمام الدخول.`);
        return false;
    }

    /**
     * نشر منشور داخل مجموعة فيسبوك
     * @param {string} groupUrl - رابط المجموعة
     * @param {string} postText - نص المنشور
     */
    async publishToGroup(groupUrl, postText) {
        try {
            console.log(`\n📡 جاري فتح المجموعة: ${groupUrl}`);
            await this.page.goto(groupUrl, { waitUntil: 'networkidle2', timeout: 45000 }).catch(() => {});
            await sleep(4000);

            // إضافة تنويع البصمة للنص (Anti-Ban Jitter)
            const randomIntro = INTROS[getRandomInt(0, INTROS.length - 1)];
            const randomOutro = OUTROS[getRandomInt(0, OUTROS.length - 1)];
            const fullText = `${randomIntro}${postText}${randomOutro}`;

            // البحث عن زر إنشاء منشور "اكتب شيئاً..."
            console.log(`🔍 جاري البحث عن مربع كتابة المنشور...`);
            const postBoxClicked = await this.page.evaluate(() => {
                // محاولات متعددة للعثور على زر البوست باللغتين العربية والإنجليزية
                const buttons = Array.from(document.querySelectorAll('div[role="button"], span, div'));
                for (const el of buttons) {
                    const text = (el.innerText || el.textContent || '').trim();
                    if (
                        text.includes('اكتب شيئاً') || 
                        text.includes('Write something') || 
                        text.includes('إنشاء منشور عام') || 
                        text.includes('Create a public post') ||
                        text.includes('ما الذي يدور في ذهنك') ||
                        text.includes("What's on your mind")
                    ) {
                        el.click();
                        return true;
                    }
                }
                return false;
            });

            if (!postBoxClicked) {
                // محاولة بالنقر المباشر على الحاوية
                const container = await this.page.$('div[role="region"] div[role="button"], div[role="main"] div[role="button"]');
                if (container) {
                    await container.click();
                } else {
                    throw new Error('تعذر العثور على زر "اكتب شيئاً" في المجموعة (قد تكون الصلاحيات مقيدة أو المجموعة مغلقة).');
                }
            }

            await sleep(3000);

            // انتظار ظهور نافذة الحوار (Modal Dialog)
            await this.page.waitForSelector('div[role="dialog"]', { timeout: 10000 });
            console.log(`📝 تم فتح نافذة كتابة المنشور. جاري إدخال النص المعتمد...`);

            // البحث عن المربع القابل للتحرير
            const textBox = await this.page.$('div[role="dialog"] div[role="textbox"], div[role="dialog"] div[contenteditable="true"]');
            if (!textBox) {
                throw new Error('تعذر العثور على حقل إدخال النص داخل نافذة النشر.');
            }

            await textBox.focus();
            await sleep(500);

            // إدخال النص عبر أمر الحافظة لضمان سرعة وموثوقية دعم الحروف العربية والرموز
            await this.page.evaluate((textToInsert) => {
                const el = document.querySelector('div[role="dialog"] div[role="textbox"], div[role="dialog"] div[contenteditable="true"]');
                if (el) {
                    el.focus();
                    document.execCommand('insertText', false, textToInsert);
                }
            }, fullText);

            await sleep(2000);

            // البحث عن زر "نشر" / "Post" داخل نافذة الحوار
            console.log(`🚀 جاري الضغط على زر (نشر)...`);
            const postSubmitted = await this.page.evaluate(() => {
                const dialog = document.querySelector('div[role="dialog"]');
                if (!dialog) return false;

                const submitButtons = Array.from(dialog.querySelectorAll('div[role="button"], button'));
                for (const btn of submitButtons) {
                    const aria = (btn.getAttribute('aria-label') || '').trim();
                    const txt = (btn.innerText || btn.textContent || '').trim();
                    if (aria === 'نشر' || aria === 'Post' || txt === 'نشر' || txt === 'Post') {
                        // التأكد من أن الزر غير معطل
                        if (btn.getAttribute('aria-disabled') !== 'true') {
                            btn.click();
                            return true;
                        }
                    }
                }
                return false;
            });

            if (!postSubmitted) {
                throw new Error('تعذر النقر على زر "نشر" (قد يكون معطلاً أو قيد التحميل).');
            }

            console.log(`⏳ في انتظار تأكيد فيسبوك وإغلاق نافذة النشر...`);
            await sleep(5000);

            return {
                success: true,
                publishedAt: new Date().toISOString(),
                groupUrl
            };
        } catch (err) {
            console.error(`❌ خطأ أثناء النشر في المجموعة (${groupUrl}):`, err.message);
            return {
                success: false,
                error: err.message,
                groupUrl
            };
        }
    }
}

// دالة التشغيل الرئيسية
async function main() {
    const args = process.argv.slice(2);
    const publisher = new FacebookBrowserPublisher();

    console.log(`\n======================================================`);
    console.log(`🤖 محرك أتمتة متصفح فيسبوك - شركة الزمردة كوزماتيكس 🤖`);
    console.log(`======================================================\n`);

    if (args.includes('--login')) {
        await publisher.launchBrowser(false);
        await publisher.page.goto('https://www.facebook.com');
        const loggedIn = await publisher.waitForUserLogin(10);
        if (loggedIn) {
            console.log(`✅ انتهى إعداد الجلسة بنجاح.`);
        }
        await publisher.closeBrowser();
        return;
    }

    if (args.includes('--status')) {
        await publisher.launchBrowser(true); // فحص سريع خلفي
        const status = await publisher.checkLoginStatus();
        console.log(`📊 حالة جلسة فيسبوك الحالية: ${status.isLoggedIn ? '✅ مسجل دخول بنجاح ومستعد للنشر' : '❌ غير مسجل دخول (يرجى تشغيل --login)'}`);
        console.log(`🔗 الرابط الحالي: ${status.url}`);
        await publisher.closeBrowser();
        return;
    }

    if (args.includes('--publish-one')) {
        await publisher.launchBrowser(false);
        const status = await publisher.checkLoginStatus();
        if (!status.isLoggedIn) {
            console.log(`⚠️ يجب تسجيل الدخول أولاً! جاري فتح شاشة تسجيل الدخول...`);
            const ok = await publisher.waitForUserLogin(5);
            if (!ok) {
                await publisher.closeBrowser();
                return;
            }
        }

        // قراءة أول منشور مجدول لليوم
        if (fs.existsSync(SCHEDULE_FILE)) {
            const schedule = JSON.parse(fs.readFileSync(SCHEDULE_FILE, 'utf8'));
            const today = new Date().toISOString().slice(0, 10);
            const todayPost = schedule.find(p => p.date === today) || schedule[0];

            if (todayPost) {
                const targetGroup = todayPost.targetDestinations.find(d => d.type === 'user_joined_group' && d.url);
                if (targetGroup) {
                    console.log(`🎯 الهدف التجريبي: مجموعة [${targetGroup.name}] (${targetGroup.url})`);
                    const res = await publisher.publishToGroup(targetGroup.url, todayPost.textEgyptian);
                    if (res.success) {
                        targetGroup.status = 'published';
                        targetGroup.publishedAt = res.publishedAt;
                        fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(schedule, null, 2), 'utf8');
                        console.log(`\n🎉 تم النشر التجريبي بنجاح وتحديث الجدول!`);
                    }
                } else {
                    console.log(`⚠️ لم يتم العثور على مجموعة مجدولة في المنشور.`);
                }
            }
        }
        await publisher.closeBrowser();
        return;
    }

    if (args.includes('--publish-today')) {
        await publisher.launchBrowser(false);
        const status = await publisher.checkLoginStatus();
        if (!status.isLoggedIn) {
            console.log(`⚠️ يجب تسجيل الدخول أولاً! جاري فتح شاشة تسجيل الدخول...`);
            const ok = await publisher.waitForUserLogin(5);
            if (!ok) {
                await publisher.closeBrowser();
                return;
            }
        }

        if (fs.existsSync(SCHEDULE_FILE)) {
            const schedule = JSON.parse(fs.readFileSync(SCHEDULE_FILE, 'utf8'));
            const today = new Date().toISOString().slice(0, 10);
            const todayPosts = schedule.filter(p => p.date === today);

            console.log(`📋 إجمالي المنشورات المجدولة لليوم (${today}): ${todayPosts.length} منشور`);

            for (const post of todayPosts) {
                const pendingGroups = post.targetDestinations.filter(d => d.type === 'user_joined_group' && d.status === 'scheduled' && d.url);
                console.log(`🏢 القناة: [${post.channelName}] | المجموعات المتبقية: ${pendingGroups.length}`);

                // تطبيق حد الأمان اليومي للمجموعات (5 مجموعات كحد أقصى لكل حساب في الأسبوع الأول)
                const safeBatch = pendingGroups.slice(0, 5);

                for (let i = 0; i < safeBatch.length; i++) {
                    const group = safeBatch[i];
                    console.log(`\n------------------------------------------------------`);
                    console.log(`🚀 [${i + 1}/${safeBatch.length}] نشر في: ${group.name}`);
                    const res = await publisher.publishToGroup(group.url, post.textEgyptian);

                    if (res.success) {
                        group.status = 'published';
                        group.publishedAt = res.publishedAt;
                        fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(schedule, null, 2), 'utf8');
                    }

                    if (i < safeBatch.length - 1) {
                        const waitMinutes = getRandomInt(15, 25);
                        console.log(`🛡️ [فاصل أمان مكافحة الحظر]: استراحة ${waitMinutes} دقيقة قبل المجموعة التالية...`);
                        await sleep(waitMinutes * 60 * 1000);
                    }
                }
            }
            console.log(`\n🎉 اكتمل تنفيذ دفعات نشر اليوم بنجاح!`);
        }
        await publisher.closeBrowser();
        return;
    }

    console.log(`يرجى تحديد أمر للتشغيل:`);
    console.log(`  node scripts/facebook_browser_publisher.js --login         (لتسجيل الدخول وحفظ الجلسة)`);
    console.log(`  node scripts/facebook_browser_publisher.js --status        (لفحص حالة الجلسة)`);
    console.log(`  node scripts/facebook_browser_publisher.js --publish-one   (لنشر بوست تجريبي في أول جروب)`);
    console.log(`  node scripts/facebook_browser_publisher.js --publish-today (لتشغيل جدول اليوم بالكامل)`);
}

module.exports = FacebookBrowserPublisher;

if (require.main === module) {
    main().catch(err => console.error('Execution error:', err));
}
