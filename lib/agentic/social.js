// Social agent: turns an inbound Messenger/Instagram/Telegram message into a reply DRAFT for staff approval.
// The wording comes from the existing rules-based sales flow (sector, catalog, price list, invoice). It never starts a conversation.
const { BaseAgent } = require('./base-agent');
const outbox = require('../outbox');
const social = require('../channels/social');
const { fail } = require('../commerce');

const tools = [{
    name: 'reply_social', kind: 'propose', action: 'reply_social',
    validate(args) {
        const text = String(args.text || '').trim();
        if (!['messenger', 'instagram', 'telegram'].includes(args.channel) || !args.recipient || !text || text.length > 1000) fail(400, 'Invalid reply');
        return { tool: 'reply_social', channel: args.channel, recipient: String(args.recipient), text, windowExpiresAt: args.windowExpiresAt ?? null, inboundId: args.inboundId };
    },
    async run(ctx, args) {
        if (args.windowExpiresAt && ctx.now > Number(args.windowExpiresAt)) return { ok: false, reason: 'window_expired' };
        const { created } = await outbox.enqueue(ctx.db, { channel: args.channel, recipient: args.recipient, body: args.text, kind: 'reply', agent: 'social', taskId: ctx.task.id, windowExpiresAt: args.windowExpiresAt, now: ctx.now });
        if (args.inboundId) await ctx.db.execute({ sql: "UPDATE inbound_messages SET status = 'replied' WHERE id = ?", args: [args.inboundId] });
        return created ? { ok: true } : { ok: false, reason: 'already_queued' };
    }
}];

class SocialAgent extends BaseAgent {
    constructor() { super({ name: 'social', version: 'rules-v1', tools }); }
    async plan(ctx, job) {
        const { inboundId } = JSON.parse(job.payload);
        const message = (await ctx.db.execute({ sql: 'SELECT * FROM inbound_messages WHERE id = ?', args: [inboundId] })).rows[0];
        if (!message || message.status !== 'new') return;
        // Prefixing the channel keeps platform ids (which are just numbers) from colliding with phone numbers.
        const draft = await require('../sales').handleMessage(ctx.db, { senderId: `${message.channel}:${message.sender_id}`, message: message.text, channel: message.channel }, 'agent:social');
        const outcome = await this.submit(ctx, {
            sourceId: `reply:${message.id}`, action: 'reply_social', subject: `${message.channel}:${message.sender_id}`,
            evidence: { channel: message.channel, customerMessage: message.text, stage: draft.stage, sector: draft.sector, attachments: draft.attachments, invoice: draft.invoice },
            proposal: { tool: 'reply_social', title: `رد على رسالة ${{ messenger: 'ماسنجر', instagram: 'إنستجرام', telegram: 'تليجرام' }[message.channel]}`, channel: message.channel, recipient: message.sender_id, text: draft.reply, windowExpiresAt: social.windowFor(message.channel, message.received_at), inboundId: message.id }
        });
        await ctx.db.execute({ sql: 'UPDATE inbound_messages SET status = ? WHERE id = ?', args: [outcome.blocked ? 'blocked' : 'drafted', message.id] });
    }
}
module.exports = new SocialAgent();
