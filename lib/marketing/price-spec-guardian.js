/**
 * price-spec-guardian.js
 * حارس الأسعار والمواصفات لمنظومة التسويق والمحتوى
 * -------------------------------------------------------------
 * 1. مراجعة صارمة للأسعار ضد products_config.js و specs/sectors-and-products.md
 * 2. تطبيق قاعدة عزل الكتالوجات (عدم تسريب أسعار الجملة للجمهور/الماميز)
 * 3. قصر الصيدليات والوكلاء على مناديل رونزا فقط
 * 4. التحقق من دقة المواصفات (الأحجام، السعات، العبوات) قبل اعتماد المحتوى
 */

const { PRODUCTS_DB } = require('../../products_config');

// المواصفات القياسية المعتمدة للمنتجات
const APPROVED_SPECS = {
    ronza_wipes: {
        name: 'مناديل مبللة رونزا',
        allowedSectors: ['pharmacy', 'hypermarkets', 'distribution', 'hotels', 'restaurants', 'salon', 'moms', 'general'],
        minRetailPrice: 35,
        wholesalePrice: 28,
        validSizes: ['80 منديل', '120 منديل', 'سنجل مفرد'],
        features: ['ألوفيرا', 'فيتامين E', 'خالٍ من الكحول', 'ملمس قطني فائق النعومة']
    },
    yono_wipes: {
        name: 'مناديل مبللة يونو',
        // الصيدليات ممنوعة من يونو (رونزا فقط)
        allowedSectors: ['hypermarkets', 'distribution', 'hotels', 'restaurants', 'salon', 'moms', 'general'],
        forbiddenSectors: ['pharmacy'],
        minRetailPrice: 30,
        wholesalePrice: 24,
        validSizes: ['72 منديل', '80 منديل'],
        features: ['اقتصادية', 'منعشة', 'استخدام يومي']
    },
    kitchen_roll_cloth: {
        name: 'فوط مطبخ قماش رول',
        allowedSectors: ['hypermarkets', 'distribution', 'hotels', 'restaurants', 'salon', 'moms', 'general'],
        forbiddenSectors: ['pharmacy'],
        minRetailPrice: 50,
        wholesalePrice: 40,
        validSizes: ['رول قماش تركي', 'مضلع عالي الامتصاص'],
        features: ['قابل للغسيل وإعادة الاستخدام', 'لا يترك وبراً', 'مقاوم للدهون والزيوت']
    },
    single_use_towel: {
        name: 'فوطة تنشيف استخدام مرة واحدة',
        allowedSectors: ['hotels', 'restaurants', 'salon', 'hypermarkets', 'distribution', 'moms', 'general'],
        forbiddenSectors: ['pharmacy'],
        minRetailPrice: 40,
        wholesalePrice: 30,
        validSizes: ['باكت', 'مفرد كبير'],
        features: ['معقمة', 'استخدام فردي لمنع العدوى', 'امتصاص فائق للماء']
    },
    air_floor_freshener: {
        name: 'معطر جو وأرضيات',
        allowedSectors: ['hotels', 'restaurants', 'corporate', 'salon', 'hypermarkets', 'distribution', 'moms', 'general'],
        forbiddenSectors: ['pharmacy'],
        minRetailPrice: 60,
        wholesalePrice: 45,
        validSizes: ['460 مل', '1 لتر', '250 مل'],
        features: ['13 رائحة فرنسية', 'ثبات يدوم طويلاً', 'آمن على المفروشات والأرضيات']
    },
    dish_soap: {
        name: 'سائل أطباق مركز يونوي',
        allowedSectors: ['restaurants', 'hotels', 'hypermarkets', 'distribution', 'moms', 'general'],
        forbiddenSectors: ['pharmacy'],
        minRetailPrice: 25,
        wholesalePrice: 18,
        validSizes: ['1 لتر', '4 لتر', 'جركن 10 لتر'],
        features: ['تركيز عالي', 'رغوة وفيرة', 'قوة تفتيت الشحوم والزيوت']
    },
    private_label_wipes: {
        name: 'مناديل مبللة سنجل براند خاص (Private Label)',
        allowedSectors: ['hotels', 'restaurants', 'corporate', 'distribution', 'general'],
        forbiddenSectors: ['pharmacy', 'moms'],
        unitPrice: 1.5,
        minOrderQuantity: 10000,
        features: ['طباعة اسم وشعار العميل بدقة عالية', 'مغلف ألومنيوم ثلاثي الطبقات', 'عطر فرنسي فاخر']
    }
};

/**
 * مراجعة مسودة محتوى تسويقي (Post / Ad Copy / Video Script / Campaign)
 * @param {Object} content - المسودة المراد فحصها
 * @returns {Object} { approved: boolean, errors: string[], warnings: string[], auditedData: Object }
 */
function reviewMarketingContent(content) {
    const errors = [];
    const warnings = [];
    const text = `${content.title || ''} ${content.body || ''} ${content.copy || ''} ${content.script || ''}`.toLowerCase();
    const sector = (content.targetSector || 'general').toLowerCase();
    const productId = content.productId;

    // 1. فحص وجود المنتج في قاعدة المنتجات المعتمدة
    if (productId && !APPROVED_SPECS[productId]) {
        errors.push(`منتج غير معتمد: (${productId}). المنتجات المعتمدة هي: ${Object.keys(APPROVED_SPECS).join(', ')}`);
    }

    const spec = productId ? APPROVED_SPECS[productId] : null;

    // 2. فحص قاعدة عزل الصيدليات الصارمة (رونزا فقط)
    if (sector === 'pharmacy' || sector === 'صيدليات') {
        if (productId && productId !== 'ronza_wipes') {
            errors.push(`مخالفة قاعدة العزل: قطاع الصيدليات والوكلاء مخصص له (مناديل مبللة رونزا) حصرياً. ممنوع نشر ${spec ? spec.name : productId} للصيدليات.`);
        }
        if (/معطر|سائل أطباق|فوط مطبخ|يونو|private label/i.test(text)) {
            errors.push('مخالفة المحتوى: يمنع ذكر منتجات أخرى غير مناديل رونزا في أي محتوى موجه للصيدليات.');
        }
    }

    // 3. فحص قطاع الماميز والجمهور القطاعي (منع تسريب أسعار الجملة للجمهور)
    if (sector === 'moms' || sector === 'retail' || sector === 'جمهور') {
        if (/سعر الجملة|سعر المصنع|سعر التوريد|أسعار الموزعين|خصم 40%|شحنات كونتر/i.test(text)) {
            errors.push('تسريب أسعار: المحتوى موجه للجمهور/الماميز ويحتوي على عبارات أو أسعار جملة ومصنع. يجب الالتزام بأسعار القطاعي.');
        }
        // فحص أي أرقام أسعار مذكورة أقل من سعر القطاعي المعتمد
        if (spec && spec.minRetailPrice) {
            const priceMatches = text.match(/(\d+)\s*(ج\.م|جنيه|egp)/gi);
            if (priceMatches) {
                for (const m of priceMatches) {
                    const num = parseInt(m, 10);
                    if (num < spec.minRetailPrice && num < spec.wholesalePrice + 2) {
                        errors.push(`السعر المذكور (${num} ج.م) أقل من الحد الأدنى للقطاعي المعتمد للمنتج (${spec.minRetailPrice} ج.م).`);
                    }
                }
            }
        }
    }

    // 4. فحص مناديل Private Label (الحد الأدنى للكمية 10,000)
    if (productId === 'private_label_wipes' || /private label|لوجو الفندق|لوجو المطعم/i.test(text)) {
        if (sector === 'moms' || sector === 'pharmacy') {
            errors.push('خدمة Private Label غير متاحة للماميز أو الصيدليات. متاحة فقط للفنادق والمطاعم والشركات.');
        }
        if (/100 منديل|500 منديل|1000 منديل/i.test(text) && !/10000|10 آلاف|عشرة آلاف/i.test(text)) {
            warnings.push('تنبيه: الحد الأدنى الاقتصادي للطباعة الخاصة Private Label هو 10,000 منديل.');
        }
    }

    // 5. فحص مصداقية المواصفات
    if (productId === 'air_floor_freshener') {
        if (/15 رائحة|20 رائحة/i.test(text)) {
            warnings.push('تنبيه: عدد روائح معطرات الجو المعتمدة حالياً هو 13 رائحة فرنسية.');
        }
    }

    // 6. فحص عزل القنوات: صفحة الماميز مخصصة للماميز والعمل المنزلي، ويمنع نشر الفنادق أو التوريدات منها (لصفحة الزمردة فقط)
    const channelId = content.channelId;
    if (channelId === '61596440741975' && sector && sector !== 'moms' && sector !== 'ماميز') {
        errors.push('مخالفة توجيه القنوات: صفحة الماميز (61596440741975) مخصصة حصرياً لجروبات البنات والماميز والعمل من المنزل، وممنوع نشر الفنادق أو الكافيهات أو التوريدات منها (مخصصة لصفحة الزمردة فقط).');
    }

    return {
        approved: errors.length === 0,
        errors,
        warnings,
        auditedData: {
            productId,
            sector,
            specChecked: spec ? spec.name : 'عام',
            timestamp: new Date().toISOString()
        }
    };
}

module.exports = {
    APPROVED_SPECS,
    reviewMarketingContent
};
