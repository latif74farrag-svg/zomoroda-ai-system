// Agent #2: Data Refinement. Deterministic cleanup of the leads table. It proposes one batch of fixes; nothing changes until staff approve,
// every update is optimistic (applies only if the field still has the value the agent saw), and nothing is ever deleted.
const crypto = require('node:crypto');
const { BaseAgent } = require('./base-agent');
const { SECTOR_LABELS, classifySector, normalizeContact } = require('../leads');
const { fail } = require('../commerce');

const SCAN_LIMIT = 500;
const MAX_FIXES = 200;
const FIELDS = ['sector', 'name', 'opted_out'];

function cleanName(name) {
    const cleaned = String(name || '').replace(/[​-‏‪-‮⁠﻿]/g, '').replace(/\s+/g, ' ').trim();
    return /\p{L}/u.test(cleaned) ? cleaned : ''; // digits-only or emoji-only names carry no information
}

async function scanLeads(db) {
    const leads = (await db.execute({ sql: "SELECT contact_key, name, notes, sector, opted_out FROM leads ORDER BY CASE WHEN sector = 'unknown' THEN 0 ELSE 1 END, updated_at DESC LIMIT ?", args: [SCAN_LIMIT] })).rows;
    const blocked = new Set((await db.execute('SELECT contact_key FROM do_not_contact')).rows.map(row => row.contact_key));
    const fixes = [];
    for (const lead of leads) {
        const push = (field, from, to, rule) => { if (fixes.length < MAX_FIXES) fixes.push({ contact_key: lead.contact_key, field, from, to, rule }); };
        if (!Number(lead.opted_out)) {
            if (blocked.has(lead.contact_key)) { push('opted_out', 0, 1, 'do_not_contact'); continue; }
            const contact = normalizeContact(lead.contact_key);
            if (!contact || contact.key !== lead.contact_key) { push('opted_out', 0, 1, 'invalid_contact'); continue; }
        }
        if (lead.sector === 'unknown') {
            const guess = classifySector(`${lead.name} ${lead.notes}`);
            if (guess !== 'unknown') push('sector', 'unknown', guess, 'classify_sector');
        }
        const name = cleanName(lead.name);
        if (name !== lead.name) push('name', lead.name, name, 'clean_name');
    }
    return fixes;
}

const tools = [
    { name: 'scan_leads', kind: 'read', run: ctx => scanLeads(ctx.db) },
    {
        name: 'apply_lead_fixes', kind: 'propose', action: 'apply_fixes',
        validate(args) {
            if (!Array.isArray(args.fixes) || !args.fixes.length || args.fixes.length > MAX_FIXES) fail(400, 'Invalid fix list');
            for (const fix of args.fixes) {
                if (typeof fix.contact_key !== 'string' || !FIELDS.includes(fix.field)) fail(400, 'Invalid fix');
                if (fix.field === 'sector' && !SECTOR_LABELS[fix.to]) fail(400, 'Invalid sector');
                if (fix.field === 'opted_out' && (fix.from !== 0 || fix.to !== 1)) fail(400, 'Invalid opt-out fix');
            }
            return args;
        },
        async run(ctx, args) {
            let applied = 0, skipped = 0;
            for (const fix of args.fixes) {
                let result;
                if (fix.field === 'opted_out') {
                    result = await ctx.db.execute({ sql: "UPDATE leads SET opted_out = 1, stage = 'opted_out', notes = CASE WHEN notes = '' THEN ? ELSE notes END, updated_at = ? WHERE contact_key = ? AND opted_out = 0", args: [fix.rule, ctx.now, fix.contact_key] });
                } else {
                    result = await ctx.db.execute({ sql: `UPDATE leads SET ${fix.field} = ?, updated_at = ? WHERE contact_key = ? AND ${fix.field} = ?`, args: [fix.to, ctx.now, fix.contact_key, fix.from] });
                }
                Number(result.rowsAffected) === 1 ? applied++ : skipped++;
            }
            await require('../commerce').audit(ctx.db, `agent:refinement`, 'refinement.applied', 'leads', { applied, skipped, approvedBy: ctx.approvedBy });
            return { ok: true, applied, skipped };
        }
    }
];

class DataRefinementAgent extends BaseAgent {
    constructor() { super({ name: 'refinement', version: 'rules-v1', tools }); }
    async plan(ctx) {
        const fixes = await this.call(ctx, 'scan_leads', {});
        if (!fixes.length) return;
        // The id is a digest of the fixes, so an identical batch is never proposed twice.
        const digest = crypto.createHash('sha256').update(JSON.stringify(fixes)).digest('hex').slice(0, 32);
        const counts = fixes.reduce((total, fix) => ({ ...total, [fix.rule]: (total[fix.rule] || 0) + 1 }), {});
        await this.submit(ctx, { sourceId: `refine:${digest}`, action: 'apply_fixes', subject: 'leads', evidence: { counts, total: fixes.length }, proposal: { tool: 'apply_lead_fixes', fixes } });
    }
}
module.exports = new DataRefinementAgent();
module.exports.scanLeads = scanLeads;
module.exports.cleanName = cleanName;
