// Single source of truth for "what agents exist and what state are they in".
// The agents page and the live-activity feed both read overview(), so they can never disagree.
const { transaction } = require('./storage');
const { audit, enqueue, fail } = require('./commerce');

// kind 'queue'      : runs inside the worker; a pause makes it skip new jobs (queue keeps them).
// kind 'standalone' : separate process (WhatsApp sender, scraper) that checks isPaused() before acting.
const ROSTER = [
    { key: 'manager', name: 'المدير العام', kind: 'queue', about: 'يذكّرك بأول الشهر ومواسم عيد الأم ورأس السنة. التذكير يُغلق بعد اطلاعك.', runs: [{ key: 'default', label: 'فحص المواعيد الآن' }] },
    { key: 'ads', name: 'وكيل الإعلانات', kind: 'queue', about: 'يقترح 3 منشورات يومياً (10 ص و4 م و9 م) بدون أسعار. تُحفظ مسودة بعد موافقتك للنشر اليدوي.', runs: [{ key: 'default', label: 'فحص المواعيد الآن' }] },
    { key: 'marketing', name: 'وكيل التسويق', kind: 'queue', about: 'يقترح مسودات حملات تحفظ بعد الموافقة؛ لا يرسل للعملاء.' },
    { key: 'sales', name: 'وكيل المبيعات', kind: 'queue', about: 'يصنّف العميل ويجهز مسودة الرد والفاتورة من صفحة العملاء؛ لا يرسل للعملاء.' },
    { key: 'orders', name: 'وكيل الطلبات', kind: 'queue', about: 'يقترح تأكيد الطلبات؛ لا يغيّر حالتها قبل الموافقة.' },
    { key: 'inventory', name: 'وكيل المخزون', kind: 'queue', about: 'ينبه الفريق لمراجعة المخزون المنخفض؛ لا يشتري من المورد.' },
    { key: 'support', name: 'وكيل الدعم', kind: 'queue', about: 'يعد مسودات ردود للدعم لتراجعها الموظفة. استخدام النموذج اختياري.' },
    { key: 'affiliate', name: 'وكيل الماميز', kind: 'queue', about: 'شجرة الماميز: ترقية المشرفة عند 5 مندوبات وحساب العمولات من صفحة الماميز.' },
    { key: 'refinement', name: 'وكيل تنظيف البيانات', kind: 'queue', about: 'يقترح تصحيح بيانات العملاء المحتملين (القطاع والاسم وقائمة عدم المراسلة). لا يحذف شيئاً ولا يطبّق إلا بعد موافقتك.', runs: [{ key: 'default', label: 'تنظيف العملاء الآن' }] },
    { key: 'aggregator', name: 'وكيل تجميع الطلبات', kind: 'queue', about: 'يجمع طلبات القنوات الخارجية ويقترح تحويلها إلى طلبات متجر. لا يُنشأ أي طلب إلا بعد موافقتك.', runs: [{ key: 'default', label: 'سحب طلبات القنوات الآن' }] },
    { key: 'outreach', name: 'وكيل المراسلة', kind: 'queue', about: 'يقترح رسالة لكل عميل مؤهل (موافقة مسجلة، مرور 30 يوماً، قطاع معروف). لا يرسل شيئاً: كل رسالة تنتظر موافقتك ثم تمر بالحارس وحدود اليوم.', runs: [{ key: 'whatsapp', label: 'اقتراح رسائل واتساب' }, { key: 'email', label: 'اقتراح رسائل إيميل' }] },
    { key: 'whatsapp', name: 'وكيل واتساب', kind: 'standalone', about: 'يرسل الرسائل المعتمدة من الصادر بمواعيد العمل (9 ص – 6 م ماعدا الجمعة) وفاصل 10 دقائق واستراحة 30 دقيقة بعد كل 5 رسائل، ويسجل الرسائل الواردة ويحترم طلبات الإيقاف.' },
    { key: 'email', name: 'وكيل الإيميل', kind: 'queue', about: 'يرسل الإيميلات المعتمدة من الصادر عبر بريد الشركة، مع رابط إلغاء اشتراك في كل رسالة. عند الإيقاف تبقى الرسائل في الطابور.' },
    { key: 'social', name: 'وكيل السوشيال', kind: 'queue', about: 'يستقبل رسائل ماسنجر وإنستجرام وتليجرام ويجهز مسودة رد تعتمدها أنت. لا يبدأ محادثة أبداً، والرد مسموح خلال 24 ساعة من رسالة العميل.' },
    { key: 'scraper', name: 'وكيل البحث والاستكشاف', kind: 'standalone', about: 'يبحث عن عملاء محتملين على المنصات. عند الإيقاف لا تبدأ عمليات بحث جديدة.' }
];
const KEYS = new Set(['global', ...ROSTER.map(agent => agent.key)]);
const FAILURE_ACTIONS = ['agent.error', 'agent.blocked', 'agent.whatsapp.failed', 'agent.email.failed', 'agent.social.failed'];
const { CONTROL } = require('./outbox');
const DAY = 86400000;

// One definition of state, used everywhere:
//   stopped = global kill switch on | paused = this agent off | active = acted in the last 24h | ready = on, nothing to do yet
function effectiveState({ globalPaused, paused, actions24h }) {
    if (globalPaused) return 'stopped';
    if (paused) return 'paused';
    return actions24h > 0 ? 'active' : 'ready';
}

// Is the thing this agent depends on actually connected? Shown as a badge so "on" never hides "but not set up".
function setupStatus(key, heartbeats, now) {
    if (key === 'whatsapp') { const beat = heartbeats.whatsapp_heartbeat; return beat && now - beat < 180000 ? { ok: true, text: 'واتساب متصل' } : { ok: false, text: 'جلسة واتساب غير متصلة (شغّل خدمة واتساب وامسح رمز QR)' }; }
    if (key === 'email') return require('./mailer').configured() ? { ok: true, text: 'بريد الشركة (SMTP) مضبوط' } : { ok: false, text: 'أضف SMTP_HOST وSMTP_USER وSMTP_PASS لتفعيل الإرسال' };
    if (key === 'social') {
        const status = require('./channels/social').configured();
        const names = [status.meta && 'ماسنجر/إنستجرام', status.telegram && 'تليجرام'].filter(Boolean);
        return names.length ? { ok: true, text: 'مربوط: ' + names.join(' و') } : { ok: false, text: 'أضف مفاتيح Meta أو Telegram في الإعدادات للربط' };
    }
    return null;
}

async function overview(database, now = Date.now()) {
    const since = now - DAY;
    const controls = (await database.execute('SELECT * FROM agent_controls')).rows;
    const control = key => controls.find(row => row.agent === key);
    const taskRows = (await database.execute('SELECT agent, status, COUNT(*) AS n FROM agent_tasks GROUP BY agent, status')).rows;
    const activity = (await database.execute({ sql: "SELECT actor, MAX(created_at) AS last_at, COUNT(*) AS n FROM audit_log WHERE actor LIKE 'agent:%' AND created_at > ? GROUP BY actor", args: [since] })).rows;
    const failures = (await database.execute({ sql: `SELECT actor, COUNT(*) AS n FROM audit_log WHERE actor LIKE 'agent:%' AND created_at > ? AND action IN (${FAILURE_ACTIONS.map(() => '?').join(',')}) GROUP BY actor`, args: [since, ...FAILURE_ACTIONS] })).rows;
    const heartbeat = (await database.execute("SELECT value FROM system_state WHERE key = 'worker_heartbeat'")).rows[0];
    const heartbeats = Object.fromEntries((await database.execute("SELECT key, value FROM system_state WHERE key = 'whatsapp_heartbeat'")).rows.map(row => [row.key, Number(row.value)]));
    const dead = (await database.execute("SELECT COUNT(*) AS n FROM jobs WHERE status = 'dead'")).rows[0];
    const outboxRows = (await database.execute({ sql: "SELECT channel, status, COUNT(*) AS n, SUM(CASE WHEN sent_at > ? THEN 1 ELSE 0 END) AS recent FROM outbox GROUP BY channel, status", args: [since] })).rows;
    const globalRow = control('global');
    const globalPaused = Boolean(globalRow && Number(globalRow.paused));
    const agents = ROSTER.map(def => {
        const row = control(def.key);
        const act = activity.find(item => item.actor === `agent:${def.key}`);
        const counts = Object.fromEntries(taskRows.filter(item => item.agent === def.key).map(item => [item.status, Number(item.n)]));
        const paused = Boolean(row && Number(row.paused));
        const actions24h = act ? Number(act.n) : 0;
        const mine = outboxRows.filter(item => CONTROL[item.channel] === def.key);
        const sumOf = (status, field = 'n') => mine.filter(item => item.status === status).reduce((total, item) => total + Number(item[field] || 0), 0);
        return {
            key: def.key, name: def.name, about: def.about, kind: def.kind, runs: def.runs || [], setup: setupStatus(def.key, heartbeats, now),
            outbox: mine.length || ['whatsapp', 'email', 'social'].includes(def.key) ? { queued: sumOf('queued'), sent_24h: sumOf('sent', 'recent'), failed: sumOf('failed') } : null,
            paused, paused_reason: row?.paused_reason || '', paused_by: row?.paused_by || null, paused_at: row?.paused_at ? Number(row.paused_at) : null,
            state: effectiveState({ globalPaused, paused, actions24h }),
            actions_24h: actions24h, last_at: act ? Number(act.last_at) : null,
            failures_24h: Number(failures.find(item => item.actor === `agent:${def.key}`)?.n || 0),
            tasks: { proposed: counts.proposed || 0, approved: counts.approved || 0, executed: counts.executed || 0, rejected: counts.rejected || 0 }
        };
    });
    return {
        global: { paused: globalPaused, paused_reason: globalRow?.paused_reason || '', paused_by: globalRow?.paused_by || null, paused_at: globalRow?.paused_at ? Number(globalRow.paused_at) : null },
        agents,
        summary: {
            total: agents.length,
            active: agents.filter(agent => agent.state === 'active').length,
            ready: agents.filter(agent => agent.state === 'ready').length,
            paused: agents.filter(agent => agent.state === 'paused').length,
            pending_review: agents.reduce((sum, agent) => sum + agent.tasks.proposed, 0),
            failures_24h: agents.reduce((sum, agent) => sum + agent.failures_24h, 0),
            dead_jobs: Number(dead.n),
            worker_heartbeat_age_ms: heartbeat ? now - Number(heartbeat.value) : null
        }
    };
}

async function setPaused(database, agent, paused, actor, reason = '') {
    if (!KEYS.has(agent) || typeof paused !== 'boolean') fail(400, 'Invalid agent control');
    const note = String(reason || '').trim().slice(0, 200);
    await transaction(database, async tx => {
        const result = await tx.execute({
            sql: 'UPDATE agent_controls SET paused = ?, paused_reason = ?, paused_by = ?, paused_at = ? WHERE agent = ?',
            args: [paused ? 1 : 0, paused ? note : '', actor, Date.now(), agent]
        });
        if (!Number(result.rowsAffected)) fail(404, 'Agent control not found');
        await audit(tx, actor, 'agent.control', agent, { paused, ...(paused && note ? { reason: note } : {}) });
    });
}

// Used by standalone processes. Fails closed: if the control cannot be read, the agent must not act.
async function isPaused(database, agent) {
    try {
        const rows = (await database.execute({ sql: "SELECT agent, paused FROM agent_controls WHERE agent IN ('global', ?)", args: [agent] })).rows;
        return rows.length < 2 || rows.some(row => Number(row.paused));
    } catch { return true; }
}

// Real action behind the "run now" button. Never bypasses pause or approval: results are proposals.
async function runNow(database, agent, actor, option = 'default') {
    const def = ROSTER.find(item => item.key === agent);
    if (!def?.runs?.some(run => run.key === option)) fail(400, 'هذا الوكيل لا يعمل عند الطلب.');
    if (!await require('./agents').enabled(database, agent)) fail(409, 'الوكيل موقوف أو الإيقاف العام مفعّل. شغّله أولاً.');
    let message;
    if (agent === 'manager' || agent === 'ads') {
        const result = await require('./manager-agent').tick(database);
        message = result.proposed ? `تم إنشاء ${result.proposed} مقترح جديد بانتظار مراجعتك.` : 'لا توجد مقترحات جديدة مستحقة الآن.';
    } else if (agent === 'refinement') {
        await transaction(database, tx => enqueue(tx, `refine:manual:${Date.now()}`, 'leads.refine', {}));
        message = 'بدأ تنظيف العملاء، وستظهر المقترحات خلال لحظات.';
    } else if (agent === 'outreach') {
        await transaction(database, tx => enqueue(tx, `outreach:manual:${option}:${Date.now()}`, 'outreach.plan', { channel: option, limit: 5 }));
        message = 'بدأ اقتراح الرسائل، وستظهر في تبويب المقترحات خلال لحظات.';
    } else if (agent === 'aggregator') {
        if (!require('./integrations/shopify').configured()) fail(409, 'لا توجد قناة متصلة للسحب. استورد ملف طلبات من صفحة القنوات.');
        await transaction(database, tx => enqueue(tx, `poll:shopify:manual:${Date.now()}`, 'channel.poll', { channel: 'shopify' }));
        message = 'بدأ سحب طلبات Shopify.';
    }
    await transaction(database, tx => audit(tx, actor, 'agent.run_now', agent, {}));
    return { message };
}

// Approve or reject every waiting proposal of one agent in one click (bounded, each goes through the normal review rules).
async function reviewAll(database, agent, decision, actor) {
    if (!ROSTER.some(item => item.key === agent)) fail(400, 'Invalid agent');
    if (!['approved', 'rejected'].includes(decision)) fail(400, 'Invalid decision');
    const { review } = require('./agents');
    const ids = (await database.execute({ sql: "SELECT id FROM agent_tasks WHERE agent = ? AND status = 'proposed' ORDER BY created_at LIMIT 50", args: [agent] })).rows;
    let done = 0;
    for (const { id } of ids) {
        try { await review(database, id, decision, actor); done++; }
        catch (error) { if (error.status !== 409) throw error; }
    }
    return { reviewed: done };
}

module.exports = { ROSTER, KEYS, overview, setPaused, isPaused, runNow, reviewAll, effectiveState };
