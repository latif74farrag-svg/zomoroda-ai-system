// Outbound mail over the company SMTP account. Credentials come only from the environment.

// Vercel holds the password as SMTP_PASSWORD, the template as SMTP_PASS; the host defaults to mail.<domain of the sender account>.
function settings(env = process.env) {
    const user = env.SMTP_USER || '';
    const pass = env.SMTP_PASS || env.SMTP_PASSWORD || '';
    const host = env.SMTP_HOST || (user.includes('@') ? 'mail.' + user.split('@')[1] : '');
    return { user, pass, host };
}

function configured(env = process.env) {
    const { user, pass, host } = settings(env);
    return Boolean(host && user && pass && !/your_.*_here/i.test(pass));
}

async function sendMail({ to, subject, text, headers }, env = process.env) {
    if (!configured(env)) throw Object.assign(new Error('بريد الإرسال غير مضبوط بعد. أضف SMTP_HOST وSMTP_USER وSMTP_PASS في إعدادات Vercel.'), { status: 503, expose: true });
    const { user, pass, host } = settings(env);
    const port = Number(env.SMTP_PORT || 465);
    const transport = require('nodemailer').createTransport({
        host, port, secure: env.SMTP_SECURE ? env.SMTP_SECURE === 'true' : port === 465,
        auth: { user, pass }, connectionTimeout: 15000, socketTimeout: 20000
    });
    try { await transport.sendMail({ from: env.EMAIL_FROM || user, to, subject, text, ...(headers ? { headers } : {}) }); }
    catch (error) {
        console.error(JSON.stringify({ event: 'mail.failure', code: error.code || null, responseCode: error.responseCode || null }));
        throw Object.assign(new Error('تعذر إرسال الرمز إلى البريد. تحقق من بيانات SMTP في إعدادات Vercel.'), { status: 503, expose: true });
    }
}

module.exports = { sendMail, configured };
