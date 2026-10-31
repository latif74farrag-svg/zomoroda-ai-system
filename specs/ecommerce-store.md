# 🛒 مواصفات المتجر الإلكتروني لشركة الزمردة (E-Commerce Store Spec)

> **الحالة**: قيد التنفيذ 🔄
> **تاريخ الإنشاء**: 2026-10-31
> **القرارات المعتمدة**: Express + Server-Side HTML | بيانات محلية | صور placeholder | كاش فقط

---

## 1. نظرة عامة (Overview)

متجر إلكتروني احترافي مدمج داخل المنظومة الحالية (Express + Server-Side HTML) لعرض وبيع منتجات الزمردة كوزماتيكس (رونزا + ونوي) مباشرة للعملاء والماميز.

### مصدر البيانات
- **30 منتج** مُستخرج من موقع Whacka (`zomrda-cosmetics-sv5f.whacka.app`)
- محفوظ محلياً في [`scripts/whacka_products.json`](../scripts/whacka_products.json)
- سكربت الاستخراج: [`scripts/inspect-whacka.js`](../scripts/inspect-whacka.js)
- **لا يوجد sync دوري** — البيانات المحلية هي المصدر الوحيد

---

## 2. هيكل المنتجات (Product Structure)

### جدول `store_products` (SQLite)
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

### التصنيفات الـ 7
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
GET  /api/store/products           → قائمة المنتجات (مع فلترة بـ ?category=)
GET  /api/store/products/:id       → تفاصيل منتج واحد
POST /api/store/orders             → إنشاء طلب جديد
GET  /api/store/orders/:phone      → تتبع طلبات العميل برقم الهاتف
```

---

## 5. نظام الطلبات (Orders System)

### جدول `store_orders`
```sql
CREATE TABLE IF NOT EXISTS store_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number TEXT UNIQUE,         -- ZMR-20261031-001
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  notes TEXT,
  items TEXT NOT NULL,              -- JSON stringified cart items
  total REAL NOT NULL,
  payment_method TEXT DEFAULT 'cash',
  status TEXT DEFAULT 'pending',    -- pending / confirmed / shipped / delivered
  created_at TEXT DEFAULT (datetime('now'))
);
```

### رقم الطلب
- الصيغة: `ZMR-YYYYMMDD-XXX` (مثال: `ZMR-20261031-001`)

### نظام الدفع
- **كاش عند الاستلام فقط** (لا يوجد دفع إلكتروني حالياً)

### إشعار الطلب الجديد
- عند إنشاء طلب، يتم إرسال رسالة واتساب تلقائية للمؤسس (أ. عبد اللطيف فراج) تتضمن تفاصيل الطلب

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
5. **شبكة المنتجات** — كروت بصورة placeholder + اسم + براند + سعر + زر إضافة
6. **Footer** — بيانات الشركة + رابط واتساب

### سلة المشتريات (Cart Sidebar)
- Drawer ينزلق من اليمين (RTL)
- تخزين في `localStorage`
- أزرار +/- للكمية
- إجمالي + زر "إتمام الطلب"

### صفحة Checkout
- ملخص الطلب من localStorage
- نموذج: الاسم + رقم الواتساب + العنوان + ملاحظات
- طريقة الدفع: كاش (معروضة فقط بدون اختيار)
- زر تأكيد → `POST /api/store/orders`
- رسالة نجاح مع رقم الطلب

---

## 7. قواعد العمل (Business Rules)

### عزل الأسعار
- المتجر العام (`/store`) يعرض **أسعار القطاعي/الجمهور** فقط (قطاع الماميز)
- **ممنوع** عرض أسعار الصيدليات أو الجملة أو الفنادق في المتجر العام

### صور المنتجات
- **مرحلة أولى**: صور placeholder (أيقونات SVG أو ألوان حسب التصنيف)
- **مرحلة لاحقة**: استبدال بصور حقيقية عبر حقل `image_url`

---

## 8. خطة التنفيذ (Implementation Phases)

| المرحلة | المهمة | الأولوية | المدة | الحالة |
|:---|:---|:---|:---|:---|
| **1** | دمج بيانات المنتجات (import + products_config) | 🔴 عالية | 1 يوم | 🔄 قيد التنفيذ |
| **2** | واجهة المتجر (store.js + checkout.js + routes) | 🔴 عالية | 2-3 أيام | 🔄 قيد التنفيذ |
| **3** | سلة المشتريات + نظام الطلبات + إشعارات | 🟡 متوسطة | 2-3 أيام | ⏳ لم يبدأ |
| **4** | عزل القطاعات + روابط الإحالة + SEO | 🟢 تحسين | 1-2 يوم | ⏳ لم يبدأ |

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

