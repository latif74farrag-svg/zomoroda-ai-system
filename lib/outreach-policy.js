// This policy is required before introducing any production messaging adapter.
function outreachDecision({ sector, productType, retailPrice, channel, consent, optedOut, lastContactAt, lastWhatsappAt, batchCount = 0, breakStartedAt, now = Date.now() }) {
    sector = ({ agents: 'pharmacies', mommies: 'moms', companies: 'supplies', distributors: 'distribution' })[sector] || sector;
    if (!consent || optedOut) return { allowed: false, reason: 'consent' };
    if (!['whatsapp', 'email'].includes(channel)) return { allowed: false, reason: 'channel' };
    if (lastContactAt && now - lastContactAt < 30 * 86400000) return { allowed: false, reason: '30_days' };
    const time = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Cairo', weekday: 'short', hour: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(now)).map(part => [part.type, part.value]));
    if (time.weekday === 'Fri' || Number(time.hour) < 9 || Number(time.hour) >= 18) return { allowed: false, reason: 'working_hours' };
    if (sector === 'pharmacies' && productType !== 'ronza_wipes') return { allowed: false, reason: 'catalog' };
    if (['hotels', 'supplies'].includes(sector) && !['private_label', 'fragrance', 'drying_towels'].includes(productType)) return { allowed: false, reason: 'catalog' };
    if (['moms', 'retail'].includes(sector) && !retailPrice) return { allowed: false, reason: 'retail_prices_only' };
    if (!['pharmacies', 'hotels', 'supplies', 'moms', 'retail', 'salon', 'hypermarkets', 'distribution'].includes(sector)) return { allowed: false, reason: 'sector' };
    if (channel === 'whatsapp' && batchCount >= 5 && (!breakStartedAt || now - breakStartedAt < 1800000)) return { allowed: false, reason: 'batch_break' };
    if (channel === 'whatsapp' && lastWhatsappAt && now - lastWhatsappAt < 600000) return { allowed: false, reason: 'message_spacing' };
    return { allowed: true };
}
module.exports = { outreachDecision };
