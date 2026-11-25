/**
 * scripts/watch_and_clone.js
 * يراقب إغلاق كروم لثانية واحدة، وينسخ الجلسة تلقائياً فور إغلاقه
 */

const { execSync } = require('child_process');
const { tryCopy } = require('./clone_facebook_session');

console.log('👀 المراقب يعمل الآن في الخلفية...');
console.log('يرجى إغلاق نافذة Google Chrome لمدة 5 ثوانٍ فقط، وسيقوم النظام بسحب الجلسة تلقائياً فوراً!');

let attempts = 0;
const interval = setInterval(async () => {
    attempts++;
    let isRunning = false;
    try {
        const out = execSync('tasklist /FI "IMAGENAME eq chrome.exe" /NH', { encoding: 'utf8' });
        if (out.toLowerCase().includes('chrome.exe')) {
            isRunning = true;
        }
    } catch (_) {}

    if (!isRunning) {
        console.log('\n⚡ تم رصد إغلاق متصفح كروم! جاري نسخ الجلسة والكوكيز الآن...');
        const ok = await tryCopy();
        if (ok) {
            console.log('\n🎉🎉 مبروك! تم سحب جلسة فيسبوك بنجاح تام وحفظها في النظام.');
            console.log('يمكنك الآن إعادة فتح متصفح Chrome واستخدامه بشكل طبيعي تماماً!');
            clearInterval(interval);
            process.exit(0);
        }
    } else {
        if (attempts % 5 === 0) {
            console.log(`⏳ في انتظار إغلاق كروم... (المتصفح مفتوح حالياً)`);
        }
    }

    if (attempts >= 120) { // دقيقتين مهلة
        console.log('⚠️ انتهت مهلة الانتظار (دقيقتان).');
        clearInterval(interval);
        process.exit(1);
    }
}, 1000);
