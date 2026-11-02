const { propose } = require('./agents');

const SLOTS = [
    { hour: 10, key: 'morning', title: 'منشور الصباح: المعطرات وفوط النظافة', text: 'نظافة وانتعاش يدوم في بيتك ومكان عملك. معطرات جو وأرضيات وفوط تنشيف من الزمردة كوزماتيكس. للتفاصيل راسلنا.' },
    { hour: 16, key: 'afternoon', title: 'منشور العصر: الوايبس للأطفال والعائلات', text: 'مناديل مبللة آمنة وعملية للأطفال والعائلة. اختاري رونزا أو يونو من الزمردة كوزماتيكس. للتفاصيل راسلنا.' },
    { hour: 21, key: 'evening', title: 'منشور المساء: فرصة العمل من البيت', text: 'عايزة دخل إضافي من بيتك بدون رأس مال؟ انضمي لفريق سيدات الزمردة بعمولة على كل بيع وفرصة الترقية لمشرفة فريق. راسلينا للتفاصيل.' }
];

function cairoNow(now) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Cairo', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', hourCycle: 'h23' }).formatToParts(new Date(now)).map(part => [part.type, part.value]));
    return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day), hour: Number(parts.hour) };
}

// Proposals the general manager and ads agents would raise right now. Pure, so it is easy to test.
function duePlans(now = Date.now()) {
    const { year, month, day, hour } = cairoNow(now);
    const plans = [];
    if (day === 1) plans.push({ agent: 'manager', sourceId: `reminder:month:${year}-${month}`, proposal: { tool: 'reminder', kind: 'monthly', text: `بداية شهر ${month}/${year}: حدد ميزانية الحملات وعروض الخصم لهذا الشهر.` } });
    if (month === 3 && day >= 14 && day <= 21) plans.push({ agent: 'manager', sourceId: `reminder:mothers:${year}`, proposal: { tool: 'reminder', kind: 'mothers_day', text: 'موسم عيد الأم: جهّز عروضاً على معطرات الجو والمنظفات والوايبس.' } });
    if (month === 12 && day >= 20) plans.push({ agent: 'manager', sourceId: `reminder:newyear:${year}`, proposal: { tool: 'reminder', kind: 'new_year', text: 'موسم رأس السنة: أطلق عروض الفنادق والمطاعم والهايبرات.' } });
    const slot = [...SLOTS].reverse().find(item => hour >= item.hour);
    if (slot) plans.push({ agent: 'ads', sourceId: `post:${year}-${month}-${day}:${slot.key}`, proposal: { tool: 'post_draft', title: slot.title, sector: 'social', channel: 'social', product_type: 'organic', message: slot.text } });
    return plans;
}

// Idempotent: propose() ignores a source id that already exists, and a paused agent is skipped.
async function tick(database, now = Date.now()) {
    const result = { proposed: 0, skipped: 0 };
    for (const plan of duePlans(now)) {
        if ((await database.execute({ sql: 'SELECT 1 FROM agent_tasks WHERE agent = ? AND source_id = ?', args: [plan.agent, plan.sourceId] })).rows.length) continue;
        try { await propose(database, plan.agent, plan.sourceId, { slot: plan.sourceId }, plan.proposal, `${plan.agent}-v1`); result.proposed++; }
        catch (error) { if (error.status === 503) result.skipped++; else throw error; }
    }
    return result;
}

module.exports = { SLOTS, duePlans, tick };
