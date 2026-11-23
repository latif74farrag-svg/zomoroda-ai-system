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
const CAIRO_COMMUNITIES_FILE = path.join(__dirname, '..', '..', 'config', 'cairo_communities.json');
const USER_GROUPS_FILE = path.join(__dirname, '..', '..', 'config', 'user_facebook_groups.json');

function loadCairoCommunities() {
    try {
        if (fs.existsSync(CAIRO_COMMUNITIES_FILE)) {
            return JSON.parse(fs.readFileSync(CAIRO_COMMUNITIES_FILE, 'utf8'));
        }
    } catch (_) { }
    return [];
}

function loadUserFacebookGroups(sectorFilter = null) {
    try {
        if (fs.existsSync(USER_GROUPS_FILE)) {
            const all = JSON.parse(fs.readFileSync(USER_GROUPS_FILE, 'utf8'));
            if (!sectorFilter) return all;
            if (sectorFilter === 'moms' || sectorFilter === 'ماميز') {
                return all.filter(g => g.sector === 'moms');
            }
            if (sectorFilter === 'hotels' || sectorFilter === 'فنادق' || sectorFilter === 'supplies' || sectorFilter === 'توريدات') {
                return all.filter(g => g.sector === 'hotels' || g.sector === 'wholesale' || g.sector === 'restaurants');
            }
            if (sectorFilter === 'restaurants' || sectorFilter === 'مطاعم') {
                return all.filter(g => g.sector === 'restaurants');
            }
            return all.filter(g => g.sector === sectorFilter);
        }
    } catch (_) { }
    return [];
}

// القنوات المعتمدة لحملات فيسبوك (التركيز على قناتي زمرده وماميز واستبعاد الحساب الشخصي من النشر الترويجي)
const MANAGED_CHANNELS = [
    {
        id: '100090392977665',
        name: 'قناة زمرده كوزماتيكس (الحساب الأول)',
        url: 'https://www.facebook.com/profile.php?id=100090392977665',
        type: 'profile_or_page',
        active: true
    },
    {
        id: '61596440741975',
        name: 'صفحة ماميز والعمل من المنزل (الصفحة الثانية)',
        url: 'https://www.facebook.com/profile.php?id=61596440741975',
        type: 'page',
        active: true
    },
    {
        id: 'abdullhami',
        name: 'حساب أ. عبد اللطيف فراج الشخصي (مستبعد من الحملات الترويجية)',
        url: 'https://www.facebook.com/abdullhami/',
        type: 'profile_manager',
        active: false
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
        } catch (_) { }
        // حفظ القنوات الافتراضية لأول مرة
        this.saveChannels(MANAGED_CHANNELS);
        return MANAGED_CHANNELS;
    }

    saveChannels(channels) {
        try {
            fs.writeFileSync(CHANNELS_CONFIG_FILE, JSON.stringify(channels, null, 2), 'utf8');
        } catch (_) { }
    }

    loadSchedule() {
        try {
            if (fs.existsSync(SCHEDULE_FILE)) {
                return JSON.parse(fs.readFileSync(SCHEDULE_FILE, 'utf8'));
            }
        } catch (_) { }
        return [];
    }

    saveSchedule() {
        try {
            fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(this.schedule, null, 2), 'utf8');
        } catch (_) { }
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
     * جلب القنوات النشطة المخصصة للنشر الترويجي (زمرده وماميز)
     */
    getActiveChannels() {
        return (this.channels || []).filter(c => c.active !== false);
    }

    /**
     * توليد جدول منشورات اليوم لكل قناة نشطة مع التدوير بين القطاعات أو التركيز على قطاع محدد (مثل الماميز والعمل من المنزل)
     * لضمان عدم نشر محتوى مكرر بين القنوات أو على المجموعات
     */
    generateDailyPostsBatch(targetDateStr = null, weekNumber = null, sectorFocus = null) {
        const dateStr = targetDateStr || new Date().toISOString().slice(0, 10);
        const policy = this.getWarmupPolicy(weekNumber);
        const sectors = ['hotels', 'restaurants', 'salons', 'pharmacies', 'wholesale', 'moms'];
        const activeChannels = this.getActiveChannels();

        // زوايا قطاع الماميز والعمل من المنزل المخصصة لكل قناة نشطة (زمرده وماميز)
        const momsThemesByChannel = [
            'moms_housewives',   // القناة 1 (زمرده): ربات البيوت والماميز والعمل من المنزل
            'independent_women'  // القناة 2 (ماميز): الفتيات وبناء الدخل المستقل
        ];

        const createdPosts = [];

        activeChannels.forEach((channel, chIndex) => {
            for (let postIndex = 0; postIndex < policy.postsPerDay; postIndex++) {
                let sectorKey = sectorFocus;
                let themeId = null;

                if (sectorFocus === 'moms' || sectorFocus === 'ماميز') {
                    sectorKey = 'moms';
                    themeId = momsThemesByChannel[(chIndex + postIndex) % momsThemesByChannel.length];
                } else if (!sectorFocus) {
                    const sectorIdx = (chIndex * 2 + postIndex) % sectors.length;
                    sectorKey = sectors[sectorIdx];
                }

                const pack = createFullCampaignPackage(sectorKey, themeId);

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

                const allUserGroups = loadUserFacebookGroups(sectorKey);
                // توزيع مجموعات فيسبوك المخصصة للقطاع المستهدف بين القنوات النشطة بالتساوي بدون تكرار
                const channelGroups = allUserGroups.filter((_, gIdx) => (gIdx % activeChannels.length) === chIndex);

                const cairoZones = loadCairoCommunities();
                const assignedZone = cairoZones.length > 0 ? cairoZones[(chIndex + postIndex) % cairoZones.length] : null;

                const targetDestinations = [
                    { type: 'own_page_or_profile', name: channel.name, url: channel.url, status: 'scheduled' }
                ];

                // إضافة الجروبات المخصصة لهذه القناة
                channelGroups.forEach(grp => {
                    targetDestinations.push({
                        type: 'user_joined_group',
                        id: grp.id,
                        name: grp.name,
                        url: grp.url,
                        category: grp.category,
                        status: 'scheduled'
                    });
                });

                if (assignedZone) {
                    targetDestinations.push({
                        type: 'cairo_community_target',
                        name: `نطاق خدمات وسكان (${assignedZone.zone}: ${assignedZone.areas.slice(0, 3).join(' / ')})`,
                        patterns: assignedZone.groupPatterns,
                        localHook: assignedZone.localHook,
                        status: 'scheduled'
                    });
                }

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
                    themeTitle: pack.campaign.themeTitle,
                    targetCairoZone: assignedZone ? assignedZone.zone : null,
                    targetCairoAreas: assignedZone ? assignedZone.areas : [],
                    primaryProduct: pack.campaign.primaryProduct,
                    copyVersion: copy.version,
                    textEgyptian: copy.egyptian,
                    textFusha: copy.fusha,
                    creativeBrief: pack.creativeBrief,
                    videoScript: pack.videoScript,
                    status: audit.approved ? 'ready_to_publish' : 'needs_review',
                    targetDestinations,
                    guardianAudit: audit,
                    createdAt: new Date().toISOString()
                };

                createdPosts.push(postRecord);
            }
        });

        // إضافة للجدول العام وحفظه
        this.schedule = this.schedule.filter(p => p.date !== dateStr);
        this.schedule.push(...createdPosts);
        this.saveSchedule();

        return {
            date: dateStr,
            policy,
            sectorFocus: sectorFocus || 'mixed',
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
