const db = require('./database');

// إعدادات الضوابط التشغيلية للمنظومة
const SYSTEM_CONFIG = {
    WORKING_HOURS: { START: 9, END: 18 }, // من 9 صباحاً إلى 6 مساءً
    REPLY_DELAYS: {
        IN_WORKING_HOURS: { MIN: 1, MAX: 5 },   // 1 إلى 5 دقائق أثناء العمل
        OUT_WORKING_HOURS: { MIN: 5, MAX: 10 }  // 5 إلى 10 دقائق خارج العمل
    },
    ALWAYS_ACTIVE_PLATFORMS: ['facebook', 'messenger', 'instagram']
};

// فحص ساعات العمل الرسمية
function isWorkingHours() {
    const currentHour = new Date().getHours();
    return currentHour >= SYSTEM_CONFIG.WORKING_HOURS.START && currentHour < SYSTEM_CONFIG.WORKING_HOURS.END;
}

// حساب الفاصل الزمني العشوائي للرد
function calculateReplyDelay() {
    const isWorking = isWorkingHours();
    const config = isWorking ? SYSTEM_CONFIG.REPLY_DELAYS.IN_WORKING_HOURS : SYSTEM_CONFIG.REPLY_DELAYS.OUT_WORKING_HOURS;
    const minutes = Math.floor(Math.random() * (config.MAX - config.MIN + 1)) + config.MIN;
    return minutes * 60 * 1000;
}

// فحص إمكانية الإرسال المباشر للحملات
function canSendOutbound(platform) {
    if (SYSTEM_CONFIG.ALWAYS_ACTIVE_PLATFORMS.includes(platform.toLowerCase())) {
        return true; // فيسبوك وماسنجر وإنستجرام تعمل 24/7
    }
    return isWorkingHours(); // باقي المنصات في ساعات العمل فقط
}

// معالجة الرسائل الواردة وتوجيهها للوكلاء
async function processIncomingMessage(platform, sector, clientName, clientPhone, messageText) {
    console.log(`📩 رسالة جديدة | المنصة: [${platform}] | القطاع: [${sector}] | العميل: ${clientName}`);

    const delay = calculateReplyDelay();
    console.log(`⏱️ المدير العام يوجه الرد خلال ${(delay / 60000).toFixed(1)} دقيقة...`);

    setTimeout(() => {
        // تسجيل التفاعل أو الطلب في قاعدة البيانات المحلية SQLite
        db.run(
            `INSERT INTO orders (client_name, client_phone, sector, platform, order_details, status) VALUES (?, ?, ?, ?, ?, ?)`,
            [clientName, clientPhone, sector, platform, messageText, 'Pending'],
            (err) => {
                if (err) {
                    console.error('❌ خطأ في حفظ الطلب بقاعدة البيانات:', err.message);
                } else {
                    console.log(`✅ تم حفظ الطلب/الاستفسار محلياً في قاعدة البيانات بنجاح.`);
                }
            }
        );
    }, delay);
}

module.exports = {
    isWorkingHours,
    canSendOutbound,
    processIncomingMessage
};