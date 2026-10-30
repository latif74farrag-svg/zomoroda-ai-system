// social_scraper_agent.js - وكيل الاستكشاف واستخراج العملاء من منصات التواصل الاجتماعي
const MultiPlatformRouter = require('./platform_router');
const db = require('./database');

class SocialScraperAgent {
    constructor() {
        this.activeSchedules = [];
    }

    /**
     * استكشاف العملاء المستهدفين وتشغيل الحملة لهم
     * @param {string} targetAudience - الجمهور المستهدف
     * @param {string} platform - المنصة (facebook, instagram, etc.)
     */
    async searchAndExecuteCampaign(targetAudience, platform = 'facebook') {
        console.log(`🤖 [وكيل الاستكشاف الآلي]: بدء البحث والتنقيب عن: "${targetAudience}" على منصة [${platform}]...`);

        // محاكاة استخراج ليدز مؤهلة بناءً على كلمات البحث المستهدفة
        const leads = this.generateProspectLeads(targetAudience, platform);
        console.log(`📊 [وكيل الاستكشاف]: تم العثور على (${leads.length}) حساب/صفحة مطابقة لشروط الاستهداف.`);

        for (const lead of leads) {
            try {
                // حفظ الليد في قاعدة البيانات
                db.run(
                    `INSERT OR IGNORE INTO orders (client_name, client_phone, sector, platform, order_details, status) VALUES (?, ?, ?, ?, ?, ?)`,
                    [lead.name, lead.phone || lead.psid, lead.sector, platform, `Auto-discovered lead: ${targetAudience}`, 'Lead_Discovered']
                );

                // إرسال الرسالة المخصصة
                await MultiPlatformRouter.dispatchToClient({
                    'اسم الجهة': lead.name,
                    'القطاع': lead.sector,
                    'المنصة': platform,
                    'PSID': lead.psid,
                    'الهاتف': lead.phone,
                    'الرسالة المخصصة': lead.message
                }, {
                    facebookApi: {
                        sendMessengerMessage: async (psid, msg) => {
                            console.log(`📩 [Messenger Sent]: تم توجيه الرسالة المخصصة للحساب: ${psid}`);
                        }
                    }
                });
            } catch (err) {
                console.error(`⚠️ [وكيل الاستكشاف]: تعذر مراسلة العميل ${lead.name}:`, err.message);
            }
        }

        return leads;
    }

    generateProspectLeads(targetAudience, platform) {
        if (/ماميز|ربح|منزل|ستات/i.test(targetAudience)) {
            return [
                { name: "جروب ماميز القاهرة والجيزة للتسوق", psid: "FB_LEAD_MOMS_CAIRO_101", sector: "MOMS_AND_HOMEWORKERS" },
                { name: "مبادرة سيدات الأعمال والعمل المنزلي", psid: "FB_LEAD_MOMS_HOME_102", sector: "MOMS_AND_HOMEWORKERS" }
            ];
        }
        if (/صالون|تجميل|كوافير/i.test(targetAudience)) {
            return [
                { name: "مركز لمسة جمال - المهندسين", psid: "FB_LEAD_SALON_MOHANDSEEN_201", sector: "SALONS" },
                { name: "صالون مسيو إبراهيم - التجمع", psid: "FB_LEAD_SALON_TAGAMOA_202", sector: "SALONS" }
            ];
        }
        return [
            { name: "مشتريات شركة التوريدات الحديثة", psid: "FB_LEAD_GEN_301", sector: "SUPPLIES_AND_HOTELS" }
        ];
    }
}

module.exports = new SocialScraperAgent();

