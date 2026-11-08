// config.json is intentionally excluded from the Vercel bundle, so deployed contact details come from BUSINESS_* variables.
function localProfile() {
    return require('./business-profile');
}

function businessProfile(env) {
    const local = localProfile();
    const pick = (name, key) => env[name] || local[key] || '';
    return {
        whatsapp: pick('BUSINESS_WHATSAPP', 'whatsapp'),
        email: pick('BUSINESS_EMAIL', 'email'),
        telegram: pick('BUSINESS_TELEGRAM', 'telegram'),
        facebookPage: pick('BUSINESS_FACEBOOK_URL', 'facebookPage'),
        instagramProfile: pick('BUSINESS_INSTAGRAM_URL', 'instagramProfile'),
        linkedinProfile: pick('BUSINESS_LINKEDIN_URL', 'linkedinProfile'),
        ronzaParentPage: pick('BUSINESS_RONZA_URL', 'ronzaParentPage')
    };
}

function getChannelStatus(env = process.env) {
    const business = businessProfile(env);
    const phone = String(business.whatsapp || '').replace(/\D/g, '');
    const whatsappLink = phone ? `https://wa.me/2${phone.replace(/^0/, '')}` : null;
    const telegramDigits = String(business.telegram || '').replace(/\D/g, '');
    const telegramLink = /^\d{10,}$/.test(telegramDigits) ? `https://t.me/+${telegramDigits.replace(/^0/, '20')}` : String(business.telegram || '').startsWith('https://t.me/') ? business.telegram : null;
    const smtpConfigured = require('./mailer').configured(env);
    const channels = [
        { id: 'whatsapp', name: 'واتساب المباشر', purpose: 'محادثة مباشرة مع العملاء', address: business.whatsapp || '', href: whatsappLink, profileReady: Boolean(whatsappLink), providerReady: false, detail: 'رقم الشركة متاح للمحادثة. ربط إرسال الحملات الآلي غير مفعّل.' },
        { id: 'email', name: 'البريد الإلكتروني', purpose: 'التواصل والعروض التجارية', address: business.email || '', href: business.email ? `mailto:${business.email}` : null, profileReady: Boolean(business.email), providerReady: false, setupReady: smtpConfigured, detail: smtpConfigured ? 'إعدادات SMTP موجودة، لكن موصّل الحملات غير مفعّل.' : 'البريد متاح كعنوان تواصل. لم يكتمل ربط موصّل الحملات.' },
        { id: 'messenger', name: 'فيسبوك ماسنجر', purpose: 'رسائل صفحة الشركة', address: business.facebookPage || '', href: business.facebookPage || null, profileReady: Boolean(business.facebookPage), providerReady: false, detail: 'رابط الصفحة متاح. الرسائل الآلية غير مربوطة.' },
        { id: 'instagram', name: 'إنستجرام', purpose: 'رسائل ومحتوى الحساب', address: business.instagramProfile || '', href: business.instagramProfile || null, profileReady: Boolean(business.instagramProfile), providerReady: false, detail: 'رابط الحساب متاح. لا يوجد موصّل رسائل حالياً.' },
        { id: 'telegram', name: 'تيليجرام', purpose: 'قناة الشركة والتنبيهات', address: business.telegram || '', href: telegramLink, profileReady: Boolean(telegramLink), providerReady: false, detail: 'يلزم تحديد رابط القناة العام وربط البوت قبل التشغيل.' },
        { id: 'linkedin', name: 'لينكدإن', purpose: 'التواصل والمحتوى المهني', address: business.linkedinProfile || '', href: business.linkedinProfile || null, profileReady: Boolean(business.linkedinProfile), providerReady: false, detail: 'رابط الصفحة متاح. النشر والرسائل الآلية غير مربوطة.' },
        { id: 'ronza', name: 'صفحة Ronza', purpose: 'الصفحة الرئيسية للعلامة', address: business.ronzaParentPage || '', href: business.ronzaParentPage || null, profileReady: Boolean(business.ronzaParentPage), providerReady: false, detail: 'رابط متابعة لصفحة العلامة. لا يوجد ربط نشر آلي.' }
    ];
    return {
        channels,
        supportAi: {
            enabled: env.AI_ENABLED === 'true' && Boolean(env.OPENAI_API_KEY && env.OPENAI_MODEL) && Number(env.AI_DAILY_CALL_LIMIT || 0) > 0,
            modelConfigured: Boolean(env.OPENAI_MODEL),
            message: env.AI_ENABLED !== 'true' ? 'وكيل الدعم الذكي متوقف من إعدادات البيئة.'
                : !env.OPENAI_API_KEY ? 'أضف مفتاح OpenAI في إعدادات البيئة لتشغيل وكيل الدعم.'
                    : !env.OPENAI_MODEL ? 'حدّد OPENAI_MODEL لتشغيل وكيل الدعم.'
                        : Number(env.AI_DAILY_CALL_LIMIT || 0) < 1 ? 'حدّد AI_DAILY_CALL_LIMIT بقيمة أكبر من صفر لتشغيل وكيل الدعم.'
                            : 'وكيل الدعم ينشئ مسودات فقط لمراجعة الفريق.'
        }
    };
}
module.exports = { getChannelStatus };
