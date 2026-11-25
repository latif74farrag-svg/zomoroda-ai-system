/**
 * scripts/clone_facebook_session.js
 * سحب جلسة فيسبوك من متصفح كروم اليومي وحفظها لمحرك الأتمتة
 */

const fs = require('fs');
const path = require('path');

const srcUserDir = 'C:\\Users\\hp\\AppData\\Local\\Google\\Chrome\\User Data';
const targetDir = path.join(__dirname, '..', 'facebook_browser_session');

const filesToCopy = [
    { src: path.join(srcUserDir, 'Local State'), dst: path.join(targetDir, 'Local State') },
    { src: path.join(srcUserDir, 'Default', 'Network', 'Cookies'), dst: path.join(targetDir, 'Default', 'Network', 'Cookies') },
    { src: path.join(srcUserDir, 'Default', 'Preferences'), dst: path.join(targetDir, 'Default', 'Preferences') },
    { src: path.join(srcUserDir, 'Default', 'Secure Preferences'), dst: path.join(targetDir, 'Default', 'Secure Preferences') }
];

async function tryCopy() {
    let success = true;
    for (const f of filesToCopy) {
        if (fs.existsSync(f.src)) {
            const dir = path.dirname(f.dst);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            try {
                fs.copyFileSync(f.src, f.dst);
                console.log(`✅ تم نسخ: ${path.basename(f.src)}`);
            } catch (err) {
                console.error(`❌ تعذر نسخ ${path.basename(f.src)} (قد يكون قيد الاستخدام):`, err.message);
                success = false;
            }
        }
    }
    return success;
}

async function main() {
    console.log('🔄 محاولة سحب الجلسة من متصفح كروم...');
    const ok = await tryCopy();
    if (ok) {
        console.log('\n🎉 تم نسخ كامل ملفات الجلسة والكوكيز بنجاح إلى facebook_browser_session!');
    } else {
        console.log('\n⚠️ ملف الكوكيز مقفول لأن كروم يعمل حالياً. يرجى إغلاق كروم لمدة 5 ثوانٍ فقط.');
    }
}

if (require.main === module) {
    main();
}

module.exports = { tryCopy };
