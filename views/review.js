// views/review.js - لوحة مراجعة الفيديوهات والحملات الإعلانية
function getReviewHtml({ BUSINESS_IDENTITY }) {
    return `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>لوحة مراجعة الحملات والفيديوهات | الزمردة كوزماتيكس</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
        <style>
            * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Cairo', sans-serif; }
            body { 
                background: linear-gradient(135deg, #064e3b 0%, #022c22 100%); 
                min-height: 100vh;
                padding: 30px 20px; 
                display: flex;
                align-items: center;
                justify-content: center;
                color: #0f172a;
            }
            .container { 
                max-width: 820px; 
                width: 100%;
                background: white; 
                padding: 36px 30px; 
                border-radius: 24px; 
                box-shadow: 0 25px 50px -12px rgba(0,0,0,0.45); 
                text-align: center;
            }
            .header-badge {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                background: #ecfdf5;
                color: #059669;
                padding: 6px 16px;
                border-radius: 30px;
                font-size: 13px;
                font-weight: 700;
                margin-bottom: 12px;
                border: 1px solid #a7f3d0;
            }
            h2 { color: #064e3b; font-size: 25px; font-weight: 800; margin-bottom: 8px; }
            p.subtitle { color: #64748b; font-size: 14.5px; margin-bottom: 24px; }
            .video-card { 
                border: 2px solid #e2e8f0; 
                border-radius: 18px; 
                padding: 20px; 
                background: #f8fafc; 
                box-shadow: 0 4px 12px rgba(0,0,0,0.03);
            }
            video { 
                width: 100%; 
                max-height: 420px; 
                border-radius: 14px; 
                background: #0f172a;
                box-shadow: 0 4px 10px rgba(0,0,0,0.1);
            }
            .caption-box { 
                margin: 20px 0; 
                padding: 18px;
                background: #ffffff;
                border-right: 4px solid #10b981;
                border-radius: 10px;
                font-size: 15px; 
                color: #1e293b; 
                font-weight: 600; 
                text-align: right;
                line-height: 1.7;
                box-shadow: 0 2px 6px rgba(0,0,0,0.03);
            }
            .btn-group {
                display: flex;
                gap: 12px;
                justify-content: center;
                flex-wrap: wrap;
                margin-top: 15px;
            }
            .btn { 
                padding: 13px 26px; 
                font-size: 15px; 
                font-weight: 700;
                border: none; 
                border-radius: 12px; 
                cursor: pointer; 
                text-decoration: none; 
                display: inline-flex; 
                align-items: center;
                gap: 8px;
                transition: all 0.2s;
            }
            .btn-approve { 
                background: linear-gradient(135deg, #059669, #047857); 
                color: white; 
                box-shadow: 0 4px 14px rgba(5, 150, 105, 0.35);
            }
            .btn-approve:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(5, 150, 105, 0.45); }
            .btn-reject { 
                background: #ef4444; 
                color: white; 
                box-shadow: 0 4px 14px rgba(239, 68, 68, 0.3);
            }
            .btn-reject:hover { transform: translateY(-2px); }
            .btn-back {
                background: #f1f5f9;
                color: #475569;
            }
            .btn-back:hover { background: #e2e8f0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header-badge">🎬 وكيل صناعة المحتوى والإعلانات التلقائية</div>
            <h2>طابور مراجعة الفيديوهات الكرتونية والحملات الإعلانية</h2>
            <p class="subtitle">يرجى معاينة المحتوى الترويجي وتدقيقه قبل الإذن بالنشر التلقائي عبر المنصات 24/7 (إدارة: ${BUSINESS_IDENTITY.ownerName})</p>

            <div class="video-card">
                <video controls>
                    <source src="/review_queue/sample_cartoon.mp4" type="video/mp4">
                    متصفحك لا يدعم تشغيل الفيديو المباشر.
                </video>
                <div class="caption-box">
                    📝 <b>النص الترويجي المجدول:</b> "هل تبحثين عن فرصة عمل حقيقية وأنتِ في بيتك؟ انضمي الآن لبرنامج سفيرات الزمردة كوزماتيكس بعمولات مجزية وترقيات فورية! 🌸"
                </div>
                <div class="btn-group">
                    <button class="btn btn-approve" onclick="alert('✅ تم اعتماد المحتوى بنجاح! جاري النشر التلقائي عبر فيسبوك وتيك توك وتليجرام...')">✅ اعتماد وإطلاق النشر الفوري</button>
                    <button class="btn btn-reject" onclick="alert('❌ تم إرسال طلب تعديل لوكيل الإعلانات.')">❌ طلب تعديل أو رفض</button>
                    <a href="/" class="btn btn-back">العودة للوحة التحكم ↩</a>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
}

module.exports = { getReviewHtml };
