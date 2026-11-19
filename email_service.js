const nodemailer = require('nodemailer');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

// مسار ملف السجل لحفظ تواريخ الإرسال ومنع التكرار قبل 30 يوماً
const HISTORY_FILE = path.join(__dirname, 'sent_history.json');

function createTransporter() {
    const requiredSettings = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'];
    const missingSettings = requiredSettings.filter(setting => !process.env[setting]);
    if (missingSettings.length) {
        throw new Error(`إعدادات SMTP المطلوبة غير موجودة: ${missingSettings.join(', ')}`);
    }

    const port = Number(process.env.SMTP_PORT || 465);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error('يجب أن يكون SMTP_PORT رقماً صحيحاً بين 1 و65535.');
    }

    const secureValue = process.env.SMTP_SECURE?.toLowerCase();
    if (secureValue && !['true', 'false'].includes(secureValue)) {
        throw new Error('يجب أن تكون قيمة SMTP_SECURE هي true أو false.');
    }

    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure: secureValue ? secureValue === 'true' : port === 465,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        },
        tls: {
            rejectUnauthorized: true
        }
    });
}

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
// =====================================================================
// 🎯 تحديد نوع الجهة بناءً على عمود "الفئة المستهدفة" الموجود فعلاً في الإكسل
// =====================================================================
function detectSectorType(category) {
    const c = (category || '').toLowerCase();
    // 🏨 فنادق راقية (5 نجوم / بحر أحمر / شرم / إسكندرية / أقصر)
    if (c.includes('فنادق') && (c.includes('5 نج') || c.includes('خمس') || c.includes('البحر الأحمر') || c.includes('الغردق') || c.includes('شرم') || c.includes('سينا') || c.includes('الأقصر') || c.includes('أسوان') || c.includes('الإسكندري'))) return 'LUXURY_HOTEL';
    // 🏨 فنادق عامة
    if (c.includes('فنادق') || c.includes('فندق') || c.includes('سياح') || c.includes('قرى سياح')) return 'HOTEL_GENERAL';
    // 🍽️ مطاعم
    if (c.includes('مطاعم') || c.includes('مطعم') || c.includes('f&b') || c.includes('أغذية')) return 'RESTAURANT';
    // 🛒 توريدات / مشتريات / مناقصات
    if (c.includes('توريدات') || c.includes('توريد') || c.includes('مشتريات') || c.includes('مناقصات') || c.includes('procurement')) return 'PROCUREMENT';
    // 🧴 توزيع مستحضرات / تجميل
    if (c.includes('تجميل') || c.includes('مستحضر') || c.includes('توزيع')) return 'COSMETICS_DIST';
    // 🏥 مستشفيات / عناية طبية
    if (c.includes('مستشفي') || c.includes('طب') || c.includes('عناية')) return 'MEDICAL';
    return 'GENERAL';
}

function getPersonalizedEmailTemplate(clientName, category) {
    const sector = detectSectorType(category);

    // التحية بناءً على الفئة
    let targetGreeting, sectorLabel;
    if (clientName) {
        targetGreeting = `السيد / ${clientName} المحترم`;
    } else {
        targetGreeting = 'السيد / المسؤول المختص المحترم';
    }

    // =====================================================================
    // 🏨 فنادق راقية 5 نجوم — رسالة حصرية تُخاطب المدير العام
    // =====================================================================
    let bodyContent = '';
    if (sector === 'LUXURY_HOTEL') {
        sectorLabel = 'فندق فاخر 5 نجوم';
        bodyContent = `
            <p>كإدارة لفندق بمعايير عالمية، نعلم تماماً أن التفاصيل الصغيرة هي ما يصنع الانطباع الأول الذي لا يُنسى لدى ضيوفكم الكرام.</p>
            <p>يسعدنا أن نقدم لكم <strong>خط توريد مؤسسي راقٍ</strong> مصمم خصيصاً للفنادق الفاخرة:</p>
            <div class="highlight-box">
                <ul>
                    <li><strong>🌸 Private Label حصري:</strong> طباعة شعار الفندق وهويته البصرية على المناديل والفوط الورقية — تجربة ضيافة تعكس تميّزكم.</li>
                    <li><strong>🌿 معطرات الجو المستدامة:</strong> 13 رائحة فاخرة تدوم طويلاً في الردهات والمصاعد والأجنحة، تُعزز الانطباع الأول.</li>
                    <li><strong>✨ معايير جودة فندقية:</strong> منتجاتنا مطابقة لأعلى معايير الفنادق الدولية — لا مساومة في الجودة.</li>
                </ul>
            </div>
        `;

    // =====================================================================
    // 🏨 فنادق عامة — تركيز على التوريد المنتظم والتكلفة
    // =====================================================================
    } else if (sector === 'HOTEL_GENERAL') {
        sectorLabel = 'فندق / مجمع سياحي';
        bodyContent = `
            <p>يسعدنا تقديم خدماتنا لقطاع الفنادق والقرى السياحية، بتوفير <strong>خط توريد مستقر ومنتظم</strong> يضمن عدم انقطاع مستلزماتكم التشغيلية:</p>
            <div class="highlight-box">
                <ul>
                    <li><strong>🏨 توريد فندقي منتظم:</strong> مناديل ورقية، فوط تنشيف، ومنظفات بجداول تسليم ثابتة تلائم احتياجاتكم.</li>
                    <li><strong>💰 أسعار الجملة المباشرة من المصنع:</strong> أعلى خصم ممكن مع ضمان ثبات الجودة.</li>
                    <li><strong>🎁 عينة مجانية:</strong> نرسل مندوبنا بعينات للتجربة قبل أي التزام.</li>
                </ul>
            </div>
        `;

    // =====================================================================
    // 🍽️ مطاعم — رسالة موجهة للشيف / مسؤول المطبخ
    // =====================================================================
    } else if (sector === 'RESTAURANT') {
        sectorLabel = 'مطعم / F&B';
        bodyContent = `
            <p>نعلم أن مطبخكم يعمل بأقصى طاقته وأن <strong>النظافة والكفاءة</strong> في الأدوات والمستلزمات ليست رفاهية بل ضرورة. لذا صممنا حلولاً خاصة بكم:</p>
            <div class="highlight-box">
                <ul>
                    <li><strong>🧼 جلايات أطباق عالية التركيز:</strong> إزالة الدهون والشحوم فوراً — نتيجة مضمونة حتى في أشد أوقات الذروة.</li>
                    <li><strong>🔥 مزيلات دهون الأفران والأسطح:</strong> مركزة وفعّالة على أصعب التلوثات في أقصر وقت.</li>
                    <li><strong>🧻 فوط ورقية خالية من الوبر:</strong> معتمدة للاستخدام في بيئات تحضير الطعام.</li>
                </ul>
            </div>
        `;

    // =====================================================================
    // 🛒 توريدات / مشتريات / مناقصات — رسالة لمدير المشتريات
    // =====================================================================
    } else if (sector === 'PROCUREMENT') {
        sectorLabel = 'مدير توريدات / مشتريات';
        bodyContent = `
            <p>كمسؤول توريد، نعلم أن قراراتكم تقوم على <strong>ثلاثة محاور: السعر، الجودة، الانتظام</strong>. شركة الزمردة كوزماتيكس تُلبّي الثلاثة معاً:</p>
            <div class="highlight-box">
                <ul>
                    <li><strong>📊 أسعار المصنع مباشرة:</strong> نتعامل بدون وسطاء — أعلى خصم وأفضل هامش ربح لشركتكم.</li>
                    <li><strong>📅 انتظام التسليم:</strong> جداول توريد محددة، لا تأخيرات، لا نقص مفاجئ.</li>
                    <li><strong>📦 مرونة الطلبيات:</strong> طلبيات عاجلة وكميات مخصصة — نتكيف مع احتياجاتكم لا العكس.</li>
                </ul>
            </div>
        `;

    // =====================================================================
    // 🧴 توزيع مستحضرات / تجميل — رسالة لمدير التوزيع
    // =====================================================================
    } else if (sector === 'COSMETICS_DIST') {
        sectorLabel = 'موزع مستحضرات / تجميل';
        bodyContent = `
            <p>نتشرف بمخاطبتكم كشركاء توزيع محتملين لمنتجات <strong>رونزا ويونو</strong> — العلامتان الرائدتان في مستلزمات العناية والورقيات:</p>
            <div class="highlight-box">
                <ul>
                    <li><strong>🌟 منتجات رونزا:</strong> مناديل مبللة، مناديل ورقية، فوط — تغطية كاملة لاحتياجات العميل النهائي.</li>
                    <li><strong>💧 منتجات يونو:</strong> معطرات ومنظفات للبيوت والمؤسسات — طلب مستمر طوال العام.</li>
                    <li><strong>💼 هامش ربح تنافسي:</strong> أسعار الوكالة والجملة تتيح لكم هامش ربح جيد في السوق.</li>
                </ul>
            </div>
        `;

    // =====================================================================
    // 🏥 مستشفيات / عناية طبية
    // =====================================================================
    } else if (sector === 'MEDICAL') {
        sectorLabel = 'مستشفى / منشأة طبية';
        bodyContent = `
            <p>المنشآت الطبية تحتاج لأعلى معايير النظافة والتعقيم بشكل لا تهاون فيه. منتجاتنا مصممة لتلبية هذه المعايير الصارمة:</p>
            <div class="highlight-box">
                <ul>
                    <li><strong>🧴 منظفات طبية عالية الكفاءة:</strong> مواصفات مناسبة للبيئات الحساسة والمستشفيات.</li>
                    <li><strong>🧻 فوط ومناديل معقمة:</strong> خالية من الوبر والملوثات، مناسبة للاستخدام الطبي.</li>
                    <li><strong>📦 توريد منتظم بعقود سنوية:</strong> لا انقطاع في المستلزمات الحيوية لعملكم.</li>
                </ul>
            </div>
        `;

    // =====================================================================
    // 🏢 عام — رسالة شاملة ومتوازنة
    // =====================================================================
    } else {
        sectorLabel = 'مؤسسة عامة';
        bodyContent = `
            <p>يسعدنا التواصل معكم لتعريفكم بمنتجات وخدمات <strong>شركة الزمردة كوزماتيكس</strong> في مجال مستلزمات النظافة والعناية المؤسسية:</p>
            <div class="highlight-box">
                <ul>
                    <li><strong>🧻 مناديل وفوط ورقية:</strong> بمواصفات عالية مع إمكانية طباعة هوية شركتكم (Private Label).</li>
                    <li><strong>🌿 معطرات جو وأرضيات:</strong> 13 رائحة مختلفة، تدوم طويلاً لتغطية المساحات الكبيرة.</li>
                    <li><strong>🧼 منظفات ومستلزمات نظافة:</strong> حلول متكاملة بأسعار تنافسية مباشرة من المصنع.</li>
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
    const transporter = createTransporter();
    const senderEmail = process.env.EMAIL_FROM || process.env.SMTP_USER;
    const bccEmail = process.env.EMAIL_BCC;
    console.log(`🤖 [مساعد المبيعات الذكي]: بدأ العمل مع تخصيص متن الرسالة الداخلية بالكامل لكل وظيفة بشكل مستقل...`);

    while (true) {
        const now = new Date();
        const hours = now.getHours();
        const dayOfWeek = now.getDay(); // 0=الأحد, 5=الجمعة, 6=السبت

        // إجازة الجمعة والسبت — النظام في وضع الراحة حتى الأحد الساعة 9 صباحاً
        if (dayOfWeek === 5 || dayOfWeek === 6) {
            console.log(`🌴 [إجازة أسبوعية]: اليوم ${dayOfWeek === 5 ? 'جمعة' : 'سبت'} — الحملة متوقفة حتى الأحد 9:00 صباحاً...`);
            await new Promise(resolve => setTimeout(resolve, 60 * 60 * 1000)); // فحص كل ساعة
            continue;
        }

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
                const currentNow = new Date();
                const currentHour = currentNow.getHours();
                const currentDay = currentNow.getDay();

                // إيقاف فوري لو دخلنا وقت إجازة أو خارج ساعات العمل
                if (currentDay === 5 || currentDay === 6) {
                    console.log(`🌴 [إجازة أسبوعية]: تم الإيقاف. الحملة ستعود الأحد 9:00 صباحاً...`);
                    break;
                }
                if (currentHour < 9 || currentHour >= 18) {
                    console.log(`🌙 انتهت ساعات العمل الرسمية (الساعة 6 مساءً). توقف مؤقت حتى صباح اليوم التالي...`);
                    break;
                }

                const row = sheetData[i];
                // ✅ قراءة الأعمدة الصحيحة من الإكسل
                const email    = String(row['البريد الإلكتروني'] || row['email'] || '').trim();
                const clientName = String(row['اسم المنشأة / الشركة'] || row['اسم'] || row['الاسم'] || '').trim();
                const category   = String(row['الفئة المستهدفة'] || row['وظيفة'] || row['القسم'] || row['منصب'] || '').trim();

                // تجاهل أي صف بدون بريد إلكتروني
                if (!email || !email.includes('@')) continue;

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
                    from: `"عبد اللطيف فراج - الزمردة كوزماتيكس" <${senderEmail}>`,
                    to: email,
                    ...(bccEmail ? { bcc: bccEmail } : {}),
                    subject: 'عرض توريدات حصري لمستلزمات النظافة والانتعاش الفندقي - شركة الزمردة كوزماتيكس',
                    html: getPersonalizedEmailTemplate(clientName, category),
                    attachments: attachments
                };

                try {
                    await transporter.sendMail(mailOptions);
                    sentCountInBatch++;

                    history[email] = new Date().toISOString();
                    saveHistory(history);

                    console.log(`✅ [${sentCountInBatch}] تم الإرسال للبريد: ${email} | الفئة: (${category || 'عام'}) | الجهة: (${clientName || 'بدون اسم'})`);

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