// whatsapp_service.js - المحرك الرئيسي المكتمل والمحمي 100%
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const { getRandomScript } = require('./messages_config');
const { getCatalogText, generateInvoice } = require('./products_config');

const HISTORY_FILE = './sent_history.json';

const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './whatsapp_auth' }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
    }
});

let messageQueue = [];
let isProcessing = false;
let sentCount = 0;

// 1. إدارة سجل الإرسال (شرط منع التكرار خلال 30 يوماً)
function loadHistory() {
    if (!fs.existsSync(HISTORY_FILE)) return {};
    try {
        return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    } catch (e) {
        return {};
    }
}

function saveHistory(history) {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

function canSendMessage(number) {
    const history = loadHistory();
    const lastSentTimestamp = history[number];

    if (!lastSentTimestamp) return true; // رقم جديد تماماً

    const now = Date.now();
    const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000; // 30 يوماً بالمللي ثانية

    if (now - lastSentTimestamp < thirtyDaysInMs) {
        const daysLeft = Math.ceil((thirtyDaysInMs - (now - lastSentTimestamp)) / (1000 * 60 * 60 * 24));
        console.log(`⚠️ الرقم ${number} استلم رسالة ترحيبية مؤخراً. يتبقى ${daysLeft} يوماً لإعادة الإرسال.`);
        return false;
    }

    return true; // مرت 30 يوماً أو أكثر
}

function markAsSent(number) {
    const history = loadHistory();
    history[number] = Date.now();
    saveHistory(history);
}

// 2. حساب وقت عشوائي آمن بين 5 إلى 10 دقائق بين الرسائل الخارجيّة
function getRandomDelay() {
    const minMinutes = 5;
    const maxMinutes = 10;
    const randomMinutes = Math.floor(Math.random() * (maxMinutes - minMinutes + 1)) + minMinutes;
    console.log(`⏱️ وقت الانتظار العشوائي للرسالة القادمة: ${randomMinutes} دقائق.`);
    return randomMinutes * 60 * 1000;
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 3. التحقق من أوقات العمل الرسمية (9:00 ص - 6:00 م، ماعدا الجمعة)
function isWorkingHours() {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 5 = الجمعة
    const hours = now.getHours();

    if (dayOfWeek === 5) {
        console.log('🕌 اليوم هو يوم الجمعة (عطلة رسمية)، طابور الإرسال التلقائي في حالة انتظار.');
        return false;
    }

    if (hours >= 9 && hours < 18) {
        return true;
    }

    console.log(`🌙 خارج أوقات العمل الرسمية للواتساب (الساعة الحالية: ${hours}). تأجيل طابور الإرسال لحين بدء ساعات العمل.`);
    return false;
}

client.on('qr', (qr) => {
    console.log('⚡ يرجى مسح رمز QR للواتساب:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ تم ربط الواتساب بنجاح!');
    console.log('🛡️ كافة قواعد الأمان المعتمدة مفعّلة بالكامل:');
    console.log('   - حظر التكرار: عدم الإرسال للرقم إلا بعد مرور 30 يوماً.');
    console.log('   - طابور الإرسال: (9 ص - 6 م) ماعدا الجمعة.');
    console.log('   - التباعد بين الرسائل: عشوائي 5-10 دقائق.');
    console.log('   - استراحة الأمان: 30 دقيقة بعد كل 5 رسائل.');
    console.log('   - الرد الفوري على الوارد: 24/7 طوال اليوم بدون انقطاع.');
});

// 4. معالجة طابور الإرسال الخارجي
async function processQueue() {
    if (isProcessing || messageQueue.length === 0) return;
    isProcessing = true;

    while (messageQueue.length > 0) {
        while (!isWorkingHours()) {
            await sleep(15 * 60 * 1000);
        }

        if (sentCount > 0 && sentCount % 5 === 0) {
            console.log('🛑 تم إرسال 5 رسائل! بدء فترة استراحة الأمان لمدة 30 دقيقة...');
            await sleep(30 * 60 * 1000);
            console.log('🔄 انتهت فترة الاستراحة، استئناف العمل...');
        }

        const currentTask = messageQueue.shift();

        try {
            await client.sendMessage(currentTask.number, currentTask.text);
            sentCount++;
            markAsSent(currentTask.number); // تسجيل التاريخ فور النجاح
            console.log(`✅ [رسالة رقم ${sentCount}] تم إرسال الرسالة إلى: ${currentTask.number}`);
        } catch (error) {
            console.error(`❌ فشل إرسال الرسالة إلى ${currentTask.number}:`, error);
        }

        if (messageQueue.length > 0) {
            const delay = getRandomDelay();
            await sleep(delay);
        }
    }

    isProcessing = false;
}

// إضافة رسائل لطابور الإرسال الخارجي مع شرط الـ 30 يوماً
function addToQueue(number, category = 'retail') {
    if (!canSendMessage(number)) {
        console.log(`🚫 تم الغاء إضافة ${number} للطابور لحمايته من التكرار خلال 30 يوماً.`);
        return;
    }

    const text = getRandomScript(category);
    messageQueue.push({ number, text });
    console.log(`📥 تم إضافة رسالة جديدة للطابور (الفئة: ${category}). الإجمالي: ${messageQueue.length}`);
    processQueue();
}

// 5. الرد الآلي الفوري 24/7
client.on('message', async (msg) => {
    if (msg.from.includes('@g.us')) return;

    const userText = msg.body.trim().toLowerCase();

    if (/كتالوج|منتجات|اسعار|أسعار|عايز اعرف|تفاصيل/i.test(userText)) {
        let category = 'retail';
        if (/صيدلية|صيدليه|دكتور|وكيل/i.test(userText)) category = 'pharmacy';
        else if (/فندق|منتجع|توريدات/i.test(userText)) category = 'hotels';

        const catalogResponse = getCatalogText(category);
        await msg.reply(catalogResponse);
        console.log(`💬 تم إرسال الكتالوج للعميل الوارد: ${msg.from}`);
        return;
    }

    const isAffiliateIntent = /عمل|أونلاين|دخل|شغل|ماميز|مندوبة|عمولة|من البيت/i.test(userText);
    if (isAffiliateIntent) {
        const replyMessage = `أهلاً بكِ في عائلة "الزمردة كوزماتيكس"! 🌸\n` +
            `يمكنكِ بدء عملكِ من المنزل فوراً بعمولات مجزية على المنتجات والورقيات والمعطرات.\n` +
            `للتسجيل وتفعيل الحساب، يرجى الرد بـ: (الاسم الثلاثي - المحافظة - رقم الواتساب).`;
        
        await msg.reply(replyMessage);
        console.log(`💬 تم الرد المباشر على عميل أونلاين/ماميز: ${msg.from}`);
    }
});

client.initialize();

function formatWhatsAppNumber(phone) {
    if (!phone) return null;
    let cleaned = String(phone).replace(/\D/g, '');
    if (!cleaned) return null;
    if (cleaned.startsWith('01') && cleaned.length === 11) {
        cleaned = '20' + cleaned.substring(1);
    } else if (cleaned.startsWith('1') && cleaned.length === 10) {
        cleaned = '20' + cleaned;
    }
    if (!cleaned.endsWith('@c.us')) {
        return `${cleaned}@c.us`;
    }
    return cleaned;
}

// دالة تشغيل حملة من ملف إكسل
async function sendCampaign(excelPath) {
    try {
        const sendCampaignModule = require('./send_campaign');
        if (typeof sendCampaignModule === 'function') {
            return await sendCampaignModule(excelPath);
        } else if (sendCampaignModule.runCampaign) {
            return await sendCampaignModule.runCampaign(excelPath);
        }
    } catch (e) {
        console.error('⚠️ تعذر تشغيل send_campaign التلقائي:', e.message);
    }
}

module.exports = {
    client,
    formatWhatsAppNumber,
    sendCampaign,
    addToQueue,
    processQueue,
    canSendMessage,
    markAsSent
};
