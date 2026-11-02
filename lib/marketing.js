const sectors = {
    pharmacies: { label: 'الصيدليات والوكلاء', products: { ronzawipes: 'مناديل رونزا فقط' } },
    hypermarkets: { label: 'الهايبرات وتجار الجملة', products: { ronzawipes: 'مناديل رونزا', yonowipes: 'مناديل يونو', fragrance: 'المعطرات', kitchenroll: 'فوط المطبخ' } },
    distribution: { label: 'شركات التوزيع والمخازن', products: { ronzawipes: 'مناديل رونزا', yonowipes: 'مناديل يونو', fragrance: 'المعطرات', kitchenroll: 'فوط المطبخ', dryingtowels: 'فوط التنشيف', dishsoap: 'سائل الأطباق' } },
    hotels: { label: 'الفنادق والتوريدات', products: { privatelabel: 'منديل سنجل Private Label', fragrance: 'المعطرات', dryingtowels: 'فوط التنشيف' } },
    supplies: { label: 'الشركات والتوريدات', products: { privatelabel: 'منديل سنجل Private Label', fragrance: 'المعطرات', dryingtowels: 'فوط التنشيف' } },
    salon: { label: 'الصالونات ومراكز التجميل', products: { dryingtowels: 'فوط التنشيف', fragrance: 'المعطرات', ronzawipes: 'مناديل رونزا' } },
    moms: { label: 'الماميز ومندوبو المبيعات وسفراء الزمردة', products: { retailcatalog: 'أسعار الجمهور والقطاعي', affiliate: 'فرصة العمل بالعمولة' } },
    social: { label: 'منشورات السوشيال ميديا', products: { organic: 'منشور عضوي بدون أسعار' } },
    retail: { label: 'عملاء التجزئة', products: { retailcatalog: 'أسعار الجمهور والقطاعي', affiliate: 'فرصة العمل بالعمولة' } }
};
const channels = { whatsapp: 'واتساب', email: 'البريد الإلكتروني', social: 'منصات التواصل (نشر يدوي)' };
function draftMessage(sectorId, productType) {
    const sector = sectors[sectorId];
    const product = sector?.products[productType];
    if (!sector || !product) throw Object.assign(new Error('اختر قطاعاً ومنتجاً صحيحين.'), { status: 400 });
    return `مرحبا،\n\nيسرنا في شركة الزمردة كوزماتيكس تقديم ${product} لقطاع ${sector.label}.\n\nيمكن لفريقنا مشاركتكم بالتفاصيل المعتمدة والشروط المناسبة.\n\nيسعدنا الرد على استفساراتكم.\n\nشركة الزمردة كوزماتيكس`;
}
function validateCampaign(input) {
    const title = typeof input.title === 'string' ? input.title.trim() : '';
    const message = typeof input.message === 'string' ? input.message.trim() : '';
    const sector = sectors[input.sector];
    if (title.length < 3 || title.length > 120 || !sector || !channels[input.channel] || !Object.hasOwn(sector.products, input.product_type) || message.length < 3 || message.length > 5000) {
        throw Object.assign(new Error('تحقق من اسم الحملة والقطاع والقناة والمنتج والرسالة.'), { status: 400 });
    }
    return { title, message, sector: input.sector, channel: input.channel, product_type: input.product_type };
}
module.exports = { sectors, channels, draftMessage, validateCampaign };
