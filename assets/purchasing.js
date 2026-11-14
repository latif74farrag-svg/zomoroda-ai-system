(() => {
    const el = id => document.getElementById(id);
    const node = (tag, value) => { const item = document.createElement(tag); if (value !== undefined) item.textContent = String(value); return item; };
    const money = value => new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(Number(value) / 100);
    const states = { draft: 'مسودة', approved: 'معتمد', received: 'مستلم', cancelled: 'ملغي' };
    let csrf = '', products = [], dirty = false, ready = false;
    const attempts = new Map();
    function notice(message, error = false) { el('buyNotice').textContent = message; el('buyNotice').classList.toggle('buy-error', error); }
    async function api(path, method = 'GET', body, key) {
        const response = await fetch('/api/v1/admin/purchasing' + path, { method, credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf, ...(key ? { 'Idempotency-Key': key } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'تعذر الحفظ. تحقق من الاتصال ثم أعد المحاولة.');
        return data;
    }
    async function save(path, body) {
        const fingerprint = path + JSON.stringify(body);
        if (!attempts.has(fingerprint)) attempts.set(fingerprint, crypto.randomUUID());
        const result = await api(path, 'POST', body, attempts.get(fingerprint));
        attempts.delete(fingerprint); return result;
    }
    function button(label, callback) {
        const item = node('button', label); item.type = 'button'; item.className = 'zs-btn';
        item.onclick = async () => { item.disabled = true; try { await callback(); await load(); } catch (error) { notice(error.message, true); } finally { item.disabled = false; } };
        return item;
    }
    function addLine() {
        if (el('buyLines').children.length >= 50) { notice('الحد الأقصى 50 صنفاً.', true); return; }
        const row = node('tr'), product = node('select'), quantity = node('input'), cost = node('input');
        product.name = 'product'; product.required = true; product.setAttribute('aria-label', 'الصنف');
        products.forEach(p => { const option = node('option', p.name); option.value = p.id; product.append(option); });
        quantity.type = 'number'; quantity.name = 'quantity'; quantity.min = '1'; quantity.max = '1000000'; quantity.step = '1'; quantity.required = true; quantity.value = '1'; quantity.setAttribute('aria-label', 'كمية الصنف');
        cost.type = 'number'; cost.name = 'unit_cost'; cost.min = '0'; cost.max = '10000000'; cost.step = '0.01'; cost.required = true; cost.inputMode = 'decimal'; cost.setAttribute('aria-label', 'تكلفة الوحدة بالجنيه');
        [product, quantity, cost].forEach(input => { const cell = node('td'); cell.append(input); row.append(cell); input.oninput = () => { dirty = true; total(); }; });
        const action = node('td'), remove = node('button', 'حذف السطر'); remove.type = 'button'; remove.className = 'zs-btn'; remove.onclick = () => { row.remove(); dirty = true; total(); }; action.append(remove); row.append(action); el('buyLines').append(row);
    }
    function lines() { return Array.from(el('buyLines').children).map(row => ({ product_id: row.querySelector('select').value, quantity: Number(row.querySelector('[name=quantity]').value), unit_minor: Math.round(Number(row.querySelector('[name=unit_cost]').value) * 100) })); }
    function total() { el('buyTotal').textContent = money(lines().reduce((sum, line) => sum + line.quantity * line.unit_minor, 0)); }
    async function load() {
        const data = await api(''); products = data.products;
        const selected = el('buySupplier').value; el('buySupplier').replaceChildren();
        if (!data.suppliers.length) { const option = node('option', 'أضف مورداً أولاً'); option.value = ''; el('buySupplier').append(option); }
        data.suppliers.forEach(s => { const option = node('option', s.name); option.value = s.id; el('buySupplier').append(option); });
        if (data.suppliers.some(s => s.id === selected)) el('buySupplier').value = selected;
        el('supplierCount').textContent = 'الموردون المسجلون: ' + data.suppliers.length;
        const root = el('buyOrders'); root.replaceChildren();
        if (!data.orders.length) { const empty = node('p', 'ابدأ بإضافة مورد ثم احفظ أول أمر شراء.'); empty.className = 'buy-empty'; root.append(empty); }
        data.orders.forEach(order => {
            const card = node('details'); card.className = 'buy-order';
            const heading = node('summary', order.supplier_name + ' — ' + money(order.total_minor)); const badge = node('span', states[order.status]); badge.className = 'buy-status'; heading.append(badge); card.append(heading);
            card.append(node('p', 'رقم الأمر: ' + order.id), node('p', new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeZone: 'Africa/Cairo' }).format(new Date(Number(order.created_at)))));
            order.lines.forEach(line => card.append(node('p', line.name_snapshot + ' × ' + line.quantity + ' — ' + money(line.unit_minor) + ' للوحدة')));
            if (order.notes) card.append(node('p', order.notes));
            if (order.receipt_reference) card.append(node('p', 'مرجع الاستلام: ' + order.receipt_reference));
            const actions = node('div'); actions.className = 'buy-actions';
            if (order.status === 'draft') actions.append(button('اعتماد الأمر', async () => { if (!confirm('اعتماد أمر ' + order.supplier_name + ' بقيمة ' + money(order.total_minor) + '؟')) return; await api('/orders/' + order.id, 'PATCH', { status: 'approved' }); notice('تم اعتماد الأمر.'); }));
            if (['draft','approved'].includes(order.status)) actions.append(button('إلغاء الأمر', async () => { if (!confirm('إلغاء أمر الشراء؟')) return; await api('/orders/' + order.id, 'PATCH', { status: 'cancelled' }); notice('أُلغي الأمر.'); }));
            card.append(actions);
            if (order.status === 'approved') {
                const form = node('form'); form.className = 'buy-fields';
                const label = node('label', 'مرجع إذن الاستلام'); const reference = node('input'); reference.id = 'receipt-' + order.id; reference.name = 'receipt_reference'; reference.autocomplete = 'off'; reference.required = true; reference.maxLength = 120; label.htmlFor = reference.id;
                const checkLabel = node('label', 'استلمت كامل الكميات وفحصتها'); const checkbox = node('input'); checkbox.type = 'checkbox'; checkbox.required = true; checkbox.style.width = 'auto'; checkLabel.prepend(checkbox);
                const submit = node('button', 'تسجيل الاستلام وزيادة المخزون'); submit.className = 'zs-btn'; submit.type = 'submit';
                form.append(label, reference, checkLabel, submit);
                form.oninput = () => { dirty = true; };
                form.onsubmit = async event => { event.preventDefault(); submit.disabled = true; try { await save('/orders/' + order.id + '/receive', { reference: reference.value }); notice('سُجّل الاستلام وزاد المخزون.'); await load(); } catch (error) { notice(error.message, true); } finally { submit.disabled = false; } };
                card.append(form);
            }
            root.append(card);
        });
    }
    async function submit(event, path, body) {
        event.preventDefault(); const submitButton = event.target.querySelector('[type=submit],button:not([type])'); submitButton.disabled = true;
        try { await save(path, body); event.target.reset(); dirty = false; if (path === '/orders') { el('buyLines').replaceChildren(); addLine(); total(); } await load(); notice('تم الحفظ.'); } catch (error) { notice(error.message, true); } finally { submitButton.disabled = false; }
    }
    el('buySupplierForm').onsubmit = event => submit(event, '/suppliers', { name: el('supplierName').value, contact: el('supplierContact').value });
    el('buyOrderForm').onsubmit = event => submit(event, '/orders', { supplier_id: el('buySupplier').value, notes: el('buyNotes').value, lines: lines() });
    el('buyOrderForm').oninput = () => { dirty = true; };
    el('buySupplierForm').oninput = () => { dirty = true; };
    window.addEventListener('beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
    el('buyAddLine').onclick = () => { addLine(); dirty = true; };
    el('buyRefresh').onclick = async () => { if (!ready) return; if (dirty && !confirm('يوجد إدخال غير محفوظ. تحديث السجل قد يغلق نموذج الاستلام. هل تريد المتابعة؟')) return; try { await load(); notice('السجل محدث.'); } catch (error) { notice(error.message, true); } };
    (async () => {
        try {
            const response = await fetch('/api/store/admin/session', { credentials: 'same-origin' }), session = await response.json();
            if (!response.ok || !session.authenticated || session.staff.role !== 'admin') { notice('سجّل الدخول بحساب المدير لعرض المشتريات.'); return; }
            csrf = session.csrf || ''; await load(); addLine(); total(); ready = true; el('buyWorkspace').hidden = false; notice('مساحة المشتريات جاهزة.');
        } catch (error) { notice(error.message, true); }
    })();
})();
