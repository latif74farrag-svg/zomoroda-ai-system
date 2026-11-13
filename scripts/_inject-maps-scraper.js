/**
 * يُضيف maps_scraper_agent routes لـ server.js
 */
const fs   = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, '..', 'server.js');
let   content    = fs.readFileSync(serverPath, 'utf8');

// 1️⃣ إضافة require في أول الملف (بعد آخر require موجود)
const requireLine = `const { registerRoutes: registerMapsScraperRoutes } = require('./maps_scraper_agent');`;

if (content.includes('maps_scraper_agent')) {
    console.log('⚠️  موجود مسبقاً – لن يُضاف مرة أخرى');
    process.exit(0);
}

// نجد نهاية مجموعة الـ requires (أول سطر فارغ بعد آخر require)
const requireInsertAfter = `const { renderResultCard } = require('./views/resultCard');`;
if (content.includes(requireInsertAfter)) {
    content = content.replace(
        requireInsertAfter,
        requireInsertAfter + '\n' + requireLine
    );
    console.log('✅ تمت إضافة require');
} else {
    // fallback: نضع في أول الملف بعد أول require
    const firstRequire = content.match(/^const .+ = require\(.+\);/m);
    if (firstRequire) {
        content = content.replace(firstRequire[0], firstRequire[0] + '\n' + requireLine);
        console.log('✅ تمت إضافة require (fallback)');
    }
}

// 2️⃣ تسجيل الـ routes قبل module.exports = app;
const routesCode = `
// ==========================================
// 🗺️  Maps Scraper Agent — مسارات استخراج بيانات جوجل مابس
// ==========================================
registerMapsScraperRoutes(app);

// صفحة عرض النتائج والبحث (لوحة التحكم)
app.get('/maps-scraper', (req, res) => {
    const sector   = req.query.sector   || 'salons';
    const location = req.query.location || 'القاهرة';
    res.send(getMapsScraperHtml({ sector, location, BUSINESS_IDENTITY }));
});

function getMapsScraperHtml({ sector, location, BUSINESS_IDENTITY }) {
    const sectors = {
        pharmacies:   '💊 صيدليات',
        hypermarkets: '🏪 هيبر ماركت',
        hotels:       '🏨 فنادق',
        salons:       '💅 صالونات',
        distribution: '🚚 موزعون',
        moms:         '🌸 ماميز',
    };
    const sectorOptions = Object.entries(sectors)
        .map(([v,l]) => \`<option value="\${v}" \${v===sector?'selected':''}>\${l}</option>\`)
        .join('');

    return \`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>🗺️ وكيل جوجل مابس – الزمردة</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
:root{--g:#064e3b;--g2:#059669;--g3:#10b981;--gold:#d4a017;--bg:#f0fdf4;--card:#fff;--border:#d1fae5;--red:#ef4444}
body{font-family:'Cairo',sans-serif;background:var(--bg);color:#1a1a1a;min-height:100vh}
.header{background:linear-gradient(135deg,#022c22,var(--g));padding:16px 24px;display:flex;align-items:center;gap:14px;box-shadow:0 2px 16px rgba(0,0,0,.3)}
.header h1{color:#fff;font-size:20px;font-weight:900}
.header .back{color:var(--g3);text-decoration:none;font-size:13px}
.container{max-width:900px;margin:0 auto;padding:24px 16px}
.card{background:var(--card);border-radius:16px;padding:24px;margin-bottom:20px;box-shadow:0 4px 20px rgba(6,78,59,.08);border:1px solid var(--border)}
.card h2{font-size:17px;font-weight:900;color:var(--g);margin-bottom:16px;display:flex;align-items:center;gap:8px}
.form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}
@media(max-width:600px){.form-row{grid-template-columns:1fr}}
label{font-size:13px;font-weight:700;color:var(--g);display:block;margin-bottom:5px}
input,select{width:100%;padding:10px 14px;border:1.5px solid var(--border);border-radius:10px;font-family:'Cairo',sans-serif;font-size:14px;background:#f8fffe;outline:none;transition:border-color .2s}
input:focus,select:focus{border-color:var(--g2)}
.btn{background:linear-gradient(135deg,var(--g),var(--g2));color:#fff;border:none;padding:12px 28px;border-radius:12px;font-family:'Cairo',sans-serif;font-size:15px;font-weight:900;cursor:pointer;transition:opacity .2s;display:inline-flex;align-items:center;gap:8px}
.btn:hover{opacity:.9}.btn:active{opacity:.8}
.btn-sm{padding:7px 14px;font-size:12px;border-radius:8px}
.btn-green{background:linear-gradient(135deg,#16a34a,#15803d)}
.btn-red{background:linear-gradient(135deg,#dc2626,#b91c1c)}
.status-bar{background:var(--g);color:#fff;border-radius:10px;padding:14px 18px;margin:12px 0;font-size:14px;font-weight:700;display:none}
.status-bar.show{display:block}
.stat-row{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px}
.stat{background:var(--border);border-radius:12px;padding:14px;text-align:center}
.stat .num{font-size:28px;font-weight:900;color:var(--g)}
.stat .lbl{font-size:12px;color:#6b7280}
table{width:100%;border-collapse:collapse;font-size:13px}
th{background:var(--g);color:#fff;padding:10px 8px;text-align:right;white-space:nowrap}
td{padding:9px 8px;border-bottom:1px solid var(--border);vertical-align:top}
tr:hover td{background:#f0fdf4}
.phone-link{color:var(--g2);font-weight:700;text-decoration:none}
.phone-link:hover{text-decoration:underline}
.wa-link{color:#25d366;font-weight:700;text-decoration:none}
.empty{text-align:center;padding:40px;color:#9ca3af}
.tag{display:inline-block;background:var(--border);color:var(--g);font-size:11px;font-weight:700;padding:2px 8px;border-radius:8px;margin:1px}
.spinner{display:inline-block;width:18px;height:18px;border:3px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .6s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.hint{background:#fefce8;border:1px solid #fde68a;border-radius:10px;padding:12px 16px;font-size:13px;color:#92400e;margin-bottom:16px}
</style>
</head>
<body>
<div class="header">
  <div>
    <a href="/" class="back">← الداشبورد</a>
    <h1>🗺️ وكيل استخراج بيانات جوجل مابس</h1>
  </div>
</div>
<div class="container">

  <div class="hint">
    💡 <b>الوكيل يعمل في 3 أوضاع:</b>
    <span class="tag">Google Places API</span> إذا أضفت <code>GOOGLE_MAPS_KEY</code> في .env —
    <span class="tag">SerpAPI</span> إذا أضفت <code>SERPAPI_KEY</code> —
    <span class="tag">Web Fallback</span> مجاناً دائماً (أبطأ).
  </div>

  <!-- نموذج البحث -->
  <div class="card">
    <h2>🔍 بحث جديد</h2>
    <div class="form-row">
      <div>
        <label>القطاع المستهدف</label>
        <select id="sector">\${sectorOptions}</select>
      </div>
      <div>
        <label>المنطقة الجغرافية</label>
        <input id="location" value="\${location}" placeholder="مثال: المهندسين، الجيزة">
      </div>
    </div>
    <div class="form-row">
      <div>
        <label>كلمات بحث إضافية (اختياري)</label>
        <input id="keywords" placeholder="مثال: صالون تجميل، حلاق">
      </div>
      <div>
        <label>الحد الأقصى للنتائج</label>
        <select id="limit">
          <option>10</option><option selected>20</option><option>50</option><option>100</option>
        </select>
      </div>
    </div>
    <button class="btn" onclick="runScraper()" id="runBtn">
      <span>🚀</span><span>ابدأ البحث والاستخراج</span>
    </button>
    <div class="status-bar" id="statusBar">⏳ جاري البحث…</div>
  </div>

  <!-- إحصائيات -->
  <div class="stat-row" id="statsRow" style="display:none">
    <div class="stat"><div class="num" id="statTotal">0</div><div class="lbl">إجمالي النتائج</div></div>
    <div class="stat"><div class="num" id="statSaved">0</div><div class="lbl">محفوظ جديد</div></div>
    <div class="stat"><div class="num" id="statSkipped">0</div><div class="lbl">مكرر (تجاهل)</div></div>
  </div>

  <!-- جدول النتائج -->
  <div class="card">
    <h2>📋 العملاء المستخرجون
      <button class="btn btn-sm btn-green" onclick="loadLeads()" style="margin-right:auto">🔄 تحديث</button>
      <button class="btn btn-sm" onclick="exportCsv()" style="background:#1e3a5f">📥 تصدير CSV</button>
    </h2>
    <div id="leadsTable"><div class="empty">ابدأ بحثاً جديداً أو اضغط "تحديث" لعرض البيانات المحفوظة.</div></div>
  </div>

</div>

<script>
async function runScraper() {
    const btn = document.getElementById('runBtn');
    const bar = document.getElementById('statusBar');
    const sector   = document.getElementById('sector').value;
    const location = document.getElementById('location').value.trim() || 'القاهرة';
    const kw       = document.getElementById('keywords').value.trim();
    const limit    = parseInt(document.getElementById('limit').value);

    btn.innerHTML  = '<span class="spinner"></span><span>جاري البحث…</span>';
    btn.disabled   = true;
    bar.textContent = \`⏳ يبحث عن [\${sector}] في [\${location}]…\`;
    bar.className  = 'status-bar show';

    try {
        const body = { sector, location, limit };
        if (kw) body.keywords = kw.split(/[,،]+/).map(s => s.trim()).filter(Boolean);

        const r    = await fetch('/api/maps-scraper/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await r.json();

        if (!data.success) throw new Error(data.error);

        document.getElementById('statsRow').style.display  = 'grid';
        document.getElementById('statTotal').textContent   = data.total;
        document.getElementById('statSaved').textContent   = data.saved;
        document.getElementById('statSkipped').textContent = data.skipped;

        bar.textContent = \`✅ انتهى! \${data.total} نتيجة، \${data.saved} جديد محفوظ.\`;
        await loadLeads();
    } catch (err) {
        bar.textContent = '❌ خطأ: ' + err.message;
    } finally {
        btn.innerHTML = '<span>🚀</span><span>ابدأ البحث والاستخراج</span>';
        btn.disabled  = false;
    }
}

async function loadLeads() {
    const sector = document.getElementById('sector').value;
    const r      = await fetch('/api/maps-scraper/leads?sector=' + sector + '&limit=200');
    const data   = await r.json();
    renderTable(data.leads || []);
}

function renderTable(leads) {
    const el = document.getElementById('leadsTable');
    if (!leads.length) {
        el.innerHTML = '<div class="empty">لا توجد نتائج محفوظة لهذا القطاع.</div>';
        return;
    }
    const rows = leads.map(r => {
        const phones = JSON.parse(r.phones || '[]').concat([r.phone]).filter((v,i,a) => v && a.indexOf(v)===i);
        const emails = JSON.parse(r.emails || '[]');
        const phoneCells = phones.map(p =>
            \`<a class="phone-link" href="tel:\${p}">\${p}</a>
             <a class="wa-link" href="https://wa.me/2\${p.replace(/^0/,'')}?text=\${encodeURIComponent('مرحباً، معك عبداللطيف فراج من شركة الزمردة كوزماتيكس')}" target="_blank"> 📲</a>\`
        ).join('<br>');
        return \`<tr>
          <td style="font-weight:700">\${r.name||'—'}</td>
          <td>\${phoneCells||'—'}</td>
          <td>\${emails.map(e=>\`<a href="mailto:\${e}">\${e}</a>\`).join('<br>')||'—'}</td>
          <td>\${r.website ? \`<a href="\${r.website}" target="_blank" style="color:#1e3a5f">🌐</a>\` : '—'}</td>
          <td style="font-size:11px;color:#6b7280">\${(r.address||'').slice(0,40)}</td>
          <td><span class="tag">\${r.source||'?'}</span></td>
        </tr>\`;
    }).join('');
    el.innerHTML = \`<table>
      <thead><tr><th>الاسم</th><th>التليفون</th><th>الإيميل</th><th>الموقع</th><th>العنوان</th><th>المصدر</th></tr></thead>
      <tbody>\${rows}</tbody>
    </table><p style="font-size:12px;color:#9ca3af;text-align:center;padding:8px">إجمالي: \${leads.length} عميل</p>\`;
}

async function exportCsv() {
    const sector = document.getElementById('sector').value;
    window.open('/api/maps-scraper/export?sector=' + sector, '_blank');
}

// تحميل فوري
loadLeads();
</script>
</body>
</html>\`;
}
`;

    const lastLine = 'module.exports = app;';
    const idx      = content.lastIndexOf(lastLine);

    if (idx === -1) {
        console.error('❌ لم يُعثر على module.exports = app;');
        process.exit(1);
    }

    const newContent = content.slice(0, idx) + routesCode + '\n' + content.slice(idx);
    fs.writeFileSync(serverPath, newContent, 'utf8');
    console.log('✅ تمت إضافة Maps Scraper routes + صفحة /maps-scraper');

