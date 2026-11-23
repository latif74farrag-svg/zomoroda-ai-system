const test = require('node:test');
const assert = require('node:assert/strict');

const {
    APPROVED_SPECS,
    reviewMarketingContent,
    generateCampaignIdea,
    generateAdCopies,
    generateCreativeBrief,
    generateVideoScript,
    createFullCampaignPackage,
    contentLibrary,
    publisher,
    messengerEscalator
} = require('../lib/marketing');

test('1. حارس الأسعار والمواصفات: كشف مخالفات العزل وتسريب الأسعار بدقة', () => {
    // محاولة إرسال منتج غير رونزا للصيدليات
    const badPharmacyPost = {
        title: 'عرض معطرات جو للصيدليات',
        body: 'اشتري معطر جو وأرضيات بسعر 60 جنيه',
        targetSector: 'pharmacy',
        productId: 'air_floor_freshener'
    };
    const audit1 = reviewMarketingContent(badPharmacyPost);
    assert.equal(audit1.approved, false);
    assert.ok(audit1.errors.some(e => e.includes('مخالفة قاعدة العزل')));

    // محاولة تسريب أسعار الجملة للجمهور
    const leakRetailPost = {
        title: 'عروض الماميز والبيوت',
        body: 'اشتري بسعر الجملة وسعر المصنع بخصم 40% كرتونة رونزا بـ 15 جنيه',
        targetSector: 'moms',
        productId: 'ronza_wipes'
    };
    const audit2 = reviewMarketingContent(leakRetailPost);
    assert.equal(audit2.approved, false);
    assert.ok(audit2.errors.some(e => e.includes('تسريب أسعار')));

    // منشور شرعي للفنادق
    const validHotelPost = {
        title: 'مناديل فندقية بشعاركم',
        body: 'خدمة Private Label وطباعة لوجو فندقكم مع معطرات جو فرنسية 460 مل',
        targetSector: 'hotels',
        productId: 'private_label_wipes'
    };
    const audit3 = reviewMarketingContent(validHotelPost);
    assert.equal(audit3.approved, true);
    assert.equal(audit3.errors.length, 0);
});

test('2. محرك الحملات: إنتاج 3 نسخ إعلانية (A/B/C) بالمصرية والفصحى', () => {
    const campaign = generateCampaignIdea('hotels');
    assert.ok(campaign.campaignId);
    assert.equal(campaign.sector, 'hotels');

    const copies = generateAdCopies(campaign);
    assert.equal(copies.length, 3);
    assert.ok(copies[0].version.includes('Value & ROI'));
    assert.ok(copies[1].version.includes('Storytelling'));
    assert.ok(copies[2].version.includes('Direct Offer'));

    // التحقق من وجود الصيغتين: المصرية والفصحى
    for (const c of copies) {
        assert.ok(c.egyptian && c.egyptian.length > 20);
        assert.ok(c.fusha && c.fusha.length > 20);
    }
});

test('3. محرك الصور والفيديو: إنتاج Creative Brief وسيناريو ريلز وتيك توك متكامل', () => {
    const campaign = generateCampaignIdea('restaurants');
    
    // Creative Brief للصور
    const brief = generateCreativeBrief(campaign);
    assert.ok(brief.brandColors.primary.includes('0F5132'));
    assert.ok(brief.aiPromptMidjourney.includes('Professional commercial product photography'));
    assert.ok(brief.negativePrompt.includes('blurry'));

    // سكريبت الفيديو (Hook -> Pain -> Solution -> CTA)
    const script = generateVideoScript(campaign);
    assert.equal(script.scenes.length, 4);
    assert.ok(script.scenes[0].segment.includes('خطف الانتباه'));
    assert.ok(script.scenes[1].segment.includes('المشكلة والألم'));
    assert.ok(script.scenes[2].segment.includes('الحل'));
    assert.ok(script.scenes[3].segment.includes('الدعوة للإجراء'));

    for (const scene of script.scenes) {
        assert.ok(scene.visual && scene.voiceover && scene.onScreenText);
    }
});

test('4. مكتبة المحتوى: تصنيف وتصفية المحتوى واعتماد المواد الصالحة', () => {
    const hotelItems = contentLibrary.query({ sector: 'hotels' });
    assert.ok(hotelItems.length >= 1);
    assert.equal(hotelItems[0].status, 'approved');

    // تصفية بحسب المنتج
    const wipesItems = contentLibrary.query({ product: 'ronza_wipes' });
    assert.ok(wipesItems.length >= 1);
});

test('5. محرك النشر الآمن: تطبيق بروتوكول مكافحة الحظر وتدوير النسخ للمجموعات', async () => {
    const pack = createFullCampaignPackage('wholesale');
    const result = await publisher.publishToGroupSafely({
        groupId: 'grp_eg_wholesalers_1',
        groupName: 'تجار جملة المنظفات والورقيات',
        campaignPackage: pack,
        copyIndex: 0
    });

    assert.equal(result.success, true);
    assert.equal(result.mode, 'safe_group_publish');
    assert.ok(result.nextSafeDelayMinutes >= 15 && result.nextSafeDelayMinutes <= 30);
    assert.ok(result.versionUsed.includes('Dynamic Jitter'));
});

test('6. ماسنجر: كشف طلبات التفاوض وتحويلها فوراً للإدارة مع استمرار الكتالوج التلقائي', () => {
    // 1. طلب تفاوض وخصم خاص للكميات الضخمة -> يجب تحويله للإدارة
    const negotiationMsg = {
        senderId: 'fb_user_9988',
        customerName: 'فندق شيراتون القاهرة',
        channel: 'messenger',
        text: 'محتاجين طلبية ضخمة وعقد سنوي وفيه تفاوض على سعر خاص وخصم إضافي؟',
        receivedAt: Date.now()
    };
    const res1 = messengerEscalator.processInboundMessage(negotiationMsg);
    assert.equal(res1.action, 'escalated_to_management');
    assert.ok(res1.replyText.includes('عبد اللطيف فراج'));
    
    const pendings = messengerEscalator.getPendingEscalations();
    assert.ok(pendings.some(p => p.senderId === 'fb_user_9988'));

    // 2. طلب كتالوج عادي -> رد آلي بالكتالوج المناسب
    const catalogMsg = {
        senderId: 'fb_user_5544',
        customerName: 'مطعم سيتي كريب',
        channel: 'messenger',
        text: 'ممكن تبعتلي الكتالوج والأسعار لو سمحت؟',
        receivedAt: Date.now()
    };
    const res2 = messengerEscalator.processInboundMessage(catalogMsg);
    assert.equal(res2.action, 'catalog_sent');
    assert.ok(res2.replyText.includes('كتالوج المطاعم'));

    // 3. رسالة قديمة تتجاوز 24 ساعة -> رفض المراسلة حفاظاً على سياسة ميتا
    const expiredMsg = {
        senderId: 'fb_user_1122',
        channel: 'messenger',
        text: 'عايز أسعار',
        receivedAt: Date.now() - (26 * 3600 * 1000) // قبل 26 ساعة
    };
    const res3 = messengerEscalator.processInboundMessage(expiredMsg);
    assert.equal(res3.action, 'expired_window');
});

test('7. مدير إحماء فيسبوك: إدارة القنوات وسلم الإحماء التدريجي (1 -> 2 -> 3 منشورات)', () => {
    const { facebookWarmupManager } = require('../lib/marketing');

    // 1. التحقق من القنوات (حسابين نشطين للحملة: زمرده وماميز، واستبعاد الحساب الشخصي)
    assert.equal(facebookWarmupManager.channels.length, 3);
    const activeChannels = facebookWarmupManager.getActiveChannels();
    assert.equal(activeChannels.length, 2, 'يجب أن تكون الحملة مركزة على حسابين نشطين فقط (زمرده وماميز)');
    assert.ok(activeChannels.some(c => c.id === '100090392977665'));
    assert.ok(activeChannels.some(c => c.id === '61596440741975'));
    assert.ok(!activeChannels.some(c => c.id === 'abdullhami'), 'استبعاد الحساب الشخصي لـ أ. عبد اللطيف من الحملة');

    // 2. التحقق من سياسة الأسبوع 1 (منشور واحد يومياً لكل قناة نشطة = 2 منشورات)
    const w1 = facebookWarmupManager.generateDailyPostsBatch('2026-11-23', 1);
    assert.equal(w1.policy.postsPerDay, 1);
    assert.equal(w1.totalPostsScheduled, 2);

    // 3. التحقق من سياسة الأسبوع 2 (منشورين يومياً لكل قناة نشطة = 4 منشورات)
    const w2 = facebookWarmupManager.generateDailyPostsBatch('2026-11-24', 2);
    assert.equal(w2.policy.postsPerDay, 2);
    assert.equal(w2.totalPostsScheduled, 4);

    // 4. التحقق من سياسة الأسبوع 3 (3 منشورات يومياً لكل قناة نشطة = 6 منشورات)
    const w3 = facebookWarmupManager.generateDailyPostsBatch('2026-11-25', 3);
    assert.equal(w3.policy.postsPerDay, 3);
    assert.equal(w3.totalPostsScheduled, 6);

    // 5. التحقق من عدم تكرار نفس النص أو نفس القطاع على القنوات النشطة في نفس الوقت
    const sectorsUsed = w1.posts.map(p => p.sector);
    const uniqueSectors = new Set(sectorsUsed);
    assert.equal(sectorsUsed.length, uniqueSectors.size, 'يجب تدوير القطاعات بين القنوات لمنع التكرار');

    // 6. التحقق من عزل مجموعات الفنادق والتوريدات الـ 84 عن مجموعات الماميز الـ 28
    const hotelsBatch = facebookWarmupManager.generateDailyPostsBatch('2026-11-23', 1, 'hotels');
    const hotelDestinations = hotelsBatch.posts[0].targetDestinations.filter(d => d.type === 'user_joined_group');
    assert.equal(hotelDestinations.length, 42, 'يجب توزيع 42 مجموعة فنادق وتوريدات لكل قناة نشطة من أصل 84');

    const momsBatch = facebookWarmupManager.generateDailyPostsBatch('2026-11-23', 1, 'moms');
    const momsDestinations = momsBatch.posts[0].targetDestinations.filter(d => d.type === 'user_joined_group');
    assert.equal(momsDestinations.length, 14, 'يجب توزيع 14 مجموعة ماميز لكل قناة نشطة من أصل 28');
});

