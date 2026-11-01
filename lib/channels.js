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
    const smtpConfigured = Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS && !/your_.*_here/i.test(env.SMTP_PASS));
    const channels = [
        { id: 'whatsapp', name: '\u0648\u0627\u062a\u0633\u0627\u0628 \u0627\u0644\u0645\u0628\u0627\u0634\u0631', purpose: '\u0645\u062d\u0627\u062f\u062b\u0629 \u0645\u0628\u0627\u0634\u0631\u0629 \u0645\u0639 \u0627\u0644\u0639\u0645\u0644\u0627\u0621', address: business.whatsapp || '', href: whatsappLink, profileReady: Boolean(whatsappLink), providerReady: false, detail: '\u0631\u0642\u0645 \u0627\u0644\u0634\u0631\u0643\u0629 \u0645\u062a\u0627\u062d \u0644\u0644\u0645\u062d\u0627\u062f\u062b\u0629. \u0631\u0628\u0637 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u062d\u0645\u0644\u0627\u062a \u0627\u0644\u0622\u0644\u064a \u063a\u064a\u0631 \u0645\u0641\u0639\u0651\u0644.' },
        { id: 'email', name: '\u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a', purpose: '\u0627\u0644\u062a\u0648\u0627\u0635\u0644 \u0648\u0627\u0644\u0639\u0631\u0648\u0636 \u0627\u0644\u062a\u062c\u0627\u0631\u064a\u0629', address: business.email || '', href: business.email ? `mailto:${business.email}` : null, profileReady: Boolean(business.email), providerReady: false, setupReady: smtpConfigured, detail: smtpConfigured ? '\u0625\u0639\u062f\u0627\u062f\u0627\u062a SMTP \u0645\u0648\u062c\u0648\u062f\u0629\u060c \u0644\u0643\u0646 \u0645\u0648\u0635\u0651\u0644 \u0627\u0644\u062d\u0645\u0644\u0627\u062a \u063a\u064a\u0631 \u0645\u0641\u0639\u0651\u0644.' : '\u0627\u0644\u0628\u0631\u064a\u062f \u0645\u062a\u0627\u062d \u0643\u0639\u0646\u0648\u0627\u0646 \u062a\u0648\u0627\u0635\u0644. \u0644\u0645 \u064a\u0643\u062a\u0645\u0644 \u0631\u0628\u0637 \u0645\u0648\u0635\u0651\u0644 \u0627\u0644\u062d\u0645\u0644\u0627\u062a.' },
        { id: 'messenger', name: '\u0641\u064a\u0633\u0628\u0648\u0643 \u0645\u0627\u0633\u0646\u062c\u0631', purpose: '\u0631\u0633\u0627\u0626\u0644 \u0635\u0641\u062d\u0629 \u0627\u0644\u0634\u0631\u0643\u0629', address: business.facebookPage || '', href: business.facebookPage || null, profileReady: Boolean(business.facebookPage), providerReady: false, detail: '\u0631\u0627\u0628\u0637 \u0627\u0644\u0635\u0641\u062d\u0629 \u0645\u062a\u0627\u062d. \u0627\u0644\u0631\u0633\u0627\u0626\u0644 \u0627\u0644\u0622\u0644\u064a\u0629 \u063a\u064a\u0631 \u0645\u0631\u0628\u0648\u0637\u0629.' },
        { id: 'instagram', name: '\u0625\u0646\u0633\u062a\u062c\u0631\u0627\u0645', purpose: '\u0631\u0633\u0627\u0626\u0644 \u0648\u0645\u062d\u062a\u0648\u0649 \u0627\u0644\u062d\u0633\u0627\u0628', address: business.instagramProfile || '', href: business.instagramProfile || null, profileReady: Boolean(business.instagramProfile), providerReady: false, detail: '\u0631\u0627\u0628\u0637 \u0627\u0644\u062d\u0633\u0627\u0628 \u0645\u062a\u0627\u062d. \u0644\u0627 \u064a\u0648\u062c\u062f \u0645\u0648\u0635\u0651\u0644 \u0631\u0633\u0627\u0626\u0644 \u062d\u0627\u0644\u064a\u0627\u064b.' },
        { id: 'telegram', name: '\u062a\u0644\u064a\u062c\u0631\u0627\u0645', purpose: '\u0642\u0646\u0627\u0629 \u0627\u0644\u0634\u0631\u0643\u0629 \u0648\u0627\u0644\u062a\u0646\u0628\u064a\u0647\u0627\u062a', address: business.telegram || '', href: telegramLink, profileReady: Boolean(telegramLink), providerReady: false, detail: '\u064a\u0644\u0632\u0645 \u062a\u062d\u062f\u064a\u062f \u0631\u0627\u0628\u0637 \u0627\u0644\u0642\u0646\u0627\u0629 \u0627\u0644\u0639\u0627\u0645 \u0648\u0631\u0628\u0637 \u0627\u0644\u0628\u0648\u062a \u0642\u0628\u0644 \u0627\u0644\u062a\u0634\u063a\u064a\u0644.' },
        { id: 'linkedin', name: '\u0644\u064a\u0646\u0643\u062f\u0625\u0646', purpose: '\u0627\u0644\u062a\u0648\u0627\u0635\u0644 \u0648\u0627\u0644\u0645\u062d\u062a\u0648\u0649 \u0627\u0644\u0645\u0647\u0646\u064a', address: business.linkedinProfile || '', href: business.linkedinProfile || null, profileReady: Boolean(business.linkedinProfile), providerReady: false, detail: '\u0631\u0627\u0628\u0637 \u0627\u0644\u0635\u0641\u062d\u0629 \u0645\u062a\u0627\u062d. \u0627\u0644\u0646\u0634\u0631 \u0648\u0627\u0644\u0631\u0633\u0627\u0626\u0644 \u0627\u0644\u0622\u0644\u064a\u0629 \u063a\u064a\u0631 \u0645\u0631\u0628\u0648\u0637\u0629.' },
        { id: 'ronza', name: '\u0635\u0641\u062d\u0629 Ronza', purpose: '\u0627\u0644\u0635\u0641\u062d\u0629 \u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629 \u0644\u0644\u0639\u0644\u0627\u0645\u0629', address: business.ronzaParentPage || '', href: business.ronzaParentPage || null, profileReady: Boolean(business.ronzaParentPage), providerReady: false, detail: '\u0631\u0627\u0628\u0637 \u0645\u062a\u0627\u0628\u0639\u0629 \u0644\u0635\u0641\u062d\u0629 \u0627\u0644\u0639\u0644\u0627\u0645\u0629. \u0644\u0627 \u064a\u0648\u062c\u062f \u0631\u0628\u0637 \u0646\u0634\u0631 \u0622\u0644\u064a.' }
    ];
    return {
        channels,
        supportAi: {
            enabled: env.AI_ENABLED === 'true' && Boolean(env.OPENAI_API_KEY && env.OPENAI_MODEL) && Number(env.AI_DAILY_CALL_LIMIT || 0) > 0,
            modelConfigured: Boolean(env.OPENAI_MODEL),
            message: '\u0648\u0643\u064a\u0644 \u0627\u0644\u062f\u0639\u0645 \u064a\u0646\u0634\u0626 \u0645\u0633\u0648\u062f\u0627\u062a \u0641\u0642\u0637 \u0644\u0645\u0631\u0627\u062c\u0639\u0629 \u0627\u0644\u0641\u0631\u064a\u0642.'
        }
    };
}
module.exports = { getChannelStatus };
