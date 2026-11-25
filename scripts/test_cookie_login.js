/**
 * scripts/test_cookie_login.js
 * اختبار حقن كوكيز فيسبوك والتأكد من تسجيل الدخول التلقائي في الخلفية
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const COOKIES_PATH = path.join(__dirname, '..', 'assets', 'facebook_cookies.json');
const SESSION_DIR = path.join(__dirname, '..', 'facebook_browser_session');

async function testLogin() {
    console.log('🍪 جاري قراءة الكوكيز من:', COOKIES_PATH);
    const rawCookies = JSON.parse(fs.readFileSync(COOKIES_PATH, 'utf8'));

    const browser = await puppeteer.launch({
        executablePath: CHROME_PATH,
        userDataDir: SESSION_DIR,
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--disable-notifications'
        ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // تهيئة كوكيز فيسبوك بصيغة CDP
    const formattedCookies = rawCookies.map(c => {
        const item = {
            name: c.name,
            value: c.value,
            domain: c.domain || '.facebook.com',
            path: c.path || '/',
            httpOnly: !!c.httpOnly,
            secure: !!c.secure
        };
        if (c.sameSite === 'no_restriction') item.sameSite = 'None';
        else if (c.sameSite === 'lax') item.sameSite = 'Lax';
        else if (c.sameSite === 'strict') item.sameSite = 'Strict';
        if (c.expirationDate) item.expires = Math.floor(c.expirationDate);
        return item;
    });

    console.log(`💉 جاري حقن ${formattedCookies.length} كوكي في المتصفح...`);
    await page.setCookie(...formattedCookies);

    console.log('🌐 جاري فتح https://www.facebook.com في الخلفية...');
    await page.goto('https://www.facebook.com', { waitUntil: 'networkidle2', timeout: 45000 }).catch(e => console.log('Goto note:', e.message));

    // فحص الرابط والعناصر الحية
    const currentUrl = page.url();
    console.log('🔗 الرابط بعد الدخول:', currentUrl);

    const cookiesNow = await page.cookies();
    const hasCUser = cookiesNow.some(c => c.name === 'c_user');
    const title = await page.title();
    console.log('📑 عنوان الصفحة:', title);

    const isLoginPage = await page.evaluate(() => {
        const email = document.querySelector('input#email, input[name="email"]');
        return !!email;
    });

    console.log('------------------------------------------------------');
    if (hasCUser && !isLoginPage) {
        console.log('🎉🎉 نجااااح باهر! تم تسجيل الدخول في فيسبوك بنجاح تام في الخلفية!');
        console.log('الحساب معتمد ومستعد للنشر التلقائي فوراً!');
    } else {
        console.log('⚠️ حالة الدخول:', { hasCUser, isLoginPage, url: currentUrl });
    }
    console.log('------------------------------------------------------');

    await browser.close();
}

testLogin().catch(err => console.error('Error:', err));
