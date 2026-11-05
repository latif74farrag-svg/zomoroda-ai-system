// whatsapp_service.js - جلسة واتساب (whatsapp-web.js): تُرسل ما اعتمدته أنت من الصادر في قاعدة البيانات، وتسجل الوارد.
// لا يوجد هنا طابور في الذاكرة ولا سجل ملفات: كل شيء في قاعدة البيانات فلا تضيع الرسائل عند إعادة التشغيل.
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { getCatalogText } = require('./products_config');

const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './whatsapp_auth' }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas', '--no-first-run', '--no-zygote', '--disable-gpu']
    }
});

let ready = false;
let sentCount = 0;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const database = () => require('./lib/storage').getDatabase();

function formatWhatsAppNumber(phone) {
    if (!phone) return null;
    let cleaned = String(phone).replace(/\D/g, '');
    if (!cleaned) return null;
    if (cleaned.startsWith('01') && cleaned.length === 11) cleaned = '20' + cleaned.substring(1);
    else if (cleaned.startsWith('1') && cleaned.length === 10) cleaned = '20' + cleaned;
    return cleaned.endsWith('@c.us') ? cleaned : `${cleaned}@c.us`;
}

// ---------- 1. الإرسال الخارجي من الصادر ----------
// الرسائل تدخل الصادر فقط بعد موافقة الموظف ومراجعة الحارس. هنا نتأكد "هل الآن مسموح":
// مفتاح الوكيل، الموافقة، مرور 30 يوماً، 9 ص – 6 م ماعدا الجمعة، فاصل 10 دقائق، استراحة 30 دقيقة بعد كل 5 رسائل.
async function heartbeat() {
    try { await (await database()).execute({ sql: "INSERT INTO system_state(key, value) VALUES ('whatsapp_heartbeat', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", args: [Date.now()] }); } catch (_) { /* reporting only */ }
}
async function sendFromOutbox() {
    if (!ready) return { status: 'held', reason: 'not_connected' };
    try {
        return await require('./lib/outbox').deliverNext(await database(), { channels: ['whatsapp'], send: row => client.sendMessage(formatWhatsAppNumber(row.recipient), row.body) });
    } catch (error) {
        console.error('⚠️ تعذر قراءة الصادر:', error.message);
        return { status: 'error' };
    }
}
function startOutboxLoop() {
    setInterval(heartbeat, 60 * 1000);
    heartbeat();
    (async function loop() {
        for (;;) {
            const result = await sendFromOutbox();
            if (result.status === 'sent') { sentCount++; console.log(`✅ [رسالة رقم ${sentCount}] أُرسلت من الصادر.`); }
            await sleep(result.status === 'sent' ? 2000 : 15000);
        }
    })();
}

client.on('qr', qr => {
    console.log('⚡ يرجى مسح رمز QR للواتساب:');
    qrcode.generate(qr, { small: true });
});
client.on('ready', () => {
    console.log('✅ تم ربط الواتساب بنجاح!');
    require('./lib/activity').logActivity('whatsapp', 'agent.whatsapp.connected', 'session', {});
    if (!ready) { ready = true; startOutboxLoop(); }
});
client.on('disconnected', () => { ready = false; });

// ---------- 2. الوارد: تسجيل + إيقاف فوري عند الطلب + ردود الكتالوج 24/7 ----------
const STOP = /إيقاف|ايقاف|الغاء|إلغاء|توقف|مش عايز|غير مهتم|حذف|stop|unsubscribe/i;
client.on('message', async msg => {
    if (msg.from.includes('@g.us')) return;
    const userText = msg.body.trim().toLowerCase();
    const contact = require('./lib/leads').normalizeContact(msg.from);
    try {
        const db = await database();
        if (contact && STOP.test(userText)) {
            // طلب الإيقاف يُنفذ فوراً ولو كان الوكيل موقوفاً: هذا التزام تجاه العميل وليس رداً تسويقياً.
            await require('./lib/unsubscribe').optOut(db, contact.key);
            require('./lib/activity').logActivity('whatsapp', 'lead.opted_out', 'whatsapp', {});
            await msg.reply('تم إيقاف الرسائل لك نهائياً، نعتذر عن الإزعاج ونشكرك على وقتك.');
            return;
        }
        await db.execute({ sql: 'INSERT OR IGNORE INTO inbound_messages(id, channel, sender_id, text, external_id, received_at, status) VALUES (?, ?, ?, ?, ?, ?, ?)', args: [require('node:crypto').randomUUID(), 'whatsapp', msg.from, userText.slice(0, 1000), msg.id?._serialized || `${msg.from}:${msg.timestamp}`, Date.now(), 'seen'] });
        require('./lib/activity').logActivity('whatsapp', 'inbound.received', 'واتساب', {});
        // الردود الآلية تعمل والوكيل مفعّل فقط (إيقافه من صفحة الوكلاء يوقف الردود أيضاً).
        if (!await require('./lib/agents').enabled(db, 'whatsapp')) return;
    } catch (error) {
        console.error('⚠️ تعذر تسجيل الرسالة الواردة:', error.message);
        return; // عند الشك لا نرد
    }

    if (/كتالوج|منتجات|اسعار|أسعار|عايز اعرف|تفاصيل/i.test(userText)) {
        let category = 'retail';
        if (/صيدلية|صيدليه|دكتور|وكيل/i.test(userText)) category = 'pharmacy';
        else if (/فندق|منتجع|توريدات/i.test(userText)) category = 'hotels';
        await msg.reply(getCatalogText(category));
        return;
    }
    if (/عمل|أونلاين|دخل|شغل|ماميز|مندوبة|عمولة|من البيت/i.test(userText)) {
        await msg.reply(`أهلاً بكِ في عائلة "الزمردة كوزماتيكس"! 🌸\nيمكنكِ بدء عملكِ من المنزل فوراً بعمولات مجزية على المنتجات والورقيات والمعطرات.\nللتسجيل وتفعيل الحساب، يرجى الرد بـ: (الاسم الثلاثي - المحافظة - رقم الواتساب).`);
    }
});

client.initialize();

// دالة تشغيل حملة من ملف إكسل (المسار القديم: لا يمر بالحارس؛ استخدم وكيل المراسلة بدلاً منه)
async function sendCampaign(excelPath) {
    try {
        const sendCampaignModule = require('./send_campaign');
        if (typeof sendCampaignModule === 'function') return await sendCampaignModule(excelPath);
        if (sendCampaignModule.runCampaign) return await sendCampaignModule.runCampaign(excelPath);
    } catch (e) {
        console.error('⚠️ تعذر تشغيل send_campaign التلقائي:', e.message);
    }
}

module.exports = { client, formatWhatsAppNumber, sendCampaign, sendFromOutbox };
