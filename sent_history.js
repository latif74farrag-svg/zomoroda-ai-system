const fs = require('fs');
const path = require('path');

// مسار ملف سجل الإرسال الدائم لمنع التكرار
const HISTORY_FILE = path.join(__dirname, 'sent_history.json');
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// قراءة السجل
function getSentHistory() {
    try {
        if (fs.existsSync(HISTORY_FILE)) {
            const data = fs.readFileSync(HISTORY_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('خطأ في قراءة سجل الإرسال:', error.message);
    }
    return {};
}

// حفظ السجل
function saveSentHistory(history) {
    try {
        fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8');
    } catch (error) {
        console.error('خطأ في حفظ سجل الإرسال:', error.message);
    }
}

// تسجيل جهة تم الإرسال لها
function markAsSent(identifier) {
    const history = getSentHistory();
    if (Array.isArray(history)) {
        // تحويل السجل القديم إلى سجل كائني يحمل التاريخ بدقة
        const converted = {};
        for (const item of history) {
            converted[item] = Date.now();
        }
        converted[identifier] = Date.now();
        saveSentHistory(converted);
    } else {
        history[identifier] = Date.now();
        saveSentHistory(history);
    }
}

// فحص هل تم التواصل مسبقاً خلال الـ 30 يوماً
function hasBeenContacted(identifier) {
    const history = getSentHistory();
    if (Array.isArray(history)) {
        return history.includes(identifier);
    }
    const lastSent = history[identifier];
    if (!lastSent) return false;
    return (Date.now() - lastSent) < THIRTY_DAYS_MS;
}

module.exports = {
    HISTORY_FILE,
    getSentHistory,
    saveSentHistory,
    markAsSent,
    hasBeenContacted
};
