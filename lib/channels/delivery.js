// Delivery for the channels the worker owns: email (company SMTP) and social replies. WhatsApp is delivered by whatsapp_service.js
// because it needs the logged-in WhatsApp Web session. All of them use the same outbox.deliverNext gate.
const outbox = require('../outbox');
const mailer = require('../mailer');
const social = require('./social');
const unsubscribe = require('../unsubscribe');

async function sendEmail(row, env = process.env, transport = mailer.sendMail) {
    const link = unsubscribe.linkFor(row.recipient, env.BASE_URL || '');
    const footer = `\n\n—\nلإيقاف استلام رسائلنا نهائياً اضغط هنا: ${link}`;
    return transport({ to: row.recipient, subject: row.subject || 'الزمردة كوزماتيكس', text: row.body + footer, headers: { 'List-Unsubscribe': `<${link}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } }, env);
}

const deliverEmail = (db, now, deps = {}) => outbox.deliverNext(db, { channels: ['email'], ready: () => mailer.configured(deps.env), send: row => sendEmail(row, deps.env, deps.transport) }, now);
const deliverSocial = (db, now, deps = {}) => outbox.deliverNext(db, { channels: ['messenger', 'instagram', 'telegram'], ready: row => social.ready(row, deps.env), send: row => social.send(row, deps.env, deps.http) }, now);

// Called by the worker every few seconds. Never throws: one broken channel must not stop the queue worker.
async function tick(db, now = Date.now(), deps = {}) {
    const results = {};
    for (const [name, run] of [['email', deliverEmail], ['social', deliverSocial]]) {
        try { results[name] = (await run(db, now, deps)).status; }
        catch (error) { results[name] = 'error'; console.error(JSON.stringify({ event: 'delivery.failure', channel: name, code: error.status || 'internal' })); }
    }
    return results;
}
module.exports = { tick, deliverEmail, deliverSocial, sendEmail };
