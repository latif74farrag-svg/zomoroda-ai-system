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

// القوالب الأربعة المتنوعة للنشر والتدوير لمجموعات الماميز والعمل من المنزل
const MOMS_ROTATING_COPIES = [
    {
        id: 'moms_copy_1_affiliate',
        angle: 'العمل من المنزل والعمولات الفورية للماميز',
        text: `ليه تدفعي أكتر لما تقدري توفري في استهلاكك الشهري وتعملي لنفسك دخل ثابت من البيت؟ 💡\nمع مناديل مبللة رونزا ومعطرات الجو الفرنسية من شركة الزمردة كوزماتيكس، بنقدملك أعلى جودة تصنيع بتكلفة اقتصادية وفرصة حقيقية للعمل بالعمولة.\nعمولات فورية تصاعدية مع شحن مباشر لعملائك لباب البيت وبدون أي شروط معقدة.\nسيبي تعليق بكلمة (تفاصيل) أو ابعتيلنا رسالة خاصة وهنشرحلك إزاي تبدأي مشروعك النهارده! 👇`
    },
    {
        id: 'moms_copy_2_ronza_quality',
        angle: 'جودة مناديل رونزا وتوفير مصاريف البيت',
        text: `أكبر مشكلة في المناديل المبللة العادية إنها بتنشف بسرعة وبتسيب وبر وخامتها خفيفة! ❌\nفي شركة الزمردة كوزماتيكس صنعنا مناديل "رونزا" بطبقات سميكة فائقة الامتصاص، خالية تماماً من الكحول ومناسبة لبشرة الأطفال والكبار.\nتوفير حقيقي في الاستهلاك العائلي مع عروض خاصة للتوصيل المباشر من المصنع.\nاكتبي (رونزا) في التعليقات أو راسلينا للحصول على عروض التوفير وشحن باب البيت! ✨`
    },
    {
        id: 'moms_copy_3_fresheners',
        angle: 'معطرات الجو والأرضيات الفرنسية للمنزل (13 عطر ثابت)',
        text: `انتعاش وفخامة تدوم بالساعات في بيتك! 🌸\nمعطرات الجو والأرضيات المركزة من شركة الزمردة كوزماتيكس بـ 13 عطر فرنسي فاخر (لافندر، توت بري، ياسمين، عود ملكي...). ثبات عالي خالي من الكيماويات الضارة، آمنة للأطفال والبيوت.\nلو بتدوري على ريحة ثابتة تفرش في البيت وتوفر في ميزانيتك، راسلينا فوراً لمعرفة الأسعار المباشرة والعروض الحالية. 🌿`
    },
    {
        id: 'moms_copy_4_towels',
        angle: 'فوط التنشيف وفوط المطبخ القماش رول لتوفير المناديل الورقية',
        text: `وداعاً للمناديل الورقية اللي بتدوب وبتخلص في يومين! 💡\nفوط التنشيف الفردية الصحية وفوط المطبخ القماش القابلة للغسيل وإعادة الاستخدام من مصنع الزمردة كوزماتيكس.\nامتصاص جبار ونعومة فائقة توفر نص ميزانية المناديل الشهرية لبيتك.\nابعتيلنا كلمة (عروض) في رسالة خاصة ويوصلك الكتالوج والأسعار لحد عندك! 🎀`
    }
];

// القوالب الأربعة المتنوعة للنشر والتدوير لمجموعات التوريدات والشركات B2B
const B2B_ROTATING_COPIES = [
    {
        id: 'b2b_copy_1_private_label',
        angle: 'طباعة البراند الخاص Private Label للمنشآت والمطاعم',
        text: `لكل السادة مسؤولي المشتريات ومديري التشغيل وأصحاب المطاعم والفنادق،\nانطباع العميل بيبدأ من أدق تفاصيل الضيافة! 🏨☕\nشركة الزمردة كوزماتيكس بتقدملكم خدمة Private Label المتكاملة:\n• طباعة لوجو منشأتكم على المناديل المبللة السنجل بأعلى دقة طباعة (حد أدنى 10,000 منديل).\n• خامات معقمة ومرطبة برائحة فندقية فاخرة.\n• فواتير ضريبية معتمدة وأسعار تعاقدية من المصنع مباشرة بدون وسطاء.\nتفضلوا بمراسلتنا لطلب عينات المعاينة المجانية والأسعار الخاصة. ✨`
    },
    {
        id: 'b2b_copy_2_commercial_fresheners',
        angle: 'المعطرات الفندقية والمركزات للمنشآت والكافيهات',
        text: `الرائحة المميزة هي الهوية البصرية الحقيقية لمنشأتك! 🌸\nتوريدات الفنادق والشركات والكافيهات من معطرات الجو والأرضيات عالية التركيز (13 عطر فرنسي فندقي ثابت).\n• ثبات يدوم طويلاً يقلل معدل الاستهلاك بنسبة 40%.\n• عبوات اقتصادية وأسعار جملة خاصة للتعاقدات الدورية.\n• شحن مباشر لكافة المحافظات بفاتورة إلكترونية معتمدة.\nتواصلوا معنا عبر الرسائل لمعرفة عروض التوريد الحالي. 💼`
    },
    {
        id: 'b2b_copy_3_ronza_wholesale',
        angle: 'مناديل رونزا المبللة أسعار جملة للمطاعم والكافيهات',
        text: `عروض التوريد المباشر لمناديل مبللة "رونزا" للمطاعم والكافيهات والشركات 📦\nطبقات ناعمة سميكة، تغليف محكم يحافظ على الرطوبة، وأعلى معايير الجودة المصرية المعتمدة.\nأسعار تعاقدية خاصة بالكميات، تسليم فوري، ودعم فني وخدمة عملاء على مدار الساعة.\nتفضلوا بالتواصل لطلب الكتالوج الرسمي وسعر كرتونة الجملة. 🤝`
    },
    {
        id: 'b2b_copy_4_towels_supplies',
        angle: 'رولات تنشيف وسوائل النظافة للمنشآت والشركات',
        text: `حلول التوريد الشاملة لنظافة وضيافة المنشآت من شركة الزمردة كوزماتيكس 🏢\n• رولات تنشيف عالية الامتصاص مخصصة للكافيهات والمطابخ التجارية.\n• فوط صحية للاستخدام الفردي للصالونات والمراكز الرياضية والفنادق.\n• جودة موحدة، توريد منتظم، وعروض أسعار رسمية فورية.\nراسلونا الآن للحصول على كشف الأسعار التعاقدية وعينات الاختبار. ✨`
    }
];

function getRotatingCopiesForChannel(channelId) {
    if (channelId === '61596440741975') {
        return MOMS_ROTATING_COPIES;
    }
    return B2B_ROTATING_COPIES;
}

const INTROS = [
    'بسم الله الرحمن الرحيم،\n\n',
    'السلام عليكم ورحمة الله وبركاته،\n\n',
    'تحياتنا لحضراتكم جميعاً،\n\n',
    'أسعد الله أوقاتكم بكل خير،\n\n',
    ''
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
        this.clickedContinueOnce = false;
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
            } catch (_) { }
            this.browser = null;
            this.page = null;
        }
    }

    /**
     * فحص هل الحساب مسجل دخول حالياً في فيسبوك
     */
    async checkLoginStatus(skipGoto = false) {
        if (!skipGoto) {
            await this.page.goto('https://www.facebook.com', { waitUntil: 'networkidle2', timeout: 45000 }).catch(() => { });
            await sleep(3000);
        }

        const cookies = await this.page.cookies();
        const hasCUser = cookies.some(c => c.name === 'c_user');

        const pageState = await this.page.evaluate(() => {
            const emailInput = document.querySelector('input#email, input[name="email"]');
            const passInput = document.querySelector('input[type="password"]');
            const isLoginPage = !!(emailInput && passInput);
            const isPasswordPrompt = !!passInput;

            const feed = document.querySelector('div[role="feed"], div[role="main"], [aria-label*="إنشاء منشور"], [aria-label*="Create a post"]');
            const searchInput = document.querySelector('input[type="search"], input[aria-label*="بحث"], input[aria-label*="Search"]');
            const hasFeed = !!(feed || searchInput);

            return { isLoginPage, isPasswordPrompt, hasFeed };
        });

        // إذا لم نكن في الفيد وظهرت شاشة "متابعة" للملف الشخصي، ننقر عليها مرة واحدة
        if (!pageState.hasFeed && !pageState.isPasswordPrompt && !this.clickedContinueOnce) {
            const clicked = await this.page.evaluate(() => {
                const btns = Array.from(document.querySelectorAll('button, div[role="button"], a[role="button"]'));
                for (const b of btns) {
                    const txt = (b.innerText || b.textContent || '').trim();
                    if (txt === 'متابعة' || txt.includes('Continue as')) {
                        b.click();
                        return true;
                    }
                }
                return false;
            });
            if (clicked) {
                this.clickedContinueOnce = true;
                console.log('🔄 تم النقر على زر "متابعة" للملف الشخصي...');
                await sleep(3000);
            }
        }

        const isLoggedIn = pageState.hasFeed && !pageState.isLoginPage && !pageState.isPasswordPrompt;

        return {
            isLoggedIn,
            hasCUser,
            ...pageState,
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
            const status = await this.checkLoginStatus(true);
            if (status.isLoggedIn) {
                console.log(`\n🎉 تم اكتشاف تسجيل الدخول بنجاح! تم حفظ الجلسة بنجاح.`);
                return true;
            }
            console.log(`⏳ في انتظار إتمام تسجيل الدخول على المتصفح... (${Math.round((Date.now() - startTime) / 1000)} ثانية)`);
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
            await this.page.goto(groupUrl, { waitUntil: 'networkidle2', timeout: 45000 }).catch(() => { });
            await sleep(4000);

            // إضافة تنويع البصمة للنص (Anti-Ban Jitter)
            const randomIntro = INTROS[getRandomInt(0, INTROS.length - 1)];
            const randomOutro = OUTROS[getRandomInt(0, OUTROS.length - 1)];
            const fullText = `${randomIntro}${postText}${randomOutro}`;

            // البحث عن زر إنشاء منشور "اكتب شيئاً..." داخل المنطقة الرئيسية للمجموعة فقط
            console.log(`🔍 جاري البحث عن مربع كتابة المنشور...`);
            const postBoxClicked = await this.page.evaluate(() => {
                const stripTashkeel = str => str.replace(/[\u064B-\u065F\u0670]/g, '');
                const main = document.querySelector('div[role="main"]') || document.body;
                const buttons = Array.from(main.querySelectorAll('div[role="button"], span'));
                for (const el of buttons) {
                    const rawText = (el.innerText || el.textContent || '').trim();
                    const text = stripTashkeel(rawText);
                    if (text.length > 0 && text.length < 80 && (
                        text.includes('اكتب شيئا') ||
                        text.includes('Write something') ||
                        text.includes('انشاء منشور') ||
                        text.includes('إنشاء منشور') ||
                        text.includes('Create a public post') ||
                        text.includes('بم تفكر') ||
                        text.includes('ما الذي يدور في ذهنك') ||
                        text.includes("What's on your mind")
                    )) {
                        el.click();
                        return true;
                    }
                }
                return false;
            });

            if (!postBoxClicked) {
                throw new Error('تعذر العثور على زر "اكتب شيئاً" في المجموعة (قد تكون غير مشترك أو المجموعة مغلقة للنشر).');
            }

            await sleep(3000);

            // انتظار ظهور نافذة الحوار الخاصة بكتابة المنشور (التي تحتوي على مربع نص)
            await this.page.waitForFunction(() => {
                const dialogs = Array.from(document.querySelectorAll('div[role="dialog"]'));
                return dialogs.some(d => d.querySelector('[contenteditable="true"], [role="textbox"]'));
            }, { timeout: 10000 });
            console.log(`📝 تم فتح نافذة كتابة المنشور. جاري إدخال النص المعتمد...`);

            // البحث عن المربع القابل للتحرير داخل نافذة النشر نفسها
            await sleep(1500);
            const textBoxFound = await this.page.evaluate(() => {
                const dialogs = Array.from(document.querySelectorAll('div[role="dialog"]'));
                const dialog = dialogs.find(d => d.querySelector('[contenteditable="true"], [role="textbox"]')) || document.body;
                const el = dialog.querySelector('[contenteditable="true"], [role="textbox"], div[data-lexical-editor="true"], [aria-multiline="true"]');
                if (el) {
                    el.focus();
                    return true;
                }
                return false;
            });

            if (!textBoxFound) {
                // إذا لم يعثر عليه داخل dialog، نبحث في كامل الصفحة
                const globalBox = await this.page.$('[contenteditable="true"], [role="textbox"]');
                if (globalBox) {
                    await globalBox.focus();
                } else {
                    throw new Error('تعذر العثور على حقل إدخال النص داخل نافذة النشر.');
                }
            }
            await sleep(500);

            // إدخال النص عبر العنصر النشط مع دعم كامل للعربية وتنبيه React / Lexical
            await this.page.evaluate((textToInsert) => {
                const target = document.activeElement || document.querySelector('[contenteditable="true"], [role="textbox"]');
                if (target) {
                    target.focus();
                    document.execCommand('insertText', false, textToInsert);
                    target.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: textToInsert }));
                    target.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }, fullText);

            // محاكاة ضغطة مفتاح لتفعيل زر النشر في خوارزميات فيسبوك الحديثة
            await sleep(1000);
            await this.page.keyboard.type(' ');
            await sleep(300);
            await this.page.keyboard.press('Backspace');
            await sleep(2000);

            // البحث عن زر "نشر" / "Post" / "إرسال للمسؤولين" داخل نافذة الحوار
            console.log(`🚀 جاري الضغط على زر (نشر)...`);
            const postSubmitResult = await this.page.evaluate(() => {
                const dialogs = Array.from(document.querySelectorAll('div[role="dialog"]'));
                const dialog = dialogs.find(d => d.querySelector('[contenteditable="true"], [role="textbox"]')) || document.body;
                const buttons = Array.from(dialog.querySelectorAll('div[role="button"], button, span[role="button"]'));

                const debugButtons = buttons.map(b => ({
                    aria: (b.getAttribute('aria-label') || '').trim(),
                    txt: (b.innerText || b.textContent || '').trim().slice(0, 30),
                    disabled: b.getAttribute('aria-disabled') || b.getAttribute('disabled')
                })).filter(b => b.aria || b.txt);

                for (const btn of buttons) {
                    const aria = (btn.getAttribute('aria-label') || '').trim();
                    const txt = (btn.innerText || btn.textContent || '').trim();

                    const matchesAction =
                        aria.includes('نشر') || aria.toLowerCase().includes('post') ||
                        aria.includes('إرسال') || aria.toLowerCase().includes('submit') ||
                        txt === 'نشر' || txt.toLowerCase() === 'post' ||
                        txt.includes('إرسال') || txt.toLowerCase().includes('submit');

                    if (matchesAction) {
                        btn.click();
                        return { clicked: true, target: aria || txt };
                    }
                }
                return { clicked: false, buttons: debugButtons.slice(0, 10) };
            });

            if (!postSubmitResult.clicked) {
                console.log("🔍 الأزرار المتاحة في النافذة:", JSON.stringify(postSubmitResult.buttons));
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
const platform = args.includes('--whatsapp') ? 'whatsapp' : 'facebook';
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
            const ok = await publisher.waitForUserLogin(10);
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
            const ok = await publisher.waitForUserLogin(10);
            if (!ok) {
                await publisher.closeBrowser();
                return;
            }
        }

        if (fs.existsSync(SCHEDULE_FILE)) {
            const schedule = JSON.parse(fs.readFileSync(SCHEDULE_FILE, 'utf8'));
            const today = new Date().toISOString().slice(0, 10);
            let todayPosts = schedule.filter(p => p.date === today);

            // إمكانية تصفية القناة المطلوبة (--channel moms أو --channel zomoroda)
            if (args.includes('--channel')) {
                const chIndex = args.indexOf('--channel');
                const chArg = (args[chIndex + 1] || '').toLowerCase();
                if (chArg.includes('mom')) {
                    todayPosts = todayPosts.filter(p => p.channelId === '61596440741975');
                } else if (chArg.includes('zom')) {
                    todayPosts = todayPosts.filter(p => p.channelId === '100090392977665');
                }
            }

            console.log(`📋 إجمالي المنشورات المجدولة لليوم (${today}): ${todayPosts.length} منشور`);

            let totalPublishedThisSession = 0;
            const MAX_SESSION_BATCH = 15; // حد أقصى 15 مجموعة في الجلسة الواحدة لمنع الحظر

            for (const post of todayPosts) {
                if (totalPublishedThisSession >= MAX_SESSION_BATCH) break;

                const pendingGroups = post.targetDestinations.filter(d => d.type === 'user_joined_group' && d.status === 'scheduled' && d.url);
                console.log(`🏢 القناة: [${post.channelName}] | المجموعات المتبقية: ${pendingGroups.length}`);

                const remainingLimit = MAX_SESSION_BATCH - totalPublishedThisSession;
                const batchTarget = pendingGroups.slice(0, remainingLimit);
                if (batchTarget.length === 0) continue;

                console.log(`🚀 جاري بدء النشر الآلي على ${batchTarget.length} مجموعة مع تدوير 4 صيغ مختلفة...`);
                const channelCopies = getRotatingCopiesForChannel(post.channelId);

                for (let i = 0; i < batchTarget.length; i++) {
                    const group = batchTarget[i];
                    const selectedCopy = channelCopies[i % channelCopies.length];
                    console.log(`\n------------------------------------------------------`);
                    console.log(`📌 [${totalPublishedThisSession + 1}/${MAX_SESSION_BATCH}] المجموعة: ${group.name}`);
                    console.log(`📝 زاوية الإعلان المختارة: [${selectedCopy.angle}]`);
                    const res = await publisher.publishToGroup(group.url, selectedCopy.text);

                    if (res.success) {
                        group.status = 'published';
                        group.publishedAt = res.publishedAt;
                        group.copyUsed = selectedCopy.id;
                        fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(schedule, null, 2), 'utf8');
                        totalPublishedThisSession++;
                    }

                    if (i < batchTarget.length - 1 && totalPublishedThisSession < MAX_SESSION_BATCH) {
                        const waitSeconds = getRandomInt(90, 180); // 1.5 إلى 3 دقائق بين المجموعات لحماية الحساب
                        console.log(`⏱️ فاصل أمان متغيّر: ${waitSeconds} ثانية (~${Math.round(waitSeconds / 60)} دقيقة) قبل المجموعة التالية...`);
                        await sleep(waitSeconds * 1000);
                    }
                }
            }
            console.log(`\n🎉 اكتمل تنفيذ دفعة نشر اليوم بنجاح (${totalPublishedThisSession} مجموعة)!`);
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
