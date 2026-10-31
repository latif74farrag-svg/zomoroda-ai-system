// views/checkout.js - صفحة إتمام الطلب لمتجر الزمردة كوزماتيكس
function getCheckoutHtml() {
    return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>إتمام الطلب | متجر الزمردة كوزماتيكس</title>
    <meta name="description" content="إتمام طلب الشراء والتوصيل من متجر الزمردة كوزماتيكس - دفع عند الاستلام.">
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
            --danger: #dc2626;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: 'Cairo', sans-serif;
        }

        body {
            background-color: var(--slate-50);
            color: var(--slate-900);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }

        header {
            background: linear-gradient(135deg, var(--primary-dark) 0%, var(--primary) 100%);
            color: white;
            padding: 1rem 1.5rem;
            box-shadow: 0 4px 15px rgba(6, 78, 59, 0.2);
        }

        .header-content {
            max-width: 1200px;
            margin: 0 auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .logo-area {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            text-decoration: none;
            color: white;
        }

        .logo-icon {
            font-size: 1.8rem;
        }

        .logo-title {
            font-size: 1.3rem;
            font-weight: 800;
        }

        .back-link {
            color: var(--emerald-100);
            text-decoration: none;
            display: flex;
            align-items: center;
            gap: 0.4rem;
            font-weight: 600;
            padding: 0.5rem 1rem;
            border-radius: 8px;
            background: rgba(255, 255, 255, 0.08);
            transition: all 0.2s;
        }

        .back-link:hover {
            background: rgba(255, 255, 255, 0.16);
            color: white;
        }

        .container {
            max-width: 1100px;
            margin: 2rem auto;
            padding: 0 1rem;
            flex: 1;
            width: 100%;
        }

        .page-title {
            font-size: 1.7rem;
            font-weight: 800;
            color: var(--primary-dark);
            margin-bottom: 0.5rem;
        }

        .page-subtitle {
            color: var(--slate-600);
            font-size: 0.95rem;
            margin-bottom: 2rem;
        }

        .checkout-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 2rem;
            align-items: start;
        }

        @media (max-width: 768px) {
            .checkout-grid {
                grid-template-columns: 1fr;
            }
        }

        .card {
            background: white;
            border-radius: 16px;
            padding: 1.75rem;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.04);
            border: 1px solid #e2e8f0;
        }

        .card-header {
            display: flex;
            align-items: center;
            gap: 0.6rem;
            font-size: 1.2rem;
            font-weight: 700;
            color: var(--primary-dark);
            margin-bottom: 1.25rem;
            padding-bottom: 0.75rem;
            border-bottom: 2px solid var(--emerald-50);
        }

        /* Order items list */
        .order-items {
            display: flex;
            flex-direction: column;
            gap: 1rem;
            max-height: 380px;
            overflow-y: auto;
            padding-left: 0.25rem;
        }

        .order-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-bottom: 0.8rem;
            border-bottom: 1px dashed #e2e8f0;
        }

        .order-item-info {
            display: flex;
            flex-direction: column;
            gap: 0.2rem;
            flex: 1;
        }

        .order-item-name {
            font-weight: 700;
            font-size: 0.95rem;
            color: var(--slate-800);
        }

        .order-item-meta {
            font-size: 0.85rem;
            color: var(--slate-600);
        }

        .order-item-price {
            font-weight: 700;
            color: var(--primary);
            white-space: nowrap;
        }

        .summary-totals {
            margin-top: 1.5rem;
            padding-top: 1.25rem;
            border-top: 2px solid #e2e8f0;
            display: flex;
            flex-direction: column;
            gap: 0.6rem;
        }

        .summary-row {
            display: flex;
            justify-content: space-between;
            font-size: 0.95rem;
            color: var(--slate-600);
        }

        .summary-row.grand-total {
            font-size: 1.3rem;
            font-weight: 800;
            color: var(--primary-dark);
            padding-top: 0.6rem;
            border-top: 1px solid #cbd5e1;
        }

        /* Form elements */
        .form-group {
            margin-bottom: 1.25rem;
        }

        .form-label {
            display: block;
            font-weight: 700;
            font-size: 0.9rem;
            margin-bottom: 0.4rem;
            color: var(--slate-800);
        }

        .form-label span.req {
            color: var(--danger);
        }

        .form-input, .form-textarea, .form-select {
            width: 100%;
            padding: 0.75rem 1rem;
            border: 1px solid #cbd5e1;
            border-radius: 10px;
            font-size: 0.95rem;
            transition: all 0.2s;
            background: #fff;
            color: var(--slate-900);
        }

        .form-input:focus, .form-textarea:focus, .form-select:focus {
            outline: none;
            border-color: var(--emerald-500);
            box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
        }

        .form-textarea {
            resize: vertical;
            min-height: 80px;
        }

        .payment-box {
            background: var(--emerald-50);
            border: 1px solid var(--emerald-100);
            border-radius: 12px;
            padding: 1rem;
            display: flex;
            align-items: center;
            gap: 0.75rem;
            margin-bottom: 1.5rem;
        }

        .payment-icon {
            font-size: 1.6rem;
        }

        .payment-details {
            display: flex;
            flex-direction: column;
        }

        .payment-title {
            font-weight: 700;
            color: var(--primary);
            font-size: 0.95rem;
        }

        .payment-desc {
            font-size: 0.8rem;
            color: var(--slate-600);
        }

        .btn-submit {
            width: 100%;
            background: linear-gradient(135deg, var(--emerald-500) 0%, var(--primary) 100%);
            color: white;
            border: none;
            padding: 1rem;
            border-radius: 12px;
            font-size: 1.1rem;
            font-weight: 800;
            cursor: pointer;
            box-shadow: 0 6px 18px rgba(16, 185, 129, 0.3);
            transition: all 0.2s;
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 0.5rem;
        }

        .btn-submit:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(16, 185, 129, 0.4);
        }

        .btn-submit:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }

        /* Empty state */
        .empty-cart-view {
            text-align: center;
            padding: 3rem 1rem;
            background: white;
            border-radius: 16px;
            border: 1px dashed #cbd5e1;
        }

        .empty-icon {
            font-size: 3.5rem;
            margin-bottom: 1rem;
        }

        .btn-shop {
            display: inline-block;
            margin-top: 1.25rem;
            background: var(--primary);
            color: white;
            text-decoration: none;
            padding: 0.75rem 1.75rem;
            border-radius: 10px;
            font-weight: 700;
            transition: all 0.2s;
        }

        .btn-shop:hover {
            background: var(--primary-light);
        }

        /* Success screen */
        .success-box {
            display: none;
            text-align: center;
            background: white;
            padding: 3rem 2rem;
            border-radius: 20px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
            max-width: 650px;
            margin: 2rem auto;
            border: 1px solid var(--emerald-100);
        }

        .success-icon {
            font-size: 4rem;
            margin-bottom: 1rem;
        }

        .order-badge {
            display: inline-block;
            background: var(--gold-light);
            color: var(--gold);
            font-weight: 800;
            font-size: 1.2rem;
            padding: 0.5rem 1.25rem;
            border-radius: 30px;
            margin: 1rem 0;
            letter-spacing: 1px;
        }

        .whatsapp-cta {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            background: #25D366;
            color: white;
            text-decoration: none;
            font-weight: 700;
            padding: 0.85rem 1.5rem;
            border-radius: 12px;
            margin-top: 1.5rem;
            font-size: 1rem;
            transition: all 0.2s;
        }

        .whatsapp-cta:hover {
            background: #1eb956;
            transform: translateY(-2px);
        }

        footer {
            background: #fff;
            border-top: 1px solid #e2e8f0;
            padding: 1.5rem;
            text-align: center;
            color: var(--slate-600);
            font-size: 0.85rem;
            margin-top: auto;
        }
    </style>
</head>
<body>

    <header>
        <div class="header-content">
            <a href="/store" class="logo-area">
                <span class="logo-icon">💎</span>
                <span class="logo-title">الزمردة كوزماتيكس</span>
            </a>
            <a href="/store" class="back-link">
                <span>←</span> العودة لتصفح المتجر
            </a>
        </div>
    </header>

    <div class="container">
        <!-- Main Form Area -->
        <div id="checkoutMain">
            <h1 class="page-title">إتمام الطلب وتأكيد الشحن</h1>
            <p class="page-subtitle">يرجى كتابة عنوان التوصيل ورقم الهاتف بدقة لتسليم الطلبية في أقرب وقت.</p>

            <div class="checkout-grid" id="checkoutGrid">
                <!-- Column 1: Cart Summary -->
                <div class="card">
                    <div class="card-header">
                        <span>🛒</span> ملخص الطلبية
                    </div>
                    <div class="order-items" id="orderItemsContainer">
                        <!-- Loaded dynamically from localStorage -->
                    </div>
                    <div class="summary-totals">
                        <div class="summary-row">
                            <span>إجمالي المنتجات:</span>
                            <span id="subtotalVal">0 ج.م</span>
                        </div>
                        <div class="summary-row">
                            <span>تكلفة التوصيل:</span>
                            <span style="color: var(--emerald-500); font-weight: 700;">يتم تحديدها مع المندوب</span>
                        </div>
                        <div class="summary-row grand-total">
                            <span>الإجمالي المستحق:</span>
                            <span id="grandTotalVal">0 ج.م</span>
                        </div>
                    </div>
                </div>

                <!-- Column 2: Customer Data Form -->
                <div class="card">
                    <div class="card-header">
                        <span>📍</span> بيانات التوصيل والاستلام
                    </div>
                    <form id="orderForm" onsubmit="handleFormSubmit(event)">
                        <div class="form-group">
                            <label class="form-label">الاسم بالكامل <span class="req">*</span></label>
                            <input type="text" id="custName" class="form-input" placeholder="مثال: أحمد محمود فراج" required>
                        </div>

                        <div class="form-group">
                            <label class="form-label">رقم الهاتف (واتساب مفعّل) <span class="req">*</span></label>
                            <input type="tel" id="custPhone" class="form-input" placeholder="مثال: 01012345678" required pattern="^(010|011|012|015)[0-9]{8}$">
                            <small style="color: var(--slate-600); font-size: 0.75rem;">سنرسل لك تفاصيل الفاتورة ومتابعة الشحن عبر الواتساب.</small>
                        </div>

                        <div class="form-group">
                            <label class="form-label">المحافظة / المدينة <span class="req">*</span></label>
                            <input type="text" id="custCity" class="form-input" placeholder="مثال: القاهرة / الجيزة / الإسكندرية..." required>
                        </div>

                        <div class="form-group">
                            <label class="form-label">العنوان بالتفصيل <span class="req">*</span></label>
                            <textarea id="custAddress" class="form-textarea" placeholder="المنطقة، الشارع، رقم العمارة، الشقة، وأقرب علامة مميزة..." required></textarea>
                        </div>

                        <div class="form-group">
                            <label class="form-label">ملاحظات خاصة بالتسليم (اختياري)</label>
                            <input type="text" id="custNotes" class="form-input" placeholder="أي تعليمات إضافية لمندوب الشحن...">
                        </div>

                        <div class="payment-box">
                            <span class="payment-icon">💵</span>
                            <div class="payment-details">
                                <span class="payment-title">طريقة الدفع: الدفع عند الاستلام (كاش)</span>
                                <span class="payment-desc">لا حاجة لبطاقات بنكية - يتم سداد المبلغ نقداً عند استلام وفحص الطلبية.</span>
                            </div>
                        </div>

                        <button type="submit" id="submitBtn" class="btn-submit">
                            <span>✅</span> تأكيد وإرسال الطلب الآن
                        </button>
                    </form>
                </div>
            </div>

            <!-- Empty Cart Fallback -->
            <div id="emptyCartView" class="empty-cart-view" style="display: none;">
                <div class="empty-icon">🛒</div>
                <h2>سلة المشتريات فارغة!</h2>
                <p style="color: var(--slate-600); margin-top: 0.5rem;">لم تقم بإضافة أي منتجات للسلة بعد.</p>
                <a href="/store" class="btn-shop">تصفح منتجات الزمردة الآن</a>
            </div>
        </div>

        <!-- Success Screen -->
        <div id="successBox" class="success-box">
            <div class="success-icon">🎉</div>
            <h2 style="color: var(--primary-dark); font-size: 1.8rem; font-weight: 800;">تم تسجيل طلبك بنجاح!</h2>
            <p style="color: var(--slate-600); margin-top: 0.5rem;">شكراً لثقتك في شركة الزمردة كوزماتيكس. سنتواصل معك لتأكيد الشحن.</p>
            
            <div>رقم الطلب الخاص بك:</div>
            <div class="order-badge" id="orderBadgeNumber">ZMR-0000</div>

            <div style="margin-top: 1rem; color: var(--slate-600); font-size: 0.95rem;" id="successSummary">
                سيتم مراجعة الطلب وتحضير الشحنة فوراً.
            </div>

            <br>
            <a id="whatsappCtaLink" href="#" target="_blank" class="whatsapp-cta">
                <span>💬</span> متابعة الطلب مع مسؤول المبيعات عبر واتساب
            </a>

            <div style="margin-top: 1.5rem;">
                <a href="/store" style="color: var(--primary); text-decoration: none; font-weight: 700;">العودة للمتجر الرئيسي</a>
            </div>
        </div>
    </div>

    <footer>
        شركة الزمردة كوزماتيكس &copy; 2026 - إدارة أ. عبداللطيف فراج. جميع الحقوق محفوظة.
    </footer>

    <script>
        let cart = [];

        function loadCart() {
            try {
                cart = JSON.parse(localStorage.getItem('zomoroda_cart') || '[]');
            } catch (e) {
                cart = [];
            }

            const container = document.getElementById('orderItemsContainer');
            const checkoutGrid = document.getElementById('checkoutGrid');
            const emptyView = document.getElementById('emptyCartView');

            if (!cart || cart.length === 0) {
                if (checkoutGrid) checkoutGrid.style.display = 'none';
                if (emptyView) emptyView.style.display = 'block';
                return;
            }

            if (checkoutGrid) checkoutGrid.style.display = 'grid';
            if (emptyView) emptyView.style.display = 'none';

            let total = 0;
            container.innerHTML = cart.map(item => {
                const itemTotal = (item.price || 0) * (item.quantity || 1);
                total += itemTotal;
                return \`
                    <div class="order-item">
                        <div class="order-item-info">
                            <span class="order-item-name">\${item.name}</span>
                            <span class="order-item-meta">\${item.quantity} × \${item.price} ج.م (\${item.unit || 'قطعة'})</span>
                        </div>
                        <div class="order-item-price">\${itemTotal} ج.م</div>
                    </div>
                \`;
            }).join('');

            document.getElementById('subtotalVal').textContent = total + ' ج.م';
            document.getElementById('grandTotalVal').textContent = total + ' ج.م';
        }

        async function handleFormSubmit(event) {
            event.preventDefault();
            if (!cart || cart.length === 0) {
                alert('سلة المشتريات فارغة');
                return;
            }

            const name = document.getElementById('custName').value.trim();
            const phone = document.getElementById('custPhone').value.trim();
            const city = document.getElementById('custCity').value.trim();
            const address = document.getElementById('custAddress').value.trim();
            const notes = document.getElementById('custNotes').value.trim();

            const fullAddress = city + ' - ' + address;
            const total = cart.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0);

            const btn = document.getElementById('submitBtn');
            btn.disabled = true;
            btn.innerHTML = 'جاري إرسال الطلب... ⏳';

            try {
                const response = await fetch('/api/store/orders', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        customer_name: name,
                        customer_phone: phone,
                        customer_address: fullAddress,
                        notes: notes,
                        items: cart,
                        total: total,
                        payment_method: 'cash'
                    })
                });

                const data = await response.json();

                if (data.success) {
                    // تفريغ السلة
                    localStorage.removeItem('zomoroda_cart');

                    // إظهار شاشة النجاح
                    document.getElementById('checkoutMain').style.display = 'none';
                    const successBox = document.getElementById('successBox');
                    document.getElementById('orderBadgeNumber').textContent = data.orderNumber;
                    
                    const waText = encodeURIComponent(\`مرحباً شركة الزمردة كوزماتيكس، قمت بعمل طلب شراء رقم \${data.orderNumber} بقيمة إجمالية \${total} ج.م، وأود تأكيد موعد الشحن والتسليم.\`);
                    const waLink = \`https://wa.me/201027878848?text=\${waText}\`;
                    document.getElementById('whatsappCtaLink').href = waLink;

                    successBox.style.display = 'block';
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                    alert('حدث خطأ: ' + (data.error || 'تعذر تسجيل الطلب، يرجى المحاولة لاحقاً'));
                    btn.disabled = false;
                    btn.innerHTML = '<span>✅</span> تأكيد وإرسال الطلب الآن';
                }
            } catch (err) {
                console.error(err);
                alert('تعذر الاتصال بالخادم، يرجى التحقق من اتصالك بالإنترنت.');
                btn.disabled = false;
                btn.innerHTML = '<span>✅</span> تأكيد وإرسال الطلب الآن';
            }
        }

        // تشغيل التهيئة
        loadCart();
    </script>
</body>
</html>`;
}

module.exports = { getCheckoutHtml };
