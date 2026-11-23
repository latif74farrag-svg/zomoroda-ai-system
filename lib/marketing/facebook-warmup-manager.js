/**
 * lib/marketing/facebook-warmup-manager.js
 * إدارة قنوات فيسبوك الثلاث وسلم الإحماء التدريجي لمكافحة الحظر
 * -------------------------------------------------------------
 * القنوات المسجلة:
 * 1. https://www.facebook.com/profile.php?id=100090392977665
 * 2. https://www.facebook.com/profile.php?id=61596440741975
 * 3. https://www.facebook.com/abdullhami/
 *
 * سلم الإحماء التلقائي:
 * - الأسبوع 1: منشور واحد يومياً (1 post/day)
 * - الأسبوع 2: منشورين يومياً (2 posts/day) بفواصل صباحية ومسائية
 * - الأسبوع 3 فصاعداً: 3 منشورات يومياً (3 posts/day) صباحاً وعصراً ومساءً
 */

const fs = require('fs');
const path = require('path');
const { createFullCampaignPackage } = require('./campaign-engine');
const { reviewMarketingContent } = require('./price-spec-guardian');

const CHANNELS_CONFIG_FILE = path.join(__dirname, '..', '..', 'facebook_channels.json');
const SCHEDULE_FILE = path.join(__dirname, '..', '..', 'facebook_posts_schedule.json');

// القنوات الثلاث المعتمدة الخاصة بـ أ. عبد اللطيف فراج
const MANAGED_CHANNELS = [
    {
        id: '100090392977665',
        name: 'قناة الزمردة كوزماتيكس - الحساب الأول',
        url: 'https://www.facebook.com/profile.php?id=100090392977665',
        type: 'profile_or_page',
        active: true
    },
    {
        id: '61596440741975',
        name: 'قناة الزمردة كوزماتيكس - الصفحة التجارية الثانية',
        url: 'https://www.facebook.com/profile.php?id=61596440741975',
        type: 'page',
        active: true
    },
    {
        id: 'abdullhami',
        name: 'قناة أ. عبد اللطيف فراج الشخصية / الإدارية',
        url: 'https://www.facebook.com/abdullhami/',
        type: 'profile_manager',
        active: true
    }
];

// سلم الإحماء المعتمد بدقة
const WARMUP_LADDER = {
    week1: { postsPerDay: 1, label: 'الأسبوع الأول: منشور واحد يومياً', slots: ['11:00 ص'] },
    week2: { postsPerDay: 2, label: 'الأسبوع الثاني: منشورين يومياً', slots: ['11:00 ص', '05:30 م'] },
    week3: { postsPerDay: 3, label: 'الأسبوع الثالث فصاعداً: 3 منشورات يومياً', slots: ['10:30 ص', '03:30 م', '07:30 م'] }
};

class FacebookWarmupManager {
    constructor() {
        this.channels = this.loadChannels();
        this.schedule = this.loadSchedule();
    }

    loadChannels() {
        try {
            if (fs.existsSync(CHANNELS_CONFIG_FILE)) {
                return JSON.parse(fs.readFileSync(CHANNELS_CONFIG_FILE, 'utf8'));
            }
        } catch (_) {}
        // حفظ القنوات الافتراضية لأول مرة
        this.saveChannels(MANAGED_CHANNELS);
        return MANAGED_CHANNELS;
    }

    saveChannels(channels) {
        try {
            fs.writeFileSync(CHANNELS_CONFIG_FILE, JSON.stringify(channels, null, 2), 'utf8');
        } catch (_) {}
    }

    loadSchedule() {
        try {
            if (fs.existsSync(SCHEDULE_FILE)) {
                return JSON.parse(fs.readFileSync(SCHEDULE_FILE, 'utf8'));
            }
        } catch (_) {}
        return [];
    }

    saveSchedule() {
        try {
            fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(this.schedule, null, 2), 'utf8');
        } catch (_) {}
    }

    /**
     * حساب رقم أسبوع الإحماء بناءً على تاريخ البدء (أو يتم تمريره يدوياً)
     */
    getCurrentWeek(startDate = new Date('2026-11-23T00:00:00+02:00')) {
        const now = new Date();
        const diffDays = Math.max(0, Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
        if (diffDays < 7) return 1;
        if (diffDays < 14) return 2;
        return 3;
    }

    /**
     * الحصول على معايير الإحماء للأسبوع الحالي
     */
    getWarmupPolicy(weekNumber = null) {
        const week = weekNumber || this.getCurrentWeek();
        if (week === 1) return { week: 1, ...WARMUP_LADDER.week1 };
        if (week === 2) return { week: 2, ...WARMUP_LADDER.week2 };
        return { week: 3, ...WARMUP_LADDER.week3 };
    }

    /**
     * توليد جدول منشورات اليوم لكل قناة مع التدوير بين القطاعات والنسخ (A/B/C)
     * لضمان عدم نشر محتوى مكرر بين القنوات الثلاث أو على المجموعات
     */
    generateDailyPostsBatch(targetDateStr = null, weekNumber = null) {
        const dateStr = targetDateStr || new Date().toISOString().slice(0, 10);
        const policy = this.getWarmupPolicy(weekNumber);
        const sectors = ['hotels', 'restaurants', 'salons', 'pharmacies', 'wholesale', 'moms'];
        
        const createdPosts = [];

        this.channels.forEach((channel, chIndex) => {
            for (let postIndex = 0; postIndex < policy.postsPerDay; postIndex++) {
                // تدوير القطاعات والنسخ بحسب رقم القناة ورقم المنشور في اليوم
                const sectorIdx = (chIndex * 2 + postIndex) % sectors.length;
                const sectorKey = sectors[sectorIdx];
                const pack = createFullCampaignPackage(sectorKey);

                // اختيار نسخة A أو B أو C مختلفة لكل قناة
                const copyIdx = (chIndex + postIndex) % 3;
                const copy = pack.adCopies[copyIdx];
                const slot = policy.slots[postIndex] || '12:00 م';

                // فحص الجارديان للأسعار والمواصفات
                const audit = reviewMarketingContent({
                    title: pack.campaign.themeTitle,
                    body: copy.egyptian + ' ' + copy.fusha,
                    targetSector: sectorKey,
                    productId: pack.campaign.primaryProduct
                });

                const postRecord = {
                    id: `post_${channel.id}_${dateStr}_${postIndex + 1}`,
                    date: dateStr,
                    channelId: channel.id,
                    channelName: channel.name,
                    channelUrl: channel.url,
                    slotTime: slot,
                    weekNumber: policy.week,
                    postNumberInDay: postIndex + 1,
                    sector: sectorKey,
                    sectorName: pack.campaign.sectorName,
                    primaryProduct: pack.campaign.primaryProduct,
                    copyVersion: copy.version,
                    textEgyptian: copy.egyptian,
                    textFusha: copy.fusha,
                    creativeBrief: pack.creativeBrief,
                    videoScript: pack.videoScript,
                    status: audit.approved ? 'ready_to_publish' : 'needs_review',
                    targetDestinations: [
                        { type: 'own_page_or_profile', name: channel.name, status: 'scheduled' },
                        { type: 'joined_groups', name: `جروبات ${pack.campaign.sectorName} المشترك بها الحساب`, status: 'scheduled' }
                    ],
                    guardianAudit: audit,
                    createdAt: new Date().toISOString()
                };

                createdPosts.push(postRecord);
            }
        });

        // إضافة للجدول العام وحفظه
        this.schedule = this.schedule.filter(p => p.date !== dateStr); // تحديث أو إضافة
        this.schedule.push(...createdPosts);
        this.saveSchedule();

        return {
            date: dateStr,
            policy,
            totalPostsScheduled: createdPosts.length,
            posts: createdPosts
        };
    }

    /**
     * جلب المنشورات المجدولة لليوم
     */
    getTodayPosts(dateStr = null) {
        const today = dateStr || new Date().toISOString().slice(0, 10);
        return this.schedule.filter(p => p.date === today);
    }

    /**
     * تمييز منشور كمنشور بنجاح على الصفحة والجروبات
     */
    markPostPublished(postId, destinationType = 'own_page_or_profile', meta = {}) {
        const post = this.schedule.find(p => p.id === postId);
        if (post) {
            const dest = post.targetDestinations.find(d => d.type === destinationType);
            if (dest) {
                dest.status = 'published';
                dest.publishedAt = new Date().toISOString();
                dest.meta = meta;
            }
            // إذا نشر على كل الأهداف يصبح المنشور مكتملاً
            if (post.targetDestinations.every(d => d.status === 'published')) {
                post.status = 'published';
            }
            this.saveSchedule();
            return true;
        }
        return false;
    }
}

module.exports = new FacebookWarmupManager();
