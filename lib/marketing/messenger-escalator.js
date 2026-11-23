/**
 * messenger-escalator.js
 * محرك إدارة ردود ماسنجر وتحويل طلبات التفاوض والتسعير الخاص للإدارة
 * -------------------------------------------------------------
 * 1. الالتزام الصارم بصلاحيات منصة Meta والنافذة الزمنية (24 ساعة)
 * 2. عدم مراسلة أي عميل دون موافقته ومبادرته بالتواصل أولاً
 * 3. كشف نية العميل آلياً (استفسار عادي vs طلب تفاوض/تسعير خاص)
 * 4. تحويل الحالات الخاصة إلى أ. عبد اللطيف فراج مع بطاقة بيانات تفصيلية
 */

const fs = require('fs');
const path = require('path');
const { getCatalogText } = require('../../products_config');

const ESCALATIONS_FILE = path.join(__dirname, '..', '..', 'escalated_leads.json');

// الكلمات الدالة على الحاجة لتفاوض، خصم خاص، أو طلبيات جملة ضخمة
const NEGOTIATION_KEYWORDS = new RegExp(
    '(' +
    'خصم خاص|خصم إضافي|سعر أقل|أرخص|تخفيض|تخفيضات|' +
    'تفاوض|نتفاوض|سعر خاص|عايز سعر أحسن|مفيش مراعاة|' +
    'كمية كبيرة|كميات كبيرة|طلبية ضخمة|كونتينر|حمولة كاملة|' +
    'عقد سنوي|عقد توريد|مناقصة|ممارسة|موزع رئيسي|وكيل معتمد|' +
    'بكام الجملة للكميات|خصم الدفع النقدي|شروط دفع|آجل|شيكات|' +
    'special price|discount|bulk|negotiate|tender|contract' +
    ')',
    'i'
);

class MessengerEscalator {
    constructor() {
        this.escalations = this.loadEscalations();
    }

    loadEscalations() {
        try {
            if (fs.existsSync(ESCALATIONS_FILE)) {
                return JSON.parse(fs.readFileSync(ESCALATIONS_FILE, 'utf8'));
            }
        } catch (_) {}
        return [];
    }

    saveEscalations() {
        try {
            fs.writeFileSync(ESCALATIONS_FILE, JSON.stringify(this.escalations, null, 2), 'utf8');
        } catch (_) {}
    }

    /**
     * معالجة رسالة ماسنجر واردة واتخاذ القرار المناسب
     * @param {Object} message - { senderId, text, channel, receivedAt, customerName }
     */
    processInboundMessage(message) {
        const text = (message.text || '').trim();
        const now = Date.now();
        const receivedAt = Number(message.receivedAt) || now;

        // 1. التحقق من صلاحية نافذة الـ 24 ساعة لـ Meta
        const ageHours = (now - receivedAt) / (1000 * 60 * 60);
        if (ageHours > 24) {
            return {
                handled: false,
                reason: 'انتهت نافذة الـ 24 ساعة المسموحة من ميتا للمراسلة التلقائية.',
                action: 'expired_window'
            };
        }

        // 2. كشف الحاجة إلى تفاوض أو تسعير خاص
        const needsNegotiation = NEGOTIATION_KEYWORDS.test(text);

        if (needsNegotiation) {
            const escalationItem = {
                id: `esc_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                senderId: message.senderId,
                customerName: message.customerName || 'عميل ماسنجر',
                channel: message.channel || 'messenger',
                messageText: text,
                timestamp: new Date().toISOString(),
                status: 'pending_management_review',
                assignedTo: 'أ. عبد اللطيف فراج (المدير المسؤول)'
            };

            this.escalations.unshift(escalationItem);
            this.saveEscalations();

            console.log(`\n🚨 [تحويل فوري للإدارة]: العميل (${escalationItem.customerName}) يطلب تفاوضاً أو تسعيراً خاصاً: "${text}"`);

            // الرد التلقائي المهني الذي يطمئن العميل ويثبت الجدية
            const customerReply = 
                `أهلاً بحضرتك يا فندم! 🌟\n\n` +
                `يسعدنا اهتمامك الكريم بمنتجات شركة الزمردة كوزماتيكس.\n` +
                `نظراً لطلبكم الخاص بالكميات والتسعير الاستثنائي، تم تحويل محادثتكم مباشرة إلى إدارة المبيعات والتوريدات (أ. عبد اللطيف فراج) لدراسة أفضل عرض سعر وخصم تجاري يناسب حجم طلبيتكم.\n\n` +
                `سيقوم المسؤول بمتابعة المحادثة معكم هنا خلال وقت قصير جداً.\n` +
                `دمتم بخير وبأعلى درجات التميز! ✨`;

            return {
                handled: true,
                action: 'escalated_to_management',
                escalationItem,
                replyText: customerReply
            };
        }

        // 3. كشف طلبات الكتالوج والأسعار العادية
        const fullContext = (text + ' ' + (message.customerName || '')).toLowerCase();
        const isCatalogRequest = /كتالوج|اسعار|أسعار|عايز اطلب|منتجاتكم|قائمة|catalog|price/i.test(text);
        if (isCatalogRequest) {
            let sector = 'hotels';
            if (/مطعم|كافيه|مطبخ|أغذية/i.test(fullContext)) sector = 'restaurants';
            else if (/صالون|كوافير|تجميل|بيوتي/i.test(fullContext)) sector = 'salons';
            else if (/صيدل|طبي|دواء/i.test(fullContext)) sector = 'pharmacy';
            else if (/جملة|توزيع|مخزن|هايبر/i.test(fullContext)) sector = 'wholesale';
            else if (/فندق|منتجع|سياح|ضيافة/i.test(fullContext)) sector = 'hotels';

            const catalog = getCatalogText(sector);
            const reply = `أهلاً بحضرتك! يسعدنا مشاركتك قائمة المنتجات المعتمدة:\n\n${catalog}\n\nلطلب عينات أو استفسار محدد، يسعدنا تواصلكم دائماً.`;

            return {
                handled: true,
                action: 'catalog_sent',
                sector,
                replyText: reply
            };
        }

        // 4. رسالة عامة
        return {
            handled: true,
            action: 'standard_welcome',
            replyText: `أهلاً بحضرتك في شركة الزمردة كوزماتيكس! 🌸\nيسعدنا خدمتكم في كافة مستلزمات النظافة والضيافة والعناية الفندقية.\nكيف يمكننا مساعدتك اليوم؟ (للاطلاع على المنتجات: أرسل كتالوج).`
        };
    }

    /**
     * الحصول على الحالات المحولة للإدارة التي تنتظر المراجعة
     */
    getPendingEscalations() {
        return this.escalations.filter(e => e.status === 'pending_management_review');
    }

    /**
     * إغلاق أو تأكيد معالجة الحالة من قِبل أ. عبد اللطيف
     */
    resolveEscalation(id, note = '') {
        const item = this.escalations.find(e => e.id === id);
        if (item) {
            item.status = 'resolved';
            item.resolvedAt = new Date().toISOString();
            item.resolutionNote = note;
            this.saveEscalations();
            return true;
        }
        return false;
    }
}

module.exports = new MessengerEscalator();
