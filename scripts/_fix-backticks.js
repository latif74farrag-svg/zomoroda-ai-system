/**
 * يصلح الـ template literal المتداخلة في server.js
 * التي أضافها inject-maps-scraper
 */
const fs   = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, '..', 'server.js');
let content = fs.readFileSync(serverPath, 'utf8');

// استبدال backtick strings داخل الـ HTML function بـ string concatenation
// المشكلة: النص الجاد في getMapsScraperHtml يستخدم backtick وبداخله JS يستخدم backtick أيضاً

// إصلاح السطر المحدد الذي فيه مشكلة
const fixes = [
    // bar.textContent = `⏳ يبحث عن [${sector}] في [${location}]…`;
    [
        "    bar.textContent = `⏳ يبحث عن [${sector}] في [${location}]…`;",
        "    bar.textContent = '⏳ يبحث عن [' + sector + '] في [' + location + ']…';"
    ],
    // bar.textContent = `✅ انتهى! ${data.total} نتيجة، ${data.saved} جديد محفوظ.`;
    [
        "        bar.textContent = `✅ انتهى! ${data.total} نتيجة، ${data.saved} جديد محفوظ.`;",
        "        bar.textContent = '✅ انتهى! ' + data.total + ' نتيجة، ' + data.saved + ' جديد محفوظ.';"
    ],
    // '<p style="font-size:12px;...إجمالي: ${leads.length} عميل</p>'
    [
        "<p style=\"font-size:12px;color:#9ca3af;text-align:center;padding:8px\">إجمالي: ${leads.length} عميل</p>",
        "<p style=\\"font-size:12px;color:#9ca3af;text-align:center;padding:8px\\">إجمالي: ' + leads.length + ' عميل</p>"
    ],
];

let changed = 0;
fixes.forEach(([from, to]) => {
    if (content.includes(from)) {
        content = content.replace(from, to);
        changed++;
        console.log('✅ Fixed:', from.slice(0, 60));
    } else {
        console.log('⚠️ Not found:', from.slice(0, 60));
    }
});

fs.writeFileSync(serverPath, content, 'utf8');
console.log(`\nتم إصلاح ${changed} سطر.`);

