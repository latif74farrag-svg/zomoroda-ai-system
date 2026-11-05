# 🌐 مسارات الخادم والواجهات البرمجية (API & Endpoints Spec)

> **Current interfaces:** [production-api.md](production-api.md). Legacy campaign/offer/chat endpoints below return 410. The root redirects to `/store`; management uses authenticated staff APIs. Repository files and business catalogs are not public static downloads.

خادم Express الرئيسي يعمل على المنفذ `PORT` (افتراضياً 3000) ومجهز للعمل محلياً أو على منصات السحاب مثل Vercel / VPS.

---

## 🛣️ قائمة المسارات الأساسية (Core Endpoints)

### 1. الصفحة الرئيسية واللوحة التفاعلية
- **المسار**: `GET /`
- **الوصف**: تعرض الواجهة التفاعلية الكاملة للمنظومة (Dashboard) متضمنة بيانات الهوية التجارية، روابط الكتالوجات المخصصة، إحصائيات النظام، وحاسبة الفواتير.

### 2. إضافة العروض الشهرية
- **المسار**: `POST /api/offers/add`
- **جسم الطلب (Body)**:
  ```json
  {
    "month_year": "10-2026",
    "category": "pharmacies",
    "offer_title": "خصم خاص على شحنات رونزا",
    "offer_details": "خصم 15% على أول 100 كرتونة",
    "discount_percent": 15
  }
  ```
- **الاستجابة**: تأكيد حفظ العرض في جدول `monthly_offers` في قاعدة البيانات.

### 3. إطلاق حملة تسويقية
- **المسار**: `POST /api/campaign/start`
- **جسم الطلب (Body)**:
  ```json
  {
    "platform": "whatsapp",
    "category": "salon"
  }
  ```
- **الوصف**: بدء تشغيل الحملة المستهدفة للفئة المختارة عبر المنصة المحددة وفق ضوابط الأمان.

### 4. محادثة الدعم الذكي التفاعلي
- **المسار**: `POST /api/support/chat`
- **جسم الطلب (Body)**:
  ```json
  {
    "userId": "client_101",
    "channel": "web",
    "message": "عايز اعرف اسعار المناديل المبللة"
  }
  ```
- **الاستجابة**: تصنيف العميل، إرجاع الكتالوج المخصص لقطاعه، وحفظ التفاعل في جدول `customers` و `orders`.

### 5. مراجعة النظام والتقارير
- **المسار**: `GET /review`
- **الوصف**: شاشة إدارية لعرض حالة المنظومة، السجلات الأخيرة (`manager_logs`)، وإجمالي المبيعات والعمولات.

---

## 🔒 حماية الملفات الحساسة (Security Middleware)
يحتوي الخادم على Middleware مدمج يمنع الوصول المباشر عبر المتصفح إلى:
- ملفات الامتدادات الحساسة: `.db`, `.json`, `.js`, `.txt`, `.env`, `.md`
- مجلدات الكود والنظام: `node_modules`, `.git`
- إعادة توجيه الطلبات غير المصرحة بـ `403 Forbidden`.


## Unified agent management (`/store/agents`)
One page for control and monitoring; `/store/activity` redirects to `/store/agents#activity`. All states come from `lib/agent-roster.js`.

| Endpoint | Purpose |
| :--- | :--- |
| `GET /api/v1/admin/agents/overview` | Roster of 12 agents + global switch + KPIs. State is one of `stopped` (global stop), `paused`, `active` (acted in 24h), `ready`. |
| `PATCH /api/v1/admin/agents/:agent` | `{ paused, reason? }`. Records who/when/why in `agent_controls` and the audit log. `global` is the kill switch. |
| `POST /api/v1/admin/agents/:agent/run` | Run now (manager, ads, refinement, aggregator). Refused while paused. Results are proposals only. |
| `POST /api/v1/admin/agents/:agent/review-all` | `{ decision }`: approve or reject up to 50 waiting proposals of one agent. |
| `GET /api/v1/admin/activity?agent=` | Live feed filtered by agent. |

WhatsApp sender and scraper (standalone processes) check `isPaused()` and fail closed. Note the global switch ships paused, so they stay idle until it is switched on from the page.
