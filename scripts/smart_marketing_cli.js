/**
 * scripts/smart_marketing_cli.js
 * واجهة تشغيل واختبار منظومة التسويق الذكي
 * -------------------------------------------------------------
 * الاستخدام:
 * node scripts/smart_marketing_cli.js [sector]
 * مثال:
 * node scripts/smart_marketing_cli.js hotels
 * node scripts/smart_marketing_cli.js restaurants
 * node scripts/smart_marketing_cli.js moms
 */

const {
    createFullCampaignPackage,
    contentLibrary,
    publisher,
    messengerEscalator
} = require('../lib/marketing');

async function run() {
    const sector = process.argv[2] || 'hotels';

    console.log(`\n======================================================`);
    console.log(`✨ منظومة التسويق الذكي - شركة الزمردة كوزماتيكس ✨`);
    console.log(`🎯 تشغيل حزمة تسويقية متكاملة لقطاع: [${sector.toUpperCase()}]`);
    console.log(`======================================================\n`);

    // 1. توليد حزمة الحملة الإعلانية
    const pack = createFullCampaignPackage(sector);
    console.log(`📢 عنوان الحملة: ${pack.campaign.themeTitle}`);
    console.log(`🎯 الخطاف الإعلاني (Hook): "${pack.campaign.coreHook}"`);
    console.log(`🎁 العرض الأساسي (Offer): "${pack.campaign.coreOffer}"`);
    console.log(`📦 المنتج الأساسي: ${pack.campaign.primaryProduct}`);
    console.log(`🛡️ فحص حارس الأسعار والمواصفات: ${pack.guardianAudit.approved ? '✅ معتمد وصالح للنشر' : '❌ مرفوض'}\n`);

    // 2. عرض النسخ الإعلانية الـ 3 (A/B/C) بالمصرية والفصحى
    console.log(`--- [ النسخ الإعلانية الـ 3 (A/B/C Testing) ] ---`);
    pack.adCopies.forEach((copy, idx) => {
        console.log(`\n📌 ${copy.version}:`);
        console.log(`🇪🇬 [بالعامية المصرية]:\n${copy.egyptian}`);
        console.log(`📖 [بالعربية الفصحى]:\n${copy.fusha}`);
    });

    // 3. عرض Creative Brief للصور
    console.log(`\n------------------------------------------------------`);
    console.log(`🎨 [ Creative Brief لتصميم الصور و Midjourney Prompt ]`);
    console.log(`------------------------------------------------------`);
    console.log(`• الهدف البصري: ${pack.creativeBrief.visualObjective}`);
    console.log(`• ألوان الهوية: ${JSON.stringify(pack.creativeBrief.brandColors, null, 2)}`);
    console.log(`• تركيبة المشهد: ${pack.creativeBrief.sceneLayout.composition}`);
    console.log(`• برومبت الذكاء الاصطناعي (Midjourney Prompt):\n  "${pack.creativeBrief.aiPromptMidjourney}"`);

    // 4. عرض سيناريو الفيديو (Reels / TikTok Script)
    console.log(`\n------------------------------------------------------`);
    console.log(`🎬 [ سيناريو فيديو Reels / TikTok - 30 إلى 45 ثانية ]`);
    console.log(`------------------------------------------------------`);
    console.log(`العنوان: ${pack.videoScript.videoTitle} | الإيقاع: ${pack.videoScript.musicMood}\n`);
    pack.videoScript.scenes.forEach(s => {
        console.log(`⏱️ [${s.second}] - ${s.segment}:`);
        console.log(`   👁️ المشهد: ${s.visual}`);
        console.log(`   🎙️ الصوت: "${s.voiceover}"`);
        console.log(`   📱 على الشاشة: [${s.onScreenText}]\n`);
    });

    // 5. حفظ في مكتبة المحتوى
    const saved = contentLibrary.addItem({
        title: pack.campaign.themeTitle,
        productId: pack.campaign.primaryProduct,
        sector: sector,
        platform: 'facebook_page',
        copies: pack.adCopies,
        creativeBrief: pack.creativeBrief,
        videoScript: pack.videoScript,
        tags: [sector, pack.campaign.primaryProduct, 'cli_generated']
    });
    console.log(`💾 تم حفظ المادة بنجاح في مكتبة المحتوى (المعرف: ${saved.id})`);

    // 6. محاكاة نشر آمن لمجموعة فيسبوك
    console.log(`\n------------------------------------------------------`);
    console.log(`🛡️ [ محاكاة بروتوكول النشر الجماعي الآمن في المجموعات ]`);
    console.log(`------------------------------------------------------`);
    const groupPub = await publisher.publishToGroupSafely({
        groupId: `grp_${sector}_leaders`,
        groupName: `تجمع رواد وأصحاب ${pack.campaign.sectorName}`,
        campaignPackage: pack,
        copyIndex: 1
    });
    console.log(`الحالة: ${groupPub.success ? '✅ تم النشر بأمان' : '❌ توقف أمان'}`);
    if (groupPub.success) {
        console.log(`النسخة المستخدمة: ${groupPub.versionUsed}`);
        console.log(`الفاصل الزمني حتى المجموعة التالية: ${groupPub.nextSafeDelayMinutes} دقيقة.`);
    }

    // 7. استعراض حالة ماسنجر والتحويلات
    console.log(`\n------------------------------------------------------`);
    console.log(`💬 [ نظام ماسنجر والتحويل التلقائي للإدارة ]`);
    console.log(`------------------------------------------------------`);
    const testNegotiation = messengerEscalator.processInboundMessage({
        senderId: 'demo_user_123',
        customerName: 'فندق سياحي بالغردقة',
        text: 'عايزين توريد سنوي لمناديل ومستلزمات وفيه تفاوض على سعر خاص للكميات الضخمة؟'
    });
    console.log(`نتيجة كشف النية: ${testNegotiation.action}`);
    console.log(`رسالة الرد الآلي للعميل:\n"${testNegotiation.replyText}"`);
    console.log(`\n🎉 اكتمل استعراض منظومة التسويق الذكي بنجاح!\n`);
}

run().catch(console.error);
