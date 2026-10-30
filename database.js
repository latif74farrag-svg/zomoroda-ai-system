// database.js - محرك قاعدة البيانات المركزي المتوافق مع sql.js و sqlite3
const path = require('path');
const fs = require('fs');

const IS_VERCEL = !!process.env.VERCEL;
const dbPath = IS_VERCEL
    ? '/tmp/zomoroda_system.db'
    : path.join(__dirname, 'zomoroda_system.db');

// هل تتوفر مكتبة sqlite3 الأصلية؟
let sqlite3Module = null;
try {
    sqlite3Module = require('sqlite3').verbose();
} catch (e) {
    // sqlite3 غير مثبتة، سنعتمد تلقائياً على sql.js (WASM) الآمنة والخفيفة
}

let dbInstance = null;

if (sqlite3Module) {
    const rawDb = new sqlite3Module.Database(dbPath, (err) => {
        if (err) {
            console.error('❌ خطأ في الاتصال بقاعدة البيانات (sqlite3):', err.message);
        } else {
            console.log('✅ تم الاتصال بقاعدة البيانات المركزية (sqlite3) بنجاح.');
        }
    });
    initSchema(rawDb);
    module.exports = rawDb;
} else {
    // محرك sql.js المتوافق
    let initSqlJs = null;
    try {
        initSqlJs = require('sql.js');
    } catch (e) {
        // سيتم تحميله بعد اكتمال npm install
    }

    let sdb = null;
    let saveTimer = null;

    function persist() {
        if (IS_VERCEL || !sdb) return;
        if (saveTimer) return;
        saveTimer = setTimeout(() => {
            saveTimer = null;
            try {
                fs.writeFileSync(dbPath, Buffer.from(sdb.export()));
            } catch (e) {
                console.log('⚠️ تعذر حفظ قاعدة البيانات:', e.message);
            }
        }, 300);
    }

    const dbReady = (async () => {
        if (!initSqlJs) {
            try { initSqlJs = require('sql.js'); } catch (err) {}
        }
        if (initSqlJs) {
            let wasmPath = path.join(__dirname, 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
            let SQL = null;
            if (fs.existsSync(wasmPath)) {
                const wasmBinary = fs.readFileSync(wasmPath);
                SQL = await initSqlJs({ wasmBinary });
            } else {
                SQL = await initSqlJs();
            }

            if (fs.existsSync(dbPath)) {
                try {
                    sdb = new SQL.Database(fs.readFileSync(dbPath));
                } catch (e) {
                    sdb = new SQL.Database();
                }
            } else {
                sdb = new SQL.Database();
            }
            console.log('✅ تم الاتصال بقاعدة البيانات المركزية (sql.js WASM) بنجاح.');
        }
    })();

    function normArgs(params, cb) {
        if (typeof params === 'function') { cb = params; params = []; }
        return [params || [], cb];
    }

    const db = {
        run(sql, params, cb) {
            [params, cb] = normArgs(params, cb);
            dbReady.then(() => {
                let err = null, ctx = {};
                try {
                    if (sdb) {
                        sdb.run(sql, params);
                        try {
                            const idRes = sdb.exec('SELECT last_insert_rowid()');
                            ctx = {
                                lastID: idRes && idRes[0] ? idRes[0].values[0][0] : null,
                                changes: sdb.getRowsModified()
                            };
                        } catch (ex) {}
                        persist();
                    }
                } catch (e) {
                    err = e;
                }
                if (cb) cb.call(ctx, err);
                else if (err) console.error('❌ خطأ SQL:', err.message);
            });
            return db;
        },
        get(sql, params, cb) {
            [params, cb] = normArgs(params, cb);
            dbReady.then(() => {
                let err = null, row = undefined;
                try {
                    if (sdb) {
                        const stmt = sdb.prepare(sql);
                        stmt.bind(params);
                        if (stmt.step()) row = stmt.getAsObject();
                        stmt.free();
                    }
                } catch (e) {
                    err = e;
                }
                if (cb) cb(err, row);
            });
            return db;
        },
        all(sql, params, cb) {
            [params, cb] = normArgs(params, cb);
            dbReady.then(() => {
                let err = null;
                const rows = [];
                try {
                    if (sdb) {
                        const stmt = sdb.prepare(sql);
                        stmt.bind(params);
                        while (stmt.step()) rows.push(stmt.getAsObject());
                        stmt.free();
                    }
                } catch (e) {
                    err = e;
                }
                if (cb) cb(err, rows);
            });
            return db;
        },
        serialize(fn) { if (fn) fn(); }
    };

    initSchema(db);
    module.exports = db;
}

function initSchema(database) {
    database.serialize(() => {
        // 1. جدول المندوبات وربات البيوت
        database.run(`CREATE TABLE IF NOT EXISTS affiliates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            phone TEXT UNIQUE,
            name TEXT,
            role TEXT DEFAULT 'Representative',
            supervisor_phone TEXT,
            sales_count INTEGER DEFAULT 0,
            total_commissions REAL DEFAULT 0.0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // 2. جدول الطلبيات
        database.run(`CREATE TABLE IF NOT EXISTS orders (
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

        // 3. جدول تتبع الحملات والإرسال
        database.run(`CREATE TABLE IF NOT EXISTS sent_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            target_identifier TEXT UNIQUE,
            platform TEXT,
            sector TEXT,
            sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // 4. جدول إدارة العملاء
        database.run(`CREATE TABLE IF NOT EXISTS customers (
            user_id TEXT PRIMARY KEY,
            channel TEXT,
            category TEXT,
            stage TEXT,
            welcomed_before INTEGER DEFAULT 0,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // 5. حالة الحملات
        database.run(`CREATE TABLE IF NOT EXISTS campaign_state (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            platform TEXT,
            category TEXT,
            last_processed_index INTEGER,
            total_recipients INTEGER,
            status TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
    });
}
