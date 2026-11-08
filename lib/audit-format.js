// Turns raw audit_log rows into sentences a manager can read.
// Raw: "agent.control · 35ab78d3-… · global · {"paused":true}"
// Readable: "أحمد أوقف جميع الوكلاء"

const AGENT_NAMES = {
    global: 'جميع الوكلاء',
    marketing: 'وكيل التسويق',
    inventory: 'وكيل المخزون',
    support: 'وكيل الدعم',
    sales: 'وكيل المبيعات',
    manager: 'وكيل المدير العام',
    ads: 'وكيل الإعلانات',
    affiliate: 'وكيل الماميز',
    refinement: 'وكيل تنظيف البيانات',
    aggregator: 'وكيل تجميع الطلبات',
    whatsapp: 'وكيل واتساب',
    scraper: 'وكيل البحث والاستكشاف',
    email: 'وكيل الإيميل',
    outreach: 'وكيل المراسلة',
    social: 'وكيل السوشيال'
};

const ORDER_STATUS = {
    pending: 'قيد المراجعة', confirmed: 'تم التأكيد', shipped: 'تم الشحن', delivered: 'تم التسليم',
    cancelled: 'ملغي', delivery_failed: 'تعذر التسليم', returned: 'مرتجع'
};

const CATEGORIES = {
    agents: 'الوكلاء', whatsapp: 'واتساب والرسائل', search: 'البحث والاستكشاف', marketing: 'التسويق',
    orders: 'الطلبات', inventory: 'المخزون', catalog: 'المنتجات', staff: 'الفريق', system: 'النظام'
};

const PAGES = {
    '/store/manager': 'الرئيسية', '/store/campaigns': 'الحملات', '/store/leads': 'العملاء', '/store/affiliates': 'الماميز',
    '/store/agents': 'إدارة الوكلاء', '/store/channels': 'القنوات', '/store/operations': 'المتجر والمخزون',
    '/store/users': 'المستخدمين', '/store/admin': 'إدارة المنتجات'
};

const money =minor => (Number(minor) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 }) + ' ج.م';
const agentName = key => AGENT_NAMES[key] || (key ? `وكيل ${key}` : 'وكيل');

function parse(details) {
    if (details && typeof details === 'object') return details;
    try { const value = JSON.parse(details || '{}'); return value && typeof value === 'object' ? value : {}; } catch { return {}; }
}

function actorLabel(entry, staffNames) {
    const actor = String(entry.actor || '');
    if (actor.startsWith('agent:')) return agentName(actor.slice(6));
    if (actor === 'guest') return 'زائر المتجر';
    if (actor.startsWith('migration:') || actor.startsWith('bootstrap:') || actor.startsWith('system')) return 'النظام';
    return staffNames.get(actor) || (/^[0-9a-f-]{30,}$/i.test(actor) ? 'موظف' : actor);
}

// Each rule returns { category, tone, icon, text }. `who` is the readable actor name.
const RULES = {
    'agent.control': (e, d, who) => ({ category: 'agents', tone: d.paused ? 'warn' : 'ok', icon: d.paused ? '⏸' : '▶', text: `${who} ${d.paused ? 'أوقف' : 'شغّل'} ${agentName(e.resource)}` }),
    'agent.proposed': (e, d, who) => ({ category: 'agents', tone: 'info', icon: '💡', text: `${who} اقترح إجراءً جديداً بانتظار مراجعتك` }),
    'agent.approved': (e, d, who) => ({ category: 'agents', tone: 'ok', icon: '✓', text: `${who} وافق على مقترح وكيل` }),
    'agent.rejected': (e, d, who) => ({ category: 'agents', tone: 'warn', icon: '✕', text: `${who} رفض مقترح وكيل` }),
    'agent.executed': (e, d, who) => ({ category: 'agents', tone: 'ok', icon: '⚙', text: `${who} نفّذ الإجراء المعتمد` }),
    'agent.model_used': (e, d, who) => ({ category: 'agents', tone: 'info', icon: '🧠', text: `${who} حضّر مسودة رد بالذكاء الاصطناعي` + (d.inputTokens ? ` (${d.inputTokens + (d.outputTokens || 0)} توكن)` : '') }),
    'agent.search': (e, d, who) => ({ category: 'search', tone: 'info', icon: '🔎', text: `${who} بحث عن «${d.query || e.resource}»` + (d.platform ? ` على ${d.platform}` : '') + (d.found !== undefined ? ` ووجد ${d.found} نتيجة` : '') }),
    'agent.lead_found': (e, d, who) => ({ category: 'search', tone: 'ok', icon: '🎯', text: `${who} أضاف عميلاً محتملاً${d.sector ? ' من قطاع ' + d.sector : ''}` }),
    'agent.whatsapp.sent': (e, d, who) => ({ category: 'whatsapp', tone: 'ok', icon: '💬', text: `${who} أرسل رسالة واتساب إلى ${d.to || e.resource}` + (d.count ? ` (الرسالة رقم ${d.count})` : '') }),
    'agent.whatsapp.failed': (e, d, who) => ({ category: 'whatsapp', tone: 'bad', icon: '⚠', text: `${who} فشل إرسال رسالة واتساب إلى ${d.to || e.resource}` + (d.error ? `: ${d.error}` : '') }),
    'agent.whatsapp.rest': (e, d, who) => ({ category: 'whatsapp', tone: 'warn', icon: '☕', text: `${who} في استراحة أمان ${d.minutes || 30} دقيقة بعد 5 رسائل` }),
    'agent.whatsapp.closed_hours': (e, d, who) => ({ category: 'whatsapp', tone: 'warn', icon: '🌙', text: `${who} ينتظر ساعات العمل (9 ص – 6 م) قبل الإرسال` }),
    'agent.whatsapp.connected': (e, d, who) => ({ category: 'whatsapp', tone: 'ok', icon: '🔗', text: `تم ربط واتساب بنجاح` }),
    'agent.email.sent': (e, d, who) => ({ category: 'marketing', tone: 'ok', icon: '✉', text: `${who} أرسل إيميلاً إلى ${d.to || e.resource}` }),
    'agent.email.failed': (e, d, who) => ({ category: 'marketing', tone: 'bad', icon: '⚠', text: `${who} فشل إرسال إيميل إلى ${d.to || e.resource}` + (d.error ? `: ${d.error}` : '') }),
    'agent.social.sent': (e, d, who) => ({ category: 'whatsapp', tone: 'ok', icon: '💬', text: `${who} أرسل رداً إلى ${d.to || e.resource}` }),
    'agent.social.failed': (e, d, who) => ({ category: 'whatsapp', tone: 'bad', icon: '⚠', text: `${who} فشل إرسال رد إلى ${d.to || e.resource}` + (d.error ? `: ${d.error}` : '') }),
    'outbox.cancelled': (e, d, who) => ({ category: 'marketing', tone: 'warn', icon: '🚫', text: `أُلغيت رسالة قبل إرسالها (${{ staff: 'بقرار الموظف', do_not_contact: 'العميل في قائمة عدم المراسلة', opted_out: 'العميل أوقف الرسائل', window_expired: 'انتهت مهلة الرد 24 ساعة', '30_days': 'لم تمر 30 يوماً', consent: 'لا توجد موافقة' }[d.reason] || d.reason || '—'}).` }),
    'outbox.retried': (e, d, who) => ({ category: 'marketing', tone: 'info', icon: '↻', text: `${who} أعاد محاولة رسالة فاشلة` }),
    'outreach.planned': (e, d, who) => ({ category: 'agents', tone: 'info', icon: '📝', text: `${who} جهّز ${d.proposed || 0} رسالة للمراجعة` + (d.blocked ? ` (${d.blocked} حجبها الحارس)` : '') }),
    'inbound.received': (e, d, who) => ({ category: 'whatsapp', tone: 'info', icon: '📥', text: `وصلت رسالة جديدة من عميل عبر ${e.resource}` }),
    'lead.unsubscribed': (e, d, who) => ({ category: 'marketing', tone: 'warn', icon: '✋', text: 'عميل ألغى الاشتراك وتوقفت مراسلته نهائياً' }),
    'lead.opted_out': (e, d, who) => ({ category: 'whatsapp', tone: 'warn', icon: '✋', text: 'عميل طلب إيقاف رسائل واتساب فتم إيقافها نهائياً' }),
    'agent.run_now': (e, d, who) => ({ category: 'agents', tone: 'info', icon: '▶', text: `${who} شغّل ${agentName(e.resource)} يدوياً` }),
    'agent.blocked': (e, d, who) => ({ category: 'agents', tone: 'warn', icon: '🛡', text: `الحارس منع تنفيذ إجراء لـ ${who}` }),
    'agent.campaign.started': (e, d, who) => ({ category: 'marketing', tone: 'info', icon: '🚀', text: `${who} بدأ حملة${d.total ? ` لعدد ${d.total} جهة` : ''}` }),
    'marketing.campaign.created': (e, d, who) => ({ category: 'marketing', tone: 'info', icon: '📣', text: `${who} أنشأ مسودة حملة جديدة` }),
    'marketing.campaign.created_from_agent': (e, d, who) => ({ category: 'marketing', tone: 'info', icon: '📣', text: `${who} حفظ مسودة حملة من مقترح وكيل` }),
    'marketing.campaign.updated': (e, d, who) => ({ category: 'marketing', tone: 'info', icon: '✎', text: `${who} عدّل حملة` }),
    'marketing.campaign.status': (e, d, who) => ({ category: 'marketing', tone: 'info', icon: '📣', text: `${who} غيّر حالة حملة إلى ${d.status || ''}` }),
    'manager.reminder.acknowledged': (e, d, who) => ({ category: 'agents', tone: 'ok', icon: '🔔', text: `${who} اطّلع على تذكير المدير العام` }),
    'order.created': (e, d, who) => ({ category: 'orders', tone: 'info', icon: '🛒', text: `${who} أنشأ طلباً جديداً ${e.resource}` + (d.total_minor ? ` بقيمة ${money(d.total_minor)}` : '') }),
    'order.status': (e, d, who) => ({ category: 'orders', tone: 'info', icon: '📦', text: `${who} غيّر حالة الطلب ${e.resource} من «${ORDER_STATUS[d.from] || d.from}» إلى «${ORDER_STATUS[d.to] || d.to}»` }),
    'cod.collected': (e, d, who) => ({ category: 'orders', tone: 'ok', icon: '💵', text: `${who} حصّل ${money(d.amount_minor)} عن الطلب ${e.resource}` }),
    'inventory.adjusted': (e, d, who) => ({ category: 'inventory', tone: 'info', icon: '▤', text: `${who} ${Number(d.delta) >= 0 ? 'أضاف' : 'خصم'} ${Math.abs(Number(d.delta) || 0)} من مخزون ${e.resource}` + (d.reason ? ` (${d.reason})` : '') }),
    'catalog.saved': (e, d, who) => ({ category: 'catalog', tone: 'info', icon: '🏷', text: `${who} حفظ المنتج ${e.resource}` + (d.price_minor !== undefined ? ` بسعر ${money(d.price_minor)}` : '') + (d.image_changed ? ' وغيّر صورته' : '') + (d.active === false ? ' (مخفي)' : '') }),
    'catalog.visibility': (e, d, who) => ({ category: 'catalog', tone: d.active ? 'ok' : 'warn', icon: d.active ? '👁' : '🚫', text: `${who} ${d.active ? 'أظهر' : 'أخفى'} المنتج ${e.resource}` }),
    'leads.imported': (e, d, who) => ({ category: 'marketing', tone: 'info', icon: '👥', text: `${who} استورد قائمة عملاء` }),
    'sales.draft': (e, d, who) => ({ category: 'agents', tone: 'info', icon: '🧾', text: `${who} جهّز مسودة رد للعميل` }),
    'support.status': (e, d, who) => ({ category: 'orders', tone: 'ok', icon: '🎧', text: `${who} حدّث تذكرة دعم إلى «${d.status === 'resolved' ? 'تم الحل' : d.status}»` }),
    'affiliate.registered': (e, d, who) => ({ category: 'marketing', tone: 'ok', icon: '🌸', text: `${who} سجّل مندوبة جديدة` + (d.promoted ? ' وتمت ترقية مشرفتها' : '') }),
    'affiliate.sale': (e, d, who) => ({ category: 'marketing', tone: 'ok', icon: '🌸', text: `${who} سجّل بيعاً بقيمة ${money(d.amountMinor)} (عمولة ${money(d.directMinor)})` }),
    'staff.page_view': (e, d, who) => ({ category: 'staff', tone: 'info', icon: '🧭', text: `${who} فتح صفحة ${PAGES[e.resource] || e.resource}` }),
    'staff.search': (e, d, who) => ({ category: 'search', tone: 'info', icon: '🔎', text: `${who} بحث عن «${e.resource}»` + (d.page ? ` في ${PAGES[d.page] || d.page}` : '') }),
    'staff.login': (e, d, who) => ({ category: 'staff', tone: 'info', icon: '🔐', text: `${who} سجّل الدخول` }),
    'staff.created': (e, d, who) => ({ category: 'staff', tone: 'info', icon: '👤', text: `${who} أنشأ حساب موظف جديد` }),
    'staff.updated': (e, d, who) => ({ category: 'staff', tone: 'info', icon: '👤', text: `${who} عدّل حساب موظف` + (d.disabled ? ' وعطّله' : '') }),
    'job.retried': (e, d, who) => ({ category: 'system', tone: 'info', icon: '↻', text: `${who} أعاد محاولة مهمة فاشلة` }),
    'pricelist.replaced': (e, d, who) => ({ category: 'catalog', tone: 'info', icon: '🏷', text: `${who} حدّث قائمة الأسعار ${e.resource}` }),
    'legacy.imported': (e, d, who) => ({ category: 'system', tone: 'info', icon: '🗂', text: `${who} استورد بيانات النظام القديم` }),
    'legacy.campaigns.imported': (e, d, who) => ({ category: 'system', tone: 'info', icon: '🗂', text: `${who} استورد حملات النظام القديم` }),
    'customer.recovery_issued': (e, d, who) => ({ category: 'staff', tone: 'warn', icon: '🔑', text: `${who} أصدر رمز استعادة حساب لعميل` }),
    'customer.password_reset': (e, d, who) => ({ category: 'staff', tone: 'info', icon: '🔑', text: `${who} أعاد تعيين كلمة مروره` })
};

function formatEntry(entry, staffNames = new Map()) {
    const details = parse(entry.details);
    const who = actorLabel(entry, staffNames);
    const rule = RULES[entry.action];
    const base = rule
        ? rule(entry, details, who)
        : { category: 'system', tone: 'info', icon: '•', text: `${who}: ${entry.action}` };
    return {
        id: entry.id,
        created_at: Number(entry.created_at),
        actor: entry.actor,
        actor_name: who,
        action: entry.action,
        resource: entry.resource,
        category: base.category,
        category_label: CATEGORIES[base.category],
        tone: base.tone,
        icon: base.icon,
        text: base.text.trim()
    };
}

async function staffNameMap(db) {
    try {
        const rows = (await db.execute('SELECT id, name FROM staff')).rows;
        return new Map(rows.map(row => [row.id, row.name]));
    } catch { return new Map(); }
}

async function formatEntries(db, rows) {
    const names = await staffNameMap(db);
    return rows.map(row => formatEntry(row, names));
}

module.exports = { formatEntry, formatEntries, AGENT_NAMES, CATEGORIES };
