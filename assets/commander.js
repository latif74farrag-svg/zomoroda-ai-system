/* global window, document, crypto, fetch */
(function () {
    'use strict';
    var csrf = '', types = [], options = {}, initialized = false, requestKey = null;
    var statuses = { NEW: 'جديدة', ASSIGNED: 'موزعة', RUNNING: 'قيد العمل', AWAITING_APPROVAL: 'بانتظار الموافقة', APPROVED: 'معتمدة', EXECUTING: 'قيد التنفيذ', COMPLETED: 'مكتملة', FAILED: 'فشلت', REJECTED: 'مرفوضة', CANCELLED: 'ملغاة', EXPIRED: 'انتهت صلاحيتها' };
    var byId = function (id) { return document.getElementById('cm-' + id); };
    function node(tag, text) { var el = document.createElement(tag); if (text !== undefined) el.textContent = String(text); return el; }
    async function api(path, method, body, key) {
        var headers = { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf };
        if (key) headers['Idempotency-Key'] = key;
        var response = await fetch('/api/v1/admin/commander' + path, { method: method || 'GET', headers: headers, body: body === undefined ? undefined : JSON.stringify(body) });
        var result = await response.json();
        if (!response.ok) throw new Error(result.error || 'تعذر تنفيذ الطلب.');
        return result;
    }
    function notice(message) { byId('notice').textContent = message; }
    function selectField(name, label, items, describe) {
        var select = node('select'); select.name = name; select.required = true;
        select.appendChild(new Option('اختر…', ''));
        items.forEach(function (item) { select.appendChild(new Option(describe(item), item.id)); });
        field(label, select);
    }
    function field(label, input) {
        var wrap = node('label', label); wrap.appendChild(input); byId('fields').appendChild(wrap); return input;
    }
    function inputField(name, label, kind, value, max) {
        var input = node(kind === 'textarea' ? 'textarea' : 'input'); input.name = name; input.required = true;
        if (kind !== 'textarea') input.type = kind;
        if (kind === 'number') { input.min = 0; input.step = 1; input.max = max || 100000000000; }
        else input.maxLength = max || 1000;
        if (value !== undefined) input.value = value;
        return field(label, input);
    }
    function renderFields() {
        requestKey = null;
        byId('fields').replaceChildren();
        var type = byId('type').value;
        if (type === 'manager.report' || type === 'bi.report') inputField('days', 'الفترة بالأيام', 'number', 1, 90).min = 1;
        if (type === 'pricing.simulate') {
            selectField('productId', 'المنتج', options.products || [], function (p) { return p.name; });
            inputField('costMinor', 'تكلفة الوحدة بالقروش', 'number');
            inputField('discountBps', 'الخصم (100 = 1٪)', 'number', 0, 10000);
        }
        if (type === 'crm.note' || type === 'crm.create_opportunity') {
            selectField('leadId', 'العميل (آخر 300 سجل)', options.leads || [], function (l) { return (l.name || 'عميل') + ' — ' + l.contact; });
            if (type === 'crm.note') inputField('note', 'الملاحظة', 'textarea');
            else { inputField('title', 'عنوان فرصة البيع', 'text', undefined, 180); inputField('valueMinor', 'القيمة المتوقعة بالقروش', 'number', 0); }
        }
        if (type === 'crm.update_opportunity') {
            selectField('opportunityId', 'فرصة البيع (آخر 100 فرصة)', options.opportunities || [], function (o) { return o.title; });
            var stage = node('select'); stage.name = 'stage';
            [['new','جديدة'],['qualified','مؤهلة'],['quoted','عرض سعر'],['won','ناجحة'],['lost','خاسرة']].forEach(function (s) { stage.appendChild(new Option(s[1], s[0])); });
            field('المرحلة الجديدة', stage); inputField('valueMinor', 'القيمة بالقروش', 'number', 0);
        }
        var tool = types.find(function (t) { return t.type === type; });
        byId('policy').textContent = tool && tool.approval ? 'ستُعرض البيانات للمراجعة قبل أي تحديث.' : 'تُنفذ هذه المهمة داخلياً عند تشغيل الوكيل ومعالجة الطابور.';
    }
    function button(label, action) {
        var el = node('button', label); el.type = 'button'; el.className = 'btn';
        el.onclick = async function () { el.disabled = true; try { await action(); } catch (e) { notice(e.message); } finally { el.disabled = false; } };
        return el;
    }
    function taskActions(task, cell) {
        cell.appendChild(button('التفاصيل والدليل', async function () {
            var data = await api('/tasks/' + encodeURIComponent(task.id));
            var detail = byId('detail'); detail.replaceChildren(node('h3', 'تفاصيل المهمة ومراجعتها'));
            var labels = { task: 'المهمة وبياناتها', events: 'سجل التوزيع والمراجعة' };
            Object.keys(labels).forEach(function (key) {
                detail.appendChild(node('h4', labels[key])); var pre = node('pre', JSON.stringify(data[key], null, 2)); pre.dir = 'auto'; detail.appendChild(pre);
            });
            detail.hidden = false; detail.focus();
        }));
        if (task.status === 'AWAITING_APPROVAL') ['approved','rejected'].forEach(function (decision) {
            cell.appendChild(button(decision === 'approved' ? 'موافقة' : 'رفض', async function () {
                var data = await api('/tasks/' + encodeURIComponent(task.id));
                if (decision === 'approved' && !window.confirm('اعتماد هذه البيانات؟\n' + JSON.stringify(data.task.input, null, 2))) return;
                await api('/tasks/' + encodeURIComponent(task.id) + '/review', 'POST', { decision: decision });
                notice('تم تسجيل قرار المراجعة.'); await refresh();
            }));
        });
        if (task.status === 'FAILED' && task.attempts < 5) cell.appendChild(button('إعادة المحاولة', async function () { await api('/tasks/' + encodeURIComponent(task.id) + '/retry', 'POST', {}); notice('أعيدت المهمة إلى الطابور.'); await refresh(); }));
        if (!['COMPLETED','REJECTED','CANCELLED','EXPIRED'].includes(task.status)) cell.appendChild(button('إلغاء', async function () { await api('/tasks/' + encodeURIComponent(task.id) + '/cancel', 'POST', {}); notice('أُلغيت المهمة.'); await refresh(); }));
    }
    async function refresh() {
        var data = await api('/overview');
        types = data.types;
        var table = byId('rows'); table.replaceChildren();
        byId('summary').textContent = data.counts.map(function (c) { return (statuses[c.status] || c.status) + ': ' + c.count; }).join('، ') || 'لا توجد مهام بعد. اختر عملاً لإنشاء أول مهمة.';
        data.tasks.forEach(function (task) {
            var tr = node('tr'); var tool = types.find(function (t) { return t.type === task.type; });
            [tool ? tool.label : task.type, task.assigned_agent, statuses[task.status] || task.status, task.attempts, new Date(task.due_at).toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' })].forEach(function (value) { tr.appendChild(node('td', value)); });
            var actions = node('td'); taskActions(task, actions); tr.appendChild(actions); table.appendChild(tr);
        });
        if (!initialized) {
            options = await api('/options');
            types.forEach(function (t) { byId('type').appendChild(new Option(t.label, t.type)); });
            byId('type').onchange = renderFields;
            byId('form').addEventListener('input', function () { requestKey = null; });
            byId('refresh').onclick = async function () { try { options = await api('/options'); renderFields(); await refresh(); } catch (e) { notice(e.message); } };
            byId('form').onsubmit = async function (event) {
                event.preventDefault(); var submit = byId('submit'); submit.disabled = true;
                try {
                    var input = {}, form = byId('form');
                    byId('fields').querySelectorAll('[name]').forEach(function (el) { input[el.name] = el.type === 'number' ? Number(el.value) : el.value; });
                    if (byId('type').value === 'crm.update_opportunity') { var opportunity = options.opportunities.find(function (o) { return o.id === input.opportunityId; }); if (!opportunity) throw new Error('حدّث القوائم ثم اختر فرصة بيع.'); input.expectedUpdatedAt = Number(opportunity.updated_at); }
                    var body = { type: byId('type').value, input: input, priority: Number(form.elements.priority.value) };
                    if (form.elements.dependsOn.value.trim()) body.dependsOn = form.elements.dependsOn.value.trim();
                    // Reuse the same key after a network failure; editing any field creates a new operation.
                    requestKey = requestKey || crypto.randomUUID();
                    var response = await api('/tasks', 'POST', body, requestKey);
                    notice('حُفظت المهمة: ' + response.task.id + ' — ' + statuses[response.task.status]);
                    requestKey = null; await refresh();
                } catch (e) { notice(e.message); } finally { submit.disabled = false; }
            };
            initialized = true; renderFields();
        }
    }
    window.ZomorodaCommander = { load: async function (token) { csrf = token; try { await refresh(); } catch (e) { notice(e.message); } } };
})();
