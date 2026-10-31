// views/store.js - واجهة المتجر الإلكتروني لشركة الزمردة كوزماتيكس
function getStoreHtml(products, categories, activeCategory) {
    const categoryLabels = {
        'all': { emoji: '🛍️', name: 'الكل' },
        'offers': { emoji: '🎁', name: 'العروض الخاصة' },
        'baby': { emoji: '👶', name: 'مناديل الأطفال والعائلة' },
        'pocket': { emoji: '🧳', name: 'مناديل الجيب والفوط' },
        'care': { emoji: '🛡️', name: 'العناية والحماية' },
        'home': { emoji: '🏠', name: 'المنزل والمعطرات' },
        'tools': { emoji: '🧹', name: 'أدوات التنظيف' }
    };

    const categoryIcons = {
        'offers': '🎁',
        'baby': '👶',
        'pocket': '🧳',
        'care': '🛡️',
        'home': '🏠',
        'tools': '🧹'
    };

    const productsJson = JSON.stringify(products);

    const productCardsHtml = products.map(p => {
        const icon = categoryIcons[p.category] || '📦';
        const brandClass = p.brand === 'رونزا' ? 'brand-ronza' : 'brand-noi';
        const brandLabel = p.brand === 'رونزا' ? 'رونزا' : 'ونوي';
        const variantsHtml = (p.variants && p.variants.length > 0) 
            ? `<div class="product-variants">${p.variants.map(v => `<span class="variant-chip">${v}</span>`).join('')}</div>` 
            : '';
        return `
            <div class="product-card" data-category="${p.category}" data-name="${p.name}" data-id="${p.id}">
                <div class="product-image-area">
                    <span class="product-icon">${icon}</span>
                    <span class="brand-badge ${brandClass}">${brandLabel}</span>
                </div>
                <div class="product-info">
                    <h3 class="product-name">${p.name}</h3>
                    ${variantsHtml}
                    <div class="product-meta">
                        <span class="product-unit">الوحدة: ${p.unit}</span>
                        <span class="product-carton">الكرتونة: ${p.carton} قطعة</span>
                    </div>
                    <div class="product-bottom">
                        <div class="product-price">${p.price} <span class="currency">ج.م</span></div>
                        <button class="btn-add-cart" onclick="addToCart('${p.id}')">أضف للسلة 🛒</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    const categoryPillsHtml = Object.entries(categoryLabels).map(([key, val]) => {
        const isActive = (activeCategory || 'all') === key ? 'active' : '';
        return `<button class="category-pill ${isActive}" onclick="filterCategory('${key}')" data-cat="${key}">${val.emoji} ${val.name}</button>`;
    }).join('');

    return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>متجر الزمردة كوزماتيكس | مناديل مبللة، معطرات، فوط تنشيف</title>
    <meta name="description" content="تسوق منتجات الزمردة كوزماتيكس بأسعار القطاعي للجمهور - مناديل مبللة رونزا وونوي، معطرات جو وأرضيات، وفوط مطبخ وتنظيف.">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #064e3b;
            --primary-dark: #022c22;
            --primary-light: #047857;
            --emerald-500: #10b981;
            --emerald-400: #34d399;
            --emerald-100: #d1fae5;
            --emerald-50: #ecfdf5;
            --gold: #d97706;
            --gold-light: #fef3c7;
            --bg: #f8fafc;
            --slate-900: #0f172a;
            --slate-800: #1e293b;
            --slate-600: #475569;
            --slate-400: #94a3b8;
            --slate-100: #f1f5f9;
            --border: #e2e8f0;
            --shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
            --shadow-lg: 0 10px 30px rgba(0, 0, 0, 0.1);
            --radius: 16px;
            --radius-md: 12px;
            --radius-sm: 8px;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Cairo', sans-serif;
            background: var(--bg);
            color: var(--slate-900);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            line-height: 1.6;
        }

        /* ===== NAVBAR ===== */
        .store-navbar {
            background: linear-gradient(135deg, var(--primary-dark) 0%, var(--primary) 60%, #065f46 100%);
            color: white;
            padding: 0 20px;
            position: sticky;
            top: 0;
            z-index: 100;
            box-shadow: 0 4px 20px rgba(6, 78, 59, 0.3);
        }
        .navbar-inner {
            max-width: 1280px;
            margin: 0 auto;
            display: flex;
            align-items: center;
            justify-content: space-between;
            height: 68px;
        }
        .nav-brand {
            display: flex;
            align-items: center;
            gap: 12px;
            text-decoration: none;
            color: white;
        }
        .nav-brand-icon {
            width: 44px;
            height: 44px;
            background: linear-gradient(135deg, #10b981, #059669);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            box-shadow: 0 0 15px rgba(16, 185, 129, 0.4);
        }
        .nav-brand-text {
            font-size: 20px;
            font-weight: 800;
        }
        .nav-links {
            display: flex;
            align-items: center;
            gap: 24px;
        }
        .nav-links a {
            color: #d1fae5;
            text-decoration: none;
            font-size: 14px;
            font-weight: 600;
            transition: color 0.2s;
        }
        .nav-links a:hover { color: white; }
        .nav-cart-btn {
            background: rgba(255,255,255,0.12);
            border: 1px solid rgba(255,255,255,0.2);
            color: white;
            padding: 8px 16px;
            border-radius: 24px;
            cursor: pointer;
            font-family: 'Cairo', sans-serif;
            font-size: 14px;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s;
            position: relative;
        }
        .nav-cart-btn:hover {
            background: rgba(255,255,255,0.2);
        }
        .cart-badge {
            background: var(--gold);
            color: white;
            width: 22px;
            height: 22px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: 800;
            position: absolute;
            top: -6px;
            left: -6px;
        }
        .cart-badge.hidden { display: none; }

        /* ===== HERO ===== */
        .hero {
            background: linear-gradient(135deg, var(--primary-dark) 0%, var(--primary) 40%, #065f46 80%, #047857 100%);
            color: white;
            padding: 60px 20px;
            text-align: center;
            position: relative;
            overflow: hidden;
        }
        .hero::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -20%;
            width: 600px;
            height: 600px;
            background: radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%);
            border-radius: 50%;
        }
        .hero::after {
            content: '';
            position: absolute;
            bottom: -30%;
            left: -10%;
            width: 400px;
            height: 400px;
            background: radial-gradient(circle, rgba(217,119,6,0.1) 0%, transparent 70%);
            border-radius: 50%;
        }
        .hero-content {
            position: relative;
            z-index: 1;
            max-width: 700px;
            margin: 0 auto;
        }
        .hero h1 {
            font-size: 38px;
            font-weight: 900;
            margin-bottom: 16px;
            line-height: 1.3;
        }
        .hero p {
            font-size: 18px;
            color: #a7f3d0;
            margin-bottom: 28px;
            font-weight: 500;
        }
        .hero-cta {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: var(--gold);
            color: white;
            padding: 14px 36px;
            border-radius: 30px;
            font-size: 16px;
            font-weight: 800;
            text-decoration: none;
            transition: all 0.3s;
            box-shadow: 0 4px 20px rgba(217,119,6,0.4);
            border: none;
            cursor: pointer;
            font-family: 'Cairo', sans-serif;
        }
        .hero-cta:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 30px rgba(217,119,6,0.5);
            background: #b45309;
        }

        /* ===== CATEGORY FILTER ===== */
        .category-bar {
            background: white;
            border-bottom: 1px solid var(--border);
            padding: 16px 20px;
            position: sticky;
            top: 68px;
            z-index: 90;
            box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        .category-bar-inner {
            max-width: 1280px;
            margin: 0 auto;
            display: flex;
            gap: 10px;
            overflow-x: auto;
            scrollbar-width: none;
            padding-bottom: 4px;
        }
        .category-bar-inner::-webkit-scrollbar { display: none; }
        .category-pill {
            flex-shrink: 0;
            padding: 10px 20px;
            border-radius: 24px;
            border: 2px solid var(--border);
            background: white;
            color: var(--slate-600);
            font-family: 'Cairo', sans-serif;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s;
            white-space: nowrap;
        }
        .category-pill:hover {
            border-color: var(--emerald-500);
            color: var(--primary);
            background: var(--emerald-50);
        }
        .category-pill.active {
            background: var(--primary);
            color: white;
            border-color: var(--primary);
        }

        /* ===== SEARCH ===== */
        .search-section {
            max-width: 1280px;
            margin: 24px auto 0;
            padding: 0 20px;
        }
        .search-box {
            position: relative;
            max-width: 500px;
        }
        .search-box input {
            width: 100%;
            padding: 14px 48px 14px 16px;
            border: 2px solid var(--border);
            border-radius: var(--radius-md);
            font-family: 'Cairo', sans-serif;
            font-size: 15px;
            background: white;
            color: var(--slate-900);
            transition: all 0.2s;
        }
        .search-box input:focus {
            outline: none;
            border-color: var(--emerald-500);
            box-shadow: 0 0 0 4px rgba(16,185,129,0.12);
        }
        .search-box input::placeholder { color: var(--slate-400); }
        .search-icon {
            position: absolute;
            right: 16px;
            top: 50%;
            transform: translateY(-50%);
            font-size: 20px;
            pointer-events: none;
        }

        /* ===== PRODUCT GRID ===== */
        .products-section {
            max-width: 1280px;
            margin: 24px auto;
            padding: 0 20px 40px;
        }
        .products-count {
            font-size: 14px;
            color: var(--slate-600);
            font-weight: 600;
            margin-bottom: 16px;
        }
        .products-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
        }
        .product-card {
            background: white;
            border-radius: var(--radius);
            overflow: hidden;
            border: 1px solid var(--border);
            box-shadow: var(--shadow);
            transition: all 0.3s;
            display: flex;
            flex-direction: column;
        }
        .product-card:hover {
            transform: translateY(-4px);
            box-shadow: var(--shadow-lg);
            border-color: var(--emerald-400);
        }
        .product-image-area {
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            height: 180px;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
        }
        .product-icon {
            font-size: 64px;
            opacity: 0.7;
        }
        .brand-badge {
            position: absolute;
            top: 12px;
            left: 12px;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 800;
        }
        .brand-ronza {
            background: #d1fae5;
            color: #065f46;
            border: 1px solid #a7f3d0;
        }
        .brand-noi {
            background: #ede9fe;
            color: #5b21b6;
            border: 1px solid #c4b5fd;
        }
        .product-info {
            padding: 18px;
            display: flex;
            flex-direction: column;
            flex: 1;
        }
        .product-name {
            font-size: 15px;
            font-weight: 800;
            color: var(--slate-900);
            line-height: 1.5;
            margin-bottom: 8px;
        }
        .product-variants {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin-bottom: 10px;
        }
        .variant-chip {
            background: var(--slate-100);
            color: var(--slate-600);
            padding: 3px 10px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
        }
        .product-meta {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            color: var(--slate-400);
            font-weight: 600;
            margin-bottom: 14px;
            margin-top: auto;
        }
        .product-bottom {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
        }
        .product-price {
            font-size: 22px;
            font-weight: 900;
            color: var(--primary);
        }
        .product-price .currency {
            font-size: 14px;
            font-weight: 700;
            color: var(--slate-600);
        }
        .btn-add-cart {
            background: linear-gradient(135deg, #059669, #047857);
            color: white;
            border: none;
            padding: 10px 18px;
            border-radius: var(--radius-sm);
            font-family: 'Cairo', sans-serif;
            font-size: 13px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 2px 8px rgba(5,150,105,0.3);
            white-space: nowrap;
        }
        .btn-add-cart:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 14px rgba(5,150,105,0.4);
        }
        .btn-add-cart:active {
            transform: scale(0.96);
        }

        /* ===== CART DRAWER ===== */
        .cart-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.45);
            z-index: 999;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s;
        }
        .cart-overlay.open {
            opacity: 1;
            visibility: visible;
        }
        .cart-drawer {
            position: fixed;
            top: 0;
            right: -420px;
            width: 400px;
            max-width: 90vw;
            height: 100vh;
            background: white;
            z-index: 1000;
            box-shadow: -5px 0 30px rgba(0,0,0,0.15);
            display: flex;
            flex-direction: column;
            transition: right 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .cart-drawer.open {
            right: 0;
        }
        .cart-drawer-header {
            background: var(--primary);
            color: white;
            padding: 20px 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-shrink: 0;
        }
        .cart-drawer-header h2 {
            font-size: 18px;
            font-weight: 800;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .cart-close-btn {
            background: rgba(255,255,255,0.15);
            border: none;
            color: white;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            font-size: 18px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s;
        }
        .cart-close-btn:hover { background: rgba(255,255,255,0.25); }
        .cart-items-list {
            flex: 1;
            overflow-y: auto;
            padding: 16px 20px;
        }
        .cart-empty {
            text-align: center;
            padding: 60px 20px;
            color: var(--slate-400);
        }
        .cart-empty-icon { font-size: 56px; margin-bottom: 16px; }
        .cart-empty p { font-size: 15px; font-weight: 600; }
        .cart-item {
            display: flex;
            align-items: center;
            gap: 14px;
            padding: 14px 0;
            border-bottom: 1px solid var(--border);
        }
        .cart-item-icon {
            width: 52px;
            height: 52px;
            border-radius: var(--radius-sm);
            background: var(--slate-100);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 26px;
            flex-shrink: 0;
        }
        .cart-item-details { flex: 1; }
        .cart-item-name {
            font-size: 13px;
            font-weight: 700;
            color: var(--slate-900);
            line-height: 1.4;
        }
        .cart-item-price {
            font-size: 14px;
            font-weight: 800;
            color: var(--primary);
            margin-top: 2px;
        }
        .cart-qty-controls {
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .cart-qty-btn {
            width: 30px;
            height: 30px;
            border-radius: 50%;
            border: 2px solid var(--border);
            background: white;
            color: var(--slate-600);
            font-size: 16px;
            font-weight: 800;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
            font-family: 'Cairo', sans-serif;
        }
        .cart-qty-btn:hover {
            border-color: var(--emerald-500);
            color: var(--primary);
            background: var(--emerald-50);
        }
        .cart-qty-btn.remove:hover {
            border-color: #ef4444;
            color: #ef4444;
            background: #fef2f2;
        }
        .cart-qty-value {
            font-size: 16px;
            font-weight: 800;
            color: var(--slate-900);
            min-width: 28px;
            text-align: center;
        }
        .cart-footer {
            border-top: 2px solid var(--border);
            padding: 20px 24px;
            flex-shrink: 0;
            background: #fafafa;
        }
        .cart-total-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
        }
        .cart-total-label {
            font-size: 16px;
            font-weight: 700;
            color: var(--slate-600);
        }
        .cart-total-value {
            font-size: 24px;
            font-weight: 900;
            color: var(--primary);
        }
        .cart-total-value .currency { font-size: 14px; color: var(--slate-600); }
        .btn-checkout {
            width: 100%;
            padding: 14px;
            background: linear-gradient(135deg, var(--gold), #b45309);
            color: white;
            border: none;
            border-radius: var(--radius-md);
            font-family: 'Cairo', sans-serif;
            font-size: 16px;
            font-weight: 800;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 4px 14px rgba(217,119,6,0.3);
        }
        .btn-checkout:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(217,119,6,0.4);
        }
        .btn-checkout:disabled {
            background: var(--slate-400);
            cursor: not-allowed;
            box-shadow: none;
            transform: none;
        }

        /* Toast notification */
        .toast {
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%) translateY(100px);
            background: var(--primary);
            color: white;
            padding: 14px 28px;
            border-radius: 30px;
            font-family: 'Cairo', sans-serif;
            font-size: 14px;
            font-weight: 700;
            box-shadow: 0 8px 30px rgba(6,78,59,0.3);
            z-index: 2000;
            opacity: 0;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            pointer-events: none;
        }
        .toast.show {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }

        /* ===== FOOTER ===== */
        .store-footer {
            background: var(--slate-900);
            color: #94a3b8;
            padding: 40px 20px;
            margin-top: auto;
        }
        .footer-inner {
            max-width: 1280px;
            margin: 0 auto;
            display: grid;
            grid-template-columns: 2fr 1fr 1fr;
            gap: 40px;
        }
        .footer-brand h3 {
            color: white;
            font-size: 20px;
            font-weight: 800;
            margin-bottom: 12px;
        }
        .footer-brand p {
            font-size: 13px;
            line-height: 1.7;
        }
        .footer-col h4 {
            color: white;
            font-size: 15px;
            font-weight: 800;
            margin-bottom: 14px;
        }
        .footer-col a {
            display: block;
            color: #94a3b8;
            text-decoration: none;
            font-size: 13px;
            font-weight: 600;
            padding: 4px 0;
            transition: color 0.2s;
        }
        .footer-col a:hover { color: var(--emerald-400); }
        .footer-bottom {
            max-width: 1280px;
            margin: 24px auto 0;
            padding-top: 20px;
            border-top: 1px solid rgba(255,255,255,0.08);
            text-align: center;
            font-size: 12px;
        }
        .footer-bottom b { color: white; }
        .whatsapp-float-link {
            color: #25d366;
            text-decoration: none;
            font-weight: 700;
        }
        .whatsapp-float-link:hover { text-decoration: underline; }

        /* ===== NO RESULTS ===== */
        .no-results {
            text-align: center;
            padding: 60px 20px;
            color: var(--slate-400);
            display: none;
        }
        .no-results-icon { font-size: 56px; margin-bottom: 12px; }
        .no-results p { font-size: 16px; font-weight: 600; }

        /* ===== RESPONSIVE ===== */
        @media (max-width: 1024px) {
            .products-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 768px) {
            .hero h1 { font-size: 28px; }
            .hero p { font-size: 15px; }
            .hero { padding: 40px 20px; }
            .nav-links a.nav-link-text { display: none; }
            .nav-brand-text { font-size: 17px; }
            .footer-inner { grid-template-columns: 1fr; gap: 24px; }
        }
        @media (max-width: 600px) {
            .products-grid { grid-template-columns: 1fr; }
            .product-image-area { height: 150px; }
            .navbar-inner { height: 58px; }
        }
    </style>
</head>
<body>

    <!-- NAVBAR -->
    <nav class="store-navbar">
        <div class="navbar-inner">
            <a href="/store" class="nav-brand">
                <div class="nav-brand-icon">💎</div>
                <span class="nav-brand-text">الزمردة كوزماتيكس</span>
            </a>
            <div class="nav-links">
                <a href="/store" class="nav-link-text">الرئيسية</a>
                <a href="#products-section" class="nav-link-text">المنتجات</a>
                <a href="https://wa.me/201010997511" target="_blank" class="nav-link-text">تواصل معنا</a>
                <button class="nav-cart-btn" onclick="toggleCart()">
                    🛒 السلة
                    <span class="cart-badge hidden" id="cartBadge">0</span>
                </button>
            </div>
        </div>
    </nav>

    <!-- HERO -->
    <section class="hero">
        <div class="hero-content">
            <h1>منتجات الزمردة كوزماتيكس</h1>
            <p>مناديل مبللة، معطرات، وفوط تنشيف — أسعار قطاعي للجمهور</p>
            <a href="#products-section" class="hero-cta">تصفح المنتجات ⬇️</a>
        </div>
    </section>

    <!-- CATEGORY FILTER -->
    <div class="category-bar">
        <div class="category-bar-inner">
            ${categoryPillsHtml}
        </div>
    </div>

    <!-- SEARCH -->
    <div class="search-section">
        <div class="search-box">
            <span class="search-icon">🔍</span>
            <input type="text" id="searchInput" placeholder="ابحث عن منتج..." oninput="searchProducts()">
        </div>
    </div>

    <!-- PRODUCTS -->
    <section class="products-section" id="products-section">
        <div class="products-count" id="productsCount">عرض ${products.length} منتج</div>
        <div class="products-grid" id="productsGrid">
            ${productCardsHtml}
        </div>
        <div class="no-results" id="noResults">
            <div class="no-results-icon">🔍</div>
            <p>لم يتم العثور على منتجات مطابقة</p>
        </div>
    </section>

    <!-- CART OVERLAY -->
    <div class="cart-overlay" id="cartOverlay" onclick="toggleCart()"></div>

    <!-- CART DRAWER -->
    <div class="cart-drawer" id="cartDrawer">
        <div class="cart-drawer-header">
            <h2>🛒 سلة المشتريات</h2>
            <button class="cart-close-btn" onclick="toggleCart()">✕</button>
        </div>
        <div class="cart-items-list" id="cartItemsList">
            <div class="cart-empty" id="cartEmpty">
                <div class="cart-empty-icon">🛒</div>
                <p>السلة فارغة</p>
            </div>
        </div>
        <div class="cart-footer">
            <div class="cart-total-row">
                <span class="cart-total-label">الإجمالي:</span>
                <span class="cart-total-value" id="cartTotal">0 <span class="currency">ج.م</span></span>
            </div>
            <button class="btn-checkout" id="checkoutBtn" onclick="goToCheckout()" disabled>إتمام الطلب 📦</button>
        </div>
    </div>

    <!-- TOAST -->
    <div class="toast" id="toast"></div>

    <!-- FOOTER -->
    <footer class="store-footer">
        <div class="footer-inner">
            <div class="footer-brand">
                <h3>💎 الزمردة كوزماتيكس</h3>
                <p>تسوق منتجات الزمردة كوزماتيكس بأسعار القطاعي للجمهور، من مناديل رونزا وونوي إلى المعطرات وفوط التنشيف ومستلزمات النظافة.</p>
            </div>
            <div class="footer-col">
                <h4>روابط سريعة</h4>
                <a href="/store">🏠 الرئيسية</a>
                <a href="#products-section">🛍️ المنتجات</a>
                <a href="/store/checkout">📦 إتمام الطلب</a>
            </div>
            <div class="footer-col">
                <h4>تواصل معنا</h4>
                <a href="https://wa.me/201010997511" target="_blank" class="whatsapp-float-link">💬 واتساب: 01010997511</a>
                <a href="mailto:a.farag@beautyhealtheg.com">✉️ البريد الإلكتروني</a>
                <a href="https://www.facebook.com/profile.php?id=100090392977665" target="_blank">🌐 فيسبوك</a>
            </div>
        </div>
        <div class="footer-bottom">
            <p>جميع الحقوق محفوظة © ${new Date().getFullYear()} • <b>شركة الزمردة كوزماتيكس</b> • إدارة: عبداللطيف فراج</p>
        </div>
    </footer>

    <script>
        // ===== PRODUCTS DATA =====
        const allProducts = ${productsJson};
        const categoryIcons = {
            'offers': '🎁', 'baby': '👶', 'pocket': '🧳',
            'care': '🛡️', 'home': '🏠', 'tools': '🧹'
        };

        // ===== CART STATE =====
        let cart = JSON.parse(localStorage.getItem('zmr_cart') || '[]');

        function saveCart() {
            localStorage.setItem('zmr_cart', JSON.stringify(cart));
            updateCartUI();
        }

        function addToCart(productId) {
            const product = allProducts.find(p => p.id === productId);
            if (!product) return;
            const existing = cart.find(item => item.id === productId);
            if (existing) {
                existing.qty += 1;
            } else {
                cart.push({
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    unit: product.unit,
                    brand: product.brand,
                    category: product.category,
                    qty: 1
                });
            }
            saveCart();
            showToast('تمت الإضافة للسلة ✅');
        }

        function updateQty(productId, delta) {
            const item = cart.find(i => i.id === productId);
            if (!item) return;
            item.qty += delta;
            if (item.qty <= 0) {
                cart = cart.filter(i => i.id !== productId);
            }
            saveCart();
        }

        function updateCartUI() {
            const badge = document.getElementById('cartBadge');
            const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
            const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

            if (totalItems > 0) {
                badge.textContent = totalItems;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }

            const listEl = document.getElementById('cartItemsList');
            const emptyEl = document.getElementById('cartEmpty');
            const checkoutBtn = document.getElementById('checkoutBtn');

            if (cart.length === 0) {
                listEl.innerHTML = '<div class="cart-empty" id="cartEmpty"><div class="cart-empty-icon">🛒</div><p>السلة فارغة</p></div>';
                checkoutBtn.disabled = true;
            } else {
                checkoutBtn.disabled = false;
                listEl.innerHTML = cart.map(item => {
                    const icon = categoryIcons[item.category] || '📦';
                    return '<div class="cart-item">' +
                        '<div class="cart-item-icon">' + icon + '</div>' +
                        '<div class="cart-item-details">' +
                            '<div class="cart-item-name">' + item.name + '</div>' +
                            '<div class="cart-item-price">' + (item.price * item.qty).toFixed(2) + ' ج.م</div>' +
                        '</div>' +
                        '<div class="cart-qty-controls">' +
                            '<button class="cart-qty-btn" onclick="updateQty(\\''+item.id+'\\', 1)">+</button>' +
                            '<span class="cart-qty-value">' + item.qty + '</span>' +
                            '<button class="cart-qty-btn remove" onclick="updateQty(\\''+item.id+'\\', -1)">−</button>' +
                        '</div>' +
                    '</div>';
                }).join('');
            }

            document.getElementById('cartTotal').innerHTML = totalPrice.toFixed(2) + ' <span class="currency">ج.م</span>';
        }

        function toggleCart() {
            const drawer = document.getElementById('cartDrawer');
            const overlay = document.getElementById('cartOverlay');
            drawer.classList.toggle('open');
            overlay.classList.toggle('open');
            document.body.style.overflow = drawer.classList.contains('open') ? 'hidden' : '';
        }

        function goToCheckout() {
            if (cart.length === 0) return;
            window.location.href = '/store/checkout';
        }

        // ===== SEARCH =====
        function searchProducts() {
            const query = document.getElementById('searchInput').value.trim().toLowerCase();
            const cards = document.querySelectorAll('.product-card');
            let shown = 0;
            cards.forEach(card => {
                const name = card.getAttribute('data-name').toLowerCase();
                const matchSearch = !query || name.includes(query);
                const activeCat = document.querySelector('.category-pill.active');
                const cat = activeCat ? activeCat.getAttribute('data-cat') : 'all';
                const matchCat = cat === 'all' || card.getAttribute('data-category') === cat;
                if (matchSearch && matchCat) {
                    card.style.display = '';
                    shown++;
                } else {
                    card.style.display = 'none';
                }
            });
            document.getElementById('productsCount').textContent = 'عرض ' + shown + ' منتج';
            document.getElementById('noResults').style.display = shown === 0 ? 'block' : 'none';
        }

        // ===== CATEGORY FILTER =====
        function filterCategory(cat) {
            document.querySelectorAll('.category-pill').forEach(p => p.classList.remove('active'));
            const btn = document.querySelector('.category-pill[data-cat="'+cat+'"]');
            if (btn) btn.classList.add('active');
            searchProducts();
        }

        // ===== TOAST =====
        function showToast(msg) {
            const toast = document.getElementById('toast');
            toast.textContent = msg;
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 2000);
        }

        // Init
        updateCartUI();
    </script>
</body>
</html>
    `;
}

module.exports = { getStoreHtml };
