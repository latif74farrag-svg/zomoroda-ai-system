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

## Real channels: outbox, email, WhatsApp, social (migration v10)
Every outbound message follows one path: **agent proposes -> Guardian (propose) -> staff approve -> Guardian (execute, daily limit) -> `outbox` row -> channel sender**.
The sender is the last gate (`gate()` in `lib/outbox.js`): agent switch, consent, Do-Not-Contact, 30 days, 9-18 Cairo (not Friday), spacing (WhatsApp 10-15 min, email 1-3 min) and the 30-minute break after 5 WhatsApp messages. A message blocked only by timing waits. One that must never go (opt-out, Do-Not-Contact, expired reply window) is cancelled.

| Piece | Where | Notes |
| :--- | :--- | :--- |
| Outreach agent (`outreach`) | `lib/agentic/outreach.js` | Run from /store/agents. One proposal per eligible lead per 30-day cycle, wording from `message_templates`. |
| WhatsApp sender | `whatsapp_service.js` | whatsapp-web.js session. Reads the outbox, writes a heartbeat to `system_state`, records inbound messages, and stop words opt the sender out at once. The legacy `send_campaign.js` and `email_service.js` bypass the Guardian: do not use them for new campaigns. |
| Email sender | `lib/channels/delivery.js` (worker) | Company SMTP (`SMTP_*`). Every mail carries a signed unsubscribe link and List-Unsubscribe headers. |
| Social agent (`social`) | `lib/agentic/social.js`, `lib/channels/social.js` | Messenger, Instagram, Telegram: inbound and approved replies only (platform rules; Meta allows replies for 24h). |

Public endpoints (no session): `GET/POST /webhooks/meta` (HMAC `X-Hub-Signature-256`, key `META_APP_SECRET`), `POST /webhooks/telegram` (`X-Telegram-Bot-Api-Secret-Token`), `GET/POST /unsubscribe?t=` (GET only asks for confirmation, POST applies it).
Staff: `GET /api/v1/admin/outbox?status=`, `POST /api/v1/admin/outbox/:id/cancel|retry`, `POST /api/v1/admin/agents/outreach/run` with `{ option: whatsapp | email }`.
Setup: Meta webhook URL is `BASE_URL/webhooks/meta` (subscribe to `messages`). Telegram: `setWebhook?url=BASE_URL/webhooks/telegram&secret_token=...`. The WhatsApp process must run on an always-on machine that uses the same database as the web app.
