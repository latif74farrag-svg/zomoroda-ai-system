// Outreach agent: proposes ONE message per eligible lead (WhatsApp or email). Nothing is sent from here.
// Flow: plan -> Guardian (propose) -> staff approval -> Guardian (execute, daily limit) -> outbox row -> channel sender (hours, spacing, break).
const crypto = require('node:crypto');
const { BaseAgent } = require('./base-agent');
const { normalizeContact } = require('../leads');
const { listTemplates } = require('../templates');
const outbox = require('../outbox');
const { fail } = require('../commerce');

const DAY = 86400000;
const SECTOR_PRODUCT = { pharmacies: 'ronza_wipes', hotels: 'private_label', supplies: 'private_label', moms: 'retail_catalog', retail: 'retail_catalog', salon: 'catalog', hypermarkets: 'catalog', distribution: 'catalog' };
const SIGNATURE = '\n\nالزمردة كوزماتيكس';
const SUBJECT = 'عرض من الزمردة كوزماتيكس';

function validateSend(channel) {
    return args => {
        const contact = normalizeContact(args.contact);
        if (!contact || contact.channel !== channel) fail(400, 'Invalid contact');
        const text = String(args.text || '').trim();
        if (!text || text.length > 1500) fail(400, 'Invalid message text');
        if (!SECTOR_PRODUCT[args.sector]) fail(400, 'Invalid sector');
        // deferTiming: the sender enforces hours/spacing/break when it actually sends.
        return { tool: args.tool, contact: contact.key, name: String(args.name || '').slice(0, 120), sector: args.sector, productType: SECTOR_PRODUCT[args.sector], retailPrice: ['moms', 'retail'].includes(args.sector), text, deferTiming: true };
    };
}
const sendTool = (name, channel, action) => ({
    name, kind: 'propose', action, validate: validateSend(channel),
    async run(ctx, args) {
        const { created } = await outbox.enqueue(ctx.db, { channel, recipient: args.contact, subject: channel === 'email' ? SUBJECT : '', body: channel === 'email' ? args.text + SIGNATURE : args.text, kind: 'outreach', agent: 'outreach', sector: args.sector, productType: args.productType, taskId: ctx.task.id, now: ctx.now });
        return created ? { ok: true } : { ok: false, reason: 'already_queued' };
    }
});
const tools = [sendTool('send_whatsapp', 'whatsapp', 'outreach_whatsapp'), sendTool('send_email', 'email', 'outreach_email')];

async function eligibleLeads(db, channel, limit, now) {
    return (await db.execute({
        sql: `SELECT contact_key, name, sector FROM leads
              WHERE consent = 1 AND opted_out = 0 AND channel = ? AND sector != 'unknown'
                AND (last_contact_at IS NULL OR last_contact_at <= ?)
                AND contact_key NOT IN (SELECT contact_key FROM do_not_contact)
                AND contact_key NOT IN (SELECT recipient FROM outbox WHERE status IN ('queued', 'sending'))
              ORDER BY created_at LIMIT ?`,
        args: [channel, now - 30 * DAY, limit]
    })).rows.filter(lead => SECTOR_PRODUCT[lead.sector]);
}

class OutreachAgent extends BaseAgent {
    constructor() { super({ name: 'outreach', version: 'rules-v1', tools }); }
    async plan(ctx, job) {
        const payload = JSON.parse(job.payload || '{}');
        const channel = payload.channel === 'email' ? 'email' : 'whatsapp';
        const limit = Math.min(Math.max(Number(payload.limit) || 5, 1), 20);
        const cycle = Math.floor(ctx.now / (30 * DAY)); // one proposal per lead per 30-day cycle
        const result = { proposed: 0, blocked: 0, noTemplate: 0 };
        for (const lead of await eligibleLeads(ctx.db, channel, limit, ctx.now)) {
            const templates = await listTemplates(ctx.db, lead.sector);
            if (!templates.length) { result.noTemplate++; continue; }
            // Deterministic pick: the same lead always gets the same wording, different leads get variety.
            const index = crypto.createHash('sha256').update(lead.contact_key).digest().readUInt16BE(0) % templates.length;
            const toolName = channel === 'email' ? 'send_email' : 'send_whatsapp';
            const outcome = await this.submit(ctx, {
                sourceId: `outreach:${channel}:${lead.contact_key}:${cycle}`, action: channel === 'email' ? 'outreach_email' : 'outreach_whatsapp', subject: lead.contact_key,
                evidence: { lead: lead.name || lead.contact_key, sector: lead.sector, channel },
                proposal: { tool: toolName, title: `رسالة ${channel === 'email' ? 'إيميل' : 'واتساب'} إلى ${lead.name || lead.contact_key}`, contact: lead.contact_key, name: lead.name, sector: lead.sector, text: templates[index].body, productType: SECTOR_PRODUCT[lead.sector], retailPrice: ['moms', 'retail'].includes(lead.sector), deferTiming: true }
            });
            outcome.blocked ? result.blocked++ : result.proposed++;
        }
        const { audit } = require('../commerce');
        const { transaction } = require('../storage');
        await transaction(ctx.db, tx => audit(tx, 'agent:outreach', 'outreach.planned', channel, result));
    }
}
module.exports = new OutreachAgent();
module.exports.eligibleLeads = eligibleLeads;
