# Facebook Automation Usage

## تشغيل الروبوت (فتح نافذة كروم للروبوت)

تم إضافة ملف **scripts/start_bot.js** الذي يعمل كواجهة بسيطة لتشغيل سكريبت النشر على فيسبوك باستخدام جلسة المتصفح المتاحة مسبقاً.

### كيفية الاستخدام
```bash
# نشر المنشورات المجدولة لليوم (الوضع الافتراضي)
node scripts/start_bot.js

# نشر منشور تجريبي واحد في مجموعة واحدة
node scripts/start_bot.js --publish-one

# تشغيل جدول نشر اليوم مع فواصل مكافحة الحظر
node scripts/start_bot.js --publish-today
```

> **ملحوظة:** لا يتم فتح نافذة تسجيل دخول يدوية لأن الجلسة تُحمَّل من ملفات الـ cookies الموجودة في `facebook_browser_session`.

## إضافة مجموعة هدف
- يمكنك تعديل `config/groups.json` (إن لم يكن موجوداً، أنشئه) وإضافة عناوين URL للمجموعات التي تريد النشر فيها.

## خطوات إضافية (اختيارية)
1. **إنشاء اختصار على سطح المكتب** لتشغيل الأمر بنقرة مزدوجة:
   - أنشئ ملف `start_facebook_bot.bat` وضع فيه:
   ```bat
   @echo off
   cd /d "d:\\latif\\zomorodaAi_ecommerce_github\\zomoroda-ai-system"
   node scripts/start_bot.js
   pause
   ```
2. **التأكد من وجود ملف cookies** في `assets/facebook_cookies.json` (تم تحديثه مسبقاً).

---
### ما تم إنجازه الآن
- إضافة ملف `scripts/start_bot.js` لتشغيل الروبوت بسهولة.
- إنشاء وثيقة إرشادية `docs/automation.md` لتوضيح طريقة الاستخدام.

يمكنك الآن تشغيل الروبوت مباشرةً أو عبر الاختصار.
