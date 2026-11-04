function getAgentsHtml() {
    return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="theme-color" content="#0b3d2e">
    <title>متابعة الوكلاء | الزمردة</title>
    <style>
        :root{--green:#0b3d2e;--green2:#176b4a;--mint:#eaf4ed;--ink:#172b22;--muted:#62746a;--line:#e1e9e3;--bg:#f4f7f5;--white:#fff;--amber:#855d15;--red:#8c3831;--shadow:0 12px 32px #123b2b0d}
        *{box-sizing:border-box}
        body{margin:0;background:var(--bg);color:var(--ink);font-family:Tahoma,Arial,sans-serif;line-height:1.6}
        a{color:inherit}
        a:focus-visible,button:focus-visible,select:focus-visible,summary:focus-visible{outline:3px solid #e6b34c;outline-offset:3px}
        .topbar{background:var(--green);color:white}
        .topbar-inner{width:min(1180px,calc(100% - 36px));min-height:76px;margin:auto;display:flex;align-items:center;justify-content:space-between;gap:20px}
        .brand{display:flex;align-items:center;gap:12px;font-weight:800}
        .brand-mark{width:42px;height:42px;border-radius:13px;background:#1a7050;display:grid;place-items:center;font-size:23px}
        .brand small{display:block;color:#b9d8c8;font-size:12px;font-weight:500}
        nav{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
        nav a{padding:9px 12px;border-radius:9px;color:#e3f1e8;text-decoration:none;font-size:14px}
        nav a:hover,nav a[aria-current=page]{background:#ffffff1a;color:white}
        main{width:min(1180px,calc(100% - 36px));margin:32px auto 60px}
        .hero{padding:29px;border-radius:22px;background:linear-gradient(120deg,#0b3d2e,#176b4a);color:white;box-shadow:0 18px 38px #123b2b20}
        .eyebrow{font-size:13px;font-weight:700;color:#c5e7d2}
        h1{font-size:clamp(28px,4vw,38px);line-height:1.25;margin:8px 0}
        .hero p{max-width:780px;margin:0;color:#e1f0e7;line-height:1.9}
        .notice{margin:16px 0;padding:13px 15px;border:1px solid #d6e5d9;border-radius:12px;background:#edf6ef;color:#315d42}
        .notice.error{border-color:#f0d4c8;background:#fff2ec;color:#853d25}
        .stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:13px;margin:17px 0}
        .stat,.panel{background:var(--white);border:1px solid var(--line);border-radius:16px;box-shadow:var(--shadow)}
        .stat{padding:17px}.stat span{display:block;color:var(--muted);font-size:13px}.stat strong{display:block;margin-top:5px;color:var(--green);font-size:25px}
        .panel{padding:21px;margin-top:17px}
        .panel-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:12px}
        h2{margin:0;font-size:20px}
        .muted{margin:5px 0 0;color:var(--muted);font-size:13px;line-height:1.8}
        .agents-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
        .agent{padding:16px;border:1px solid var(--line);border-radius:14px;background:#fcfdfc}
        .agent-top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
        .agent h3{margin:0;font-size:16px}
        .agent-counts{display:flex;gap:8px;flex-wrap:wrap;margin:13px 0;color:var(--muted);font-size:12px}
        .pill{display:inline-flex;align-items:center;gap:6px;padding:5px 9px;border-radius:99px;background:#edf1ee;color:#526259;font-size:12px;font-weight:750}
        .pill.ready{background:#e8f5eb;color:#23683e}.pill.warn{background:#fff3dc;color:var(--amber)}
        .btn{border:0;border-radius:9px;padding:9px 12px;background:var(--green2);color:white;font:inherit;font-weight:700;cursor:pointer}
        .btn.secondary{background:#edf3ef;color:#315441}.btn.danger{background:#fff0eb;color:var(--red)}
        .btn:disabled{opacity:.55;cursor:wait}
        .toolbar{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:14px 0}
        select{max-width:100%;border:1px solid #ccd8cf;border-radius:9px;padding:9px 11px;background:white;color:var(--ink);font:inherit}
        .task{margin:11px 0;padding:16px;border:1px solid var(--line);border-radius:14px;background:#fff}
        .task-top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
        .task h3{margin:0;font-size:15px}
        .task-meta{margin-top:5px;color:var(--muted);font-size:12px;line-height:1.8}
        .task-summary{margin:10px 0 0;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.8}
        .task-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
        details{margin-top:12px;border-top:1px solid var(--line);padding-top:10px}
        summary{cursor:pointer;color:var(--green2);font-weight:700;font-size:13px}
        .technical{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px}
        .technical h4{margin:0 0 5px;font-size:12px;color:var(--muted)}
        pre{max-height:300px;overflow:auto;margin:0;padding:11px;border-radius:9px;background:#f4f7f5;white-space:pre-wrap;overflow-wrap:anywhere;direction:ltr;text-align:left;font:12px/1.6 ui-monospace,Consolas,monospace}
        .audit-list{display:grid;gap:8px}
        .audit-item{display:grid;grid-template-columns:minmax(150px,.6fr) minmax(0,1.4fr);gap:10px;padding:12px;border-radius:11px;background:#f7faf8}
        .audit-time{color:var(--muted);font-size:12px}.audit-description{font-size:13px;overflow-wrap:anywhere}
        .empty{padding:24px;text-align:center;border:1px dashed #cbd9ce;border-radius:12px;color:var(--muted)}
        .hidden{display:none!important}
        @media(max-width:850px){.stats{grid-template-columns:repeat(2,minmax(0,1fr))}.agents-grid{grid-template-columns:1fr}}
        @media(max-width:600px){.topbar-inner{padding:14px 0;align-items:flex-start;flex-direction:column;gap:10px}nav{gap:2px}nav a{padding:8px}main{margin-top:22px}.hero{padding:23px 20px}.panel{padding:16px}.technical{grid-template-columns:1fr}.audit-item{grid-template-columns:1fr;gap:3px}}
        @media(max-width:380px){.stats{grid-template-columns:1fr}}
    </style>
</head>
<body>
    <header class="topbar">
        <div class="topbar-inner">
            <div class="brand"><span class="brand-mark" aria-hidden="true">✦</span><span>الزمردة<small>متابعة الوكلاء</small></span></div>
            <nav aria-label="التنقل الرئيسي">
                <a href="/store/manager">الرئيسية</a>
                <a href="/store/campaigns">الحملات</a>
                <a href="/store/channels">القنوات</a>
                <a href="/store/operations">العمليات</a>
            </nav>
        </div>
    </header>
    <main>
        <section class="hero">
            <div class="eyebrow">حالة التشغيل | المقترحات | سجل الإجراءات</div>
            <h1>متابعة وكلاء الذكاء الاصطناعي</h1>
            <p>تابع حالة كل وكيل، ومقترحاته، وما تمت مراجعته أو تنفيذه. الوكلاء لا يرسلون رسائل ولا ينفذون إجراءات حساسة دون موافقة بشرية.</p>
        </section>
        <div id="notice" class="notice" role="status" aria-live="polite">جارٍ تحميل بيانات المتابعة…</div>
        <section class="stats" aria-label="ملخص الوكلاء">
            <article class="stat"><span>الوكلاء المهيأون</span><strong id="agentCount">—</strong></article>
            <article class="stat"><span>مقترحات بانتظار المراجعة</span><strong id="pendingCount">—</strong></article>
            <article class="stat"><span>مهام مسجلة</span><strong id="taskCount">—</strong></article>
            <article class="stat"><span>العامل الخلفي</span><strong id="workerState">—</strong></article>
        </section>
        <section class="panel">
            <div class="panel-head"><div><h2>حالة الوكلاء</h2><p class="muted">الإيقاف العام يعلّق معالجة المهام الجديدة ولا يحذف الطابور.</p></div></div>
            <div id="controls" class="agents-grid"></div>
        </section>
        <section class="panel">
            <div class="panel-head"><div><h2>المقترحات والمهام</h2><p class="muted">أحدث 100 مهمة. افتح التفاصيل التقنية لمعرفة المصدر والأدلة ونسخة الوكيل ومخرجاته.</p></div><button id="refresh" class="btn secondary" type="button">تحديث المتابعة</button></div>
            <div class="toolbar"><label for="taskFilter">عرض الحالة</label><select id="taskFilter"><option value="all">كل الحالات</option><option value="proposed">بانتظار المراجعة</option><option value="approved">تمت الموافقة</option><option value="executed">تم التنفيذ</option><option value="rejected">مرفوض</option></select></div>
            <div id="tasks"></div>
        </section>
        <section class="panel">
            <div class="panel-head"><div><h2>سجل نشاط الوكلاء</h2><p class="muted">أحدث الإجراءات المسجلة في سجل المراجعة، بما فيها إنشاء المقترح والموافقة والتنفيذ.</p></div></div>
            <div id="audit"></div>
        </section>
        <section class="panel">
            <div class="panel-head"><div><h2>حالة المهام الخلفية</h2><p class="muted">نبضة العامل وحالة الطابور تساعدان على اكتشاف التأخر أو توقف المعالجة.</p></div></div>
            <div id="jobSummary" class="muted">جارٍ تحميل حالة الطابور…</div>
            <div id="jobs"></div>
        </section>
    </main>
    <script>
        let csrf = '';
        let agentData = { controls: [], tasks: [] };
        let auditEntries = [];
        let selectedStatus = 'all';
        const el = id => document.getElementById(id);
        const names = { global:'الإيقاف العام', inventory:'وكيل المخزون', orders:'وكيل الطلبات', support:'وكيل الدعم', marketing:'وكيل التسويق', manager:'المدير العام', ads:'وكيل الإعلانات', sales:'وكيل المبيعات', affiliate:'وكيل الماميز' };
        const descriptions = {
            global:'مفتاح إيقاف شامل لمعالجة الوكلاء.',
            inventory:'ينبه الفريق لمراجعة المخزون المنخفض؛ لا يشتري من المورد.',
            orders:'يقترح تأكيد الطلبات؛ لا يغيّر حالتها قبل الموافقة.',
            support:'يعد مسودات ردود للدعم لتراجعها الموظفة. استخدام النموذج اختياري.',
            marketing:'يقترح مسودات حملات تحفظ بعد الموافقة؛ لا يرسل للعملاء.',
            manager:'يذكّرك بأول الشهر ومواسم عيد الأم ورأس السنة. التذكير يُغلق بعد اطلاعك.',
            ads:'يقترح 3 منشورات يومياً (10 ص و4 م و9 م) بدون أسعار. تُحفظ مسودة بعد موافقتك للنشر اليدوي.',
            sales:'يصنّف العميل ويجهز مسودة الرد والفاتورة من صفحة العملاء؛ لا يرسل للعملاء.',
            affiliate:'شجرة الماميز: ترقية المشرفة عند 5 مندوبات وحساب العمولات من صفحة الماميز.'
        };
        const statuses = { proposed:'بانتظار المراجعة', approved:'تمت الموافقة — بانتظار التنفيذ', executed:'تم التنفيذ', rejected:'مرفوض' };
        const actionNames = {
            'agent.proposed':'أنشأ الوكيل مقترحاً',
            'agent.approved':'وافق الموظف على المقترح',
            'agent.rejected':'رفض الموظف المقترح',
            'agent.executed':'نفّذ الوكيل الإجراء المعتمد',
            'marketing.campaign.created_from_agent':'حُفظت مسودة حملة من مقترح وكيل'
        };
        function setNotice(message, error = false) {
            el('notice').textContent = message;
            el('notice').classList.toggle('error', error);
        }
        async function api(url, method = 'GET', body) {
            const response = await fetch(url, {
                method,
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
                body: body === undefined ? undefined : JSON.stringify(body)
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || 'تعذر تحميل بيانات متابعة الوكلاء (' + response.status + ').');
            return data;
        }
        function time(value) {
            const timestamp = Number(value);
            return Number.isFinite(timestamp) && timestamp > 0
                ? new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(timestamp))
                : 'غير متاح';
        }
        function parseJson(value) {
            if (typeof value !== 'string') return value && typeof value === 'object' ? value : {};
            try {
                const parsed = JSON.parse(value);
                return parsed && typeof parsed === 'object' ? parsed : {};
            } catch {
                return {};
            }
        }
        function make(tag, text, className) {
            const node = document.createElement(tag);
            if (className) node.className = className;
            if (text !== undefined) node.textContent = text;
            return node;
        }
        function statePill(text, style) {
            return make('span', text, 'pill' + (style ? ' ' + style : ''));
        }
        function renderControls() {
            const root = el('controls');
            root.replaceChildren();
            const globalPaused = agentData.controls.some(item => item.agent === 'global' && item.paused);
            const taskCounts = Object.fromEntries(Object.keys(names).map(agent => [agent, agentData.tasks.filter(task => task.agent === agent)]));
            agentData.controls.forEach(control => {
                const card = make('article', undefined, 'agent');
                const top = make('div', undefined, 'agent-top');
                const title = make('div');
                title.append(make('h3', names[control.agent] || control.agent));
                title.append(make('p', descriptions[control.agent] || 'وكيل مهام داخلية.', 'muted'));
                const paused = Boolean(control.paused || (control.agent !== 'global' && globalPaused));
                top.append(title, statePill(paused ? 'متوقف' : 'يعمل', paused ? 'warn' : 'ready'));
                const counts = taskCounts[control.agent] || [];
                const proposed = counts.filter(task => task.status === 'proposed').length;
                const meta = make('div', undefined, 'agent-counts');
                meta.append(statePill('المهام المسجلة: ' + counts.length));
                meta.append(statePill('بانتظار المراجعة: ' + proposed, proposed ? 'warn' : ''));
                if (control.agent !== 'global' && globalPaused) meta.append(statePill('الإيقاف العام مفعّل', 'warn'));
                const button = make('button', control.paused ? 'تشغيل الوكيل' : 'إيقاف مؤقت', 'btn ' + (control.paused ? '' : 'secondary'));
                button.type = 'button';
                button.disabled = control.agent !== 'global' && globalPaused;
                button.title = button.disabled ? 'أوقف الإيقاف العام أولاً.' : '';
                button.onclick = async () => {
                    button.disabled = true;
                    try {
                        await api('/api/v1/admin/agents/' + encodeURIComponent(control.agent), 'PATCH', { paused: !control.paused });
                        await load();
                    } catch (error) {
                        setNotice(error.message, true);
                        button.disabled = false;
                    }
                };
                card.append(top, meta, button);
                root.append(card);
            });
        }
        function taskCard(task) {
            const proposal = parseJson(task.proposal);
            const evidence = parseJson(task.evidence);
            const box = make('article', undefined, 'task');
            const top = make('div', undefined, 'task-top');
            const heading = make('div');
            heading.append(make('h3', proposal.title || names[task.agent] || task.agent));
            heading.append(make('div', [names[task.agent] || task.agent, time(task.created_at), 'نسخة ' + (task.version || 'غير معروفة')].join(' · '), 'task-meta'));
            const statusClass = task.status === 'proposed' ? 'warn' : task.status === 'executed' ? 'ready' : '';
            top.append(heading, statePill(statuses[task.status] || task.status, statusClass));
            box.append(top);
            const summary = proposal.message || proposal.summary || proposal.text || proposal.title || task.task_key || '';
            if (summary) box.append(make('p', summary, 'task-summary'));
            const details = document.createElement('details');
            details.append(make('summary', 'تفاصيل المهمة والأدلة'));
            const metadata = make('div', undefined, 'task-meta');
            metadata.append(make('div', 'معرّف المهمة: ' + task.id));
            metadata.append(make('div', 'المصدر: ' + (task.source_id || 'غير متاح')));
            if (task.approved_by) metadata.append(make('div', 'اعتمدها الموظف: ' + task.approved_by));
            details.append(metadata);
            const technical = make('div', undefined, 'technical');
            const evidenceBlock = make('div');
            evidenceBlock.append(make('h4', 'المدخلات / الأدلة'));
            evidenceBlock.append(make('pre', JSON.stringify(evidence, null, 2)));
            const proposalBlock = make('div');
            proposalBlock.append(make('h4', 'مخرجات الوكيل'));
            proposalBlock.append(make('pre', JSON.stringify(proposal, null, 2)));
            technical.append(evidenceBlock, proposalBlock);
            details.append(technical);
            box.append(details);
            if (task.status === 'proposed') {
                const actions = make('div', undefined, 'task-actions');
                for (const [label, decision, style] of [['موافقة', 'approved', ''], ['رفض', 'rejected', 'danger']]) {
                    const button = make('button', label, 'btn ' + style);
                    button.type = 'button';
                    button.onclick = async () => {
                        button.disabled = true;
                        try {
                            await api('/api/v1/admin/agent-tasks/' + encodeURIComponent(task.id) + '/review', 'POST', { decision });
                            await load();
                        } catch (error) {
                            setNotice(error.message, true);
                            button.disabled = false;
                        }
                    };
                    actions.append(button);
                }
                box.append(actions);
            }
            return box;
        }
        function renderTasks() {
            const rows = agentData.tasks.filter(task => selectedStatus === 'all' || task.status === selectedStatus);
            const root = el('tasks');
            root.replaceChildren();
            if (!rows.length) {
                root.append(make('div', selectedStatus === 'all' ? 'لا توجد مهام مسجلة بعد. ستظهر المهام عندما يعالج العامل الخلفي أحداث المتجر.' : 'لا توجد مهام بهذه الحالة.', 'empty'));
                return;
            }
            rows.forEach(task => root.append(taskCard(task)));
        }
        function renderAudit() {
            const root = el('audit');
            root.replaceChildren();
            const rows = auditEntries.filter(entry => String(entry.actor).startsWith('agent:') || String(entry.action).startsWith('agent.') || entry.action === 'marketing.campaign.created_from_agent');
            if (!rows.length) {
                root.append(make('div', 'لا توجد إجراءات للوكلاء في سجل المراجعة بعد.', 'empty'));
                return;
            }
            const list = make('div', undefined, 'audit-list');
            rows.forEach(entry => {
                const item = make('article', undefined, 'audit-item');
                item.append(make('time', time(entry.created_at), 'audit-time'));
                item.append(make('div', (entry.icon || '') + ' ' + (entry.text || actionNames[entry.action] || entry.action), 'audit-description'));
                list.append(item);
            });
            root.append(list);
        }
        function renderOperations(operations) {
            const age = operations.workerHeartbeatAgeMs;
            el('workerState').textContent = age === null ? 'غير متصل' : age < 120000 ? 'متصل' : 'نبضة قديمة';
            const jobs = operations.jobs || [];
            el('jobSummary').textContent = jobs.length
                ? jobs.map(job => job.status + ': ' + job.count).join(' · ') + (age === null ? ' · لم تصل نبضة من العامل.' : ' · عمر آخر نبضة: ' + Math.max(0, Math.round(age / 1000)) + ' ثانية.')
                : (age === null ? 'لا توجد نبضة من العامل، ولا توجد مهام مسجلة في الطابور.' : 'لا توجد مهام معلقة حالياً. آخر نبضة منذ ' + Math.max(0, Math.round(age / 1000)) + ' ثانية.');
        }
        function renderJobs(jobs) {
            const root = el('jobs');
            root.replaceChildren();
            if (!jobs.length) {
                root.append(make('div', 'لا توجد مهام معلقة أو فاشلة حالياً.', 'empty'));
                return;
            }
            jobs.forEach(job => {
                const item = make('article', undefined, 'task');
                const top = make('div', undefined, 'task-top');
                const heading = make('div');
                heading.append(make('h3', job.type));
                heading.append(make('div', 'عدد المحاولات: ' + job.attempts + ' · موعد المحاولة: ' + time(job.available_at), 'task-meta'));
                top.append(heading, statePill(job.status, job.status === 'dead' ? 'warn' : ''));
                item.append(top);
                if (job.last_error) item.append(make('p', 'تفاصيل الخطأ: ' + job.last_error, 'task-meta'));
                if (job.status === 'dead') {
                    const retry = make('button', 'إعادة المهمة إلى الطابور', 'btn secondary');
                    retry.type = 'button';
                    retry.onclick = async () => {
                        retry.disabled = true;
                        try {
                            await api('/api/v1/admin/jobs/' + encodeURIComponent(job.id) + '/retry', 'POST', {});
                            await load();
                        } catch (error) {
                            setNotice(error.message, true);
                            retry.disabled = false;
                        }
                    };
                    item.append(retry);
                }
                root.append(item);
            });
        }
        async function load() {
            try {
                const session = await api('/api/store/admin/session');
                csrf = session.csrf || '';
                if (!session.authenticated || session.staff.role !== 'admin') {
                    setNotice('سجّل الدخول بحساب المدير لمتابعة الوكلاء وسجل إجراءاتهم.', true);
                    return;
                }
                const [agents, audit, operations, jobs] = await Promise.all([
                    api('/api/v1/admin/agents'),
                    api('/api/v1/admin/audit'),
                    api('/api/v1/admin/operations'),
                    api('/api/v1/admin/jobs')
                ]);
                agentData = agents;
                auditEntries = audit.entries || [];
                el('agentCount').textContent = agents.controls.filter(control => control.agent !== 'global').length;
                el('pendingCount').textContent = agents.tasks.filter(task => task.status === 'proposed').length;
                el('taskCount').textContent = agents.tasks.length;
                renderControls();
                renderTasks();
                renderAudit();
                renderOperations(operations);
                renderJobs(jobs.jobs || []);
                setNotice('تم تحميل حالة الوكلاء والمهام وسجل المراجعة.');
            } catch (error) {
                setNotice(error.message, true);
            }
        }
        el('taskFilter').onchange = event => {
            selectedStatus = event.target.value;
            renderTasks();
        };
        el('refresh').onclick = () => load();
        load();
    </script>
</body>
</html>`;
}
module.exports = { getAgentsHtml };
