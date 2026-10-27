const XLSX = require('xlsx');
const fs = require('fs');
// إصلاح الربط مع خدمة الواتساب دون تغيير باقي المنطق
const { client, formatWhatsAppNumber } = require('./whatsapp_service');

// ==========================================
// 1. خريطة الفئات والكتالوجات والأسعار ومحاكاة حاسبة الكميات
// ==========================================
const categoryFunnels = {
    "salon": {
        name: "الصالونات والكوافير",
        catalog: "https://zomoroda.com/catalogs/salon_no_price.pdf",
        pricing: "https://zomoroda.com/catalogs/salon_with_price.pdf",
        unitPrice: 150 // متوسط سعر الوحدة الافتراضي للتسعير الفوري (يمكن تعديله حسب رغبتك)
    },
    "فنادق": {
        name: "الفنادق والضيافة",
        catalog: "https://zomoroda.com/catalogs/hotels_no_price.pdf",
        pricing: "https://zomoroda.com/catalogs/hotels_with_price.pdf",
        unitPrice: 200
    },
    "هايبرات": {
        name: "الهايبر ماركت",
        catalog: "https://zomoroda.com/catalogs/ronza_hyper_2026.pdf",
        pricing: "https://zomoroda.com/catalogs/hyper_price_list.xlsx",
        unitPrice: 120
    },
    "وكلاء": {
        name: "وكلاء الصيادلة",
        catalog: "https://zomoroda.com/catalogs/ronza_agents.pdf",
        pricing: "https://zomoroda.com/catalogs/agents_price_list.xlsx",
        unitPrice: 100
    },
    "توزيع": {
        name: "شركات التوزيع",
        catalog: "https://zomoroda.com/catalogs/ronza_distribution.pdf",
        pricing: "https://zomoroda.com/catalogs/distribution_price_list.xlsx",
        unitPrice: 110
    },
    "صيدليات": {
        name: "الصيدليات والجمهور",
        catalog: "https://zomoroda.com/catalogs/ronza_pharmacy_public.pdf",
        pricing: "https://zomoroda.com/catalogs/ronza_pharmacy_catalog.pdf",
        unitPrice: 130
    }
};

const CONTACTED_LOG_FILE = 'contacted_numbers.json';
const STAGE_LOG_FILE = 'funnel_stages.json';
const BLACKLIST_FILE = 'blacklist.json';

function getStoredData(filename) {
    try {
        if (fs.existsSync(filename)) {
            return JSON.parse(fs.readFileSync(filename, 'utf-8'));
        }
    } catch (e) {}
    return [];
}

function saveStoredData(filename, list) {
    try {
        fs.writeFileSync(filename, JSON.stringify(list, null, 2));
    } catch (e) {}
}

const POSITIVE_KEYWORDS = ['كتالوج', 'نعم', 'ارسل', 'أرسل', 'مهتم', 'تفاصيل', 'تمام', 'ممكن', 'عايز', 'أسعار', 'اسعار', 'عنوان', 'رقم', '👍', '👌'];
const STOP_KEYWORDS = ['إيقاف', 'ايقاف', 'الغاء', 'إلغاء', 'توقف', 'مش عايز', 'غير مهتم', 'حذف'];

// ==========================================
// 2. محرك الحملة الأولى
// ==========================================
async function runCampaign(excelFilePath) {
    console.log(`📂 جاري فتح ملف الحملة: ${excelFilePath}...`);
    
    if (!fs.existsSync(excelFilePath)) {
        console.error(`❌ ملف الإكسل غير موجود: ${excelFilePath}`);
        return;
    }

    const workbook = XLSX.readFile(excelFilePath);
    const rawSheetName = workbook.SheetNames[0].trim().toLowerCase(); 

    let matchedCategoryKey = Object.keys(categoryFunnels).find(key => rawSheetName.includes(key));

    if (!matchedCategoryKey) {
        console.error(`❌ لم يتم التعرف على فئة الشيت ("${rawSheetName}"). تم إيقاف الإرسال لتفادي أي خلط!`);
        return;
    }

    const funnelInfo = categoryFunnels[matchedCategoryKey];
    console.log(`🎯 تم التعرف على الفئة بنجاح: [${funnelInfo.name}]`);

    const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
    const contactedList = getStoredData(CONTACTED_LOG_FILE);
    const blacklist = getStoredData(BLACKLIST_FILE);
    let sentCountInBatch = 0;

    const initialWelcomeMessage = `أهلاً بحضرتك ، معك عبد اللطيف فراج من الزمردة كوزماتيكس.\n\nمتخصصون في توريد منتجات النظافة والانتعاش رونزا ويونو للفنادق والمطاعم والشركات (معطرات جو بـ13 رائحة، معطرات أرضيات، رولات وفوط تنظيف بدون وبرة، وسائل غسيل الأطباق، ومناديل فردية مطبوع عليها شعاركم).\n\nلتلقي الكتالوج وصور المنتجات، اتبع الرد بكلمة (كتالوج او نعم ).\nلإيقاف الرسائل رد بـ (إيقاف).`;

    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const rawPhone = row['هاتف (موبايل/واتساب)'] || row.Phone || row['رقم الهاتف'] || row.Mobile;
        const chatId = formatWhatsAppNumber ? formatWhatsAppNumber(rawPhone) : rawPhone;

        if (!chatId) continue;

        if (blacklist.includes(chatId)) continue;
        if (contactedList.includes(chatId)) continue;

        const currentHour = new Date().getHours();
        if (currentHour < 9 || currentHour >= 19) {
            console.log(`⏰ خارج أوقات العمل الرسمية. توقف الإرسال.`);
            break;
        }

        try {
            const isRegistered = await client.isRegisteredUser(chatId);
            if (isRegistered) {
                await client.sendMessage(chatId, initialWelcomeMessage);
                console.log(`✅ [السطر ${i + 1}] تم إرسال الرسالة الترحيبية إلى: ${chatId}`);

                contactedList.push(chatId);
                saveStoredData(CONTACTED_LOG_FILE, contactedList);
                sentCountInBatch++;

                let stages = getStoredData(STAGE_LOG_FILE);
                stages.push({ 
                    chatId, 
                    categoryKey: matchedCategoryKey, 
                    stage: 'welcome_sent_waiting_for_interest',
                    updatedAt: new Date().toISOString()
                });
                saveStoredData(STAGE_LOG_FILE, stages);

                if (sentCountInBatch % 5 === 0) {
                    const restMins = Math.floor(Math.random() * (10 - 8 + 1)) + 8;
                    console.log(`☕ استراحة أمان لحماية الرقم لمدة ${restMins} دقائق...`);
                    await new Promise(resolve => setTimeout(resolve, restMins * 60 * 1000));
                } else {
                    const delayMins = Math.floor(Math.random() * (5 - 1 + 1)) + 1;
                    console.log(`⏳ انتظار ${delayMins} دقيقة قبل الرسالة التالية...`);
                    await new Promise(resolve => setTimeout(resolve, delayMins * 60 * 1000));
                }
            }
        } catch (err) {
            console.error(`⚠️ خطأ في السطر ${i + 1}:`, err.message);
        }
    }
}

// ==========================================
// 3. البوت الذكي للرد وإصدار الفاتورة التلقائية عند طلب كميات
// ==========================================
if (client && typeof client.on === 'function') {
    client.on('message', async (msg) => {
        if (msg.from.endsWith('@g.us') || msg.from.includes('status')) return;

        const senderId = msg.from;
        const clientReplyText = msg.body.trim();
        const clientReplyLower = clientReplyText.toLowerCase();

        const currentHour = new Date().getHours();
        const isWorkingHours = currentHour >= 9 && currentHour < 19;

        try {
            let stages = getStoredData(STAGE_LOG_FILE);
            let blacklist = getStoredData(BLACKLIST_FILE);
            let clientRecord = stages.find(s => s.chatId === senderId);

            // أ) معالجة الإيقاف
            if (STOP_KEYWORDS.some(keyword => clientReplyLower.includes(keyword))) {
                if (!blacklist.includes(senderId)) {
                    blacklist.push(senderId);
                    saveStoredData(BLACKLIST_FILE, blacklist);
                }
                await client.sendMessage(senderId, "تم إيقاف الرسائل بنجاح. شكراً لك ونعتذر عن أي إزعاج.");
                return;
            }

            // ب) استجابة للترحيب وإرسال الكتالوج
            if (clientRecord && clientRecord.stage === 'welcome_sent_waiting_for_interest') {
                const isPositive = POSITIVE_KEYWORDS.some(keyword => clientReplyLower.includes(keyword)) || clientReplyText.length > 0;

                if (isPositive) {
                    const delayMs = isWorkingHours ? 60000 : (Math.floor(Math.random() * (5 - 2 + 1)) + 2) * 60 * 1000;
                    await new Promise(resolve => setTimeout(resolve, delayMs));

                    const funnelInfo = categoryFunnels[clientRecord.categoryKey];
                    const catalogMsg = `تفضل حضرتك، هذا كتالوج المنتجات المخصص لفئة (${funnelInfo.name}):\n${funnelInfo.catalog}\n\nإذا كنت ترغب في معرفة الأسعار أو طلب كميات محددة، أرسل لنا الكمية المطلوبة وسنقوم بإصدار فاتورة تقديرية لحضرتك فوراً!`;

                    await client.sendMessage(senderId, catalogMsg);

                    clientRecord.stage = 'catalog_sent_waiting_for_pricing_or_quantity';
                    clientRecord.updatedAt = new Date().toISOString();
                    saveStoredData(STAGE_LOG_FILE, stages);
                    return;
                }
            }

            // ج) استجابة بعد الكتالوج (إما طلب أسعار عامة أو كتابة رقم/كمية لإصدار الفاتورة)
            if (clientRecord && clientRecord.stage === 'catalog_sent_waiting_for_pricing_or_quantity') {
                const delayMs = isWorkingHours ? 60000 : (Math.floor(Math.random() * (5 - 2 + 1)) + 2) * 60 * 1000;
                await new Promise(resolve => setTimeout(resolve, delayMs));

                const funnelInfo = categoryFunnels[clientRecord.categoryKey];
                
                // استخراج الأرقام من رسالة العميل لمعرفة هل كتب كمية محددة (مثل: "عايز 50 كرتونة" أو "100")
                const extractedNumbers = clientReplyText.match(/\d+/g);

                if (extractedNumbers && extractedNumbers.length > 0) {
                    // إذا كتب العميل رقماً (يعتبره النظام كمية مطلوبة)
                    const quantity = parseInt(extractedNumbers[0], 10);
                    const unitPrice = funnelInfo.unitPrice || 150;
                    const totalAmount = quantity * unitPrice;

                    const invoiceMsg = `🧾 *فاتورة مبدئية تقديرية - الزمردة كوزماتيكس*\n` +
                                       `-----------------------------------\n` +
                                       `📌 الفئة: ${funnelInfo.name}\n` +
                                       `📦 الكمية المطلوبة: ${quantity} وحدة / كرتونة\n` +
                                       `💰 إجمالي القيمة التقديرية: ${totalAmount} جنيه مصري\n` +
                                       `-----------------------------------\n` +
                                       `سيتواصل معك أستاذ عبد اللطيف فراج الآن لتأكيد تفاصيل الأوردر وموعد التوريد وشحن المنتجات لحضرتك. شكراً لثقتكم بنا!`;

                    await client.sendMessage(senderId, invoiceMsg);
                    console.log(`✅ تم إصدار وإرسال الفاتورة للعميل (${senderId}) بمبلغ: ${totalAmount} جنيه`);

                    clientRecord.stage = 'invoice_issued_converted_to_human';
                    clientRecord.updatedAt = new Date().toISOString();
                    saveStoredData(STAGE_LOG_FILE, stages);

                } else {
                    // إذا لم يكتب رقماً بل طلب الأسعار نصياً
                    const pricingMsg = `تفضل قائمة الأسعار المخصصة لفئة (${funnelInfo.name}):\n${funnelInfo.pricing}\n\nإذا كنت ترغب في حساب قيمة كمية معينة، فقط اكتب لنا الرقم (مثلاً: 50) وسنقوم بإصدار الفاتورة لحضرتك فوراً!`;
                    await client.sendMessage(senderId, pricingMsg);
                    
                    clientRecord.stage = 'pricing_sent_waiting_for_quantity';
                    saveStoredData(STAGE_LOG_FILE, stages);
                }
                return;
            }

            // د) إذا كان العميل استلم الأسعار سابقاً وكتب الكمية الآن
            if (clientRecord && clientRecord.stage === 'pricing_sent_waiting_for_quantity') {
                const extractedNumbers = clientReplyText.match(/\d+/g);
                if (extractedNumbers && extractedNumbers.length > 0) {
                    const quantity = parseInt(extractedNumbers[0], 10);
                    const funnelInfo = categoryFunnels[clientRecord.categoryKey];
                    const unitPrice = funnelInfo.unitPrice || 150;
                    const totalAmount = quantity * unitPrice;

                    const invoiceMsg = `🧾 *فاتورة مبدئية تقديرية - الزمردة كوزماتيكس*\n` +
                                       `-----------------------------------\n` +
                                       `📌 الفئة: ${funnelInfo.name}\n` +
                                       `📦 الكمية المطلوبة: ${quantity} وحدة / كرتونة\n` +
                                       `💰 إجمالي القيمة التقديرية: ${totalAmount} جنيه مصري\n` +
                                       `-----------------------------------\n` +
                                       `أستاذ عبد اللطيف فراج يتابع معك الآن لتأكيد الأوردر نهائياً. شكراً لتواصلك!`;

                    await client.sendMessage(senderId, invoiceMsg);
                    
                    clientRecord.stage = 'invoice_issued_converted_to_human';
                    saveStoredData(STAGE_LOG_FILE, stages);
                }
            }

        } catch (error) {
            console.error(`⚠️ خطأ في معالجة الرد والفاتورة:`, error.message);
        }
    });
}

// التصدير الكامل لضمان عدم نقص أي بند
module.exports = { runCampaign };