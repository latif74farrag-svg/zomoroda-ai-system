const TARGET_SECTORS = require('./target_categories');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// ==========================================
// 1. محرك توجيه الرسائل المستهدفة لكل المنصات
// ==========================================
class MultiPlatformRouter {
    constructor() {
        console.log('🚀 تم تشغيل محول المنصات الموحد لمشروع الزمردة...');
    }

    // دالة فحص وتحديد نص الرسالة حسب بيانات القطاع والمنصة
    getPreparedMessage(rowData) {
        const textToSearch = `${rowData['المجال'] || ''} ${rowData['اسم الجهة'] || ''} ${rowData['ملاحظات'] || ''} ${rowData['القطاع'] || ''}`.toLowerCase();
        let selectedSector = TARGET_SECTORS.SUPPLIES_AND_HOTELS; // افتراضي

        for (const key in TARGET_SECTORS) {
            const sector = TARGET_SECTORS[key];
            if (sector.keywords.some(kw => textToSearch.includes(kw.toLowerCase()))) {
                selectedSector = sector;
                break;
            }
        }

        return {
            sectorName: selectedSector.name,
            message: rowData['الرسالة المخصصة'] || selectedSector.messageTemplate
        };
    }

    // ==========================================
    // 2. إرسال موحد يحدد المنصة المناسبة تلقائياً
    // ==========================================
    async dispatchToClient(clientData, instances) {
        const { sectorName, message } = this.getPreparedMessage(clientData);
        const platform = (clientData['المنصة'] || 'whatsapp').toLowerCase();

        console.log(`🎯 العميل: ${clientData['اسم الجهة'] || clientData['الهاتف']} | القطاع: [${sectorName}] | المنصة: [${platform.toUpperCase()}]`);

        try {
            switch (platform) {
                case 'whatsapp':
                    if (instances.whatsappClient) {
                        const phone = clientData['الهاتف'] || clientData['الرقم'];
                        // استدعاء دالة إرسال الواتساب
                        await instances.whatsappClient.sendMessage(phone, message);
                        console.log(`✅ [WhatsApp] تم الإرسال للرقم: ${phone}`);
                    }
                    break;

                case 'facebook':
                case 'messenger':
                    if (instances.facebookApi) {
                        const psid = clientData['PSID'] || clientData['Facebook_ID'];
                        // استدعاء Meta Graph API للفيسبوك والماسنجر
                        await instances.facebookApi.sendMessengerMessage(psid, message);
                        console.log(`✅ [Messenger] تم الإرسال للحساب: ${psid}`);
                    }
                    break;

                case 'instagram':
                    if (instances.instagramApi) {
                        const igUserId = clientData['IG_ID'] || clientData['Instagram_Handle'];
                        // استدعاء Meta Instagram API
                        await instances.instagramApi.sendDirectMessage(igUserId, message);
                        console.log(`✅ [Instagram] تم الإرسال للـ Direct: ${igUserId}`);
                    }
                    break;

                case 'telegram':
                    if (instances.telegramBot) {
                        const chatId = clientData['Telegram_ID'] || clientData['Chat_ID'];
                        // استدعاء Telegram Bot API
                        await instances.telegramBot.sendMessage(chatId, message);
                        console.log(`✅ [Telegram] تم الإرسال للمعرف: ${chatId}`);
                    }
                    break;

                default:
                    console.log(`⚠️ المنصة غير معروفة أو غير مفعلة: ${platform}`);
            }
        } catch (error) {
            console.error(`❌ خطأ أثناء الإرسال عبر [${platform}]:`, error.message);
        }
    }
}

module.exports = new MultiPlatformRouter();