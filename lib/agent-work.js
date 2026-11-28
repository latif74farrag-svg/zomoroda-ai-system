// What "run all agents now" does for every agent. Each worker returns { status, message } and never
// claims more than it did: 'done' = new records saved, 'idle' = checked, nothing eligible,
// 'external' = runs in its own process or channel, 'skipped' = cannot run now (paused or needs input).
const DAY = 86400000;
const agents = () => require('./agents');
const result = (status, message, created = 0) => ({ status, message, created });

async function drain(database, now, limit = 8) {
    const { runOnce } = require('./queue');
    for (let i = 0; i < limit && await runOnce(database, job => agents().coordinate(database, job), now); i++);
}
async function count(database, sql, args = []) { return Number((await database.execute({ sql, args })).rows[0].n); }

// Marketing: one campaign-draft proposal per sector that has consenting leads, once a week, with
// the sector's own catalog (pharmacies get Ronza wipes only). Nothing is sent; staff approval is still required.
async function marketing(database, now) {
    const library = require('./marketing');
    const sectors = Object.keys(library.sectors).filter(key => !['social', 'moms', 'retail'].includes(key));
    const rows = (await database.execute({ sql: `SELECT sector, COUNT(*) AS n FROM leads WHERE consent = 1 AND opted_out = 0 AND sector IN (${sectors.map(() => '?').join(',')}) GROUP BY sector ORDER BY n DESC LIMIT 3`, args: sectors })).rows;
    if (!rows.length) return result('idle', 'لا توجد قطاعات بعملاء موافقين على التواصل لإعداد مسودة حملة.');
    const week = Math.floor(now / (7 * DAY));
    let created = 0;
    for (const { sector, n } of rows) {
        const source = `manual:marketing:${sector}:${week}`;
        if (await count(database, 'SELECT COUNT(*) AS n FROM agent_tasks WHERE agent = ? AND source_id = ?', ['marketing', source])) continue;
        const product = Object.keys(library.sectors[sector].products)[0];
        await agents().propose(database, 'marketing', source, { trigger: 'manual', consenting_leads: Number(n) }, { tool: 'campaign_draft', title: `حملة ${library.sectors[sector].label}`.slice(0, 120), sector, channel: 'whatsapp', product_type: product, message: library.draftMessage(sector, product) }, 'marketing-v1');
        created++;
    }
    return created ? result('done', `${created} مسودة حملة بانتظار مراجعتك (كل قطاع بكتالوجه الخاص).`, created) : result('idle', 'سبق إعداد مسودات هذا الأسبوع لكل القطاعات المؤهلة.');
}
// CRM scores every lead (rules, no cost) and labels where it should go. Scores are internal; nothing is sent.
async function crm(database, def, actor, now) {
    const scoring = require('./lead-scoring');
    const summary = await scoring.scoreAll(database, now);
    if (!summary.scored) return result('idle', 'لا يوجد عملاء محتملون لتقييمهم بعد. استورد عملاء من صفحة العملاء.');
    await require('./commerce').audit(database, 'agent:crm', 'crm.scored', 'leads', summary);
    return result(summary.changed ? 'done' : 'idle', `قُيّم ${summary.scored} عميلاً: ${summary.hot} ساخن و${summary.warm} دافئ و${summary.cold} بارد (تغيّر تقييم ${summary.changed}).`, summary.changed);
}
// Sales works from the scored queue (scores are kept fresh by the crm agent and the worker): the hot leads a person should call first.
async function sales(database) {
    const hot = await require('./lead-scoring').topLeads(database, { priority: 'hot', limit: 5 });
    const waiting = await count(database, 'SELECT COUNT(*) AS n FROM leads WHERE opted_out = 0 AND last_contact_at IS NULL');
    if (!hot.length) return result('idle', `لا يوجد عملاء ساخنون الآن. ${waiting} عميلاً لم يُتواصل معهم بعد.`);
    return result('idle', `${hot.length} عملاء ساخنون يستحقون المتابعة الآن: ${hot.map(lead => lead.name || 'بدون اسم').join('، ')}. (${waiting} لم يُتواصل معهم بعد)`);
}
async function affiliate(database) {
    const total = await count(database, 'SELECT COUNT(*) AS n FROM affiliates');
    const ready = await count(database, "SELECT COUNT(*) AS n FROM (SELECT a.phone FROM affiliates a JOIN affiliates r ON r.supervisor_phone = a.phone WHERE a.role = 'representative' GROUP BY a.phone HAVING COUNT(*) >= 5)");
    return result('idle', ready ? `${ready} مندوبة مؤهلة للترقية إلى مشرفة (راجع صفحة الماميز). إجمالي المسجلات ${total}.` : `لا ترقيات مستحقة. إجمالي المسجلات ${total}.`);
}
// Standalone processes cannot be started from the web server; show their verified state instead.
async function whatsapp(database, now) {
    const beat = (await database.execute("SELECT value FROM system_state WHERE key = 'whatsapp_heartbeat'")).rows[0];
    const queued = await count(database, "SELECT COUNT(*) AS n FROM outbox WHERE channel = 'whatsapp' AND status = 'queued'");
    const connected = beat && now - Number(beat.value) < 180000;
    return result('external', connected ? `الجلسة متصلة. ${queued} رسالة معتمدة في الطابور تُرسل بمواعيد العمل.` : `خدمة واتساب غير متصلة (شغّلها وامسح رمز QR). ${queued} رسالة بانتظار الإرسال.`);
}
// Email and social replies are sent by the worker only after approval and inside working hours; "run all" never sends.
const channelQueue = channels => async database => {
    const queued = await count(database, `SELECT COUNT(*) AS n FROM outbox WHERE status = 'queued' AND channel IN (${channels.map(() => '?').join(',')})`, channels);
    return result('external', queued ? `${queued} رسالة معتمدة في الطابور. يرسلها العامل بمواعيد العمل؛ هذا الزر لا يرسل رسائل.` : 'لا رسائل معتمدة في الطابور. الإرسال يتم تلقائياً بعد موافقتك وبمواعيد العمل.');
};
const scraper = async () => result('external', 'يعمل كخدمة منفصلة من صفحة البحث ولا يبدأ من هنا.');
// Commander agents: reports are internal read-only tasks, recorded with evidence like any other task.
async function report(database, def, actor, now, type, input, label) {
    const commander = require('./commander');
    const task = await commander.create(database, { type, input, source: 'run_all', expectedOutcome: label }, actor, `runall-${type.replace(/\./g, '-')}-${Math.floor(now / 3600000)}`, now);
    await drain(database, now);
    const { task: after } = await commander.detail(database, task.id);
    if (after.status === 'COMPLETED') return result('done', `اكتمل ${label} وحُفظ في مركز المهام.`, 1);
    return result(after.status === 'FAILED' ? 'failed' : 'idle', `${label}: الحالة ${after.status}. راجع مركز المهام.`);
}
const needsInput = text => async () => result('skipped', text);

const WORKERS = {
    marketing, sales, crm, affiliate, whatsapp, scraper,
    email: channelQueue(['email']), social: channelQueue(['messenger', 'instagram', 'telegram']),
    bi: (db, def, actor, now) => report(db, def, actor, now, 'bi.report', { days: 1 }, 'تقرير المبيعات والتحصيل'),
    distribution: (db, def, actor, now) => report(db, def, actor, now, 'distribution.report', {}, 'تقرير تغطية القطاعات'),
    procurement: (db, def, actor, now) => report(db, def, actor, now, 'procurement.report', {}, 'تقرير احتياجات التوريد'),
    pricing: needsInput('ينتظر منتجاً وتكلفة: أنشئ محاكاة من مركز المهام.')
};

async function run(database, def, actor, runNow, now = Date.now()) {
    if (!await agents().enabled(database, def.key)) return result('skipped', 'موقوف يدوياً. فعّله من بطاقة الوكيل.');
    if (WORKERS[def.key]) return WORKERS[def.key](database, def, actor, now);
    const options = def.key === 'outreach' ? ['whatsapp', 'email'] : [def.runs?.some(item => item.key === 'instant') ? 'instant' : 'default'];
    const messages = []; let created = 0;
    for (const option of options) { const outcome = await runNow(database, def.key, actor, option); messages.push(outcome.message); created += outcome.created || 0; }
    return result(created ? 'done' : 'idle', [...new Set(messages)].join(' '), created);
}
module.exports = { run, WORKERS };
