/**
 * build-products-data.js
 * ينشئ products_data.json مع أسعار مخصصة لكل فئة من الـ 6 فئات
 * يُشغَّل مرة واحدة ثم يُحذف
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ─── مفاتيح سرية لكل فئة ─────────────────────────────────────────
const KEYS = {
    pharmacies:    crypto.randomBytes(12).toString('hex'),
    hypermarkets:  crypto.randomBytes(12).toString('hex'),
    hotels:        crypto.randomBytes(12).toString('hex'),
    salons:        crypto.randomBytes(12).toString('hex'),
    distribution:  crypto.randomBytes(12).toString('hex'),
    housewives:    crypto.randomBytes(12).toString('hex'),
};

// ─── معلومات الفئات ───────────────────────────────────────────────
const categories = {
    pharmacies:   { name: "صيادلة وصيدليات",        key: KEYS.pharmacies,   color: "#065f46", emoji: "💊" },
    hypermarkets: { name: "هيبر ماركت وتجار جملة",  key: KEYS.hypermarkets, color: "#1e3a5f", emoji: "🏪" },
    hotels:       { name: "فنادق ومطاعم",            key: KEYS.hotels,       color: "#7c2d12", emoji: "🏨" },
    salons:       { name: "صالونات ومراكز تجميل",   key: KEYS.salons,       color: "#701a75", emoji: "💅" },
    distribution: { name: "موزعون ومناديب",          key: KEYS.distribution, color: "#1e3a5f", emoji: "🚚" },
    housewives:   { name: "ماميز وعملاء مباشرين",   key: KEYS.housewives,   color: "#3f1f69", emoji: "🌸" },
};

// ─── دالة حساب أسعار الفئات من سعر الجمهور ──────────────────────
// pharmacies: Ronza wipes only → price 110-120 range
// hypermarkets: standard -10% from retail
// hotels: premium +15%
// salons: -5% from retail
// distribution: bulk -20% from retail
// housewives: near retail (consumer price)
function calcPrices(product) {
    const retail = product.price;
    const cat = product.category;

    // الصيدليات: مناديل رونزا فقط (baby, care, pocket) — سعر خاص
    const isPharmaProduct = ['baby', 'care', 'pocket'].includes(cat) && product.brand === 'رونزا';
    
    return {
        pharmacies:   isPharmaProduct ? Math.round(retail * 0.75 * 100) / 100 : null, // null = لا يُعرض
        hypermarkets: Math.round(retail * 0.82 * 100) / 100,
        hotels:       Math.round(retail * 1.05 * 100) / 100,
        salons:       Math.round(retail * 0.88 * 100) / 100,
        distribution: Math.round(retail * 0.72 * 100) / 100,
        housewives:   Math.round(retail * 0.95 * 100) / 100,
    };
}

// ─── بيانات المنتجات الكاملة (33 منتج) ────────────────────────────
const rawProducts = [
    // === OFFERS (عروض شهرية) ===
    { id:"off-120-boy",       name:"باكو مناديل رونزا 120 وايبس (بنين)",          unit:"باكو",   brand:"رونزا", price:79.5,  carton:6,  category:"baby",   image:"https://api.whacka.app/storage/v1/object/public/app-images/b2edf064-7f05-4f5c-8361-30ad097d16c5/product-images/baby-120.jpg" },
    { id:"off-120-girl",      name:"باكو مناديل رونزا 120 وايبس (بنات)",          unit:"باكو",   brand:"رونزا", price:79.5,  carton:6,  category:"baby",   image:"https://api.whacka.app/storage/v1/object/public/app-images/b2edf064-7f05-4f5c-8361-30ad097d16c5/product-images/baby-120.jpg" },
    { id:"off-72-x3",         name:"عرض 3 باكو رونزا 72 وايبس",                   unit:"عرض",    brand:"رونزا", price:86.5,  carton:8,  category:"baby",   image:"https://api.whacka.app/storage/v1/object/public/app-images/b2edf064-7f05-4f5c-8361-30ad097d16c5/product-images/baby-72.jpg" },
    { id:"off-protect-40-x3", name:"عرض 3 باكو رونزا حماية أكيد 40 وايبس",       unit:"عرض",    brand:"رونزا", price:51.5,  carton:12, category:"care",   image:"https://api.whacka.app/storage/v1/object/public/app-images/b2edf064-7f05-4f5c-8361-30ad097d16c5/product-images/care-protect-40.jpg" },
    { id:"off-remover-25-x3", name:"عرض 3 باكو رونزا مزيل مكياج 25 وايبس",       unit:"عرض",    brand:"رونزا", price:53,    carton:24, category:"care",   image:"https://api.whacka.app/storage/v1/object/public/app-images/b2edf064-7f05-4f5c-8361-30ad097d16c5/product-images/care-aloe-25.jpg" },
    { id:"off-pocket-15-x4",  name:"عرض 4 باكو رونزا جيب 15 وايبس",               unit:"عرض",    brand:"رونزا", price:26,    carton:72, category:"pocket", image:"https://api.whacka.app/storage/v1/object/public/app-images/b2edf064-7f05-4f5c-8361-30ad097d16c5/product-images/pocket-15.jpg" },
    { id:"off-air-2",         name:"عرض معطري رونزا جو (2 علبة من عرض)",           unit:"عرض",    brand:"رونزا", price:129,   carton:3,  category:"home",   image:"https://api.whacka.app/storage/v1/object/public/app-images/b2edf064-7f05-4f5c-8361-30ad097d16c5/product-images/home-air-460.jpg" },
    { id:"off-towel-2",       name:"عرض فوط رونزا تنشيف (2 من عرض)",               unit:"عرض",    brand:"رونزا", price:87.5,  carton:12, category:"tools",  image:"https://api.whacka.app/storage/v1/object/public/app-images/b2edf064-7f05-4f5c-8361-30ad097d16c5/product-images/tools-yellow-20.jpg" },
    { id:"off-noi-120-72",    name:"عرض نوي (باكو 120 وايبس + باكو 72 وايبس)",    unit:"عرض",    brand:"ونوي",  price:68,    carton:6,  category:"baby",   image:"https://api.whacka.app/storage/v1/object/public/app-images/b2edf064-7f05-4f5c-8361-30ad097d16c5/product-images/baby-120.jpg" },
    { id:"off-protect-20-x3", name:"عرض الحماية رونزا (3 باكو وايبس 20 وايبس)",   unit:"عرض",    brand:"رونزا", price:34.5,  carton:16, category:"care",   image:"https://api.whacka.app/storage/v1/object/public/app-images/b2edf064-7f05-4f5c-8361-30ad097d16c5/product-images/care-protect-20.jpg" },
    { id:"off-family-roll-2", name:"عرض الرول المنزلي رونزا (2 رول منزل 20 متر)", unit:"عرض",    brand:"رونزا", price:193,   carton:9,  category:"tools",  image:"https://api.whacka.app/storage/v1/object/public/app-images/b2edf064-7f05-4f5c-8361-30ad097d16c5/product-images/tools-kitchen-3.jpg" },

    // === BABY (مناديل أطفال) ===
    { id:"baby-newborn-54",   name:"مناديل رونزا لأطفال حديثي الولادة 54 وايبس",  unit:"باكو",   brand:"رونزا", price:31.5,  carton:28, category:"baby",   image:"https://api.whacka.app/storage/v1/object/public/app-images/b2edf064-7f05-4f5c-8361-30ad097d16c5/product-images/baby-newborn-54.jpg" },
    { id:"baby-120",          name:"مناديل رونزا للأطفال 120 وايبس",               unit:"باكو",   brand:"رونزا", price:43.5,  carton:12, category:"baby",   image:"https://api.whacka.app/storage/v1/object/public/app-images/b2edf064-7f05-4f5c-8361-30ad097d16c5/product-images/baby-120.jpg" },
    { id:"baby-72",           name:"مناديل رونزا للأطفال 72 وايبس",                unit:"باكو",   brand:"رونزا", price:25.5,  carton:24, category:"baby",   image:"https://api.whacka.app/storage/v1/object/public/app-images/b2edf064-7f05-4f5c-8361-30ad097d16c5/product-images/baby-72.jpg" },
    { id:"baby-noi-120",      name:"مناديل ونوي للأطفال 120 وايبس",                unit:"باكو",   brand:"ونوي",  price:32,    carton:12, category:"baby",   image:"https://api.whacka.app/storage/v1/object/public/app-images/b2edf064-7f05-4f5c-8361-30ad097d16c5/product-images/baby-120.jpg" },
    { id:"baby-noi-72",       name:"مناديل ونوي للأطفال 72 وايبس",                 unit:"باكو",   brand:"ونوي",  price:18,    carton:24, category:"baby",   image:"https://api.whacka.app/storage/v1/object/public/app-images/b2edf064-7f05-4f5c-8361-30ad097d16c5/product-images/baby-72.jpg" },

    // === POCKET (مناديل جيب) ===
    { id:"pocket-lavender-15",  name:"مناديل رونزا لافندر جيب 15 وايبس",           unit:"باكو",   brand:"رونزا", price:8.5,   carton:144,category:"pocket", image:"https://api.whacka.app/storage/v1/object/public/app-images/b2edf064-7f05-4f5c-8361-30ad097d16c5/product-images/pocket-15.jpg" },
    { id:"pocket-rose-15",      name:"مناديل رونزا وردة جيب 15 وايبس",             unit:"باكو",   brand:"رونزا", price:8.5,   carton:144,category:"pocket", image:"https://api.whacka.app/storage/v1/object/public/app-images/b2edf064-7f05-4f5c-8361-30ad097d16c5/product-images/pocket-15.jpg" },
    { id:"pocket-mint-piece",   name:"منديل رونزا نعناع جيب (قطعة) - كرتون 24 قطعة",unit:"قطعة", brand:"رونزا", price:2.5,   carton:500,category:"pocket", image:"https://api.whacka.app/storage/v1/object/public/app-images/b2edf064-7f05-4f5c-8361-30ad097d16c5/product-images/pocket-mint-24.jpg" },
    { id:"pocket-mint-24",      name:"مناديل رونزا نعناع (كرتون) - كرتون 24 باكو",  unit:"باكو",   brand:"رونزا", price:56,    carton:24, category:"pocket", image:"https://api.whacka.app/storage/v1/object/public/app-images/b2edf064-7f05-4f5c-8361-30ad097d16c5/product-images/pocket-mint-24.jpg" },
    { id:"pocket-shoe",         name:"منديل تلميع أحذية رونزا (قطعة فردية)",        unit:"باكو",   brand:"رونزا", price:2,     carton:500,category:"pocket", image:"https://api.whacka.app/storage/v1/object/public/app-images/b2edf064-7f05-4f5c-8361-30ad097d16c5/product-images/pocket-shoe.jpg" },

    // === CARE (العناية) ===
    { id:"care-aloe-25",     name:"باكو رونزا مزيل مكياج ألوفيرا 25 وايبس",       unit:"باكو",   brand:"رونزا", price:19,    carton:72, category:"care",   image:"https://api.whacka.app/storage/v1/object/public/app-images/b2edf064-7f05-4f5c-8361-30ad097d16c5/product-images/care-aloe-25.jpg" },
    { id:"care-rose-25",     name:"باكو رونزا مزيل مكياج وردة حمراء 25 وايبس",    unit:"باكو",   brand:"رونزا", price:19,    carton:72, category:"care",   image:"https://api.whacka.app/storage/v1/object/public/app-images/b2edf064-7f05-4f5c-8361-30ad097d16c5/product-images/care-rose-25.jpg" },
    { id:"care-protect-20",  name:"رونزا حماية أكيد 20 وايبس",                     unit:"باكو",   brand:"رونزا", price:15,    carton:50, category:"care",   image:"https://api.whacka.app/storage/v1/object/public/app-images/b2edf064-7f05-4f5c-8361-30ad097d16c5/product-images/care-protect-20.jpg" },
    { id:"care-protect-40",  name:"رونزا حماية أكيد 40 وايبس",                     unit:"باكو",   brand:"رونزا", price:20,    carton:36, category:"care",   image:"https://api.whacka.app/storage/v1/object/public/app-images/b2edf064-7f05-4f5c-8361-30ad097d16c5/product-images/care-protect-40.jpg" },

    // === HOME (منزل) ===
    { id:"home-air-460",   name:"معطر جو رونزا 460 مل (13 عطر مختلف)",           unit:"علبة",   brand:"رونزا", price:60,    carton:6,  category:"home",   image:"https://api.whacka.app/storage/v1/object/public/app-images/b2edf064-7f05-4f5c-8361-30ad097d16c5/product-images/home-air-460.jpg" },
    { id:"home-floor-1000",name:"معطر أرضيات رونزا 1000 مل",                    unit:"علبة",   brand:"رونزا", price:70,    carton:6,  category:"home",   image:"https://api.whacka.app/storage/v1/object/public/app-images/b2edf064-7f05-4f5c-8361-30ad097d16c5/product-images/home-floor-1000.jpg" },
    { id:"home-floor-250", name:"معطر أرضيات رونزا 250 مل",                     unit:"علبة",   brand:"رونزا", price:26,    carton:12, category:"home",   image:"https://api.whacka.app/storage/v1/object/public/app-images/b2edf064-7f05-4f5c-8361-30ad097d16c5/product-images/home-floor-250.jpg" },
    { id:"home-dish-650",  name:"سائل جلي يونوي برائحة ليمون 650 جرام",          unit:"علبة",   brand:"ونوي",  price:38,    carton:12, category:"home",   image:"https://api.whacka.app/storage/v1/object/public/app-images/b2edf064-7f05-4f5c-8361-30ad097d16c5/product-images/home-dish-650.jpg" },

    // === TOOLS (أدوات) ===
    { id:"tools-kitchen-3",  name:"رول مطبخ رونزا (كرتون 3 لفات كبيرة)",         unit:"باكو",   brand:"رونزا", price:46.5,  carton:24, category:"tools",  image:"https://api.whacka.app/storage/v1/object/public/app-images/b2edf064-7f05-4f5c-8361-30ad097d16c5/product-images/tools-kitchen-3.jpg" },
    { id:"tools-yellow-20",  name:"فوط تنشيف تركي 20 قطعة لكل طرد",             unit:"طرد",    brand:"رونزا", price:107.5, carton:18, category:"tools",  image:"https://api.whacka.app/storage/v1/object/public/app-images/b2edf064-7f05-4f5c-8361-30ad097d16c5/product-images/tools-yellow-20.jpg" },
    { id:"tools-glass-20",   name:"فوط تنشيف صفراء ومزدوجة مضلعة 20 قطعة",     unit:"طرد",    brand:"رونزا", price:78.5,  carton:20, category:"tools",  image:"https://api.whacka.app/storage/v1/object/public/app-images/b2edf064-7f05-4f5c-8361-30ad097d16c5/product-images/tools-glass-20.jpg" },
];

// ─── بناء المنتجات النهائية مع الأسعار ────────────────────────────
const products = rawProducts.map(p => {
    const prices = calcPrices(p);
    return {
        id: p.id,
        name: p.name,
        unit: p.unit,
        brand: p.brand,
        carton: p.carton,
        wcCategory: p.category, // Whacka category for display grouping
        image: p.image,
        prices,
    };
});

const output = { categories, products };
fs.writeFileSync(
    path.join(__dirname, '..', 'products_data.json'),
    JSON.stringify(output, null, 2),
    'utf8'
);

console.log('✅ products_data.json تم إنشاؤه بنجاح!');
console.log('\n🔑 روابط الدخول السرية (احتفظ بها في مكان آمن):\n');
const BASE = process.env.BASE_URL || 'https://zomoroda-ai-system.vercel.app';
Object.entries(categories).forEach(([id, cat]) => {
    console.log(`  ${cat.emoji} ${cat.name.padEnd(30)} → ${BASE}/shop?k=${cat.key}`);
});

