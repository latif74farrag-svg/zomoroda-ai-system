// products_config.js - ملف قاعدة بيانات المنتجات والأسعار وإصدار الفواتير
const PRODUCTS_DB = {
    "مناديل مبللة رونزا": { id: "ronza_wipes", price: 35, unit: "عبوة" },
    "مناديل مبللة يونو": { id: "yono_wipes", price: 30, unit: "عبوة" },
    "فوط مطبخ قماش رول": { id: "kitchen_roll_cloth", price: 50, unit: "رول" },
    "فوطة تنشيف مرة واحدة": { id: "single_use_towel", price: 40, unit: "باكت" },
    "معطر جو وأرضيات": { id: "air_floor_freshener", price: 60, unit: "زجاجة" },
    "سائل أطباق مركز": { id: "dish_soap", price: 25, unit: "لتر" },
    "مناديل مبللة سنجل براند خاص": { id: "private_label_wipes", price: 1.5, unit: "منديل فردي" }
};

// 1. توليد قائمة الأسعار والكتالوج النصي
function getCatalogText(category) {
    let catalogText = "📋 *كتالوج منتجات الزمردة المتاحة:*\n\n";
    
    // إذا كان العميل صيدلية أو وكيلاً صيدلياً -> يظهر له رونزا فقط
    if (category === 'pharmacy') {
        return "🩺 *عرض الصيدليات والوكلاء المخصص:*\n\n" +
               "• **مناديل مبللة رونزا (Ronza Wipes):** 35 ج.م للعبوة (خصومات خاصة للكميات والشحنات).\n\n" +
               "لطلب شحنة، يرجى الرد بالكمية المطلوبة (مثال: 50 عبوة رونزا).";
    }

    // لجميع الفئات الأخرى
    for (const [name, info] of Object.entries(PRODUCTS_DB)) {
        catalogText += `• **${name}:** ${info.price} ج.م / ${info.unit}\n`;
    }

    if (category === 'hotels') {
        catalogText += "\n✨ *متاح خدمة التصنيع الخاص (Private Label) لطباعة اسم ولوجو فندقكم على المنديل السنجل.*";
    }

    catalogText += "\n\nلإصدار فاتورة بالطلب، يرجى الرد بالمنتجات والكميات المطلوبة.";
    return catalogText;
}

// 2. دالة حساب الفاتورة تلقائياً (الكمية × السعر)
function generateInvoice(items) {
    let grandTotal = 0;
    let invoiceLines = "🧾 *فاتورة طلبية - الزمردة كوزماتيكس*\n";
    invoiceLines += "────────────────────\n";

    items.forEach(item => {
        const product = PRODUCTS_DB[item.productName];
        if (product) {
            const itemTotal = product.price * item.quantity;
            grandTotal += itemTotal;
            invoiceLines += `• ${item.productName} (${item.quantity} ${product.unit}) × ${product.price} ج.م = *${itemTotal} ج.م*\n`;
        }
    });

    invoiceLines += "────────────────────\n";
    invoiceLines += `💰 *الإجمالي الكلي للطلبية:* **${grandTotal} ج.م**\n\n`;
    invoiceLines += "يرجى تأكيد البيانات لتأكيد الشحن وتسليم الطلبية.";

    return { invoiceText: invoiceLines, grandTotal };
}

module.exports = { PRODUCTS_DB, getCatalogText, generateInvoice };