// Read-only explanations from the same roster snapshot shown on the agents page.
function answer(overview, question) {
    const q = String(question || '').trim().slice(0, 300);
    if (!q) return 'اكتب سؤالك عن الوكلاء أو الموافقات أو الأخطاء.';
    const agents = overview.agents || [];
    const names = rows => rows.map(a => a.name).join('، ') || 'لا يوجد';
    const active = agents.filter(a => a.actions_24h > 0);
    const paused = agents.filter(a => a.paused);
    const missing = agents.filter(a => a.setup && !a.setup.ok);
    const errors = agents.filter(a => a.failures_24h > 0);
    const pending = agents.filter(a => a.tasks.proposed > 0);
    if (/خطأ|اخطاء|أخطاء|فشل|محظور|مشاكل/.test(q)) return errors.length
        ? `ظهر خطأ أو حظر خلال 24 ساعة لدى: ${names(errors)}. افتح تبويب النشاط لمعرفة السبب المسجّل.`
        : 'لا توجد أخطاء أو إجراءات محظورة مسجّلة للوكلاء خلال آخر 24 ساعة.';
    if (/موافق|مقترح|مراجع|مهام/.test(q)) return pending.length
        ? `هناك ${overview.summary.pending_review} مقترح بانتظار المراجعة لدى: ${names(pending)}. افتح تبويب المقترحات لقراءة الأدلة قبل القرار.`
        : 'لا توجد مقترحات بانتظار المراجعة حالياً.';
    if (/ربط|إعداد|اتصال|واتساب|ايميل|إيميل/.test(q)) return missing.length
        ? `هذه الخدمات ينقصها إعداد أو اتصال: ${missing.map(a => a.name + ' — ' + a.setup.text).join('؛ ')}.`
        : 'لا تظهر نواقص ربط في الحالة الحالية. تحقق من اختبار الإرسال والاستقبال لكل قناة عند استخدامها.';
    if (/موقوف|متوقف|ايقاف|إيقاف/.test(q)) return overview.global.paused
        ? 'الإيقاف الشامل مفعّل حالياً؛ لا تبدأ مهام جديدة. راجع مفتاح التحكم أعلى الصفحة.'
        : paused.length ? `الوكلاء الموقوفون يدوياً: ${names(paused)}.` : 'لا يوجد وكيل موقوف يدوياً والإيقاف الشامل غير مفعّل.';
    if (/نشط|شغال|يعمل|ليه|لماذا|حالة|تقرير|ملخص/.test(q)) {
        const enabled = overview.global.paused ? 0 : agents.filter(a => !a.paused).length;
        return `المفعّلون الآن: ${enabled} من ${agents.length}. سجّل ${active.length} نشاطاً خلال 24 ساعة: ${names(active)}. ${overview.global.paused ? 'الإيقاف الشامل مفعّل. ' : ''}${missing.length ? missing.length + ' لديهم نقص في الربط. ' : ''}${pending.length ? pending.length + ' لديهم مقترحات تنتظر الموافقة. ' : ''}غياب النشاط قد يعني انتظار حدث أو موعد تشغيل، ولا يثبت تعطّل الوكيل.`;
    }
    return 'أستطيع شرح حالة الوكلاء، سبب قلة النشاط، الموافقات المعلقة، الأخطاء، الإيقاف، ونواقص الربط. اسأل عن أحد هذه الموضوعات.';
}
module.exports = { answer };
