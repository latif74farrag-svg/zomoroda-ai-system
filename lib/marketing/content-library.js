/**
 * content-library.js
 * مكتبة المحتوى التسويقي المصنفة بحسب المنتج والجمهور والمنصة
 * -------------------------------------------------------------
 * تصنيف هيكلي متقدم:
 * - المنتج: (ronza_wipes, yono_wipes, kitchen_roll_cloth, single_use_towel, air_floor_freshener, dish_soap, private_label_wipes)
 * - الجمهور/القطاع: (hotels, restaurants, salons, pharmacies, wholesale, moms)
 * - المنصة: (facebook_page, facebook_group, instagram, messenger, tiktok_reels, linkedin)
 * - الحالة: (draft, approved, published, archived)
 */

const fs = require('fs');
const path = require('path');
const { reviewMarketingContent } = require('./price-spec-guardian');
const { createFullCampaignPackage } = require('./campaign-engine');

const LIBRARY_FILE = path.join(__dirname, '..', '..', 'content_library.json');

class ContentLibrary {
    constructor() {
        this.items = this.load();
        if (this.items.length === 0) {
            this.seedInitialLibrary();
        }
    }

    load() {
        try {
            if (fs.existsSync(LIBRARY_FILE)) {
                return JSON.parse(fs.readFileSync(LIBRARY_FILE, 'utf8'));
            }
        } catch (_) {}
        return [];
    }

    save() {
        try {
            fs.writeFileSync(LIBRARY_FILE, JSON.stringify(this.items, null, 2), 'utf8');
        } catch (_) {}
    }

    /**
     * إضافة منشور أو مادة تسويقية جديدة مع فحص الجارديان التلقائي
     */
    addItem(item) {
        const id = item.id || `content_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        
        // مراجعة الجارديان للأسعار والمواصفات
        const guardianAudit = reviewMarketingContent({
            title: item.title,
            body: (item.copies ? item.copies.map(c => c.egyptian + ' ' + c.fusha).join(' ') : '') + (item.body || ''),
            targetSector: item.sector,
            productId: item.productId
        });

        const record = {
            id,
            title: item.title,
            productId: item.productId,
            sector: item.sector || 'general',
            platform: item.platform || 'facebook_page',
            status: guardianAudit.approved ? (item.status || 'approved') : 'needs_revision',
            copies: item.copies || [],
            creativeBrief: item.creativeBrief || null,
            videoScript: item.videoScript || null,
            tags: item.tags || [],
            guardianAudit,
            createdAt: item.createdAt || new Date().toISOString(),
            publishedAt: item.publishedAt || null
        };

        this.items.unshift(record);
        this.save();
        return record;
    }

    /**
     * البحث والتصفية بحسب المعايير المطلوبة
     */
    query({ product, sector, platform, status, tag } = {}) {
        return this.items.filter(item => {
            if (product && item.productId !== product) return false;
            if (sector && item.sector !== sector) return false;
            if (platform && item.platform !== platform && item.platform !== 'all') return false;
            if (status && item.status !== status) return false;
            if (tag && !item.tags.includes(tag)) return false;
            return true;
        });
    }

    /**
     * الحصول على مادة بواسطة المعرف
     */
    getById(id) {
        return this.items.find(x => x.id === id) || null;
    }

    /**
     * اعتماد مادة للنشر
     */
    approveItem(id) {
        const item = this.getById(id);
        if (!item) return { success: false, reason: 'المحتوى غير موجود' };
        
        const recheck = reviewMarketingContent({
            title: item.title,
            body: item.copies.map(c => c.egyptian + ' ' + c.fusha).join(' '),
            targetSector: item.sector,
            productId: item.productId
        });

        if (!recheck.approved) {
            item.status = 'rejected';
            item.guardianAudit = recheck;
            this.save();
            return { success: false, reason: 'مرفوض من حارس الأسعار والمواصفات', errors: recheck.errors };
        }

        item.status = 'approved';
        item.guardianAudit = recheck;
        this.save();
        return { success: true, item };
    }

    /**
     * تمييز المحتوى كمنشور وتحديث موعده
     */
    markPublished(id, publishResult = {}) {
        const item = this.getById(id);
        if (item) {
            item.status = 'published';
            item.publishedAt = new Date().toISOString();
            item.publishMetadata = publishResult;
            this.save();
        }
    }

    /**
     * ملء المكتبة الأولية تلقائياً بحزم جاهزة لكافة القطاعات الـ 6
     */
    seedInitialLibrary() {
        const sectors = ['hotels', 'restaurants', 'salons', 'pharmacies', 'wholesale', 'moms'];
        const platforms = ['facebook_page', 'facebook_group', 'instagram', 'tiktok_reels'];

        for (const s of sectors) {
            const pack = createFullCampaignPackage(s);
            this.addItem({
                id: `seed_${s}_pack`,
                title: pack.campaign.themeTitle,
                productId: pack.campaign.primaryProduct,
                sector: s,
                platform: s === 'hotels' ? 'facebook_page' : 'facebook_group',
                status: 'approved',
                copies: pack.adCopies,
                creativeBrief: pack.creativeBrief,
                videoScript: pack.videoScript,
                tags: [s, pack.campaign.primaryProduct, 'seed_campaign', 'ready_to_publish']
            });
        }
    }
}

module.exports = new ContentLibrary();
