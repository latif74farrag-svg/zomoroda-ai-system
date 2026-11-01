// Outbound mail over the company SMTP account. Credentials come only from the environment.

function configured(env = process.env) {
    return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS && !/your_.*_here/i.test(env.SMTP_PASS));
}

async function sendMail({ to, subject, text }, env = process.env) {
    if (!configured(env)) throw Object.assign(new Error('بريد الإرسال غير مضبوط بعد. أضف SMTP_HOST وSMTP_USER وSMTP_PASS في إعدادات Vercel.'), { status: 503, expose: true });
    const port = Number(env.SMTP_PORT || 465);
    const transport = require('nodemailer').createTransport({
        host: env.SMTP_HOST, port, secure: env.SMTP_SECURE ? env.SMTP_SECURE === 'true' : port === 465,
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASS }, connectionTimeout: 15000, socketTimeout: 20000
    });
    try { await transport.sendMail({ from: env.EMAIL_FROM || env.SMTP_USER, to, subject, text }); }
    catch (error) {
        console.error(JSON.stringify({ event: 'mail.failure', code: error.code || null, responseCode: error.responseCode || null }));
        throw Object.assign(new Error('تعذر إرسال الرمز إلى البريد. تحقق من بيانات SMTP في إعدادات Vercel.'), { status: 503, expose: true });
    }
}

module.exports = { sendMail, configured };
