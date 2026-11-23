/**
 * campaign-engine.js
 * محرك إنتاج الحملات والمحتوى الإعلاني لمنظومة التسويق الذكي
 * -------------------------------------------------------------
 * 1. إنتاج أفكار حملات وعروض لكل قطاع وموسم
 * 2. كتابة 3 نسخ إعلانية مختلفة لكل فكرة (A/B/C Copywriting)
 * 3. صياغة المنشورات باللهجة المصرية الدارجة والعربية الفصحى
 * 4. تصميم Brief احترافي وموجه للصور (Image Creative Brief + AI Prompts)
 * 5. إعداد سيناريوهات الفيديوهات (Reels / TikTok / Shorts) بجدول المشاهد والصوت
 * 6. مراجعة مسبقة عبر حارس الأسعار والمواصفات (Price & Spec Guardian)
 */

const { reviewMarketingContent, APPROVED_SPECS } = require('./price-spec-guardian');

// بنك زوايا الحملات الإعلانية ومواسمها
const CAMPAIGN_ANGLES = {
    hotels: {
        name: 'قطاع الفنادق والضيافة الراقية',
        themes: [
            {
                id: 'hotel_prestige',
                title: 'هوية الضيافة الفاخرة (Private Label)',
                hook: 'المنديل السنجل المطبوع بشعار فندقك ليس مجرد منديل.. إنه انطباع دائم في ذاكرة النزيل',
                offer: 'طباعة شعار الفندق بدقة فائقة + باقة معطرات الغرف الفرنسية المجانية مع الطلبية الأولى',
                primaryProduct: 'private_label_wipes'
            },
            {
                id: 'hotel_scent_memory',
                title: 'ذاكرة العطر الفندقي (13 عطر فرنسي)',
                hook: 'لماذا يتذكر النزلاء رائحة الفنادق الفاخرة لشهور طويلة؟',
                offer: 'عقود توريد سنوية بأسعار ثابتة تشمل عينات مجانية لمديري المشتريات',
                primaryProduct: 'air_floor_freshener'
            }
        ]
    },
    restaurants: {
        name: 'المطاعم والكافيهات والمطابخ الاحترافية',
        themes: [
            {
                id: 'restaurant_hygiene',
                title: 'كفاءة المطبخ ونظافة الطاولة',
                hook: 'فوط التنشيف التركي ورولات القماش المضلعة: امتصاص مضاعف للدهون بدون وبر',
                offer: 'خصومات توريد الجملة الأسبوعية مع سائل جلي الأطباق يونوي المركز',
                primaryProduct: 'kitchen_roll_cloth'
            },
            {
                id: 'restaurant_branded_wipes',
                title: 'مناديل المائدة بهوية مطعمك',
                hook: 'قدم لزبونك منديلاً مبللاً فاخراً باللوجو الخاص بك يرفع تقييم الخدمة',
                offer: 'تصميم مجاني لشعار المطعم على الغلاف + خصم كميات الجملة',
                primaryProduct: 'private_label_wipes'
            }
        ]
    },
    salons: {
        name: 'الصالونات ومراكز التجميل (Beauty Salons & Spas)',
        themes: [
            {
                id: 'salon_single_use',
                title: 'الأمان الصحي والراحة الفاخرة للعميلة',
                hook: 'وداعاً لغسيل الفوط التقليدية: فوط التنشيف الفردية للاستخدام الواحد تمنح عميلتك ثقة 100%',
                offer: 'باقة الصالون المتكاملة: فوط استخدام مرة واحدة + مناديل إزالة المكياج رونزا بالألوفيرا',
                primaryProduct: 'single_use_towel'
            }
        ]
    },
    pharmacies: {
        name: 'الصيدليات والوكلاء والمخازن الطبية',
        themes: [
            {
                id: 'pharmacy_ronza_exclusive',
                title: 'مناديل رونزا المبللة — الاختيار الأول للأمهات والعائلات',
                hook: 'تركيبة ألوفيرا وفيتامين E خالية تماماً من الكحول بمواصفات طبية معتمدة',
                offer: 'عروض كراتين الصيدليات مع تسهيلات توزيع وشحن مباشر للمحافظات',
                primaryProduct: 'ronza_wipes'
            }
        ]
    },
    wholesale: {
        name: 'تجار الجملة والهايبرات وشركات التوزيع',
        themes: [
            {
                id: 'wholesale_high_turnover',
                title: 'دوران سريع وأعلى هامش ربح في السوق',
                hook: 'منتجات استهلاكية يومية لا يستغني عنها أي بيت أو منشأة: رونزا ويونو ومعطرات الزمردة',
                offer: 'أسعار المصنع المباشرة لكبار الموزعين مع حمولات فورية لكافة المحافظات',
                primaryProduct: 'ronza_wipes'
            }
        ]
    },
    moms: {
        name: 'الماميز والجمهور المباشر وفرص العمل الحر',
        themes: [
            {
                id: 'moms_clean_home',
                title: 'بيت منعش وعناية فائقة بأطفالك',
                hook: 'مناديل رونزا الناعمة لبشرة طفلك + معطر الزمردة الفرنسي الذي يدوم لساعات',
                offer: 'عرض باقة البيت السعيدة بخصم قطاعي خاص + فرصة الانضمام لبرنامج مسوقات الزمردة بالعمولة',
                primaryProduct: 'ronza_wipes'
            }
        ]
    }
};

/**
 * 1. إنتاج فكرة حملة متكاملة لقطاع محدد
 */
function generateCampaignIdea(sectorKey, customThemeId = null) {
    const sectorData = CAMPAIGN_ANGLES[sectorKey] || CAMPAIGN_ANGLES.hotels;
    let theme = sectorData.themes[0];
    if (customThemeId) {
        const found = sectorData.themes.find(t => t.id === customThemeId);
        if (found) theme = found;
    }

    return {
        campaignId: `camp_${sectorKey}_${Date.now()}`,
        sector: sectorKey,
        sectorName: sectorData.name,
        themeTitle: theme.title,
        coreHook: theme.hook,
        coreOffer: theme.offer,
        primaryProduct: theme.primaryProduct,
        generatedAt: new Date().toISOString()
    };
}

/**
 * 2. كتابة 3 نسخ إعلانية مختلفة (A/B/C Copywriting) + نسختين لغويتين (مصرية وفصحى)
 */
function generateAdCopies(campaign, options = {}) {
    const product = APPROVED_SPECS[campaign.primaryProduct] || APPROVED_SPECS.ronza_wipes;

    // النسخة أ: التركيز على العائد والأرباح والقيمة التجارية (Value & ROI)
    const copyA = {
        version: 'A - القيمة وعائد الاستثمار (Value & ROI)',
        egyptian: `ليه تدفع أكتر لما تقدر توفر في استهلاكك الشهري وتكسب رضاء عملائك؟ 💡
مع ${product.name} من شركة الزمردة كوزماتيكس، بنقدملك أعلى جودة تصنيع بتكلفة اقتصادية مدروسة.
${campaign.coreOffer}.
توريد مباشر وفواتير معتمدة بدون وسيط.
اطلب عرض أسعارك وسيب الباقي علينا! 👇`,
        fusha: `ارتقِ بكفاءة مشترياتك وعزز عوائد منشأتك مع حلول التوريد المتطورة من شركة الزمردة كوزماتيكس.
نقدم لكم ${product.name} وفق أعلى المعايير القياسية وبأسعار تعاقدية تنافسية تضمن ضبط التكاليف التشغيلية.
${campaign.coreOffer}.
تفضلوا بطلب قائمة الأسعار التعاقدية الآن.`
    };

    // النسخة ب: التركيز على القصة والألم وحل المشكلة (Story & Pain Point)
    const copyB = {
        version: 'B - القصة وحل المشكلة (Storytelling & Pain Point)',
        egyptian: `كام مرة رولات المطبخ اتقطعت وسابت وبر، أو النزيل اشتكى من ريحة المكان، أو المناديل نشفت بسرعة؟ 🤦‍♂️
احنا عارفين التفاصيل دي كويس، عشان كده في "الزمردة" صنعنا ${product.name} عشان تريحك من المشاكل دي للأبد.
خامات ممتازة، ثبات يدوم، وتجربة نظافة وانتعاش تشرفك قدام زباينك.
جرب الفارق بنفسك واطلب عيناتك المجانية النهارده! ✨`,
        fusha: `إن التفاصيل الدقيقة هي الفارق الحقيقي بين تجربة عادية وأخرى استثنائية يثني عليها عملاؤك.
تجاوز تحديات الجودة مع ${product.name} من شركة الزمردة كوزماتيكس؛ حلول مبتكرة صممت خصيصاً لتمنح منشأتكم النظافة المطلقة والأناقة المستحقة.
${campaign.coreHook}.
تواصلوا معنا لتنسيق استلام العينات المعتمدة.`
    };

    // النسخة ج: العرض المباشر والفرصة والندرة (Direct CTA & Urgency)
    const copyC = {
        version: 'C - العرض المباشر والفرصة (Direct Offer & Urgency)',
        egyptian: `عرض توريدات خاص لفترة محدودة! 🚀
جاهز ترفع مستوى منشأتك وتستفيد من أقوى عروض الموسم؟
احجز طلبيتك من ${product.name} واستمتع بـ:
${campaign.coreOffer}.
الشحن متاح لجميع المحافظات حتى باب منشأتك.
ابعت كلمة "عرض" في رسالة وهنرد عليك فوراً! 📦`,
        fusha: `فرصة استثنائية لشركاء النجاح والمنشآت المتميزة! 🎯
تعلن شركة الزمردة كوزماتيكس عن إطلاق باقة التوريد الحصرية لهذا الموسم على منتج: ${product.name}.
المزايا: ${campaign.coreOffer}.
خدمة شحن سريعة ومنتظمة تغطي جميع أنحاء جمهورية مصر العربية.
أرسل استفسارك عبر الرسائل لتحصل على كشف الأسعار الفوري.`
    };

    return [copyA, copyB, copyC];
}

/**
 * 3. تصميم Brief احترافي للصور موجه للمصمم أو محركات الذكاء الاصطناعي
 */
function generateCreativeBrief(campaign) {
    const product = APPROVED_SPECS[campaign.primaryProduct] || APPROVED_SPECS.ronza_wipes;

    return {
        campaignTitle: campaign.themeTitle,
        productName: product.name,
        visualObjective: `إبراز الفخامة والنقاء والنظافة الفائقة لمنتج ${product.name} في بيئة واقعية راقية.`,
        brandColors: {
            primary: '#0F5132 (أخضر زمردي فاخر - Zomoroda Emerald)',
            secondary: '#D4AF37 (ذهبي ملكي دافئ - Royal Gold)',
            background: '#F8FAFC (أبيض نقي ورخام رمادي فاتح - Clean Marble White)',
            accent: '#0284C7 (أزرق نظافة منعش - Fresh Sky Blue)'
        },
        sceneLayout: {
            composition: 'لقطة ثلاثية الأبعاد بزاوية 45 درجة أو لقطة عين الطائر على طاولة رخامية فاخرة',
            lighting: 'إضاءة صباحية طبيعية ناعمة ودافئة (Soft Studio Diffused Light) مع انعكاسات خفيفة تعكس النقاء',
            props: 'قطرات ماء نقية منتعشة، أوراق ألوفيرا خضراء، فوطة قطنية مطوية بعناية، زجاجات عطور فرنسية أنيقة في الخلفية بعزل ضبابي (Bokeh)'
        },
        aiPromptMidjourney: `Professional commercial product photography of ${product.name}, luxury emerald green and gold cosmetic packaging, placed on clean white polished marble countertop, soft natural morning sunlight, fine water droplets, fresh green aloe vera leaves in background with shallow depth of field, 8k resolution, photorealistic, hyper-detailed, award-winning advertising visual --ar 1:1 --v 6.0 --style raw`,
        negativePrompt: `blurry, low quality, distorted text, cheap plastic, dark shadows, dirty background, oversaturated colors, cartoon, watermark, stock photo stamp`
    };
}

/**
 * 4. إعداد سيناريوهات الفيديوهات (Video Scripts) لـ Reels / TikTok / Shorts
 */
function generateVideoScript(campaign) {
    const product = APPROVED_SPECS[campaign.primaryProduct] || APPROVED_SPECS.ronza_wipes;

    return {
        videoTitle: `ريلز: ${campaign.themeTitle}`,
        targetDuration: '30 إلى 45 ثانية',
        aspectRatio: '9:16 (عمودي للهواتف)',
        musicMood: 'موسيقى حيوية، أنيقة، إيقاعية حديثة (Modern Corporate / Fresh Chic Beats)',
        scenes: [
            {
                second: '0:00 - 0:03',
                segment: '1. خطف الانتباه (The Hook)',
                visual: 'لقطة سريعة مقربة جداً بحركة سينمائية (Macro Shot) لمنديل يسحب من العبوة أو رذاذ المعطر ينتشر بنعومة في الهواء مع صوت انتعاش عالي.',
                voiceover: 'عمرك سألت نفسك إيه أول حاجة بتعلق في بال الزبون أول ما يدخل عندك؟',
                onScreenText: 'سر الانطباع الأول الفاخر! 🌟'
            },
            {
                second: '0:03 - 0:12',
                segment: '2. المشكلة والألم (The Pain Point)',
                visual: 'لقطة سريعة لمدير مطعم أو مشتريات يبدو قلقاً من شكوى عميل من خامة منديل رديء أو رائحة مكان غير ثابتة.',
                voiceover: 'أدوات النظافة الرخيصة والروائح اللي بتطير في ثواني بتقلل من قيمة اسمك ومنشأتك وبتكلفك أكتر في الاستهلاك.',
                onScreenText: 'بلاش توفر في المكان الغلط ❌'
            },
            {
                second: '0:12 - 0:28',
                segment: '3. الحل واستعراض المنتج (The Solution & Demo)',
                visual: `استعراض مبهج وعصري لـ ${product.name}: الملمس الفاخر، طباعة اللوجو الخاص، ورذاذ المعطر الفرنسي الفواح يملأ المكان مع ابتسامة النزلاء.`,
                voiceover: `مع الزمردة كوزماتيكس، بنقدملك ${product.name}.. خامات تركية ممتازة، روائح فرنسية ثابتة، وشعار منشأتك مطبوع بجودة تليق باسمك.`,
                onScreenText: `جودة تليق باسمك ✨ | توريد مباشر للمصنع`
            },
            {
                second: '0:28 - 0:35',
                segment: '4. الدعوة للإجراء (Strong CTA)',
                visual: 'شاشة خاتمة أنيقة باللون الأخضر الزمردي والذهبي، يظهر فيها رقم الواتساب ورابط الطلب مع حزمة المنتجات.',
                voiceover: 'اطلب عيناتك المجانية دلوقتي أو تواصل معنا لاستلام الكتالوج وعروض الأسعار الفورية!',
                onScreenText: 'اطلب عيناتك المجانية الآن 📦 | اضغط على الرابط بالأسفل'
            }
        ]
    };
}

/**
 * 5. تجميع الحملة المتكاملة وفحصها عبر حارس الأسعار والمواصفات
 */
function createFullCampaignPackage(sectorKey, themeId = null) {
    const campaign = generateCampaignIdea(sectorKey, themeId);
    const adCopies = generateAdCopies(campaign);
    const creativeBrief = generateCreativeBrief(campaign);
    const videoScript = generateVideoScript(campaign);

    // التحقق الصارم عبر حارس الأسعار والمواصفات
    const audit = reviewMarketingContent({
        title: campaign.themeTitle,
        body: adCopies[0].egyptian + ' ' + adCopies[0].fusha,
        targetSector: sectorKey,
        productId: campaign.primaryProduct
    });

    return {
        campaign,
        adCopies,
        creativeBrief,
        videoScript,
        guardianAudit: audit
    };
}

module.exports = {
    CAMPAIGN_ANGLES,
    generateCampaignIdea,
    generateAdCopies,
    generateCreativeBrief,
    generateVideoScript,
    createFullCampaignPackage
};
