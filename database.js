const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// مسار قاعدة البيانات المحلية (مجانية وآمنة 100% على جهازك)
const dbPath = path.join(__dirname, 'zomoroda_system.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ خطأ في الاتصال بقاعدة البيانات:', err.message);
    } else {
        console.log('✅ تم الاتصال بقاعدة البيانات المركزية (SQLite) بنجاح.');
    }
});

// تهيئة الجداول الأساسية للنظام
db.serialize(() => {
    // 1. جدول المندوبات وربات البيوت (شجرة التسويق بالعمولة)
    db.run(`CREATE TABLE IF NOT EXISTS affiliates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone TEXT UNIQUE,
        name TEXT,
        role TEXT DEFAULT 'Representative',
        supervisor_phone TEXT,
        sales_count INTEGER DEFAULT 0,
        total_commissions REAL DEFAULT 0.0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 2. جدول الطلبيات وعمليات البيع
    db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_name TEXT,
        client_phone TEXT,
        sector TEXT,
        platform TEXT,
        order_details TEXT,
        total_amount REAL,
        status TEXT DEFAULT 'Pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 3. جدول تتبع الحملات والإرسال (لمنع التكرار وحظر الإيميلات خلال 30 يوماً)
    db.run(`CREATE TABLE IF NOT EXISTS sent_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        target_identifier TEXT UNIQUE,
        platform TEXT,
        sector TEXT,
        sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    console.log('📦 تم تجهيز وبناء جميع جداول المنظومة بنجاح.');
});

module.exports = db;