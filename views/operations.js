function getOperationsHtml() {
    return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>عمليات الزمردة</title>
    <style>body{font:16px system-ui;background:#f1f5f9;color:#123;padding:20px;margin:auto;max-width:1100px}section{background:white;padding:24px;margin:20px 0;border-radius:12px}input,select,button{font:inherit;padding:10px;margin:5px;max-width:95%}button{background:#047857;color:white;border:0;border-radius:5px;cursor:pointer}table{width:100%;border-collapse:collapse}td,th{text-align:right;padding:10px;border-bottom:1px solid #ddd}pre{white-space:pre-wrap;overflow-wrap:anywhere;direction:ltr}#notice{position:sticky;top:0;background:#fff3cd;padding:12px}a{color:#047857}.scroll{overflow:auto}article{padding:14px;border:1px solid #ddd;margin:8px 0}button:disabled{opacity:.5}</style></head><body>
    <h1>عمليات الزمردة</h1><nav><a href="/store/admin">المنتجات والطلبات وتسجيل الدخول</a> · <a href="/store">المتجر</a></nav><p id="notice" role="status" aria-live="polite">جارٍ تحميل الجلسة...</p>
    <section><h2>المخزون</h2><p>أدخل الكميات الفعلية بعد الجرد. يتم حجز الكمية عند الطلب حتى تأكيده خلال 24 ساعة.</p><div class="scroll"><table><thead><tr><th>المنتج</th><th>الموجود</th><th>المحجوز</th><th>المتاح</th></tr></thead><tbody id="inventory"></tbody></table></div>
    <form id="stockForm"><label>المنتج <select id="product" required></select></label><label>التغيير بالكمية <input id="delta" type="number" step="1" required></label><label>السبب <input id="reason" minlength="3" maxlength="500" required></label><button>تسجيل حركة مخزون</button></form></section>
    <section><h2>التحصيل عند الاستلام</h2><form id="collectionForm"><label>رقم الطلب <input id="orderNumber" required></label><label>المبلغ بالجنيه <input id="amount" type="number" min="0" step="0.01" required></label><label>مرجع التحصيل <input id="reference" minlength="3" maxlength="120" required></label><button>تأكيد التحصيل</button></form><p>يجب أن يطابق التحصيل إجمالي طلب تم تسليمه شاملاً رسوم التوصيل.</p></section>
    <section><h2>التجهيز والتوصيل والمرتجعات</h2><p>سجّل المرتجع بعد استلام البضاعة وفحصها؛ تسجيل المرتجع يعيد الكمية للمخزون.</p><div id="orders"></div></section>
    <section><h2>مراجعة المساعدين</h2><p>تحتاج الإجراءات إلى موافقة موظف. مقترحات التوريد ومسودات الدعم تُراجع هنا قبل التعامل مع المورد أو العميل.</p><div id="controls"></div><div id="tasks"></div></section>
    <section><h2>خدمة العملاء</h2><div id="tickets"></div><h3>استعادة حساب عميل</h3><p>تحقق من هوية صاحب الحساب عبر قناة موثوقة قبل إصدار الرمز. سلّمه لصاحب الحساب فقط.</p><form id="recoveryForm"><label>رقم هاتف العميل <input id="recoveryPhone" required></label><label>مرجع التحقق من الهوية <input id="verification" minlength="5" required></label><label><input id="verified" type="checkbox" required>تم التحقق من هوية العميل</label><button>إصدار رمز مؤقت</button></form><output id="recoveryToken"></output></section>
    <section><h2>المتابعة التشغيلية</h2><button id="refresh" type="button">تحديث</button><pre id="metrics"></pre><div id="jobs"></div><details><summary>سجل المراجعة</summary><pre id="audit"></pre></details></section>
    <script>
    let csrf = '';
    const el = id => document.getElementById(id);
    const notice = message => { el('notice').textContent = message; };
    async function api(url, method = 'GET', body, extra = {}) {
        const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf, ...extra }, body: body === undefined ? undefined : JSON.stringify(body) });
        const data = await response.json(); if (!response.ok) throw new Error(data.error || 'تعذر إكمال العملية'); return data;
    }
    function text(tag, value) { const node = document.createElement(tag); node.textContent = value; return node; }
    function button(label, action) { const node = text('button', label); node.type = 'button'; node.onclick = async () => { node.disabled = true; try { await action(); notice('تم الحفظ'); await load(); } catch (e) { notice(e.message); } finally { node.disabled = false; } }; return node; }
    async function load() {
        const session = await api('/api/store/admin/session'); csrf = session.csrf || '';
        if (!session.authenticated) { notice('يرجى تسجيل الدخول من صفحة إدارة المتجر'); return; }
        notice('مرحباً ' + session.staff.name);
        const tasks = [];
        if (['admin','operations'].includes(session.staff.role)) tasks.push((async () => {
            const data = await api('/api/v1/admin/inventory'); el('inventory').replaceChildren(); el('product').replaceChildren();
            data.inventory.forEach(row => { const tr = document.createElement('tr'); [row.name, row.on_hand, row.reserved, row.on_hand - row.reserved].forEach(value => tr.append(text('td', value))); el('inventory').append(tr); const option = text('option', row.name); option.value = row.product_id; el('product').append(option); });
            el('orders').replaceChildren();
            const labels = { pending:'قيد المراجعة', confirmed:'تم التأكيد', shipped:'تم الشحن', delivered:'تم التسليم', delivery_failed:'تعذر التسليم', returned:'مرتجع', cancelled:'ملغي' };
            const transitions = { pending:['confirmed','cancelled'], confirmed:['shipped','cancelled'], shipped:['delivered','delivery_failed'], delivery_failed:['shipped','returned'], delivered:['returned'], returned:[], cancelled:[] };
            (await api('/api/v1/admin/orders')).orders.forEach(order => {
                const card = text('article', order.order_number + ' — ' + labels[order.status] + ' — ' + order.customer_name + ' — ' + order.customer_phone);
                card.append(text('p', order.customer_address)); card.append(text('p', Number(order.total).toFixed(2) + ' ج.م'));
                JSON.parse(JSON.stringify(order.items)).forEach(item => card.append(text('p', item.name + ' ' + (item.variant || '') + ' × ' + item.quantity)));
                (transitions[order.status] || []).forEach(status => card.append(button(labels[status], () => api('/api/v1/admin/orders/' + encodeURIComponent(order.order_number), 'PATCH', { status })))); el('orders').append(card);
            });
        })());
        if (session.staff.role === 'admin') tasks.push((async () => {
            const data = await api('/api/v1/admin/agents'); el('controls').replaceChildren(); el('tasks').replaceChildren();
            data.controls.forEach(control => el('controls').append(button(control.agent + (control.paused ? ' — متوقف: تشغيل' : ' — يعمل: إيقاف'), () => api('/api/v1/admin/agents/' + control.agent, 'PATCH', { paused: !control.paused }))));
            data.tasks.forEach(task => { const card = text('article', task.agent + ' — ' + task.status); card.append(text('pre', JSON.stringify(JSON.parse(task.proposal), null, 2))); if (task.status === 'proposed') ['approved','rejected'].forEach(decision => card.append(button(decision === 'approved' ? 'موافقة' : 'رفض', () => api('/api/v1/admin/agent-tasks/' + task.id + '/review', 'POST', { decision })))); el('tasks').append(card); });
            el('metrics').textContent = JSON.stringify(await api('/api/v1/admin/operations'), null, 2);
            el('audit').textContent = JSON.stringify((await api('/api/v1/admin/audit')).entries, null, 2);
            el('jobs').replaceChildren(); (await api('/api/v1/admin/jobs')).jobs.forEach(job => { const card = text('article', job.type + ' — ' + job.status + ' — ' + (job.last_error || '')); if (job.status === 'dead') card.append(button('إعادة المحاولة', () => api('/api/v1/admin/jobs/' + encodeURIComponent(job.id) + '/retry', 'POST', {}))); el('jobs').append(card); });
        })());
        if (['admin','support'].includes(session.staff.role)) tasks.push((async () => {
            el('tickets').replaceChildren(); (await api('/api/v1/admin/support')).tickets.forEach(ticket => { const card = text('article', ticket.message); card.append(text('p', ticket.status)); if (ticket.status !== 'resolved') card.append(button('تم الحل', () => api('/api/v1/admin/support/' + ticket.id, 'PATCH', { status: 'resolved' }))); el('tickets').append(card); });
        })());
        await Promise.all(tasks);
    }
    el('stockForm').onsubmit = async event => {
        event.preventDefault(); const payload = { delta: Number(el('delta').value), reason: el('reason').value }; const fingerprint = JSON.stringify([el('product').value,payload]);
        let attempt; try { attempt = JSON.parse(sessionStorage.getItem('zmr_stock_attempt')); } catch (_) {}
        if (!attempt || attempt.fingerprint !== fingerprint) { attempt = { fingerprint, key: crypto.randomUUID() }; sessionStorage.setItem('zmr_stock_attempt',JSON.stringify(attempt)); }
        try { await api('/api/v1/admin/inventory/' + encodeURIComponent(el('product').value) + '/adjustments', 'POST', payload, { 'Idempotency-Key': attempt.key }); sessionStorage.removeItem('zmr_stock_attempt'); event.target.reset(); await load(); notice('تم تحديث المخزون'); } catch (e) { notice(e.message); }
    };
    el('collectionForm').onsubmit = async event => { event.preventDefault(); try { await api('/api/v1/admin/orders/' + encodeURIComponent(el('orderNumber').value) + '/collection', 'POST', { amount_minor: Math.round(Number(el('amount').value) * 100), reference: el('reference').value }); notice('تم تسجيل التحصيل'); } catch (e) { notice(e.message); } };
    el('recoveryForm').onsubmit = async event => { event.preventDefault(); try { const result = await api('/api/v1/admin/customer-recovery', 'POST', { phone: el('recoveryPhone').value, verification: el('verification').value, verified: el('verified').checked }); el('recoveryToken').textContent = 'رمز مؤقت لمدة 15 دقيقة: ' + result.token; } catch (e) { notice(e.message); } };
    el('refresh').onclick = () => load().catch(e => notice(e.message)); load().catch(e => notice(e.message));
    </script></body></html>`;
}
module.exports = { getOperationsHtml };
