function getStoreProductHtml(product, category) {
    const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[character]);
    const name = escapeHtml(product.name);
    const image = product.image_url
        ? `<img class="product-image" src="${escapeHtml(product.image_url)}" alt="${name}">`
        : '<span class="product-placeholder" aria-hidden="true">📦</span>';
    const hasVariants = Array.isArray(product.variants) && product.variants.length > 0;
    const description = product.desc || product.description;
    const descriptionHtml = description
        ? `<section class="detail-block"><h2>تفاصيل المنتج</h2><p>${escapeHtml(description)}</p></section>`
        : '';
    const categoryName = category?.name || 'منتجات الزمردة';

    return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${name} | متجر الزمردة</title>
    <meta name="description" content="${escapeHtml((description || name) + ' - ' + categoryName + '، بسعر ' + Number(product.price).toFixed(2) + ' جنيه مصري.') }">
    <link rel="icon" type="image/png" href="/assets/zomoroda-store-logo.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; }
        body { margin: 0; min-height: 100vh; display: flex; flex-direction: column; background: #f8fafc; color: #0f172a; font-family: 'Cairo', sans-serif; }
        header { padding: 14px 20px; color: white; background: linear-gradient(135deg, #022c22, #047857); }
        nav, main { width: min(1080px, calc(100% - 32px)); margin: auto; }
        nav { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
        .brand { display: flex; align-items: center; gap: 10px; color: inherit; text-decoration: none; font-weight: 800; }
        .brand img { width: 76px; height: 54px; object-fit: contain; background: white; border-radius: 9px; }
        nav a:last-child { color: #d1fae5; }
        main { flex: 1; padding: 28px 0 52px; }
        .breadcrumbs { margin-bottom: 18px; color: #64748b; font-size: 14px; }
        .breadcrumbs a { color: #047857; text-decoration: none; }
        .product { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 32px; align-items: start; padding: 26px; border: 1px solid #e2e8f0; border-radius: 18px; background: white; box-shadow: 0 10px 28px #0f172a0d; }
        .image-frame { min-height: 340px; display: grid; place-items: center; overflow: hidden; border-radius: 14px; background: #f1f5f9; }
        .product-image { width: 100%; height: 340px; object-fit: contain; padding: 20px; }
        .product-placeholder { font-size: 100px; }
        .eyebrow { color: #047857; font-weight: 800; }
        h1 { margin: 8px 0; color: #064e3b; font-size: clamp(24px, 4vw, 36px); }
        .brand-label { color: #64748b; }
        .price { margin: 22px 0; color: #047857; font-size: 30px; font-weight: 800; }
        .price small { font-size: 16px; }
        .meta { display: flex; flex-wrap: wrap; gap: 10px; margin: 16px 0; }
        .meta span, .variants li { padding: 6px 12px; border-radius: 20px; background: #ecfdf5; color: #065f46; font-size: 14px; }
        .detail-block { margin-top: 20px; padding-top: 16px; border-top: 1px solid #e2e8f0; }
        .detail-block h2 { margin: 0 0 8px; color: #064e3b; font-size: 18px; }
        .detail-block p { line-height: 1.8; white-space: pre-line; }
        .variants { display: flex; flex-wrap: wrap; gap: 8px; margin: 0; padding: 0; list-style: none; }
        .actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 24px; }
        button, .back { display: inline-flex; align-items: center; justify-content: center; min-height: 46px; padding: 10px 20px; border: 0; border-radius: 10px; font: inherit; font-weight: 800; text-decoration: none; cursor: pointer; }
        button { background: #047857; color: white; }
        .back { background: #ecfdf5; color: #065f46; }
        #notice { min-height: 24px; margin-top: 10px; color: #065f46; }
        footer { padding: 18px; text-align: center; color: #64748b; }
        @media (max-width: 720px) { .product { grid-template-columns: 1fr; gap: 22px; padding: 18px; } .image-frame { min-height: 250px; } .product-image { height: 280px; } }
    </style>
</head>
<body>
    <header><nav>
        <a class="brand" href="/store"><img src="/assets/zomoroda-store-logo.png" alt="شعار متجر الزمردة"><span>متجر الزمردة</span></a>
        <a href="/store">العودة إلى المنتجات</a>
    </nav></header>
    <main>
        <div class="breadcrumbs"><a href="/store">الرئيسية</a> / ${escapeHtml(categoryName)} / ${name}</div>
        <article class="product">
            <div class="image-frame">${image}</div>
            <div>
                <div class="eyebrow">${escapeHtml(categoryName)}</div>
                <h1>${name}</h1>
                <div class="brand-label">${escapeHtml(product.brand || 'الزمردة كوزماتيكس')}</div>
                <div class="price">${Number(product.price).toFixed(2)} <small>ج.م</small></div>
                <div class="meta">
                    <span>الوحدة: ${escapeHtml(product.unit || 'قطعة')}</span>
                    ${product.carton ? `<span>الكرتونة: ${escapeHtml(product.carton)} قطعة</span>` : ''}
                </div>
                ${hasVariants ? `<section class="detail-block"><h2>الأنواع المتاحة</h2><ul class="variants">${product.variants.map(value => `<li>${escapeHtml(value)}</li>`).join('')}</ul></section>` : ''}
                ${descriptionHtml}
                <div class="actions">
                    <button id="addToCart" type="button">أضف للسلة 🛒</button>
                    <a class="back" href="/store">متابعة التسوق</a>
                </div>
                <div id="notice" role="status" aria-live="polite"></div>
            </div>
        </article>
    </main>
    <footer>متجر الزمردة كوزماتيكس © ${new Date().getFullYear()}</footer>
    <script>
        const product = ${JSON.stringify({
            id: product.id,
            name: product.name,
            price: Number(product.price),
            unit: product.unit || 'قطعة',
            brand: product.brand || '',
            category: product.category
        }).replace(/</g, '\\u003c')};
        document.getElementById('addToCart').addEventListener('click', () => {
            let cart = [];
            try {
                const saved = localStorage.getItem('zmr_cart') || localStorage.getItem('zomoroda_cart') || '[]';
                const parsed = JSON.parse(saved);
                cart = Array.isArray(parsed) ? parsed : [];
            } catch (error) {
                document.getElementById('notice').textContent = 'تعذر قراءة سلة المشتريات. امسح بيانات السلة ثم حاول مرة أخرى.';
                return;
            }
            const item = cart.find(entry => entry.id === product.id);
            if (item) {
                const quantity = Number(item.qty ?? item.quantity ?? 0);
                if (!Number.isInteger(quantity) || quantity >= 99) {
                    document.getElementById('notice').textContent = 'وصلت إلى الحد الأقصى وهو 99 من هذا المنتج.';
                    return;
                }
                item.qty = quantity + 1;
            } else {
                cart.push({ ...product, qty: 1 });
            }
            localStorage.setItem('zmr_cart', JSON.stringify(cart));
            document.getElementById('notice').textContent = 'تمت إضافة المنتج إلى السلة.';
        });
    </script>
</body>
</html>`;
}

module.exports = { getStoreProductHtml };
