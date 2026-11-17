/**
 * pair-whatsapp.js
 * سكريبت ربط حساب واتساب وتوليد رمز QR
 * يعرض الكود في التيرمينال + صفحة ويب واضحة جداً للمسح
 */
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const path = require('path');
const fs = require('fs');

const QR_HTML_PATH = path.join(__dirname, '..', 'assets', 'whatsapp-qr.html');

console.log('🔄 جاري تشغيل محرك ربط الواتساب... برجاء الانتظار ثوانٍ...');

const client = new Client({
    authStrategy: new LocalAuth({ dataPath: path.join(__dirname, '..', 'whatsapp_auth') }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu'
        ]
    }
});

client.on('qr', qr => {
    console.log('\n=============================================================');
    console.log('📲 امسح رمز الـ QR التالي من تطبيق واتساب على هاتفك:');
    console.log('👉 (الإعدادات > الأجهزة المرتبطة > ربط جهاز)');
    console.log('🌐 أو افتح الرابط في المتصفح لمسح صورة واضحة جداً:');
    console.log('👉 http://localhost:3000/assets/whatsapp-qr.html');
    console.log('=============================================================\n');
    
    // 1. طباعة بالتيرمينال
    qrcode.generate(qr, { small: true });

    // 2. حفظ صفحة HTML واضحة ومصغرة جداً للمسح من أي شاشة
    const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qr)}`;
    const htmlContent = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="refresh" content="25">
    <title>ربط واتساب – الزمردة</title>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@700;900&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Cairo', sans-serif;
            background: #022c22;
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 10px;
        }
        .card {
            background: #fff;
            color: #064e3b;
            padding: 20px;
            border-radius: 18px;
            text-align: center;
            max-width: 260px;
            box-shadow: 0 8px 30px rgba(0,0,0,0.5);
        }
        h3 { margin: 0 0 10px; font-weight: 900; font-size: 16px; }
        .steps {
            font-size: 11px;
            color: #475569;
            margin-bottom: 12px;
            line-height: 1.6;
        }
        img {
            display: block;
            margin: 0 auto;
            width: 170px;
            height: 170px;
            border: 2px solid #059669;
            border-radius: 12px;
            padding: 6px;
            background: #fff;
        }
        .hint { font-size: 10px; color: #94a3b8; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="card">
        <h3>📲 امسح رمز الواتساب</h3>
        <div class="steps">
            واتساب > الأجهزة المرتبطة > ربط جهاز
        </div>
        <img src="${qrImgUrl}" alt="WhatsApp QR">
        <div class="hint">يتحدث الرمز تلقائياً كل 25 ثانية</div>
    </div>
</body>
</html>`;
    try {
        fs.writeFileSync(QR_HTML_PATH, htmlContent, 'utf8');
    } catch(e) {}
});

client.on('authenticated', () => {
    console.log('\n🎉 تم التوثيق بنجاح! جاري حفظ بيانات الجلسة...');
});

client.on('ready', () => {
    console.log('\n=============================================================');
    console.log('✅ مبروك! تم ربط حساب الواتساب بنجاح وحفظ الجلسة دائماً.');
    console.log('🚀 المنظومة جاهزة تماماً لانطلاق حملة الغد صباحاً!');
    console.log('=============================================================\n');

    const successHtml = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>تم الربط بنجاح</title>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@700;900&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Cairo', sans-serif; background: #064e3b; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
        .card { background: #fff; color: #064e3b; padding: 40px; border-radius: 24px; text-align: center; }
        h1 { margin-top: 10px; }
    </style>
</head>
<body>
    <div class="card">
        <div style="font-size: 60px;">✅</div>
        <h1>تم ربط الواتساب بنجاح!</h1>
        <p style="color: #64748b;">تم حفظ الجلسة الدائمة. يمكنك الآن إغلاق هذه الصفحة.</p>
    </div>
</body>
</html>`;
    try { fs.writeFileSync(QR_HTML_PATH, successHtml, 'utf8'); } catch(e) {}

    setTimeout(() => {
        process.exit(0);
    }, 3000);
});

client.on('auth_failure', msg => {
    console.error('❌ فشل في التوثيق:', msg);
});

client.initialize().catch(err => {
    console.error('❌ خطأ في تشغيل Puppeteer:', err.message);
});
