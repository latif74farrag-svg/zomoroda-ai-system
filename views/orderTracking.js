function getOrderTrackingHtml() {
    return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>متابعة الطلب | متجر الزمردة كوزماتيكس</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; }
        body { margin: 0; min-height: 100vh; display: flex; flex-direction: column; background: #f8fafc; color: #0f172a; font-family: 'Cairo', sans-serif; }
        header { padding: 18px 24px; color: #fff; background: linear-gradient(135deg, #022c22, #047857); }
        header div { max-width: 900px; margin: auto; display: flex; justify-content: space-between; gap: 16px; }
        a { color: inherit; }
        main { width: min(680px, calc(100% - 32px)); margin: 48px auto; flex: 1; }
        .card { padding: 28px; border: 1px solid #e2e8f0; border-radius: 18px; background: #fff; box-shadow: 0 10px 28px #0f172a0d; }
        h1 { margin-top: 0; color: #064e3b; }
        p { color: #475569; }
        label { display: block; margin: 16px 0 6px; font-weight: 700; }
        input, button { width: 100%; padding: 12px 14px; border: 1px solid #cbd5e1; border-radius: 10px; font: inherit; }
        button { margin-top: 20px; border: 0; background: #047857; color: #fff; font-weight: 800; cursor: pointer; }
        button:disabled { opacity: .6; cursor: wait; }
        #message { margin-top: 18px; }
        .order-result { margin-top: 20px; padding: 18px; border-radius: 12px; background: #ecfdf5; border: 1px solid #a7f3d0; }
        .order-result h2 { margin: 0 0 8px; color: #064e3b; font-size: 1.1rem; }
        .order-items { margin: 12px 0 0; padding-right: 20px; }
        footer { padding: 20px; text-align: center; color: #64748b; }
    </style>
</head>
<body>
    <header><div><strong>💎 الزمردة كوزماتيكس</strong><a href="/store">العودة للمتجر</a></div></header>
    <main>
        <section class="card">
            <h1>متابعة طلبك</h1>
            <p>أدخل رقم الطلب ورقم الهاتف المستخدم عند الشراء لعرض حالة الطلب.</p>
            <form id="trackForm">
                <label for="orderNumber">رقم الطلب</label>
                <input id="orderNumber" name="orderNumber" placeholder="ZMR-20261031-ABCDEF0123456789" required>
                <label for="phone">رقم الهاتف</label>
                <input id="phone" name="phone" inputmode="tel" autocomplete="tel" placeholder="01012345678" pattern="^(010|011|012|015)[0-9]{8}$" required>
                <button id="submitButton" type="submit">ابحث عن طلبي</button>
            </form>
            <div id="message" role="status" aria-live="polite"></div>
        </section>
    </main>
    <footer>شركة الزمردة كوزماتيكس © ${new Date().getFullYear()}</footer>
    <script>
        const statusLabels = {
            pending: 'قيد المراجعة',
            confirmed: 'تم التأكيد',
            shipped: 'تم الشحن',
            delivered: 'تم التسليم',
            cancelled: 'تم إلغاء الطلب'
        };

        document.getElementById('trackForm').addEventListener('submit', async event => {
            event.preventDefault();
            const button = document.getElementById('submitButton');
            const message = document.getElementById('message');
            const phone = document.getElementById('phone').value.replace(/\\D/g, '');
            const orderNumber = document.getElementById('orderNumber').value.trim().toUpperCase();
            message.textContent = '';
            button.disabled = true;
            button.textContent = 'جارٍ البحث...';

            try {
                const response = await fetch('/api/store/orders/track', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone, order_number: orderNumber })
                });
                const data = await response.json();
                if (!response.ok || !data.success) throw new Error(data.error || 'تعذر العثور على الطلب.');

                const order = data.order;
                const result = document.createElement('section');
                result.className = 'order-result';
                const title = document.createElement('h2');
                title.textContent = 'الطلب ' + order.order_number + ' — ' + (statusLabels[order.status] || order.status);
                const total = document.createElement('p');
                total.textContent = 'إجمالي المنتجات: ' + Number(order.total).toFixed(2) + ' ج.م';
                const created = document.createElement('p');
                created.textContent = 'تاريخ الطلب: ' + order.created_at;
                const items = document.createElement('ul');
                items.className = 'order-items';
                order.items.forEach(item => {
                    const row = document.createElement('li');
                    row.textContent = item.name + ' × ' + item.quantity;
                    items.appendChild(row);
                });
                result.append(title, total, created, items);
                message.replaceChildren(result);
            } catch (error) {
                message.textContent = error.message || 'تعذر الاتصال بالخادم. حاول مرة أخرى.';
            } finally {
                button.disabled = false;
                button.textContent = 'ابحث عن طلبي';
            }
        });

        const orderNumberFromLink = new URLSearchParams(window.location.search).get('order_number');
        if (orderNumberFromLink) document.getElementById('orderNumber').value = orderNumberFromLink;
    </script>
</body>
</html>`;
}

module.exports = { getOrderTrackingHtml };
