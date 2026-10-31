// views/dashboard.js - واجهة لوحة التحكم العصرية لمنظومة الزمردة كوزماتيكس
function getDashboardHtml({
    BUSINESS_IDENTITY,
    categoryAssets,
    fileUrl,
    logs = [],
    offers = [],
    totalCust = 0,
    totalOrders = 0
}) {
    const activeOffersCount = offers ? offers.length : 0;
    const logsCount = logs ? logs.length : 0;

    let logsHtml = (logs && logs.length > 0) ? logs.map(l => `
        <div class="timeline-item">
            <div class="timeline-badge">${l.action_type || 'إجراء'}</div>
            <div class="timeline-content">
                <div class="timeline-meta">${l.created_at || 'الآن'}</div>
                <div class="timeline-text">${l.details || ''}</div>
            </div>
        </div>
    `).join('') : '<div class="empty-state">جاري تدوين الإجراءات الإدارية...</div>';

    let offersHtml = (offers && offers.length > 0) ? offers.map(o => `
        <div class="offer-card">
            <div class="offer-header">
                <span class="badge-gold">عرض شهر ${o.month_year || ''}</span>
                <span class="badge-sector">${categoryAssets[o.category]?.name || o.category || 'كافة الفئات'}</span>
            </div>
            <div class="offer-title">🎁 ${o.offer_title}</div>
        </div>
    `).join('') : '<div class="empty-state">لا توجد عروض مضافة لهذا الشهر حتى الآن. أضف عرضاً جديداً بالأعلى.</div>';

    return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="keywords" content="${BUSINESS_IDENTITY.keywords.join(', ')}">
    <meta name="description" content="شركة الزمردة كوزماتيكس بإدارة عبداللطيف فراج - توريدات مناديل مبللة رونزا ويونو، معطرات، فوط تنشيف، وخدمة Private Label للفنادق والشركات.">
    <title>شركة الزمردة كوزماتيكس | المنظومة الذكية للتوريدات والتسويق الآلي</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #064e3b;
            --primary-dark: #022c22;
            --primary-light: #047857;
            --emerald-500: #10b981;
            --emerald-100: #d1fae5;
            --emerald-50: #ecfdf5;
            --gold: #d97706;
            --gold-light: #fef3c7;
            --slate-900: #0f172a;
            --slate-800: #1e293b;
            --slate-600: #475569;
            --slate-100: #f1f5f9;
            --slate-50: #f8fafc;
            --border: #e2e8f0;
            --shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.07), 0 8px 10px -6px rgba(0, 0, 0, 0.04);
            --radius-lg: 16px;
            --radius-md: 12px;
            --radius-sm: 8px;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Cairo', sans-serif; }

        body {
            background-color: #f1f5f9;
            color: var(--slate-900);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            line-height: 1.6;
        }

        /* Top Bar */
        .top-navbar {
            background: linear-gradient(135deg, var(--primary-dark) 0%, var(--primary) 60%, #065f46 100%);
            color: white;
            padding: 24px 20px 20px;
            box-shadow: 0 4px 20px rgba(6, 78, 59, 0.25);
            border-bottom: 2px solid rgba(16, 185, 129, 0.3);
        }

        .navbar-container {
            max-width: 1240px;
            margin: 0 auto;
        }

        .brand-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 16px;
            margin-bottom: 20px;
        }

        .brand-identity {
            display: flex;
            align-items: center;
            gap: 14px;
        }

        .brand-logo {
            width: 56px;
            height: 56px;
            background: linear-gradient(135deg, #10b981, #059669);
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 30px;
            box-shadow: 0 0 20px rgba(16, 185, 129, 0.4);
            border: 2px solid rgba(255, 255, 255, 0.25);
        }

        .brand-title h1 {
            font-size: 22px;
            font-weight: 800;
            color: #ffffff;
            letter-spacing: -0.3px;
        }

        .brand-title p {
            font-size: 13px;
            color: #a7f3d0;
            font-weight: 500;
        }

        .founder-chip {
            background: rgba(255, 255, 255, 0.12);
            backdrop-filter: blur(8px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            padding: 8px 16px;
            border-radius: 30px;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            font-weight: 700;
            color: #fef3c7;
        }

        .store-launch-button {
            background: linear-gradient(135deg, #fbbf24, #d97706);
            border: 1px solid rgba(255, 255, 255, 0.35);
            border-radius: 30px;
            padding: 10px 18px;
            color: #fff;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            text-decoration: none;
            font-size: 14px;
            font-weight: 800;
            box-shadow: 0 4px 14px rgba(217, 119, 6, 0.3);
            transition: transform 0.2s, filter 0.2s;
        }

        .store-launch-button:hover {
            transform: translateY(-2px);
            filter: brightness(1.08);
        }

        /* Status Ticker */
        .status-ticker {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            gap: 12px;
            margin-top: 15px;
        }

        .status-pill {
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: var(--radius-md);
            padding: 10px 14px;
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 12.5px;
            color: #f0fdf4;
        }

        .pulse-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: #10b981;
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
            animation: pulse 1.8s infinite;
            flex-shrink: 0;
        }

        @keyframes pulse {
            0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
            70% { transform: scale(1); box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
            100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }

        /* Channels Ribbon */
        .channels-ribbon {
            background: white;
            border-bottom: 1px solid var(--border);
            padding: 12px 20px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
        }

        .channels-container {
            max-width: 1240px;
            margin: 0 auto;
            display: flex;
            align-items: center;
            gap: 10px;
            overflow-x: auto;
            padding-bottom: 4px;
            scrollbar-width: thin;
        }

        .channels-label {
            font-size: 13px;
            font-weight: 700;
            color: var(--slate-600);
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 6px;
            margin-left: 8px;
        }

        .channel-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 8px 14px;
            border-radius: 20px;
            color: white;
            text-decoration: none;
            font-size: 13px;
            font-weight: 700;
            white-space: nowrap;
            transition: all 0.2s ease;
            box-shadow: 0 2px 5px rgba(0,0,0,0.08);
        }

        .channel-btn:hover {
            transform: translateY(-2px);
            filter: brightness(1.08);
            box-shadow: 0 4px 10px rgba(0,0,0,0.15);
        }

        .btn-fb { background: #1877f2; }
        .btn-ronza { background: #059669; }
        .btn-ig { background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%); }
        .btn-in { background: #0a66c2; }
        .btn-tg { background: #229ed9; }
        .btn-wa { background: #25d366; }
        .btn-mail { background: #ea4335; }
        .btn-review { background: #7c3aed; }
        .btn-store { background: linear-gradient(135deg, #059669, #047857); }

        /* Main Layout */
        .main-wrapper {
            max-width: 1240px;
            width: 100%;
            margin: 24px auto;
            padding: 0 20px;
            flex: 1;
        }

        /* KPI Cards */
        .kpi-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
        }

        .kpi-card {
            background: white;
            border-radius: var(--radius-md);
            padding: 20px;
            display: flex;
            align-items: center;
            gap: 16px;
            box-shadow: var(--shadow);
            border: 1px solid var(--border);
            transition: transform 0.2s;
        }

        .kpi-card:hover { transform: translateY(-3px); }

        .kpi-icon {
            width: 52px;
            height: 52px;
            border-radius: var(--radius-md);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            flex-shrink: 0;
        }

        .kpi-info h4 {
            font-size: 13px;
            color: var(--slate-600);
            font-weight: 600;
        }

        .kpi-info .kpi-value {
            font-size: 26px;
            font-weight: 800;
            color: var(--slate-900);
            line-height: 1.2;
        }

        /* Navigation Tabs */
        .tabs-header {
            display: flex;
            gap: 8px;
            border-bottom: 2px solid var(--border);
            margin-bottom: 24px;
            overflow-x: auto;
            scrollbar-width: none;
        }

        .tab-btn {
            background: none;
            border: none;
            padding: 12px 20px;
            font-size: 15px;
            font-weight: 700;
            color: var(--slate-600);
            cursor: pointer;
            position: relative;
            white-space: nowrap;
            transition: all 0.2s;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            border-radius: var(--radius-sm) var(--radius-sm) 0 0;
        }

        .tab-btn:hover { color: var(--primary); background: rgba(6, 78, 59, 0.04); }

        .tab-btn.active {
            color: var(--primary);
            background: white;
            border-bottom: 3px solid var(--emerald-500);
        }

        /* Tab Content */
        .tab-pane {
            display: none;
            animation: fadeIn 0.25s ease-in-out;
        }

        .tab-pane.active { display: block; }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(6px); }
            to { opacity: 1; transform: translateY(0); }
        }

        /* Card Panels */
        .panel {
            background: white;
            border-radius: var(--radius-lg);
            padding: 28px;
            box-shadow: var(--shadow);
            border: 1px solid var(--border);
            margin-bottom: 24px;
        }

        .panel-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
            padding-bottom: 12px;
            border-bottom: 1px solid var(--border);
            flex-wrap: wrap;
            gap: 10px;
        }

        .panel-header h3 {
            font-size: 18px;
            font-weight: 800;
            color: var(--primary);
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .panel-header p {
            font-size: 13.5px;
            color: var(--slate-600);
        }

        /* Form Controls */
        .form-group {
            margin-bottom: 18px;
            text-align: right;
        }

        .form-label {
            display: block;
            font-size: 14px;
            font-weight: 700;
            color: var(--slate-800);
            margin-bottom: 8px;
        }

        .form-control {
            width: 100%;
            padding: 12px 16px;
            border: 1.5px solid var(--border);
            border-radius: var(--radius-md);
            font-size: 15px;
            background: #fafafa;
            transition: all 0.2s;
            color: var(--slate-900);
        }

        .form-control:focus {
            outline: none;
            border-color: var(--emerald-500);
            background: white;
            box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.15);
        }

        .form-row {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
            gap: 16px;
        }

        /* Sector Cards Selector */
        .sector-cards-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 14px;
            margin: 16px 0;
        }

        .sector-choice-card {
            border: 2px solid var(--border);
            border-radius: var(--radius-md);
            padding: 16px;
            cursor: pointer;
            transition: all 0.2s ease;
            position: relative;
            background: #fdfdfd;
            text-align: right;
        }

        .sector-choice-card:hover {
            border-color: var(--emerald-500);
            background: var(--emerald-50);
            transform: translateY(-2px);
        }

        .sector-choice-card.selected {
            border-color: var(--emerald-500);
            background: #f0fdf4;
            box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
        }

        .sector-choice-card input[type="radio"] {
            display: none;
        }

        .sector-card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 8px;
        }

        .sector-card-name {
            font-size: 15px;
            font-weight: 800;
            color: var(--primary);
        }

        .sector-badge {
            font-size: 11px;
            padding: 3px 8px;
            border-radius: 12px;
            font-weight: 700;
        }

        .badge-exclusive { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
        .badge-standard { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }

        .sector-desc {
            font-size: 12.5px;
            color: var(--slate-600);
            line-height: 1.5;
            margin-bottom: 8px;
        }

        .sector-meta-links {
            display: flex;
            gap: 8px;
            font-size: 11.5px;
        }

        .sector-meta-links a {
            color: #0284c7;
            text-decoration: none;
            font-weight: 600;
        }

        .sector-meta-links a:hover { text-decoration: underline; }

        /* Platform Grid Radio */
        .platform-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
            gap: 12px;
            margin: 12px 0 20px;
        }

        .platform-choice {
            border: 2px solid var(--border);
            border-radius: var(--radius-md);
            padding: 14px 12px;
            cursor: pointer;
            text-align: center;
            background: white;
            transition: all 0.2s;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 6px;
        }

        .platform-choice:hover {
            border-color: var(--emerald-500);
            background: var(--emerald-50);
        }

        .platform-choice.selected {
            border-color: var(--emerald-500);
            background: #f0fdf4;
            box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
        }

        .platform-choice input[type="radio"] { display: none; }

        .platform-icon { font-size: 26px; }
        .platform-name { font-size: 13.5px; font-weight: 700; color: var(--slate-900); }
        .platform-time-tag { font-size: 11px; color: var(--emerald-500); font-weight: 700; }

        /* Action Buttons */
        .btn-submit {
            background: linear-gradient(135deg, #059669 0%, #047857 100%);
            color: white;
            padding: 14px 32px;
            border-radius: var(--radius-md);
            font-size: 16px;
            font-weight: 800;
            border: none;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 4px 14px rgba(5, 150, 105, 0.35);
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }

        .btn-submit:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(5, 150, 105, 0.45);
        }

        /* Timeline / Audit Feed */
        .timeline-stream {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .timeline-item {
            display: flex;
            align-items: flex-start;
            gap: 14px;
            padding: 14px 16px;
            background: #f8fafc;
            border-radius: var(--radius-md);
            border-right: 4px solid var(--emerald-500);
            transition: background 0.2s;
        }

        .timeline-item:hover { background: #f1f5f9; }

        .timeline-badge {
            background: #0f172a;
            color: #f8fafc;
            font-size: 11px;
            font-weight: 700;
            padding: 4px 10px;
            border-radius: 6px;
            white-space: nowrap;
        }

        .timeline-content { flex: 1; text-align: right; }
        .timeline-meta { font-size: 11.5px; color: var(--slate-600); margin-bottom: 2px; }
        .timeline-text { font-size: 13.5px; color: var(--slate-900); font-weight: 600; line-height: 1.5; }

        /* Chat Simulator Styles */
        .chat-simulator-card {
            background: #f8fafc;
            border: 1px solid var(--border);
            border-radius: var(--radius-lg);
            overflow: hidden;
            max-width: 760px;
            margin: 0 auto;
            box-shadow: var(--shadow);
        }

        .chat-header {
            background: linear-gradient(135deg, var(--primary) 0%, #065f46 100%);
            color: white;
            padding: 14px 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .chat-bot-info {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .chat-body {
            padding: 20px;
            min-height: 280px;
            max-height: 380px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 14px;
            background: #efeae2;
            background-image: radial-gradient(#d1d7db 1px, transparent 1px);
            background-size: 18px 18px;
        }

        .chat-bubble {
            max-width: 82%;
            padding: 12px 16px;
            border-radius: 14px;
            font-size: 14px;
            line-height: 1.6;
            white-space: pre-line;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .chat-bubble.bot {
            align-self: flex-start;
            background: white;
            color: #111b21;
            border-bottom-right-radius: 2px;
        }

        .chat-bubble.user {
            align-self: flex-end;
            background: #d9fdd3;
            color: #111b21;
            border-bottom-left-radius: 2px;
        }

        .chat-bubble-meta {
            font-size: 11px;
            color: #667781;
            margin-top: 4px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
        }

        .chat-input-bar {
            padding: 12px 16px;
            background: #f0f2f5;
            display: flex;
            gap: 10px;
            border-top: 1px solid var(--border);
        }

        .prompt-chips {
            display: flex;
            gap: 8px;
            overflow-x: auto;
            padding: 10px 14px;
            background: #f8fafc;
            border-top: 1px solid var(--border);
            scrollbar-width: none;
        }

        .prompt-chip {
            background: white;
            border: 1px solid var(--border);
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            color: var(--primary);
            cursor: pointer;
            white-space: nowrap;
            transition: all 0.2s;
        }

        .prompt-chip:hover {
            background: var(--emerald-50);
            border-color: var(--emerald-500);
        }

        /* Offers Grid */
        .offers-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 16px;
            margin-top: 16px;
        }

        .offer-card {
            background: #fffbeb;
            border: 1px solid #fde68a;
            border-radius: var(--radius-md);
            padding: 16px;
            text-align: right;
            box-shadow: 0 2px 8px rgba(217, 119, 6, 0.08);
        }

        .offer-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }

        .badge-gold {
            background: #d97706;
            color: white;
            font-size: 11px;
            font-weight: 800;
            padding: 3px 8px;
            border-radius: 6px;
        }

        .badge-sector {
            background: #fef3c7;
            color: #92400e;
            font-size: 11.5px;
            font-weight: 700;
            padding: 2px 6px;
            border-radius: 4px;
        }

        .offer-title {
            font-size: 15px;
            font-weight: 700;
            color: #78350f;
            line-height: 1.5;
        }

        .empty-state {
            text-align: center;
            padding: 24px;
            color: var(--slate-600);
            font-size: 14px;
            background: #f8fafc;
            border-radius: var(--radius-md);
            border: 1px dashed var(--border);
        }

        /* Footer */
        .app-footer {
            background: var(--slate-900);
            color: #94a3b8;
            padding: 24px 20px;
            text-align: center;
            font-size: 13px;
            margin-top: auto;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .app-footer b { color: #f8fafc; }

        @media (max-width: 768px) {
            .brand-header { flex-direction: column; align-items: flex-start; }
            .kpi-grid { grid-template-columns: 1fr 1fr; }
            .platform-grid { grid-template-columns: 1fr 1fr; }
            .panel { padding: 18px; }
        }
    </style>
</head>
<body>

    <!-- 1. شريط الهوية والترويسة الفاخرة -->
    <header class="top-navbar">
        <div class="navbar-container">
            <div class="brand-header">
                <div class="brand-identity">
                    <div class="brand-logo">💎</div>
                    <div class="brand-title">
                        <h1>${BUSINESS_IDENTITY.name}</h1>
                        <p>المنظومة الذكية للتجارة الإلكترونية والتسويق الآلي متعدد القنوات</p>
                    </div>
                </div>
                <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 12px;">
                    <a class="store-launch-button" href="/store" target="_blank" rel="noopener noreferrer">
                        🛍️ افتح المتجر الإلكتروني
                    </a>
                    <div class="founder-chip">
                        <span>👔 المؤسس والمدير العام:</span>
                        <b>${BUSINESS_IDENTITY.ownerName}</b>
                    </div>
                </div>
            </div>

            <!-- مؤشرات حالة المنظومة اللحظية -->
            <div class="status-ticker">
                <div class="status-pill">
                    <span class="pulse-dot"></span>
                    <span><b>السوشيال ميديا:</b> تعمل 24/7 (نشر ورد ذكي فوري)</span>
                </div>
                <div class="status-pill">
                    <span class="pulse-dot" style="background: #38bdf8;"></span>
                    <span><b>درع الأمان (Anti-Ban):</b> فاصل 30 يوماً مفعل للعملاء</span>
                </div>
                <div class="status-pill">
                    <span class="pulse-dot" style="background: #f59e0b;"></span>
                    <span><b>مواعيد الواتساب:</b> 9:00 ص - 7:00 م (استراحة كل 5 رسائل)</span>
                </div>
                <div class="status-pill">
                    <span class="pulse-dot" style="background: #a855f7;"></span>
                    <span><b>النشر التلقائي:</b> 3 منشورات يومياً (10ص - 4م - 9م)</span>
                </div>
            </div>
        </div>
    </header>

    <!-- 2. شريط القنوات والانتقال السريع -->
    <div class="channels-ribbon">
        <div class="channels-container">
            <span class="channels-label">⚡ القنوات والمنصات:</span>
            <a class="channel-btn btn-fb" href="${BUSINESS_IDENTITY.facebookPage}" target="_blank">🌐 فيسبوك الزمردة</a>
            <a class="channel-btn btn-ronza" href="${BUSINESS_IDENTITY.ronzaParentPage}" target="_blank">🌺 شركة Ronza الأم</a>
            <a class="channel-btn btn-ig" href="${BUSINESS_IDENTITY.instagramProfile}" target="_blank">📸 إنستجرام</a>
            <a class="channel-btn btn-in" href="${BUSINESS_IDENTITY.linkedinProfile}" target="_blank">💼 لينكد إن</a>
            <a class="channel-btn btn-tg" href="https://t.me/${BUSINESS_IDENTITY.telegram}" target="_blank">✈️ تليجرام</a>
            <a class="channel-btn btn-wa" href="https://wa.me/2${BUSINESS_IDENTITY.whatsapp}" target="_blank">💬 واتساب المبيعات</a>
            <a class="channel-btn btn-mail" href="mailto:${BUSINESS_IDENTITY.email}" target="_blank">✉️ البريد الرسمي</a>
            <a class="channel-btn btn-review" href="/review" target="_blank">🎬 مراجعة الفيديوهات</a>
            <a class="channel-btn btn-store" href="/store" target="_blank" rel="noopener noreferrer">🛍️ المتجر الإلكتروني</a>
        </div>
    </div>

    <!-- 3. المحتوى الرئيسي والتبويبات -->
    <main class="main-wrapper">

        <!-- بطاقات الإحصاءات السريعة (KPIs) -->
        <div class="kpi-grid">
            <div class="kpi-card">
                <div class="kpi-icon" style="background: #ecfdf5; color: #059669;">👥</div>
                <div class="kpi-info">
                    <h4>العملاء في الفانل</h4>
                    <div class="kpi-value">${totalCust}</div>
                </div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon" style="background: #eff6ff; color: #2563eb;">📦</div>
                <div class="kpi-info">
                    <h4>الطلبيات المسجلة</h4>
                    <div class="kpi-value">${totalOrders}</div>
                </div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon" style="background: #fffbeb; color: #d97706;">🎁</div>
                <div class="kpi-info">
                    <h4>عروض الشهر المفعلة</h4>
                    <div class="kpi-value">${activeOffersCount}</div>
                </div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon" style="background: #f5f3ff; color: #7c3aed;">📋</div>
                <div class="kpi-info">
                    <h4>سجل قرارات الإدارة</h4>
                    <div class="kpi-value">${logsCount}</div>
                </div>
            </div>
        </div>

        <!-- شريط التبويبات الحديثة -->
        <div class="tabs-header">
            <button class="tab-btn active" onclick="switchTab('tab-campaign')">🚀 إطلاق الحملات الذكية</button>
            <button class="tab-btn" onclick="switchTab('tab-chat')">🤖 محاكي الرد الذكي 24/7</button>
            <button class="tab-btn" onclick="switchTab('tab-offers')">🎁 عروض الشهر والميزانية</button>
            <button class="tab-btn" onclick="switchTab('tab-matrix')">📦 مصفوفة القطاعات والكتالوجات</button>
            <button class="tab-btn" onclick="switchTab('tab-audit')">👔 سجل المدير العام اللحظي</button>
        </div>

        <!-- تبويب 1: إطلاق الحملات -->
        <div id="tab-campaign" class="tab-pane active">
            <div class="panel">
                <div class="panel-header">
                    <div>
                        <h3>📢 إطلاق حملة موجهة متعددة القنوات</h3>
                        <p>يتم توجيه الحملات وتطبيق قواعد العزل الصارمة وساعات العمل المعتمدة تلقائياً</p>
                    </div>
                </div>

                <form id="campaignForm" action="/api/campaign/start" method="POST">
                    
                    <label class="form-label">1. حدد منصة الإطلاق:</label>
                    <div class="platform-grid">
                        <label class="platform-choice selected" onclick="selectPlatform(this)">
                            <input type="radio" name="platform" value="Facebook_Messenger" checked>
                            <span class="platform-icon">🌐</span>
                            <span class="platform-name">فيسبوك ماسنجر</span>
                            <span class="platform-time-tag">🟢 متاح 24/7</span>
                        </label>
                        <label class="platform-choice" onclick="selectPlatform(this)">
                            <input type="radio" name="platform" value="Instagram">
                            <span class="platform-icon">📸</span>
                            <span class="platform-name">إنستجرام ديركت</span>
                            <span class="platform-time-tag">🟢 متاح 24/7</span>
                        </label>
                        <label class="platform-choice" onclick="selectPlatform(this)">
                            <input type="radio" name="platform" value="Telegram">
                            <span class="platform-icon">✈️</span>
                            <span class="platform-name">قناة التليجرام</span>
                            <span class="platform-time-tag">🟢 متاح 24/7</span>
                        </label>
                        <label class="platform-choice" onclick="selectPlatform(this)">
                            <input type="radio" name="platform" value="LinkedIn">
                            <span class="platform-icon">💼</span>
                            <span class="platform-name">بروفايل لينكدإن</span>
                            <span class="platform-time-tag">🟢 متاح 24/7</span>
                        </label>
                        <label class="platform-choice" onclick="selectPlatform(this)">
                            <input type="radio" name="platform" value="WhatsApp">
                            <span class="platform-icon">💬</span>
                            <span class="platform-name">واتساب المبيعات</span>
                            <span class="platform-time-tag" style="color: #d97706;">⏰ 9ص - 7م (أمان)</span>
                        </label>
                        <label class="platform-choice" onclick="selectPlatform(this)">
                            <input type="radio" name="platform" value="Email">
                            <span class="platform-icon">✉️</span>
                            <span class="platform-name">البريد الإلكتروني</span>
                            <span class="platform-time-tag" style="color: #d97706;">⏰ أوقات العمل</span>
                        </label>
                    </div>

                    <label class="form-label">2. حدد القطاع والجمهور المستهدف (عزل تام للأسعار والكتالوجات):</label>
                    <div class="sector-cards-grid">
                        <label class="sector-choice-card selected" onclick="selectSector(this)">
                            <input type="radio" name="category" value="housewives_team" checked>
                            <div class="sector-card-header">
                                <span class="sector-card-name">🌸 قطاع المندوبات والماميز</span>
                                <span class="sector-badge badge-standard">قطاعي + عمولة</span>
                            </div>
                            <div class="sector-desc">ربات بيوت القاهرة والجيزة - فرصة دخل من المنزل وشجرة عمولات (5% و 2%).</div>
                            <div class="sector-meta-links">
                                <a href="${fileUrl(categoryAssets['housewives_team'].catalog)}" target="_blank">📄 الكتالوج</a> • 
                                <a href="${fileUrl(categoryAssets['housewives_team'].pricelist)}" target="_blank">📊 قائمة الأسعار</a>
                            </div>
                        </label>

                        <label class="sector-choice-card" onclick="selectSector(this)">
                            <input type="radio" name="category" value="pharmacies">
                            <div class="sector-card-header">
                                <span class="sector-card-name">💊 الصيادلة والوكلاء</span>
                                <span class="sector-badge badge-exclusive">مناديل رونزا فقط</span>
                            </div>
                            <div class="sector-desc">حظر إرسال أي منتجات أخرى سوى مناديل رونزا الطبية والتجميلية.</div>
                            <div class="sector-meta-links">
                                <a href="${fileUrl(categoryAssets['pharmacies'].catalog)}" target="_blank">📄 الكتالوج</a> • 
                                <a href="${fileUrl(categoryAssets['pharmacies'].pricelist)}" target="_blank">📊 قائمة الوكلاء</a>
                            </div>
                        </label>

                        <label class="sector-choice-card" onclick="selectSector(this)">
                            <input type="radio" name="category" value="hotels">
                            <div class="sector-card-header">
                                <span class="sector-card-name">🏨 الفنادق والمطاعم</span>
                                <span class="sector-badge badge-exclusive">Private Label</span>
                            </div>
                            <div class="sector-desc">طباعة شعار الفندق على المناديل السنجل + معطرات جو وأرضيات وفوط تنشيف.</div>
                            <div class="sector-meta-links">
                                <a href="${fileUrl(categoryAssets['hotels'].catalog)}" target="_blank">📄 الكتالوج</a> • 
                                <a href="${fileUrl(categoryAssets['hotels'].pricelist)}" target="_blank">📊 قائمة التوريدات</a>
                            </div>
                        </label>

                        <label class="sector-choice-card" onclick="selectSector(this)">
                            <input type="radio" name="category" value="hypermarkets">
                            <div class="sector-card-header">
                                <span class="sector-card-name">🛒 الهايبرات وتجار الجملة</span>
                                <span class="sector-badge badge-standard">جملة موسعة</span>
                            </div>
                            <div class="sector-desc">مناديل رونزا ويونو، معطرات 460مل و1لتر، وفوط مطبخ رول قماش تركي.</div>
                            <div class="sector-meta-links">
                                <a href="${fileUrl(categoryAssets['hypermarkets'].catalog)}" target="_blank">📄 الكتالوج</a> • 
                                <a href="${fileUrl(categoryAssets['hypermarkets'].pricelist)}" target="_blank">📊 أسعار الجملة</a>
                            </div>
                        </label>

                        <label class="sector-choice-card" onclick="selectSector(this)">
                            <input type="radio" name="category" value="salons">
                            <div class="sector-card-header">
                                <span class="sector-card-name">💇 صالونات ومراكز التجميل</span>
                                <span class="sector-badge badge-standard">فوط ومعطرات</span>
                            </div>
                            <div class="sector-desc">فوط تنشيف مرة واحدة متعددة المقاسات ومعطرات فواحة ومزيل مكياج رونزا.</div>
                            <div class="sector-meta-links">
                                <a href="${fileUrl(categoryAssets['salons'].catalog)}" target="_blank">📄 الكتالوج</a> • 
                                <a href="${fileUrl(categoryAssets['salons'].pricelist)}" target="_blank">📊 أسعار الصالونات</a>
                            </div>
                        </label>

                        <label class="sector-choice-card" onclick="selectSector(this)">
                            <input type="radio" name="category" value="distribution">
                            <div class="sector-card-header">
                                <span class="sector-card-name">🚚 شركات التوزيع والمخازن</span>
                                <span class="sector-badge badge-standard">كميات كبرى</span>
                            </div>
                            <div class="sector-desc">عقود توزيع توريدات تجارية معتمدة وخطوط إنتاج بأسعار المصنع التنافسية.</div>
                            <div class="sector-meta-links">
                                <a href="${fileUrl(categoryAssets['distribution'].catalog)}" target="_blank">📄 الكتالوج</a> • 
                                <a href="${fileUrl(categoryAssets['distribution'].pricelist)}" target="_blank">📊 أسعار الموزعين</a>
                            </div>
                        </label>
                    </div>

                    <div class="form-row" style="margin-top: 15px;">
                        <div class="form-group">
                            <label class="form-label">3. عدد المستهدفين بالحملة:</label>
                            <input type="number" name="totalRecipients" class="form-control" value="30" min="1" max="500">
                        </div>
                    </div>

                    <button type="submit" class="btn-submit">
                        <span>إطلاق الحملة الموجهة الآن</span>
                        <span>⚡</span>
                    </button>
                </form>
            </div>
        </div>

        <!-- تبويب 2: محاكي الرد الذكي -->
        <div id="tab-chat" class="tab-pane">
            <div class="panel">
                <div class="panel-header">
                    <div>
                        <h3>🤖 محاكي الرد الآلي وتصنيف العملاء (24/7 AI Agent)</h3>
                        <p>اختبر رد الذكاء الاصطناعي، تصنيف الفئات، واحتساب الفواتير لحظياً كما يراها العميل</p>
                    </div>
                </div>

                <div class="chat-simulator-card">
                    <div class="chat-header">
                        <div class="chat-bot-info">
                            <span style="font-size: 22px;">🤖</span>
                            <div>
                                <b style="font-size: 14px;">وكيل الزمردة الذكي (Zomoroda AI)</b>
                                <div style="font-size: 11px; color: #a7f3d0;">متصل الآن • يخدم كافة القنوات 24/7</div>
                            </div>
                        </div>
                        <span style="font-size: 11.5px; background: rgba(255,255,255,0.15); padding: 4px 10px; border-radius: 12px;">المرحلة: <b id="chatStageBadge">NEW</b></span>
                    </div>

                    <div class="chat-body" id="chatStream">
                        <div class="chat-bubble bot">
                            مرحباً بك في شركة الزمردة كوزماتيكس! 💎
                            أنا مساعدك الذكي للتوريدات والعروض برعاية أ. عبداللطيف فراج.
                            تفضل باختيار استفسار أو كتابة رسالتك لتجربة التصنيف الفوري وإرسال الكتالوج المعتمد.
                            <div class="chat-bubble-meta">
                                <span>الزمردة AI</span>
                                <span>الآن</span>
                            </div>
                        </div>
                    </div>

                    <div class="prompt-chips">
                        <span class="prompt-chip" onclick="fillPrompt('عايزة اشتغل مندوبة مبيعات من البيت في الجيزة')">🌸 شغل مندوبات من البيت</span>
                        <span class="prompt-chip" onclick="fillPrompt('احنا صيدلية في الدقي ومحتاجين كرتونة مناديل رونزا')">💊 طلب صيدلية (رونزا فقط)</span>
                        <span class="prompt-chip" onclick="fillPrompt('فندق في الغردقة محتاجين مناديل سنجل خاصة بشعارنا ومعطرات')">🏨 فندق (Private Label)</span>
                        <span class="prompt-chip" onclick="fillPrompt('هايبر ماركت محتاجين أسعار وعروض كمية 50 مناديل يونو')">🛒 هايبر ماركت (طلب كمية)</span>
                        <span class="prompt-chip" onclick="fillPrompt('عايز اعرف اسعار الجملة للصالونات ومراكز التجميل')">💇 صالونات تجميل</span>
                    </div>

                    <form class="chat-input-bar" id="chatForm" onsubmit="sendSimulatedChat(event)">
                        <input type="text" id="chatSenderInput" value="Test_User_24" style="display:none;">
                        <input type="text" id="chatMsgInput" class="form-control" style="background: white;" placeholder="اكتب رسالة العميل للتجربة هنا..." required>
                        <button type="submit" class="btn-submit" style="padding: 10px 22px; font-size: 14px;">إرسال 💬</button>
                    </form>
                </div>
            </div>
        </div>

        <!-- تبويب 3: عروض الشهر -->
        <div id="tab-offers" class="tab-pane">
            <div class="panel">
                <div class="panel-header">
                    <div>
                        <h3>🎁 إدارة عروض الشهر والخصومات الموجهة</h3>
                        <p>تفعيل العروض الخاصة لقطاع معين أو لجميع الفئات وتحديث استجابة الذكاء الاصطناعي</p>
                    </div>
                </div>

                <form action="/api/offers/add" method="POST">
                    <div class="form-row">
                        <div class="form-group" style="flex: 2;">
                            <label class="form-label">عنوان العرض الترويجي:</label>
                            <input type="text" name="offerTitle" class="form-control" placeholder="مثال: خصم 10% بمناسبة عروض الشهر لكافة عملاء التوريدات" required>
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label class="form-label">الفئة المستهدفة بالعرض:</label>
                            <select name="category" class="form-control">
                                <option value="all">جميع الفئات والقطاعات</option>
                                <option value="housewives_team">قطاع المندوبات والمشرفات (الماميز)</option>
                                <option value="pharmacies">الصيدليات والوكلاء (رونزا فقط)</option>
                                <option value="hypermarkets">الهايبرات وتجار الجملة</option>
                                <option value="hotels">الفنادق والمطاعم والتوريدات</option>
                                <option value="salons">صالونات ومراكز التجميل</option>
                                <option value="distribution">شركات التوزيع والمخازن</option>
                            </select>
                        </div>
                    </div>
                    <button type="submit" class="btn-submit">حفظ وتفعيل عرض الشهر 📌</button>
                </form>

                <h4 style="margin: 24px 0 12px; font-weight: 800; color: var(--primary);">📋 العروض النشطة لشهر ${new Date().getMonth() + 1}/${new Date().getFullYear()}:</h4>
                <div class="offers-grid">
                    ${offersHtml}
                </div>
            </div>
        </div>

        <!-- تبويب 4: مصفوفة القطاعات والكتالوجات -->
        <div id="tab-matrix" class="tab-pane">
            <div class="panel">
                <div class="panel-header">
                    <div>
                        <h3>📦 مصفوفة القطاعات والكتالوجات والأسعار المعتمدة</h3>
                        <p>قواعد العزل التجاري الصارمة لشركة الزمردة كوزماتيكس (إدارة: أ. عبداللطيف فراج)</p>
                    </div>
                </div>

                <div class="sector-cards-grid" style="grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));">
                    <div class="sector-choice-card" style="cursor: default;">
                        <div class="sector-card-header">
                            <span class="sector-card-name">1. الصيدليات والوكلاء</span>
                            <span class="sector-badge badge-exclusive">مناديل رونزا فقط</span>
                        </div>
                        <p class="sector-desc">يُحظر منعاً باتاً إرسال منظفات أو منتجات أخرى. مناديل وايبس رونزا فقط لحماية هوامش الوكلاء.</p>
                        <div style="font-size: 13px; font-weight: 700; color: var(--slate-900); margin-bottom: 8px;">سعر الوحدة المرجعي: 110 ج.م</div>
                        <div class="sector-meta-links">
                            <a href="${fileUrl(categoryAssets['pharmacies'].catalog)}" target="_blank">📥 تحميل الكتالوج المعتمد (PDF)</a><br>
                            <a href="${fileUrl(categoryAssets['pharmacies'].pricelist)}" target="_blank">📊 تحميل ملف الأسعار الرسمي (Excel)</a>
                        </div>
                    </div>

                    <div class="sector-choice-card" style="cursor: default;">
                        <div class="sector-card-header">
                            <span class="sector-card-name">2. الهايبرات وتجار الجملة</span>
                            <span class="sector-badge badge-standard">عروض جملة</span>
                        </div>
                        <p class="sector-desc">مناديل مبللة رونزا ويونو، معطرات أرضيات وجو 460مل، ورول فوط مطبخ تركي فاخر.</p>
                        <div style="font-size: 13px; font-weight: 700; color: var(--slate-900); margin-bottom: 8px;">سعر الوحدة المرجعي: 95 ج.م</div>
                        <div class="sector-meta-links">
                            <a href="${fileUrl(categoryAssets['hypermarkets'].catalog)}" target="_blank">📥 تحميل الكتالوج المعتمد (PDF)</a><br>
                            <a href="${fileUrl(categoryAssets['hypermarkets'].pricelist)}" target="_blank">📊 تحميل ملف أسعار الهيبرات (Excel)</a>
                        </div>
                    </div>

                    <div class="sector-choice-card" style="cursor: default;">
                        <div class="sector-card-header">
                            <span class="sector-card-name">3. الفنادق والتوريدات الكبرى</span>
                            <span class="sector-badge badge-exclusive">خدمة Private Label</span>
                        </div>
                        <p class="sector-desc">طباعة شعار الفندق/المطعم على المناديل الفردية، معطرات فندقية، وفوط تنشيف استخدام مرة واحدة.</p>
                        <div style="font-size: 13px; font-weight: 700; color: var(--slate-900); margin-bottom: 8px;">سعر الوحدة المرجعي: 150 - 200 ج.م</div>
                        <div class="sector-meta-links">
                            <a href="${fileUrl(categoryAssets['hotels'].catalog)}" target="_blank">📥 كتالوج الفنادق والتوريدات (PDF)</a><br>
                            <a href="${fileUrl(categoryAssets['hotels'].pricelist)}" target="_blank">📊 قائمة أسعار التوريدات (PDF)</a>
                        </div>
                    </div>

                    <div class="sector-choice-card" style="cursor: default;">
                        <div class="sector-card-header">
                            <span class="sector-card-name">4. الصالونات ومراكز التجميل</span>
                            <span class="sector-badge badge-standard">فوط ومعطرات</span>
                        </div>
                        <p class="sector-desc">فوط تنشيف استخدام مرة واحدة ناعمة، معطرات فواحة، ومناديل مزيل مكياج رونزا حماية أكيدة.</p>
                        <div style="font-size: 13px; font-weight: 700; color: var(--slate-900); margin-bottom: 8px;">سعر الوحدة المرجعي: 120 ج.م</div>
                        <div class="sector-meta-links">
                            <a href="${fileUrl(categoryAssets['salons'].catalog)}" target="_blank">📥 كتالوج الصالونات (PDF)</a><br>
                            <a href="${fileUrl(categoryAssets['salons'].pricelist)}" target="_blank">📊 أسعار الصالونات (PDF)</a>
                        </div>
                    </div>

                    <div class="sector-choice-card" style="cursor: default;">
                        <div class="sector-card-header">
                            <span class="sector-card-name">5. شركات التوزيع والمخازن</span>
                            <span class="sector-badge badge-standard">عقود توريد</span>
                        </div>
                        <p class="sector-desc">كافة خطوط الإنتاج بكميات وشحنات كبرى لمحافظات القاهرة، الجيزة، وباقي الأقاليم.</p>
                        <div style="font-size: 13px; font-weight: 700; color: var(--slate-900); margin-bottom: 8px;">سعر الوحدة المرجعي: 85 ج.م</div>
                        <div class="sector-meta-links">
                            <a href="${fileUrl(categoryAssets['distribution'].catalog)}" target="_blank">📥 كتالوج التوزيع (PDF)</a><br>
                            <a href="${fileUrl(categoryAssets['distribution'].pricelist)}" target="_blank">📊 قائمة أسعار الموزعين (Excel)</a>
                        </div>
                    </div>

                    <div class="sector-choice-card" style="cursor: default;">
                        <div class="sector-card-header">
                            <span class="sector-card-name">6. قطاع المندوبات والماميز</span>
                            <span class="sector-badge badge-standard">شجرة العمولات</span>
                        </div>
                        <p class="sector-desc">أسعار المستهلك/القطاعي حصرياً مع نظام عمولة 5% للمندوبة المباشرة + 2% ترقية للمشرفة.</p>
                        <div style="font-size: 13px; font-weight: 700; color: var(--slate-900); margin-bottom: 8px;">نطاق: ${BUSINESS_IDENTITY.targetRegions}</div>
                        <div class="sector-meta-links">
                            <a href="${fileUrl(categoryAssets['housewives_team'].catalog)}" target="_blank">📥 كتالوج الجمهور الرسمي (PDF)</a><br>
                            <a href="${fileUrl(categoryAssets['housewives_team'].pricelist)}" target="_blank">📊 قائمة أسعار المستهلك (Excel)</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- تبويب 5: سجل وقرارات المدير العام -->
        <div id="tab-audit" class="tab-pane">
            <div class="panel">
                <div class="panel-header">
                    <div>
                        <h3>👔 سجل قرارات وتنبيهات المدير العام اللحظية</h3>
                        <p>توثيق مركزي لكافة إجراءات الإطلاق، استئناف الحملات، وحماية المنظومة</p>
                    </div>
                </div>

                <div class="timeline-stream">
                    ${logsHtml}
                </div>
            </div>
        </div>

    </main>

    <!-- 4. تذييل الصفحة -->
    <footer class="app-footer">
        <p>جميع الحقوق محفوظة © ${new Date().getFullYear()} • <b>${BUSINESS_IDENTITY.name}</b></p>
        <p style="font-size: 11.5px; margin-top: 4px; color: #64748b;">إدارة: ${BUSINESS_IDENTITY.ownerName} | نطاق التوزيع: ${BUSINESS_IDENTITY.targetRegions} | منظومة AI المتكاملة</p>
    </footer>

    <script>
        function switchTab(tabId) {
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
            
            const targetBtn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.getAttribute('onclick').includes(tabId));
            if (targetBtn) targetBtn.classList.add('active');
            
            const targetPane = document.getElementById(tabId);
            if (targetPane) targetPane.classList.add('active');
        }

        function selectPlatform(label) {
            document.querySelectorAll('.platform-choice').forEach(el => el.classList.remove('selected'));
            label.classList.add('selected');
            const radio = label.querySelector('input[type="radio"]');
            if (radio) radio.checked = true;
        }

        function selectSector(label) {
            document.querySelectorAll('.sector-choice-card').forEach(el => el.classList.remove('selected'));
            label.classList.add('selected');
            const radio = label.querySelector('input[type="radio"]');
            if (radio) radio.checked = true;
        }

        function fillPrompt(text) {
            document.getElementById('chatMsgInput').value = text;
            document.getElementById('chatMsgInput').focus();
        }

        async function sendSimulatedChat(e) {
            e.preventDefault();
            const msgInput = document.getElementById('chatMsgInput');
            const senderInput = document.getElementById('chatSenderInput');
            const stream = document.getElementById('chatStream');
            const stageBadge = document.getElementById('chatStageBadge');
            
            const userMsg = msgInput.value.trim();
            if (!userMsg) return;

            // إظهار رسالة المستخدم
            const userBubble = document.createElement('div');
            userBubble.className = 'chat-bubble user';
            userBubble.innerHTML = userMsg + '<div class="chat-bubble-meta"><span>أنت</span><span>الآن</span></div>';
            stream.appendChild(userBubble);
            msgInput.value = '';
            stream.scrollTop = stream.scrollHeight;

            // إظهار فقاعة جاري التفكير
            const typingBubble = document.createElement('div');
            typingBubble.className = 'chat-bubble bot';
            typingBubble.id = 'typingIndicator';
            typingBubble.innerHTML = 'جاري المعالجة والتصنيف الذكي... ⏳';
            stream.appendChild(typingBubble);
            stream.scrollTop = stream.scrollHeight;

            try {
                const response = await fetch('/api/support/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        senderId: senderInput.value,
                        message: userMsg
                    })
                });
                const data = await response.json();
                
                const typing = document.getElementById('typingIndicator');
                if (typing) typing.remove();

                const botBubble = document.createElement('div');
                botBubble.className = 'chat-bubble bot';
                
                // تحويل الروابط إلى روابط قابلة للنقر
                let formattedReply = (data.reply || '')
                    .replace(/(https?:\\/\\/[^\\s]+)/g, '<a href="$1" target="_blank" style="color: #0284c7; font-weight: bold;">$1</a>');

                botBubble.innerHTML = formattedReply + '<div class="chat-bubble-meta"><span>الزمردة AI</span><span>' + (data.stage ? 'مرحلة: ' + data.stage : 'رد فوري') + '</span></div>';
                stream.appendChild(botBubble);
                
                if (data.stage) {
                    stageBadge.textContent = data.stage;
                }
            } catch (err) {
                const typing = document.getElementById('typingIndicator');
                if (typing) typing.remove();

                const errBubble = document.createElement('div');
                errBubble.className = 'chat-bubble bot';
                errBubble.innerHTML = '⚠️ حدث خطأ في الاتصال بالسيرفر. يرجى المحاولة مرة أخرى.';
                stream.appendChild(errBubble);
            }
            stream.scrollTop = stream.scrollHeight;
        }
    </script>
</body>
</html>
    `;
}

module.exports = { getDashboardHtml };
