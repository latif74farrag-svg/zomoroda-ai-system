const db = require('./database');

// 1. تسجيل مندوبة جديدة (وربة منزل) تحت إشراف مشرفة اختيارياً
function registerAffiliate(phone, name, supervisorPhone = null) {
    return new Promise((resolve, reject) => {
        // التحقق مما إذا كانت المشرفة موجودة وصالحة
        if (supervisorPhone) {
            db.get(`SELECT * FROM affiliates WHERE phone = ?`, [supervisorPhone], (err, supervisor) => {
                if (err) return reject(err.message);
                if (!supervisor) {
                    return resolve({ success: false, message: "رقم المشرفة غير مسجل في النظام." });
                }
                insertNewRep(phone, name, supervisorPhone, resolve, reject);
            });
        } else {
            insertNewRep(phone, name, null, resolve, reject);
        }
    });
}

// دالة مساعدة لإتمام الإدخال في قاعدة البيانات
function insertNewRep(phone, name, supervisorPhone, resolve, reject) {
    db.run(
        `INSERT INTO affiliates (phone, name, supervisor_phone, role) VALUES (?, ?, ?, 'Representative')`,
        [phone, name, supervisorPhone],
        function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return resolve({ success: false, message: "رقم الهاتف مسجل مسبقاً كمندوبة." });
                }
                return reject(err.message);
            }

            // فحص وترقية المشرفة إن وجدت
            if (supervisorPhone) {
                checkAndUpdateSupervisor(supervisorPhone);
            }

            resolve({ success: true, message: `تم تسجيل المندوبة (${name}) بنجاح وتفعيل كود العمولة الخاص بها.` });
        }
    );
}

// 2. نظام الترقية التلقائي للمشرفة عند وصولها إلى 5 مندوبات
function checkAndUpdateSupervisor(supervisorPhone) {
    db.get(
        `SELECT COUNT(*) as count FROM affiliates WHERE supervisor_phone = ?`,
        [supervisorPhone],
        (err, row) => {
            if (!err && row && row.count >= 5) {
                db.run(
                    `UPDATE affiliates SET role = 'Team Leader' WHERE phone = ?`,
                    [supervisorPhone],
                    (updateErr) => {
                        if (!updateErr) {
                            console.log(`🎉 [ترقية شجرية]: تم ترقية المشرفة ذات الرقم (${supervisorPhone}) إلى رتبة (مشرفة فريق - Team Leader) لنجاحها في ضم 5 مندوبات!`);
                        }
                    }
                );
            }
        }
    );
}

// 3. احتساب وتوزيع العمولات عند إتمام عملية البيع
function processAffiliateSale(repPhone, orderAmount) {
    return new Promise((resolve, reject) => {
        // حساب العمولة المباشرة للمندوبة (مثلاً 10%)
        const directCommission = orderAmount * 0.10;

        db.run(
            `UPDATE affiliates SET sales_count = sales_count + 1, total_commissions = total_commissions + ? WHERE phone = ?`,
            [directCommission, repPhone],
            function (err) {
                if (err) return reject(err.message);

                console.log(`💰 تم إضافة عمولة مباشرة (${directCommission} ج.م) للمندوبة ذات الرقم: ${repPhone}`);

                // البحث عن المشرفة الخاصة بها لإعطائها عمولة الإشراف (مثلاً 3%)
                db.get(`SELECT supervisor_phone FROM affiliates WHERE phone = ?`, [repPhone], (err, row) => {
                    if (!err && row && row.supervisor_phone) {
                        const supPhone = row.supervisor_phone;
                        const overrideCommission = orderAmount * 0.03;

                        db.run(
                            `UPDATE affiliates SET total_commissions = total_commissions + ? WHERE phone = ?`,
                            [overrideCommission, supPhone],
                            (supErr) => {
                                if (!supErr) {
                                    console.log(`👑 تم إضافة عمولة إشراف (${overrideCommission} ج.م) للمشرفة ذات الرقم: ${supPhone}`);
                                }
                            }
                        );
                    }
                });

                resolve({ success: true, commission: directCommission });
            }
        );
    });
}

module.exports = {
    registerAffiliate,
    processAffiliateSale
};