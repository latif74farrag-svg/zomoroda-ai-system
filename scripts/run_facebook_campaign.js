/**
 * scripts/run_facebook_campaign.js
 * تشغيل وإدارة حملة فيسبوك للقنوات الثلاث وسلم الإحماء التدريجي
 * -------------------------------------------------------------
 * الاستخدام:
 * node scripts/run_facebook_campaign.js [weekNumber]
 * مثال:
 * node scripts/run_facebook_campaign.js 1   (لتشغيل/معاينة الأسبوع 1: منشور يومياً)
 * node scripts/run_facebook_campaign.js 2   (لتشغيل/معاينة الأسبوع 2: منشورين يومياً)
 * node scripts/run_facebook_campaign.js 3   (لتشغيل/معاينة الأسبوع 3: 3 منشورات يومياً)
 */

const { facebookWarmupManager, publisher } = require('../lib/marketing');

async function main() {
    const forcedWeek = process.argv[2] ? parseInt(process.argv[2], 10) : null;
    const todayStr = new Date().toISOString().slice(0, 10);

    console.log(`\n================================================================`);
    console.log(`🚀 حملة فيسبوك الذكية للقنوات الثلاث - شركة الزمردة كوزماتيكس 🚀`);
    console.log(`================================================================\n`);

    // 1. توليد منشورات اليوم وفق سلم الإحماء
    const batch = facebookWarmupManager.generateDailyPostsBatch(todayStr, forcedWeek);
    const policy = batch.policy;

    console.log(`📅 تاريخ اليوم: ${todayStr}`);
    console.log(`🛡️ مرحلة الإحماء الحالية: [ ${policy.label} ]`);
    console.log(`⏱️ مواعيد النشر اليومية المحددة: ${policy.slots.join(' | ')}`);
    console.log(`📊 إجمالي المنشورات المجدولة لليوم: ${batch.totalPostsScheduled} منشور عبر 3 قنوات\n`);

    console.log(`--- [ القنوات الثلاث المعتمدة بالنظام ] ---`);
    facebookWarmupManager.channels.forEach((ch, idx) => {
        console.log(`${idx + 1}. [${ch.name}]`);
        console.log(`   🔗 الرابط: ${ch.url}`);
    });
    console.log(`-------------------------------------------\n`);

    // 2. استعراض تفاصيل كل منشور مخصص لكل قناة
    batch.posts.forEach((post, i) => {
        console.log(`\n======================================================`);
        console.log(`📌 المنشور رقم (${i + 1}/${batch.posts.length}) | موعد النشر المقترح: [${post.slotTime}]`);
        console.log(`🏢 القناة المستهدفة: ${post.channelName}`);
        console.log(`🎯 القطاع المستهدف: ${post.sectorName} (${post.sector})`);
        console.log(`📦 المنتج: ${post.primaryProduct}`);
        console.log(`📝 زاوية الإعلان: ${post.copyVersion}`);
        console.log(`🛡️ حارس الأسعار والمواصفات: ${post.guardianAudit.approved ? '✅ معتمد' : '❌ مرفوض'}`);
        console.log(`------------------------------------------------------`);
        console.log(`🇪🇬 [النص بالعامية المصرية]:\n${post.textEgyptian}`);
        console.log(`\n📖 [النص بالعربية الفصحى]:\n${post.textFusha}`);
        console.log(`------------------------------------------------------`);
        console.log(`🎯 الأهداف المجدولة:`);
        post.targetDestinations.forEach(d => {
            console.log(`   • ${d.name} -> [${d.status}]`);
        });
        console.log(`🎨 فكرة الصورة المرفقة: ${post.creativeBrief.visualObjective}`);
        console.log(`======================================================`);
    });

    // 3. محاكاة النشر الآمن مع فواصل مكافحة الحظر
    console.log(`\n🛡️ [ بدء فحص تنفيذ النشر الآمن مع تطبيق فواصل الأمان ]`);
    for (const post of batch.posts) {
        // النشر على الصفحة
        console.log(`\n📡 جاري معالجة المنشور (${post.id}) للقناة (${post.channelName})...`);
        const pageResult = await publisher.publishToPage({
            pageId: post.channelId,
            text: post.textEgyptian,
            sector: post.sector,
            productId: post.primaryProduct
        });
        if (pageResult.success) {
            facebookWarmupManager.markPostPublished(post.id, 'own_page_or_profile', pageResult);
            console.log(`   ✅ تم اعتماد النشر على القناة (${post.channelName}) بنجاح.`);
        }

        // النشر على الجروبات بفواصل الأمان
        const groupResult = await publisher.publishToGroupSafely({
            groupId: `grp_${post.sector}_${post.channelId}`,
            groupName: `مجموعات ${post.sectorName} المشتركة بالحساب`,
            campaignPackage: {
                campaign: { sector: post.sector, primaryProduct: post.primaryProduct },
                adCopies: [{ egyptian: post.textEgyptian, fusha: post.textFusha }]
            },
            copyIndex: post.postNumberInDay - 1
        });
        if (groupResult.success) {
            facebookWarmupManager.markPostPublished(post.id, 'joined_groups', groupResult);
            console.log(`   ✅ تم اعتماد النشر على المجموعات بنجاح.`);
            console.log(`   ⏱️ فاصل الأمان الموصى به قبل المجموعة التالية: ${groupResult.nextSafeDelayMinutes} دقيقة.`);
        }
    }

    console.log(`\n🎉 اكتمل جدول إحماء ونشر فيسبوك لليوم بنجاح!`);
    console.log(`💾 جميع المنشورات وحالاتها محفوظة في: facebook_posts_schedule.json\n`);
}

main().catch(console.error);
