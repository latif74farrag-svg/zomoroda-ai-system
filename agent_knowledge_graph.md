# خريطة معرفة الوكلاء (Knowledge Graph)

```mermaid
flowchart TD
    %% Main Agent
    A[Antigravity (Main Agent)] -->|يدير| B[Facebook Groups Collector]
    A -->|يدير| C[Facebook Page Joiner]
    A -->|يدير| D[Advertising Agent]
    A -->|يدير| E[Marketing Agent]
    A -->|يدير| F[Sales Agent]
    A -->|يدير| G[Orders Agent]
    A -->|يدير| H[Inventory Agent]
    A -->|يدير| I[Research Agent]
    A -->|يدير| J[Browser Agent]
    A -->|يدير| K[Self Agent]
    A -->|يدير| L[Automation Agent]
    A -->|يدير| M[AI Architect]
    A -->|يدير| N[Deployment Expert]
    A -->|يدير| O[Performance Optimizer]

    %% Relationships / data flow
    B -->|يباحث عن مجموعات/صفحات| FB[Facebook API]
    C -->|يتحقق من صلاحية النشر| FB
    D -->|ينتج محتوى إعلان| Content[محتوى إعلاني]
    E -->|ينتج محتوى تسويقي| Content
    F -->|يعالج طلبات مبيعات| CRM[CRM System]
    G -->|يدير تأكيد الطلبات| CRM
    H -->|يرسل تنبيهات مخزون| Alerts[تنبيهات المخزون]
    I -->|يبحث في ملفات الكود| Repo[Repo Files]
    J -->|يتفاعل مع UI المتصفح| UI[واجهة المتصفح]
    K -->|نموذج فرعي للمهام المعزولة| Subtasks[مهام معزولة]
    L -->|ينشئ جدولة مهام| Scheduler[Scheduled Tasks]
    M -->|يصمم بنية AI| AIApp[AI Application]
    N -->|يدير عمليات النشر| Vercel[Vercel]
    O -->|يحسن الأداء| Metrics[Performance Metrics]
```

**شرح الخريطة**
- **Antigravity** هو الوكيل الرئيس يدير جميع الوكلاء الفرعيين.
- **Facebook Groups Collector** و **Facebook Page Joiner** يجمعان ويتحققان من روابط المجموعات/الصفحات على فيسبوك.
- **Advertising Agent**, **Marketing Agent**, **Sales Agent**, **Orders Agent** ينتجون محتوى إعلاني/تسويقي، ويتعاملون مع نظام CRM للطلبات والمبيعات.
- **Inventory Agent** يرسل تنبيهات المخزون عند انخفاض الكميات.
- **Research Agent** يقرأ ملفات المستودع لأغراض البحث دون تعديل.
- **Browser Agent** يتحكم بواجهة المتصفح لأداء تفاعل UI.
- **Self Agent** نسخة من Antigravity للاستخدام في مهام معزولة.
- **Automation Agent** يُنشئ مهام جدولة (cron) لتشغيل عمليات دورية.
- **AI Architect** يخطط بنية تطبيقات الذكاء الاصطناعي.
- **Deployment Expert** يدير عمليات النشر على Vercel.
- **Performance Optimizer** يحسن Core Web Vitals وأداء النظام.

> **ملاحظة**: كل عقدة تمثل وكيلًا، والسهام توضح العلاقة الوظيفية أو تدفق البيانات بين الوكلاء والنظام.
