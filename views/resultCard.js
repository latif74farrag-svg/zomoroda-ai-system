// views/resultCard.js - بطاقة الاستجابة والنتائج الأنيقة لمنظومة الزمردة
function renderResultCard(res, { title, message, isSuccess = true, platformUrl = null, platformName = null }) {
    const statusColor = isSuccess ? '#059669' : '#dc2626';
    const statusBg = isSuccess ? '#ecfdf5' : '#fef2f2';
    const statusIcon = isSuccess ? '✅' : '⚠️';

    res.send(`
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>${title} | شركة الزمردة كوزماتيكس</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
        <style>
            * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Cairo', sans-serif; }
            body {
                background: linear-gradient(135deg, #064e3b 0%, #022c22 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                color: #0f172a;
            }
            .card {
                background: white;
                max-width: 580px;
                width: 100%;
                border-radius: 20px;
                padding: 40px 32px;
                text-align: center;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
                border: 1px solid rgba(255, 255, 255, 0.2);
                animation: popIn 0.3s ease-out;
            }
            @keyframes popIn {
                from { transform: scale(0.95); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
            }
            .icon-badge {
                width: 80px;
                height: 80px;
                border-radius: 50%;
                background: ${statusBg};
                color: ${statusColor};
                font-size: 38px;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 20px;
                border: 2px solid ${statusColor};
            }
            h2 { color: #064e3b; font-size: 24px; font-weight: 800; margin-bottom: 14px; }
            p { color: #475569; font-size: 16px; line-height: 1.7; margin-bottom: 28px; }
            .btn-group { display: flex; flex-direction: column; gap: 12px; }
            .btn {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                padding: 14px 24px;
                font-size: 16px;
                font-weight: 700;
                border-radius: 12px;
                text-decoration: none;
                transition: all 0.2s;
                border: none;
                cursor: pointer;
            }
            .btn-platform {
                background: linear-gradient(135deg, #10b981, #059669);
                color: white;
                box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);
            }
            .btn-platform:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(16, 185, 129, 0.45); }
            .btn-outline { background: #f1f5f9; color: #334155; }
            .btn-outline:hover { background: #e2e8f0; }
        </style>
    </head>
    <body>
        <div class="card">
            <div class="icon-badge">${statusIcon}</div>
            <h2>${title}</h2>
            <p>${message}</p>
            <div class="btn-group">
                ${platformUrl ? `<a href="${platformUrl}" target="_blank" class="btn btn-platform">🚀 فتح منصة [${platformName || 'الحملة'}] الآن</a>` : ''}
                <a href="/" class="btn btn-outline">العودة للوحة التحكم الرئيسية ↩</a>
            </div>
        </div>
    </body>
    </html>
    `);
}

module.exports = { renderResultCard };
