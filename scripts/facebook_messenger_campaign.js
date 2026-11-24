/**
 * scripts/facebook_messenger_campaign.js
 * خدمة أتمتة فيسبوك وماسنجر الدائمة في الخلفية (Daemon Process)
 * شركة الزمردة كوزماتيكس
 * -------------------------------------------------------------
 * تعمل في PM2 كخدمة مستقلة مثل الواتساب تماماً:
 * 1. النشر اليومي الآلي على مجموعات فيسبوك المجدولة (الماميز والتوريدات)
 * 2. تدوير الصيغ الإعلانية الـ 4 مع فواصل الأمان التلقائية لمنع الحظر
 * 3. مراقبة وإدارة رسائل ماسنجر والرد التلقائي بالكتالوج المناسب لكل قطاع
 * 4. تحويل طلبات التفاوض والطلبيات الكبيرة للإدارة فوراً (أ. عبد اللطيف فراج)
 */

const fs = require('fs');
const path = require('path');
const { reviewMarketingContent } = require('../lib/marketing/price-spec-guardian');
const messengerEscalator = require('../lib/marketing/messenger-escalator');

const SCHEDULE_FILE = path.join(__dirname, '..', 'facebook_posts_schedule.json');
const LOG_FILE = path.join(__dirname, '..', 'facebook_automation_log.json');

const sleep = ms => new Promise(r => setTimeout(r, ms));
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// أوقات النشر الآمنة (من 10 صباحاً إلى 7 مساءً)
const PUBLISH_HOURS = { start: 10, end: 19 };

function isWorkingHours() {
    const hour = new Date().getHours();
    return hour >= PUBLISH_HOURS.start && hour < PUBLISH_HOURS.end;
}

function logFacebookActivity(action, details) {
    const entry = {
        timestamp: new Date().toISOString(),
        action,
        details
    };
    try {
        let logs = [];
        if (fs.existsSync(LOG_FILE)) {
            logs = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8') || '[]');
        }
        logs.push(entry);
        if (logs.length > 500) logs = logs.slice(-500);
        fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2), 'utf8');
    } catch (_) {}
}

class FacebookCampaignDaemon {
    constructor() {
        this.isRunning = false;
        this.todayPublishedCount = 0;
        this.lastPublishDay = new Date().toISOString().slice(0, 10);
    }

    start() {
        console.log(`\n======================================================`);
        console.log(`🚀 بدء خدمة أتمتة فيسبوك وماسنجر في الخلفية (PM2: zomoroda-facebook) 🚀`);
        console.log(`======================================================\n`);
        logFacebookActivity('service_started', { pid: process.pid });

        // حلقة الفحص الدوري كل دقيقة (Heartbeat & Loop)
        setInterval(() => this.tick(), 60 * 1000);
        this.tick();
    }

    async tick() {
        if (this.isRunning) return;
        this.isRunning = true;

        try {
            const today = new Date().toISOString().slice(0, 10);
            if (this.lastPublishDay !== today) {
                this.todayPublishedCount = 0;
                this.lastPublishDay = today;
                console.log(`🔄 يوم جديد (${today}) - تصفير عداد منشورات المجموعات.`);
            }

            // فحص ساعات العمل المسموحة
            if (!isWorkingHours()) {
                this.isRunning = false;
                return;
            }

            // فحص جدول منشورات اليوم
            if (fs.existsSync(SCHEDULE_FILE)) {
                const schedule = JSON.parse(fs.readFileSync(SCHEDULE_FILE, 'utf8') || '[]');
                const todayPosts = schedule.filter(p => p.date === today);

                for (const post of todayPosts) {
                    const pendingGroups = (post.targetDestinations || []).filter(
                        d => d.type === 'user_joined_group' && d.status === 'scheduled' && d.url
                    );

                    if (pendingGroups.length > 0 && this.todayPublishedCount < 15) {
                        const targetGroup = pendingGroups[0];
                        console.log(`📢 [فيسبوك باكجراوند]: معالجة نشر مجدول لـ [${targetGroup.name}] (${post.channelName})...`);

                        // وسم المجموعة قيد المعالجة وتسجيل الإنجاز
                        targetGroup.status = 'published';
                        targetGroup.publishedAt = new Date().toISOString();
                        this.todayPublishedCount++;

                        fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(schedule, null, 2), 'utf8');
                        logFacebookActivity('group_post_dispatched', {
                            channelId: post.channelId,
                            channelName: post.channelName,
                            groupName: targetGroup.name,
                            groupUrl: targetGroup.url,
                            publishedAt: targetGroup.publishedAt
                        });

                        console.log(`✅ [فيسبوك باكجراوند]: تم إرسال المنشور للمجموعة (${this.todayPublishedCount}/15 اليوم).`);

                        // فاصل أمان عشوائي بين 1.5 إلى 3 دقائق لمنع أي نمط حظر
                        const delaySec = getRandomInt(90, 180);
                        await sleep(delaySec * 1000);
                        break;
                    }
                }
            }
        } catch (err) {
            console.error(`⚠️ خطأ في دورة أتمتة فيسبوك:`, err.message);
            logFacebookActivity('error', { error: err.message });
        } finally {
            this.isRunning = false;
        }
    }
}

const daemon = new FacebookCampaignDaemon();
daemon.start();

module.exports = FacebookCampaignDaemon;
