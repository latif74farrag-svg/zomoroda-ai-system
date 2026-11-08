// Safe, non-secret settings that staff can change from the agents page. Provider
// credentials deliberately stay in environment variables / the secret manager.
const { transaction } = require('./storage');
const { audit, fail } = require('./commerce');

const BASE = [{ key: 'proposalLimit', label: 'الحد الأقصى للمقترحات في اليوم', help: 'يوقف إنشاء مقترحات جديدة بعد هذا العدد؛ لا يؤثر على المقترحات الموجودة.', min: 1, max: 500, value: 100 }];
const EXTRA = {
    ads: [{ key: 'postingHours', label: 'ساعات اقتراح المنشورات', help: 'أرقام من 0 إلى 23 مفصولة بفواصل، بتوقيت القاهرة.', type: 'hours', value: '10,16,21' }],
    refinement: [{ key: 'scanLimit', label: 'عدد العملاء في كل فحص', help: 'عدد سجلات العملاء التي يفحصها الوكيل في المرة الواحدة.', min: 1, max: 500, value: 500 }, { key: 'maxFixes', label: 'أقصى تصحيحات في المقترح', help: 'كل التصحيحات تظل بانتظار الموافقة.', min: 1, max: 200, value: 200 }],
    outreach: [{ key: 'batchSize', label: 'حجم دفعة المراسلة', help: 'عدد الرسائل المقترحة عند الضغط على تشغيل الآن.', min: 1, max: 20, value: 5 }],
    inventory: [{ key: 'lowStockThreshold', label: 'حد تنبيه المخزون المنخفض', help: 'يقترح مراجعة المنتج عندما يصل المتاح إلى هذا العدد أو أقل.', min: 0, max: 1000000, value: 5 }],
    aggregator: [{ key: 'pollIntervalMinutes', label: 'فاصل سحب طلبات Shopify (دقيقة)', help: 'يُستخدم عند ربط Shopify فقط.', min: 5, max: 1440, value: 60 }]
};

function fields(agent) { return [...BASE, ...(EXTRA[agent] || [])]; }
function defaults(agent) { return Object.fromEntries(fields(agent).map(field => [field.key, field.value])); }
function parseHours(value) {
    const hours = String(value).split(',').map(part => Number(part.trim())).filter(Number.isInteger);
    if (!hours.length || hours.length > 6 || hours.some(hour => hour < 0 || hour > 23)) fail(400, 'ساعات النشر يجب أن تكون أرقاماً من 0 إلى 23.');
    return [...new Set(hours)].sort((a, b) => a - b).join(',');
}
function normalize(agent, input = {}) {
    const result = defaults(agent);
    for (const field of fields(agent)) {
        if (!Object.hasOwn(input, field.key)) continue;
        if (field.type === 'hours') result[field.key] = parseHours(input[field.key]);
        else {
            const value = Number(input[field.key]);
            if (!Number.isInteger(value) || value < field.min || value > field.max) fail(400, `قيمة ${field.label} غير صالحة.`);
            result[field.key] = value;
        }
    }
    return result;
}
async function get(database, agent) {
    const row = (await database.execute({ sql: 'SELECT settings FROM agent_settings WHERE agent = ?', args: [agent] })).rows[0];
    let stored = {};
    try { stored = row ? JSON.parse(row.settings) : {}; } catch (_) { /* use safe defaults */ }
    return normalize(agent, stored);
}
async function all(database) {
    const rows = (await database.execute('SELECT agent, settings FROM agent_settings')).rows;
    const stored = new Map(rows.map(row => {
        try { return [row.agent, JSON.parse(row.settings)]; } catch (_) { return [row.agent, {}]; }
    }));
    return Object.fromEntries([...new Set([...Object.keys(EXTRA), ...rows.map(row => row.agent)])].map(agent => [agent, normalize(agent, stored.get(agent) || {})]));
}
function describe(agent, config) { return fields(agent).map(field => ({ ...field, value: config[field.key] })); }
async function save(database, agent, input, actor) {
    const config = normalize(agent, input);
    await transaction(database, async tx => {
        await tx.execute({ sql: 'INSERT INTO agent_settings(agent, settings, updated_by, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(agent) DO UPDATE SET settings = excluded.settings, updated_by = excluded.updated_by, updated_at = excluded.updated_at', args: [agent, JSON.stringify(config), actor, Date.now()] });
        await audit(tx, actor, 'agent.settings.updated', agent, { settings: config });
    });
    return config;
}
module.exports = { get, all, describe, save, defaults };
