# 🛒 مواصفات المتجر الإلكتروني لشركة الزمردة (E-Commerce Store Spec)

> **الحالة**: المراحل 1، 2، و3 مكتملة بنجاح ✅
> **تاريخ الإنشاء**: 2026-10-31
> **القرارات المعتمدة**: Express + Server-Side HTML | Turso على Vercel | صور Vercel Blob | كاش فقط

---

## 1. نظرة عامة (Overview)

متجر إلكتروني احترافي مدمج داخل المنظومة الحالية (Express + Server-Side HTML) لعرض وبيع منتجات الزمردة كوزماتيكس (رونزا + ونوي) مباشرة للعملاء والماميز.

### مصدر البيانات
- **33 منتجاً** مُستخرجاً من موقع Whacka (`zomrda-cosmetics-sv5f.whacka.app`)
- المصدر الأولي محفوظ في [`scripts/whacka_products.json`](../scripts/whacka_products.json)، ويُستورد تلقائياً مرة واحدة إلى Turso عند بدء المتجر على Vercel
- قاعدة بيانات Turso هي مصدر المنتجات والطلبات بعد التهيئة؛ التشغيل المحلي بدون بيانات Turso يستخدم كتالوج JSON
- سكربت الاستخراج: [`scripts/inspect-whacka.js`](../scripts/inspect-whacka.js)
- **لا يوجد sync دوري** — البيانات المحلية هي المصدر الوحيد

---

## 2. هيكل المنتجات (Product Structure)

### جدول `store_products` (SQLite / Turso)
```sql
CREATE TABLE IF NOT EXISTS store_products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT,              -- رونزا / ونوي
  category TEXT,           -- offers / baby / pocket / care / home / tools
  price REAL,
  unit TEXT,
  carton INTEGER,
  variants TEXT,           -- JSON array
  description TEXT,
  image_url TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

### التصنيفات الـ 6
| الفئة | `category` | عدد المنتجات | الأيقونة |
|:---|:---|:---|:---|
| العروض الخاصة | `offers` | 11 | 🎁 |
| مناديل الأطفال والعائلة | `baby` | 6 | 👶 |
| مناديل الجيب والفوط | `pocket` | 5 | 🧳 |
| العناية والحماية | `care` | 4 | 🛡️ |
| المنزل والمعطرات | `home` | 4 | 🏠 |
| أدوات التنظيف | `tools` | 3 | 🧹 |

### خريطة التسميات (Category Labels)
```js
const CATEGORY_LABELS = {
  offers: { name: 'العروض الخاصة', icon: '🎁' },
  baby:   { name: 'مناديل الأطفال والعائلة', icon: '👶' },
  pocket: { name: 'مناديل الجيب والفوط', icon: '🧳' },
  care:   { name: 'العناية والحماية', icon: '🛡️' },
  home:   { name: 'المنزل والمعطرات', icon: '🏠' },
  tools:  { name: 'أدوات التنظيف', icon: '🧹' }
};
```

---

## 3. الملفات الجديدة (New Files)

| الملف | الوظيفة |
|:---|:---|
| `views/store.js` | واجهة المتجر الرئيسية (عرض المنتجات + السلة) |
| `views/checkout.js` | صفحة إتمام الطلب |
| `views/storeAdmin.js` | لوحة إدارة المنتجات والصور والطلبات |
| `store_data.js` | قاعدة البيانات الدائمة لمنتجات وطلبات Vercel عبر Turso |
| `scripts/import-whacka-products.js` | سكربت استيراد المنتجات من JSON إلى SQLite |

### الملفات المعدّلة
| الملف | التعديل |
|:---|:---|
| `products_config.js` | إضافة exports جديدة: `STORE_PRODUCTS`, `CATEGORY_LABELS`, `getStoreProducts()`, `getStoreProductById()` — مع الحفاظ الكامل على الـ exports الموجودة |
| `server.js` | إضافة routes المتجر في نهاية الملف (بدون تعديل أي كود موجود) |

---

## 4. نقاط الـ API الجديدة (Store Endpoints)

```
GET  /store                        → صفحة المتجر الرئيسية
GET  /store/checkout               → صفحة إتمام الطلب
GET  /store/account                → تسجيل الدخول وإنشاء حساب وسجل الطلبات
GET  /api/store/products           → قائمة المنتجات (مع فلترة بـ ?category=)
GET  /api/store/products/:id       → تفاصيل منتج واحد
POST /api/store/orders             → إنشاء طلب جديد
POST /api/store/orders/track       → تتبع طلب برقم الهاتف ورقم الطلب
POST /api/store/customer/register  → إنشاء حساب برقم الهاتف وكلمة مرور
POST /api/store/customer/login     → تسجيل دخول العميل
POST /api/store/customer/logout    → تسجيل خروج العميل
GET  /api/store/customer/session  → بيانات جلسة العميل الحالية
GET  /api/store/customer/orders   → سجل الطلبات المرتبط بالحساب
GET  /store/admin                  → لوحة إدارة المتجر
GET  /api/store/admin/products     → إدارة المنتجات (تسجيل دخول مطلوب)
GET  /api/store/admin/orders       → إدارة الطلبات (تسجيل دخول مطلوب)
POST /api/store/admin/images       → رفع صورة إلى Vercel Blob (تسجيل دخول مطلوب)
```

### فتح المتجر والتنقل
- شغّل التطبيق باستخدام `npm start` ثم افتح لوحة التحكم على `http://localhost:5000`.
- استخدم زر **🛍️ افتح المتجر الإلكتروني** أعلى لوحة التحكم، أو رابط **🛍️ المتجر الإلكتروني** في شريط القنوات.
- يمكن فتح المتجر مباشرة على `/store`. صفحة إتمام الطلب متاحة عبر `/store/checkout` بعد إضافة منتجات إلى السلة.
- في النشر، استبدل `localhost:5000` بعنوان التطبيق المنشور؛ مسارات المتجر تبقى `/store` و`/store/checkout`.

---

## 5. نظام الطلبات (Orders System)

### جدول `store_orders`
```sql
CREATE TABLE IF NOT EXISTS store_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number TEXT UNIQUE,         -- ZMR-YYYYMMDD-<16 hex characters>
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  notes TEXT,
  items TEXT NOT NULL,              -- JSON stringified cart items
  total REAL NOT NULL,
  payment_method TEXT DEFAULT 'cash',
  status TEXT DEFAULT 'pending',    -- pending / confirmed / shipped / delivered
  created_at TEXT DEFAULT (datetime('now')),
  customer_id TEXT                 -- NULL for guest orders
);
```

### حسابات العملاء
- ينشئ العميل حساباً من `/store/account` باستخدام الاسم ورقم الهاتف المصري وكلمة مرور (8 أحرف على الأقل).
- لكل حساب معرّف مستقل؛ تحفظ كلمة المرور كـ hash مملح باستخدام scrypt ولا تحفظ كنص صريح.
- يستطيع العميل تسجيل الدخول والخروج ومشاهدة طلبات الحساب فقط. الطلبات السابقة المنفذة كضيف لا تُربط تلقائياً برقم الهاتف.
- يظل الشراء كضيف متاحاً. عند تسجيل الدخول في صفحة الدفع يُربط الطلب الجديد بالحساب، وتُملأ بيانات الاسم والهاتف تلقائياً.
- حساب الإدارة منفصل عن حساب العميل، ويتطلب تسجيل الدخول الخاص بلوحة `/store/admin`.
- إصدار البداية لا يرسل رمز تحقق للهاتف ولا يدعم استعادة كلمة المرور؛ يلزم لاحقاً إعداد مزود رسائل موثوق للتحقق والاستعادة. لا تستخدم الحسابات حالياً كإثبات لملكية رقم الهاتف.
- جلسة العميل Cookie محمية بـ HttpOnly وSameSite=Strict وتنتهي بعد 7 أيام، وموقعة بسر `STORE_ADMIN_SESSION_SECRET`.

### رقم الطلب
- الصيغة: `ZMR-YYYYMMDD-<16 hex characters>`

### نظام الدفع
- **كاش عند الاستلام فقط** (لا يوجد دفع إلكتروني حالياً)

### إشعار الطلب الجديد
- عند إنشاء طلب، يُسجل الحدث في سجل الإدارة دون بيانات العميل الشخصية.
- بعد التسجيل، يظهر للعميل رابط واتساب لبدء التواصل مع رقم الشركة وتأكيد موعد الشحن.
- لا يُرسل الخادم رسالة واتساب تلقائية؛ يتطلب ذلك إعداد اتصال واتساب مستمر.

---

## 6. تصميم واجهة المتجر (Storefront UI)

### المواصفات العامة
- **اتجاه**: RTL عربي (`dir="rtl" lang="ar"`)
- **الخط**: Cairo (Google Fonts)
- **الألوان**: نفس هوية المنظومة:
  - Primary: `#064e3b` (أخضر زمردي غامق)
  - Primary Light: `#047857` / `#10b981`
  - Gold: `#d97706` (ذهبي)
  - Background: `#f8fafc`
- **متجاوب**: Mobile-first (1 col) → Tablet (2 cols) → Desktop (3 cols)
- **بدون frameworks**: Vanilla HTML/CSS/JS فقط

### أقسام الصفحة الرئيسية
1. **Header/Navbar** — لوجو نصي + روابط + أيقونة السلة مع عداد
2. **Hero Banner** — عنوان + وصف + زر CTA + خلفية gradient زمردية
3. **شريط البحث** — فلترة فورية بالاسم (client-side)
4. **شريط التصنيفات** — pills أفقية قابلة للتمرير + خيار "الكل"
5. **شبكة المنتجات** — صور المنتج المرفوعة أو placeholder + اسم + براند + سعر + زر إضافة
6. **Footer** — بيانات الشركة + رابط واتساب

### سلة المشتريات (Cart Sidebar)
- Drawer ينزلق من اليمين (RTL)
- تخزين في `localStorage` بالمفتاح `zmr_cart`، ويُقرأ المفتاح القديم `zomoroda_cart` للتوافق
- أزرار +/- للكمية
- حد أقصى 99 من كل منتج
- إجمالي + زر "إتمام الطلب"

### صفحة Checkout
- ملخص الطلب من localStorage
- نموذج: الاسم + رقم الواتساب + العنوان + ملاحظات
- طريقة الدفع: كاش (معروضة فقط بدون اختيار)
- يعيد الخادم تحميل أسعار المنتجات من الكتالوج ويحسب الإجمالي؛ لا يعتمد على سعر أو إجمالي المتصفح
- زر تأكيد → `POST /api/store/orders`
- رسالة نجاح مع رقم الطلب

### متابعة الطلب
- صفحة `/store/track` للبحث باستخدام رقم الطلب ورقم الهاتف المستخدم في الطلب.
- تعرض حالة الطلب وإجمالي المنتجات وتفاصيل الكميات دون كشف عنوان العميل أو بياناته الأخرى.

### حساب العميل
- صفحة `/store/account` لإنشاء حساب أو تسجيل الدخول برقم الهاتف وكلمة المرور، والخروج، واستعراض الطلبات المرتبطة بالحساب.
- يمكن للعميل الطلب كضيف؛ الطلبات المنشأة قبل تسجيل حساب لا تظهر في سجل الحساب.

### لوحة إدارة المتجر
- افتح `/store/admin` وسجّل الدخول بكلمة مرور الإدارة.
- أضف المنتجات وعدّل الاسم والتصنيف والسعر والوحدة والكرتونة والتنويعات والوصف والصورة.
- أخفِ المنتجات وأعد إظهارها دون حذفها من سجل الطلبات السابق.
- ارفع الصور إلى Vercel Blob؛ روابط الصور العامة تُعرض في المتجر.
- راجع الطلبات وبيانات التوصيل وحدّث الحالة: قيد المراجعة، تم التأكيد، تم الشحن، تم التسليم، أو ملغي.
- على Vercel، تُحفظ المنتجات والطلبات في Turso عبر `TURSO_DATABASE_URL` و`TURSO_AUTH_TOKEN`. لا يعتمد النظام على `/tmp` لحفظ بيانات المتجر.
- أضف متغيرات Vercel التالية قبل الاستخدام: `STORE_ADMIN_PASSWORD`، و`STORE_ADMIN_SESSION_SECRET` (32 حرفاً عشوائياً على الأقل)، وبيانات Turso أعلاه، و`BLOB_READ_WRITE_TOKEN` لرفع الصور. أعد نشر المشروع بعد ضبطها.
- إنشاء الجداول واستيراد كتالوج المنتجات الأولي يتم تلقائياً عند أول زيارة بعد ضبط بيانات Turso.
- كلمة مرور الإدارة سرّ على الخادم ولا تُحفظ في المستودع. جلسة الدخول مؤقتة وآمنة عبر Cookie محمي.
- تحفظ حسابات العملاء في `store_customers` عبر Turso على Vercel، وفي قاعدة SQLite المحلية أثناء التطوير. تظل الطلبات المرتبطة بالحساب بعد إعادة النشر.

---

## 7. قواعد العمل (Business Rules)

### عزل الأسعار
- المتجر العام (`/store`) يعرض **أسعار القطاعي/الجمهور** فقط (قطاع الماميز)
- **ممنوع** عرض أسعار الصيدليات أو الجملة أو الفنادق في المتجر العام

### صور المنتجات
- تمت إضافة 13 صورة مطابقة بوضوح من مجلد الصور الذي زوّدنا به المستخدم وربطها بـ17 منتجاً في `assets/store-products/`.
- يربط `scripts/store_product_images.json` الصور بمعرّفات المنتجات، ويحمّلها الكتالوج تلقائياً؛ لا يحتاج نشرها إلى إعداد Blob.
- يمكن رفع صور أخرى من لوحة الإدارة إلى Vercel Blob. المنتجات التي لم نجد لها صورة مطابقة تبقى بلا صورة إلى أن تُضاف صورة صحيحة.
- يقبل حقل الصورة رابط `https` أو مساراً محلياً ضمن `/assets/store-products/` لتسهيل إدارة الصور المضمّنة.
- شعار المتجر الرسمي محفوظ في `assets/zomoroda-store-logo.png` ويظهر في ترويسة المتجر والدفع ومتابعة الطلب والإدارة، وكذلك كأيقونة تبويب.

---

## 8. خطة التنفيذ (Implementation Phases)

| المرحلة | المهمة | الأولوية | المدة | الحالة |
|:---|:---|:---|:---|:---|
| **1** | دمج بيانات المنتجات (import + products_config) | 🔴 عالية | 1 يوم | ✅ مكتملة |
| **2** | واجهة المتجر (store.js + checkout.js + routes) | 🔴 عالية | 2-3 أيام | ✅ مكتملة |
| **3** | سلة المشتريات + نظام الطلبات + إشعارات | 🟡 متوسطة | 2-3 أيام | ✅ مكتملة |
| **4** | عزل القطاعات + روابط الإحالة + SEO | 🟢 تحسين | 1-2 يوم | ⏳ التالي |
| **5** | لوحة إدارة المتجر والمنتجات والصور والطلبات | 🔴 عالية | — | ✅ مكتملة |

---

## 9. مخطط التدفق (Flow Diagram)

```
العميل → /store → تصفح المنتجات → إضافة للسلة (localStorage)
    → /store/checkout → ملء البيانات → تأكيد الطلب
    → POST /api/store/orders → حفظ في store_orders
    → إشعار واتساب للمؤسس → صفحة تأكيد + رقم الطلب
```

---

## 10. Whacka API Reference (للاستعلام المستقبلي فقط)

```js
// POST https://zomrda-cosmetics-sv5f.whacka.app/api/app/{APP_ID}/data
// Body: { action: 'selectShared', collection: 'products' }
// APP_ID: b2edf064-7f05-4f5c-8361-30ad097d16c5
// Returns: Array of product objects
```
> ⚠️ لا يُستخدم في الإنتاج — مرجع فقط إذا احتجنا تحديث البيانات يدوياً في المستقبل.
