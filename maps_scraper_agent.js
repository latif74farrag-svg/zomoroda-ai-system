/**
 * ============================================================
 * 🗺️  maps_scraper_agent.js — وكيل استخراج بيانات جوجل مابس
 * ============================================================
 * يستخرج: أرقام التليفون + الإيميل + الموقع الإلكتروني لكل
 * نشاط تجاري في منطقة جغرافية محددة.
 *
 * طريقة العمل (بدون تكلفة API رسمية):
 *  1. Google Places API (Text Search + Place Details) — إذا تم تفعيل GOOGLE_MAPS_KEY
 *  2. SerpAPI Google Maps Results         — إذا تم تفعيل SERPAPI_KEY
 *  3. Web Search Fallback (Axios + regex) — مجاني دائماً، أبطأ
 *
 * الاستخدام:
 *   node maps_scraper_agent.js                 (يشغّل demo بالإعدادات الافتراضية)
 *   node maps_scraper_agent.js --sector=salons --location="المهندسين، الجيزة" --limit=20
 *
 * API المدمج مع server.js:
 *   POST /api/maps-scraper/run
 *   Body: { sector, location, keywords, limit }
 * ============================================================
 */

'use strict';

const https  = require('https');
const http   = require('http');
const fs     = require('fs');
const path   = require('path');
const db     = require('./database');

// ─── قراءة الـ API Keys من .env أو البيئة ─────────────────────────
const GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_KEY || '';
const SERPAPI_KEY     = process.env.SERPAPI_KEY     || '';

// ─── خريطة القطاعات → كلمات بحث افتراضية ─────────────────────────
const SECTOR_KEYWORDS = {
    pharmacies:   ['صيدلية', 'pharmacy', 'صيدلية مصر'],
    hypermarkets: ['هايبر ماركت', 'سوبر ماركت', 'تاجر جملة'],
    hotels:       ['فندق', 'hotel', 'شقق فندقية'],
    salons:       ['صالون تجميل', 'مركز تجميل', 'حلاق', 'salon'],
    distribution: ['مستودع', 'مخزن', 'شركة توزيع', 'مورد'],
    moms:         ['جروب ماميز', 'مجموعة أمهات', 'بيع اونلاين'],
};

// ─── مساعدات HTTP بسيطة (بدون axios لضمان التوافق) ───────────────
function fetchJson(url, timeoutMs = 12000) {
    return new Promise((resolve, reject) => {
        const lib  = url.startsWith('https') ? https : http;
        const req  = lib.get(url, { headers: { 'User-Agent': 'ZomorodaBot/1.0' } }, res => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end',  () => {
                try { resolve(JSON.parse(data)); }
                catch(e) { reject(new Error('JSON parse error: ' + data.slice(0, 120))); }
            });
        });
        req.on('error', reject);
        req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error('Timeout')); });
    });
}

// ─── استخراج معلومات الاتصال بـ Regex من نص حر ───────────────────
function extractContacts(text) {
    const phones  = [...new Set((text.match(/(?:\+2|002)?0[1-9]\d{9}/g) || []))];
    const emails  = [...new Set((text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g) || []))];
    const websites= [...new Set((text.match(/https?:\/\/[^\s"'<>]+/g) || []).filter(u => !u.includes('google') && !u.includes('gstatic')))];
    return { phones, emails, websites };
}

// ─── 1. Google Places API ──────────────────────────────────────────
async function searchViaGooglePlaces(keyword, location, limit = 20) {
    if (!GOOGLE_MAPS_KEY) return [];
    const results = [];

    // Text Search
    const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(keyword + ' ' + location)}&language=ar&key=${GOOGLE_MAPS_KEY}`;
    let searchData;
    try { searchData = await fetchJson(searchUrl); }
    catch(e) { console.warn('⚠️  Places TextSearch error:', e.message); return []; }

    const places = (searchData.results || []).slice(0, limit);
    for (const place of places) {
        const detailUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_phone_number,international_phone_number,website,formatted_address,types&language=ar&key=${GOOGLE_MAPS_KEY}`;
        let detail;
        try { detail = await fetchJson(detailUrl); await sleep(300); }
        catch(e) { continue; }
        const r = detail.result || {};
        results.push({
            source:   'google_places',
            name:     r.name || place.name,
            address:  r.formatted_address || place.formatted_address || '',
            phone:    r.international_phone_number || r.formatted_phone_number || '',
            phones:   r.formatted_phone_number ? [r.formatted_phone_number] : [],
            emails:   [],
            website:  r.website || '',
            rating:   place.rating || null,
            types:    (r.types || []).join(','),
        });
    }
    return results;
}

// ─── 2. SerpAPI ────────────────────────────────────────────────────
async function searchViaSerpApi(keyword, location, limit = 20) {
    if (!SERPAPI_KEY) return [];
    const url = `https://serpapi.com/search.json?engine=google_maps&q=${encodeURIComponent(keyword)}&location=${encodeURIComponent(location)}&hl=ar&gl=eg&api_key=${SERPAPI_KEY}&num=${limit}`;
    let data;
    try { data = await fetchJson(url); }
    catch(e) { console.warn('⚠️  SerpAPI error:', e.message); return []; }

    return (data.local_results || []).map(r => {
        const contacts = extractContacts(JSON.stringify(r));
        return {
            source:  'serpapi',
            name:    r.title || '',
            address: r.address || '',
            phone:   r.phone   || (contacts.phones[0] || ''),
            phones:  r.phone   ? [r.phone] : contacts.phones,
            emails:  contacts.emails,
            website: r.website || (contacts.websites[0] || ''),
            rating:  r.rating  || null,
            types:   r.type    || '',
        };
    });
}

// ─── 3. Web Search Fallback (Google Custom Search or Bing) ─────────
async function searchViaWebFallback(keyword, location, limit = 10) {
    // بناء استعلام بحث مع كلمات استخراج معلومات الاتصال
    const query = encodeURIComponent(`${keyword} ${location} تليفون ايميل موقع`);
    // نستخدم DuckDuckGo HTML API (لا تحتاج key)
    const url = `https://html.duckduckgo.com/html/?q=${query}`;

    return new Promise((resolve) => {
        const lib = https;
        const req = lib.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; ZomorodaBot/1.0)',
                'Accept': 'text/html',
            }
        }, res => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                const contacts = extractContacts(data);
                // استخراج أسماء من snippets
                const nameMatches = data.match(/class="result__a"[^>]*>([^<]{3,80})</g) || [];
                const names = nameMatches.slice(0, limit).map(m => m.replace(/class="result__a"[^>]*>/, '').replace(/</, '').trim());

                // بناء نتائج مبسطة
                const results = contacts.phones.slice(0, limit).map((phone, i) => ({
                    source:  'web_fallback',
                    name:    names[i] || `نشاط ${i+1}`,
                    address: location,
                    phone:   phone,
                    phones:  [phone],
                    emails:  contacts.emails.slice(i, i+1),
                    website: contacts.websites.slice(i, i+1)[0] || '',
                    rating:  null,
                    types:   keyword,
                }));
                resolve(results.length ? results : []);
            });
        });
        req.on('error', () => resolve([]));
        req.setTimeout(10000, () => { req.destroy(); resolve([]); });
    });
}

// ─── حفظ النتائج في قاعدة البيانات ───────────────────────────────
async function saveLeadsToDb(leads, sector) {
    return new Promise((resolve) => {
        let saved = 0, skipped = 0;
        if (!leads.length) return resolve({ saved, skipped });

        db.serialize(() => {
            // إنشاء جدول leads إذا لم يكن موجوداً
            db.run(`
                CREATE TABLE IF NOT EXISTS maps_leads (
                    id         INTEGER PRIMARY KEY AUTOINCREMENT,
                    sector     TEXT,
                    name       TEXT,
                    address    TEXT,
                    phone      TEXT,
                    emails     TEXT,
                    website    TEXT,
                    rating     REAL,
                    types      TEXT,
                    source     TEXT,
                    status     TEXT DEFAULT 'new',
                    contacted  INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(phone, sector)
                )
            `, () => {
                const stmt = db.prepare(`
                    INSERT OR IGNORE INTO maps_leads
                        (sector, name, address, phone, emails, website, rating, types, source)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `);

                leads.forEach(lead => {
                    // ندخّل كل رقم تليفون كسجل منفصل (للمتابعة الفردية)
                    const phonesToSave = lead.phones && lead.phones.length ? lead.phones : [lead.phone || ''];
                    phonesToSave.forEach(phone => {
                        if (!phone) { skipped++; return; }
                        stmt.run(
                            sector,
                            lead.name,
                            lead.address,
                            phone,
                            JSON.stringify(lead.emails || []),
                            lead.website || '',
                            lead.rating  || null,
                            lead.types   || '',
                            lead.source  || 'unknown',
                            function(err) {
                                if (err && err.message.includes('UNIQUE')) skipped++;
                                else if (!err) saved++;
                            }
                        );
                    });
                });

                stmt.finalize(() => resolve({ saved, skipped }));
            });
        });
    });
}

// ─── الدالة الرئيسية للبحث ────────────────────────────────────────
async function scrapeGoogleMaps({ sector = 'salons', location = 'القاهرة', keywords = null, limit = 20 } = {}) {
    const kwList = keywords
        ? (Array.isArray(keywords) ? keywords : [keywords])
        : (SECTOR_KEYWORDS[sector] || ['نشاط تجاري']);

    console.log(`\n🗺️  [Maps Scraper] بدء البحث`);
    console.log(`   القطاع  : ${sector}`);
    console.log(`   المنطقة : ${location}`);
    console.log(`   كلمات   : ${kwList.join(' | ')}`);
    console.log(`   الحد الأقصى: ${limit} نتيجة\n`);

    const allLeads = [];
    const mode = GOOGLE_MAPS_KEY ? 'google_places' : SERPAPI_KEY ? 'serpapi' : 'web_fallback';
    console.log(`   🔧 الوضع: ${mode}`);

    for (const kw of kwList) {
        console.log(`\n   🔍 يبحث عن: "${kw}" في "${location}"...`);
        let results = [];

        if (GOOGLE_MAPS_KEY) {
            results = await searchViaGooglePlaces(kw, location, Math.ceil(limit / kwList.length));
        } else if (SERPAPI_KEY) {
            results = await searchViaSerpApi(kw, location, Math.ceil(limit / kwList.length));
        } else {
            results = await searchViaWebFallback(kw, location, Math.ceil(limit / kwList.length));
        }

        console.log(`   ✅ وجد ${results.length} نتيجة`);
        allLeads.push(...results);
        await sleep(500); // تأخير آمن بين الطلبات
    }

    // إزالة المكررات بناءً على الاسم + الهاتف
    const unique = [];
    const seen   = new Set();
    for (const lead of allLeads) {
        const key = `${lead.phone || ''}_${lead.name || ''}`.toLowerCase().replace(/\s/g, '');
        if (!seen.has(key)) { seen.add(key); unique.push(lead); }
    }

    console.log(`\n📊 المجموع الكلي (بعد إزالة المكررات): ${unique.length}`);

    // حفظ في قاعدة البيانات
    const { saved, skipped } = await saveLeadsToDb(unique, sector);
    console.log(`💾 تم الحفظ: ${saved} جديد | تكرار (تجاهل): ${skipped}`);

    // طباعة ملخص
    if (unique.length > 0) {
        console.log('\n📋 ملخص النتائج:\n' + '─'.repeat(60));
        unique.slice(0, 10).forEach((r, i) => {
            console.log(`${i+1}. ${r.name || '(بدون اسم)'}`);
            if (r.phones?.length)  console.log(`   📞 ${r.phones.join(' | ')}`);
            if (r.emails?.length)  console.log(`   📧 ${r.emails.join(' | ')}`);
            if (r.website)         console.log(`   🌐 ${r.website}`);
            if (r.address)         console.log(`   📍 ${r.address}`);
        });
        if (unique.length > 10) console.log(`   ... و ${unique.length - 10} آخرين محفوظين في قاعدة البيانات`);
    }

    return {
        total:   unique.length,
        saved,
        skipped,
        leads:   unique,
        sector,
        location,
    };
}

// ─── تصدير جدول النتائج كـ CSV ────────────────────────────────────
function exportLeadsCsv(sector) {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT * FROM maps_leads WHERE sector = ? ORDER BY created_at DESC`,
            [sector],
            (err, rows) => {
                if (err) return reject(err);
                if (!rows || !rows.length) return resolve('لا توجد بيانات');

                const header = 'id,sector,name,address,phone,emails,website,rating,status,contacted,created_at';
                const lines  = rows.map(r =>
                    [r.id, r.sector, `"${(r.name||'').replace(/"/g,'""')}"`,
                     `"${(r.address||'').replace(/"/g,'""')}"`, r.phone,
                     `"${r.emails||''}"`, r.website||'', r.rating||'',
                     r.status, r.contacted, r.created_at].join(',')
                );
                const csv = [header, ...lines].join('\n');
                const outPath = path.join(__dirname, `leads_${sector}_${Date.now()}.csv`);
                fs.writeFileSync(outPath, '\uFEFF' + csv, 'utf8'); // BOM للعربي في Excel
                resolve(outPath);
            }
        );
    });
}

// ─── Helper ────────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── الـ API Endpoints في server.js ───────────────────────────────
function registerRoutes(app) {
    // POST /api/maps-scraper/run
    app.post('/api/maps-scraper/run', async (req, res) => {
        const { sector = 'salons', location = 'القاهرة', keywords, limit = 20 } = req.body;
        try {
            const result = await scrapeGoogleMaps({ sector, location, keywords, limit: Math.min(limit, 100) });
            res.json({ success: true, ...result });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    });

    // GET /api/maps-scraper/leads?sector=salons&limit=50
    app.get('/api/maps-scraper/leads', (req, res) => {
        const { sector, limit = 100, status } = req.query;
        const conditions = [];
        const params = [];
        if (sector) { conditions.push('sector = ?'); params.push(sector); }
        if (status) { conditions.push('status = ?'); params.push(status); }
        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        db.all(
            `SELECT * FROM maps_leads ${where} ORDER BY created_at DESC LIMIT ?`,
            [...params, parseInt(limit)],
            (err, rows) => {
                if (err) return res.status(500).json({ success: false, error: err.message });
                res.json({ success: true, total: rows.length, leads: rows });
            }
        );
    });

    // GET /api/maps-scraper/export?sector=salons  → CSV
    app.get('/api/maps-scraper/export', async (req, res) => {
        const { sector = 'all' } = req.query;
        try {
            const csvPath = await exportLeadsCsv(sector);
            res.download(csvPath, path.basename(csvPath), () => {
                fs.unlinkSync(csvPath);
            });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    });

    // PATCH /api/maps-scraper/leads/:id/status
    app.patch('/api/maps-scraper/leads/:id/status', (req, res) => {
        const { status, contacted } = req.body;
        db.run(
            `UPDATE maps_leads SET status = ?, contacted = ? WHERE id = ?`,
            [status || 'new', contacted ? 1 : 0, req.params.id],
            function(err) {
                if (err) return res.status(500).json({ success: false, error: err.message });
                res.json({ success: true, changed: this.changes });
            }
        );
    });

    console.log('✅ [Maps Scraper] API routes مفعّلة: /api/maps-scraper/*');
}

// ─── تشغيل CLI مباشر ──────────────────────────────────────────────
if (require.main === module) {
    const args  = process.argv.slice(2);
    const opts  = {};
    args.forEach(a => {
        const [k, v] = a.replace('--', '').split('=');
        opts[k] = v;
    });

    // قيم افتراضية للديمو
    const sector   = opts.sector   || 'salons';
    const location = opts.location || 'القاهرة';
    const limit    = parseInt(opts.limit || '10');

    scrapeGoogleMaps({ sector, location, limit })
        .then(result => {
            console.log('\n✅ انتهت العملية بنجاح.');
            if (!GOOGLE_MAPS_KEY && !SERPAPI_KEY) {
                console.log('\n💡 تلميح: أضف GOOGLE_MAPS_KEY في .env لنتائج أدق وأكثر.');
                console.log('   احصل على مفتاح مجاني (200$ شهرياً مجاناً) من:');
                console.log('   https://console.cloud.google.com/apis/credentials');
            }
            process.exit(0);
        })
        .catch(err => { console.error('❌ خطأ:', err.message); process.exit(1); });
}

module.exports = { scrapeGoogleMaps, registerRoutes, exportLeadsCsv, saveLeadsToDb, extractContacts };

