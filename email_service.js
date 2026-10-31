const nodemailer = require('nodemailer');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

// مسار ملف السجل لحفظ تواريخ الإرسال ومنع التكرار قبل 30 يوماً
const HISTORY_FILE = path.join(__dirname, 'sent_history.json');
//كومنت للديبلوي
// 1. إعداد خادم الإرسال SMTP
const transporter = nodemailer.createTransport({
    host: 'mail.beautyhealtheg.com',
    port: 465,
    secure: true, // SSL/TLS على البورت 465
    auth: {
        user: 'a.farag@beautyhealtheg.com',
        pass: 'E_yrX]&8(CWHMC]q' // كلمة المرور الخاصة بك
    },
    tls: {
        rejectUnauthorized: false
    }
});

// قراءة سجل الإرسال السابق
function loadHistory() {
    if (fs.existsSync(HISTORY_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
        } catch (e) {
            return {};
        }
    }
    return {};
}

// حفظ سجل الإرسال
function saveHistory(history) {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8');
}

// 2. قالب HTML المخصص كلياً لكل وظيفة على حدة (المتن الداخلي يتغير بالكامل حسب الوظيفة)
function getPersonalizedEmailTemplate(clientName, jobTitle) {
    let targetGreeting = 'السيد / المسؤول المختص المحترم';
    const titleLower = (jobTitle || '').toLowerCase();

    if (clientName && jobTitle) {
        targetGreeting = `السيد / ${clientName} (${jobTitle}) المحترم`;
    } else if (jobTitle) {
        targetGreeting = `السيد / ${jobTitle} المحترم`;
    } else if (clientName) {
        targetGreeting = `السيد / ${clientName} المحترم`;
    }

    // صياغة متن الرسالة المخصصة حصرياً لكل وظيفة
    let bodyContent = '';

    if (titleLower.includes('مشتريات') || titleLower.includes('purchasing') || titleLower.includes('procurement') || titleLower.includes('مخازن')) {
        // 🛒 تخصيص حصري لمدير / مسؤول المشتريات
        bodyContent = `
            <p>نعلم تماماً الأهمية البالغة لضبط تكاليف التشغيل وتأمين خطوط التوريد المستقرة لإدارة المشتريات، ويسعدنا أن نضع بين أيديكم خدماتنا لتوفير توريدات مؤسسية منتظمة بأعلى معايير الجودة الاقتصادية بأسعار تنافسية مباشرة من المصنع.</p>
            
            <div class="highlight-box">
                <ul>
                    <li><strong>أسعار توريد مؤسسية:</strong> توفير أعلى نسبة خصم للتوريدات المباشرة مع استقرار التكاليف.</li>
                    <li><strong>انتظام التوريد:</strong> جدول تسليم محدد يضمن عدم انقطاع أي من المستلزمات التشغيلية لديك.</li>
                    <li><strong>تسهيلات التعامل:</strong> مرونة في تلبية الطلبيات العاجلة وتوفير العينات قبل الاعتماد.</li>
                </ul>
            </div>
        `;
    } else if (titleLower.includes('شيف') || titleLower.includes('chef') || titleLower.includes('مطبخ') || titleLower.includes('f&b') || titleLower.includes('أغذية')) {
        // 🍳 تخصيص حصري للشيف العمومي / مسؤول الأغذية والمشروبات
        bodyContent = `
            <p>نعلم حرصكم الشديد والدائم في المطبخ على تطبيق أعلى معايير النظافة والتعقيم وااختيار المنتجات التي تضمن سرعة وكفاءة العمل التشغيلي، ويسعدنا أن نضع بين أيديكم حلولنا المتخصصة للمطابخ والمطاعم:</p>
            
            <div class="highlight-box">
                <ul>
                    <li><strong>مستلزمات جلايات الأطباق:</strong> منظفات وحلايات عالية التركيز تضمن إزالة الدهون وإعطاء لمعان فوري.</li>
                    <li><strong>إزالة الدهون الصعبة:</strong> مزيلات دهون مركزة مخصصة للاستخدام الشاق على الأسطح والأفران.</li>
                    <li><strong>الفوط والمستهلكات الورقية:</strong> رولات قماشية وورقية خالية تماماً من الوبر والمواصفات المعتمدة للأغذية.</li>
                </ul>
            </div>
        `;
    } else if (titleLower.includes('عام') || titleLower.includes('مدير') || titleLower.includes('gm') || titleLower.includes('manager') || titleLower.includes('إدارة')) {
        // 👔 تخصيص حصري للمدير العام / الإدارة التنفيذية
        bodyContent = `
            <p>نعلم حرصكم الدائم كإدارة تنفيذية على تقديم تجربة استثنائية لضيوف الفندق والحفاظ على أعلى مستويات التقييم والانطباع العام، ويسعدنا أن نكون الشريك المعتمد لديكم لتوفير أرقى حلول العناية والانتعاش الفندقي:</p>
            
            <div class="highlight-box">
                <ul>
                    <li><strong>ثبات الانتعاش:</strong> معطرات جو وأرضيات بـ 13 رائحة تدوم طويلاً لتغطية المساحات والممرات الكبرى.</li>
                    <li><strong>الهوية المخصصة:</strong> إمكانية طباعة الهوية الخاصة بالفندق على المناديل والمستهلكات الورقية.</li>
                    <li><strong>اعتمادية الجودة:</strong> منتجات مطابقة لأعلى معايير الجودة الفندقية التي تعكس فخامة المنشأة.</li>
                </ul>
            </div>
        `;
    } else {
        // 🏢 تخصيص عام وباقي الوظائف الفندقية
        bodyContent = `
            <p>نعلم جودتكم العالية واهتمامكم بأدق التفاصيل لتقديم أفضل تجربة لضيوفكم، ويسعدنا أن نضع بين أيديكم خدماتنا لتوفير خط توريد منتظم وبأعلى معايير الجودة الاقتصادية التي تلبي كافة الاحتياجات التشغيلية:</p>
            
            <div class="highlight-box">
                <ul>
                    <li><strong>مستلزمات المطابخ والأغذية (F&B):</strong> جلايات وحلايات الأطباق العالية التركيز ومنظفات الدهون.</li>
                    <li><strong>المناديل والمستهلكات الورقية:</strong> رولات تنظيف خالية من الوبر مع إمكانية طباعة الهوية الخاصة بكم.</li>
                    <li><strong>معطرات الجو والأرضيات:</strong> تشكيلة معطرات ثباتها يدوم طويلاً لتغطية المساحات الكبرى.</li>
                </ul>
            </div>
        `;
    }

    return `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.8; color: #333; background-color: #f9f9f9; padding: 20px; }
            .container { max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 8px; padding: 30px; border: 1px solid #e0e0e0; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
            .header { text-align: center; border-bottom: 2px solid #006699; padding-bottom: 15px; margin-bottom: 20px; }
            .header h2 { color: #006699; margin: 0; font-size: 24px; }
            .header p { color: #666; margin: 5px 0 0 0; font-size: 14px; }
            .content p { font-size: 15px; margin-bottom: 15px; }
            .highlight-box { background-color: #f0f7ff; border-right: 4px solid #006699; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .highlight-box ul { margin: 0; padding-right: 20px; }
            .highlight-box li { margin-bottom: 8px; font-size: 14px; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #555; }
            .footer-title { font-weight: bold; color: #006699; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2>شركة الزمردة كوزماتيكس</h2>
                <p>حلول التجهيزات والمستلزمات المؤسسية للفنادق والمطاعم (علامتي رونزا و يونو)</p>
            </div>
            
            <div class="content">
                <p><strong>السلام عليكم ورحمة الله وبركاته،</strong></p>
                <p><strong>${targetGreeting}،،</strong></p>
                <p>تحية طيبة وبعد،،</p>
                
                <p>معكم <strong>عبد اللطيف فراج</strong> من شركة <strong>الزمردة كوزماتيكس</strong>، المتخصصة في إنتاج وتوريد أرقى حلول العناية والتجهيزات المؤسسية لمستلزمات النظافة والانتعاش.</p>
                
                ${bodyContent}
                
                <p>📌 <strong>تجدون مرفقاً بالرسالة:</strong> قائمة أسعار الفنادق المخصصة للتوريدات المؤسسية.</p>
                
                <p><strong>يسرنا جداً تنسيق موعد لإرسال "عينة مجانية" مع مندوبنا لمعاينة الجودة على الطبيعة والتأكد من ملاءمتها لاشتراطاتكم.</strong></p>
            </div>
            
            <div class="footer">
                <p class="footer-title">أطيب التحيات،</p>
                <p><strong>عبد اللطيف فراج</strong><br>
                إدارة التوريدات والمبيعات المؤسسية<br>
                <strong>شركة الزمردة كوزماتيكس</strong><br>
                📧 البريد الإلكتروني: a.farag@beautyhealtheg.com</p>
            </div>
        </div>
    </body>
    </html>
    `;
}

// دالة صياغة الرد الاحترافي للردود اللاحقة (عروض/خصومات/أجل/طلبيات)
function generateSalesReplyTemplate(clientName, requestType, customDetails = '') {
    const targetGreeting = clientName ? `السيد / ${clientName} المحترم` : `السيد / المسؤول المختص المحترم`;
    
    let responseBody = '';

    if (requestType === 'discount_or_terms') {
        responseBody = `
            <p>نشكر لكم التواصل المستمر مع شركة <strong>الزمردة كوزماتيكس</strong> واهتمامكم بمنتجاتنا.</p>
            <p>بخصوص طلبكم الكريم (الخاص بالشروط الخاصة، التسهيلات، أو العروض الإضافية)، نود إفادتكم بأنه <strong>سيتم دراسة الأمر بعناية مع الإدارة العليا</strong>، وسنقوم بالرد على حضراتكم في أقرب وقت ممكن بقرار رسمي يرضي تعاوننا المشترك.</p>
        `;
    } else if (requestType === 'order_request') {
        responseBody = `
            <p>نشكر ثقتكم الغالية في منتجات شركة <strong>الزمردة كوزماتيكس</strong>.</p>
            <p>بناءً على طلبكم المذكور، تفضلوا أدناه بيان إجمالي التكلفة والأسعار المقررة وفقاً لقائمة التوريدات المؤسسية:</p>
            <div style="background-color: #f0f7ff; padding: 15px; border-right: 4px solid #006699; margin: 15px 0;">
                <p><strong>تفاصيل الطلبية والأسعار:</strong></p>
                <p>${customDetails}</p>
            </div>
            <p>يسرنا تجهيز الطلبية وشحنها في أسرع وقت وفقاً للمواعيد المتفق عليها.</p>
        `;
    } else {
        responseBody = `
            <p>نشكر استفساركم، وسنكون دائماً في خدمتكم لتلبية كافة احتياجاتكم التشغيلية.</p>
        `;
    }

    return `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.8; color: #333; background-color: #f9f9f9; padding: 20px; }
            .container { max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 8px; padding: 30px; border: 1px solid #e0e0e0; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
            .header { text-align: center; border-bottom: 2px solid #006699; padding-bottom: 15px; margin-bottom: 20px; }
            .header h2 { color: #006699; margin: 0; font-size: 24px; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #555; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2>شركة الزمردة كوزماتيكس</h2>
                <p>إدارة المبيعات المؤسسية</p>
            </div>
            <div class="content">
                <p><strong>السلام عليكم ورحمة الله وبركاته،</strong></p>
                <p><strong>${targetGreeting}،،</strong></p>
                ${responseBody}
            </div>
            <div class="footer">
                <p><strong>أطيب التحيات،</strong><br>
                عبد اللطيف فراج<br>
                إدارة التوريدات والمبيعات المؤسسية<br>
                <strong>شركة الزمردة كوزماتيكس</strong><br>
                📧 البريد الإلكتروني: a.farag@beautyhealtheg.com</p>
            </div>
        </div>
    </body>
    </html>
    `;
}

// توليد فاصل زمني عشوائي بين 5 إلى 10 دقائق
function getRandomMinutes(minMinutes, maxMinutes) {
    const minMs = minMinutes * 60 * 1000;
    const maxMs = maxMinutes * 60 * 1000;
    return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

// التحقق من شرط عدم المراسلة إلا بعد مرور 30 يوماً
function canSendToEmail(email, history) {
    if (!history[email]) return true;
    const lastSentDate = new Date(history[email]);
    const now = new Date();
    const diffDays = (now - lastSentDate) / (1000 * 60 * 60 * 24);
    return diffDays >= 30;
}

// 3. دالة التشغيل الرئيسية (تأخذ مسار ملف الإكسل اختياري أو تفترض ايميلات فنادق.xlsx)
async function startAutomatedCampaign(excelFilePath = path.join(__dirname, 'ايميلات فنادق.xlsx')) {
    console.log(`🤖 [مساعد المبيعات الذكي]: بدأ العمل مع تخصيص متن الرسالة الداخلية بالكامل لكل وظيفة بشكل مستقل...`);

    while (true) {
        const now = new Date();
        const hours = now.getHours();

        if (hours >= 9 && hours < 18) {
            if (!fs.existsSync(excelFilePath)) {
                console.error(`❌ لم يتم العثور على ملف الإكسل: ${excelFilePath}`);
                await new Promise(resolve => setTimeout(resolve, 60 * 60 * 1000));
                continue;
            }

            const workbook = xlsx.readFile(excelFilePath);
            const sheetName = workbook.SheetNames[0];
            const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

            const history = loadHistory();
            let sentCountInBatch = 0;

            for (let i = 0; i < sheetData.length; i++) {
                const currentHour = new Date().getHours();
                if (currentHour < 9 || currentHour >= 18) {
                    console.log(`🌙 انتهت ساعات العمل الرسمية (الساعة 6 مساءً). توقف مؤقت حتى صباح اليوم التالي...`);
                    break;
                }

                const row = sheetData[i];
                let email = null;
                let clientName = null;
                let jobTitle = null;

                for (const key in row) {
                    const val = String(row[key] || '').trim();
                    if (val.includes('@') && val.includes('.')) {
                        email = val;
                    }
                    if (key.includes('اسم') || key.includes('الشخص')) {
                        clientName = val;
                    }
                    if (key.includes('وظيفة') || key.includes('الصفة') || key.includes('منصب') || key.includes('القسم') || key.includes('عنوان')) {
                        jobTitle = val;
                    }
                }

                if (!email) continue;

                if (!canSendToEmail(email, history)) {
                    console.log(`⏭️ [تخطي ذكي]: تم مراسلة (${email}) خلال الـ 30 يوماً الماضية.`);
                    continue;
                }

                const attachments = [];
                const priceListPath = path.join(__dirname, 'اسعار الفنادق.pdf');
                if (fs.existsSync(priceListPath)) {
                    attachments.push({ filename: 'اسعار الفنادق.pdf', path: priceListPath });
                } else {
                    console.error(`❌ تنبيه: ملف (اسعار الفنادق.pdf) غير موجود في المجلد!`);
                }

                const mailOptions = {
                    from: '"عبد اللطيف فراج - الزمردة كوزماتيكس" <a.farag@beautyhealtheg.com>',
                    to: email,
                    bcc: 'a.farag@beautyhealtheg.com',
                    subject: 'عرض توريدات حصري لمستلزمات النظافة والانتعاش الفندقي - شركة الزمردة كوزماتيكس',
                    html: getPersonalizedEmailTemplate(clientName, jobTitle),
                    attachments: attachments
                };

                try {
                    await transporter.sendMail(mailOptions);
                    sentCountInBatch++;
                    
                    history[email] = new Date().toISOString();
                    saveHistory(history);

                    console.log(`✅ [${sentCountInBatch}] تم الإرسال للبريد: ${email} | تخصيص المتن: (${jobTitle || 'عام'} - ${clientName || 'بدون اسم'})`);

                    if (sentCountInBatch % 5 === 0) {
                        console.log(`\n☕ [استراحة السيرفر الآمنة]: تم إرسال 5 رسائل. راحة لمدة 30 دقيقة...`);
                        await new Promise(resolve => setTimeout(resolve, 30 * 60 * 1000));
                    } else {
                        const delayMs = getRandomMinutes(5, 10);
                        console.log(`⏱️ انتظار ${(delayMs / 60000).toFixed(1)} دقائق للرسالة التالية...`);
                        await new Promise(resolve => setTimeout(resolve, delayMs));
                    }

                } catch (error) {
                    console.error(`⚠️ خطأ في الإرسال إلى البريد (${email}):`, error.message);
                }
            }

            console.log(`💤 انتهت دورة الفحص الحالية. جاري الانتظار...`);
            await new Promise(resolve => setTimeout(resolve, 2 * 60 * 60 * 1000));

        } else {
            console.log(`🌙 [خارج مواعيد العمل الرسمية]: النظام في وضع الاستعداد الذكي حتى 9:00 صباحاً...`);
            await new Promise(resolve => setTimeout(resolve, 30 * 60 * 1000));
        }
    }
}

// 🛑 إرجاع كافة المسميات الممكنة لضمان التوافق مع ملف run_email.js بدون أخطاء
module.exports = {
    startAutomatedCampaign,
    processExcelAndSendEmails: startAutomatedCampaign,
    sendHotelEmailCampaign: startAutomatedCampaign,
    generateSalesReplyTemplate
};