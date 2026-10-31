// import-whacka-products.js - استيراد منتجات Whacka إلى قاعدة بيانات SQLite
const path = require('path');
const fs = require('fs');

const productsPath = path.join(__dirname, 'whacka_products.json');
const products = JSON.parse(fs.readFileSync(productsPath, 'utf-8'));

// تحميل sql.js مباشرة (بدون المرور عبر database.js لتجنب التعقيد غير المتزامن)
const IS_VERCEL = !!process.env.VERCEL;
const dbPath = IS_VERCEL
    ? '/tmp/zomoroda_system.db'
    : path.join(__dirname, '..', 'zomoroda_system.db');

async function main() {
    const initSqlJs = require(path.join(__dirname, '..', 'node_modules', 'sql.js'));
    const wasmPath = path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');

    let SQL;
    if (fs.existsSync(wasmPath)) {
        const wasmBinary = fs.readFileSync(wasmPath);
        SQL = await initSqlJs({ wasmBinary });
    } else {
        SQL = await initSqlJs();
    }

    let db;
    if (fs.existsSync(dbPath)) {
        try {
            db = new SQL.Database(fs.readFileSync(dbPath));
        } catch (e) {
            db = new SQL.Database();
        }
    } else {
        db = new SQL.Database();
    }

    // إنشاء جدول store_products
    db.run(`CREATE TABLE IF NOT EXISTS store_products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        brand TEXT,
        category TEXT,
        price REAL,
        unit TEXT,
        carton INTEGER,
        variants TEXT,
        description TEXT,
        image_url TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
    )`);

    // إدراج المنتجات
    const stmt = db.prepare(`INSERT OR REPLACE INTO store_products
        (id, name, brand, category, price, unit, carton, variants, description, image_url, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`);

    let inserted = 0;
    for (const p of products) {
        const variants = p.variants ? JSON.stringify(p.variants) : null;
        const desc = p.desc || null;
        const imageUrl = p.image_url || null;

        stmt.run([p.id, p.name, p.brand || null, p.category || null, p.price || 0, p.unit || null, p.carton || null, variants, desc, imageUrl]);
        inserted++;
    }
    stmt.free();

    // حفظ قاعدة البيانات
    const data = db.export();
    fs.writeFileSync(dbPath, Buffer.from(data));
    db.close();

    console.log(`✅ تم استيراد ${inserted} منتج بنجاح إلى جدول store_products`);

    // التحقق من البيانات
    const verifyDb = new SQL.Database(fs.readFileSync(dbPath));
    const result = verifyDb.exec('SELECT COUNT(*) as count FROM store_products');
    const count = result[0].values[0][0];
    console.log(`📊 إجمالي المنتجات في الجدول: ${count}`);

    const categories = verifyDb.exec('SELECT category, COUNT(*) as cnt FROM store_products GROUP BY category ORDER BY cnt DESC');
    console.log('📂 التوزيع حسب الفئة:');
    for (const row of categories[0].values) {
        console.log(`   - ${row[0]}: ${row[1]} منتج`);
    }
    verifyDb.close();
}

main().catch(err => {
    console.error('❌ خطأ أثناء الاستيراد:', err.message);
    process.exit(1);
});
