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
