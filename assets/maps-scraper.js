async function runScraper() {
    const btn = document.getElementById('runBtn');
    const bar = document.getElementById('statusBar');
    const sector   = document.getElementById('sector').value;
    const location = document.getElementById('location').value.trim() || 'القاهرة';
    const kw       = document.getElementById('keywords').value.trim();
    const limit    = parseInt(document.getElementById('limit').value);

    btn.innerHTML  = '<span class="spinner"></span><span>جاري البحث…</span>';
    btn.disabled   = true;
    bar.textContent = `⏳ يبحث عن [${sector}] في [${location}]…`;
    bar.className  = 'status-bar show';

    try {
        const sessionResponse = await fetch('/api/store/admin/session', { credentials: 'same-origin' });
        const session = await sessionResponse.json();
        if (!sessionResponse.ok || !session.authenticated) throw new Error('سجّل الدخول بحساب المدير أولاً.');
        const body = { sector, location, limit };
        if (kw) body.keywords = kw.split(/[,،]+/).map(s => s.trim()).filter(Boolean);

        const r    = await fetch('/api/maps-scraper/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': session.csrf || '' },
            body: JSON.stringify(body)
        });
        const data = await r.json();

        if (!data.success) throw new Error(data.error);

        document.getElementById('statsRow').style.display  = 'grid';
        document.getElementById('statTotal').textContent   = data.total;
        document.getElementById('statSaved').textContent   = data.saved;
        document.getElementById('statSkipped').textContent = data.skipped;

        bar.textContent = `✅ انتهى! ${data.total} نتيجة، ${data.saved} جديد محفوظ.`;
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
    el.replaceChildren();
    const node = (tag, value) => { const n = document.createElement(tag); if (value !== undefined) n.textContent = String(value); return n; };
    if (!leads.length) {
        el.append(node('p', 'لا توجد نتائج محفوظة لهذا القطاع.'));
        return;
    }
    const table = node('table'), head = node('thead'), header = node('tr'), body = node('tbody');
    ['الاسم','التليفون','الإيميل','الموقع','العنوان','المصدر'].forEach(label => header.append(node('th', label)));
    head.append(header); table.append(head, body);
    const values = value => { try { const list = JSON.parse(value || '[]'); return Array.isArray(list) ? list.filter(v => typeof v === 'string') : []; } catch { return []; } };
    leads.forEach(r => {
        const row = node('tr'), phones = node('td'), emails = node('td'), website = node('td');
        [...new Set(values(r.phones).concat(r.phone || []))].forEach(phone => {
            const digits = String(phone).replace(/\D/g, '');
            if (!digits) return;
            const link = node('a', phone); link.href = 'tel:' + digits; phones.append(link, node('br'));
        });
        values(r.emails).forEach(email => { const link = node('a', email); link.href = 'mailto:' + encodeURIComponent(email); emails.append(link, node('br')); });
        try { const url = new URL(r.website); if (['https:','http:'].includes(url.protocol)) { const link = node('a', '🌐'); link.href = url.href; link.target = '_blank'; link.rel = 'noopener noreferrer'; website.append(link); } } catch { /* Invalid scraped URLs remain plain text. */ }
        row.append(node('td', r.name || '—'), phones, emails, website, node('td', r.address || '—'), node('td', r.source || '?')); body.append(row);
    });
    el.append(table, node('p', 'إجمالي: ' + leads.length + ' عميل'));
}

async function exportCsv() {
    const sector = document.getElementById('sector').value;
    window.open('/api/maps-scraper/export?sector=' + sector, '_blank');
}

// تحميل فوري
loadLeads();
