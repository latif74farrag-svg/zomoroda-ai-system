const { processExcelAndSendEmails } = require('./email_service');
const path = require('path');

async function run() {
    console.log("🚀 جاري بدء حملة الإرسال لملف إيميلات الفنادق فقط...");
    
    // تحديد ملف ايميلات فنادق.xlsx حصرياً
    const targetFile = path.join(__dirname, 'ايميلات فنادق.xlsx');
    
    await processExcelAndSendEmails(targetFile);
    
    console.log("\n🎉 تمت حملة إيميلات الفنادق بنجاح!");
}

run();