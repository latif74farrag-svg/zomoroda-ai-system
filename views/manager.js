function getManagerHtml() {
    const copy = {
        title: 'مركز إدارة الزمردة',
        brand: 'الزمردة | مركز الإدارة',
        storefront: 'المتجر', admin: 'إدارة المتجر',
        eyebrow: 'العمليات | الوكلاء | الحملات',
        heading: 'لوحة المدير',
        intro: 'من هنا تتابع العمليات، تراجع مقترحات الوكلاء، وتدير حملات التسويق من مكان واحد.',
        checking: 'جارٍ التحقق من جلسة المدير...',
        reviews: 'مقترحات بانتظار المراجعة',
        campaigns: 'حملات في المكتبة',
        jobs: 'مهام تشغيلية مفتوحة',
        worker: 'اتصال العامل الخلفي',
        operations: 'العمليات والوكلاء',
        operationsText: 'إدارة المخزون والطلبات، مراجعة اقتراحات الوكلاء، ومتابعة المهام والسجلات.',
        openOperations: 'افتح لوحة العمليات',
        marketing: 'التسويق والحملات',
        marketingText: 'إنشاء مسودات حسب القطاع، طلب مسودة من وكيل التسويق، ومراجعتها قبل اعتمادها.',
        openMarketing: 'افتح لوحة التسويق',
        noSend: 'اعتماد الحملة يحفظ المسودة فقط؛ لا يتم إرسال رسائل واتساب أو بريد إلكتروني.',
        refresh: 'تحديث اللوحة',
        signIn: 'سجّل الدخول من صفحة إدارة المتجر أولاً.',
        adminOnly: 'هذه اللوحة مخصصة للمدير.',
        globalPaused: 'إيقاف الوكلاء العام مفعّل. يمكنك تغييره من لوحة العمليات.',
        workerMissing: 'لا توجد نبضة حديثة للعامل الخلفي؛ قد تنتظر مهام الطلبات والمخزون والدعم. مسودات التسويق تُحفظ مباشرةً بعد الموافقة.',
        welcome: 'مرحباً', noWorker: 'غير متصل', workerOnline: 'متصل', workerStale: 'متوقف عن الاستجابة',
        requestError: 'تعذر تحميل بيانات الإدارة.'
    };
    return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${copy.title}</title>
<style>
:root{font-family:"Cairo",Tahoma,Arial,sans-serif;color:#17251f;background:#f3f6f3}*{box-sizing:border-box}body{margin:0}header{background:#123b2d;color:#fff;padding:18px max(22px,calc((100vw - 1120px)/2));display:flex;justify-content:space-between;align-items:center;gap:16px}header a{color:#d5f0df;text-decoration:none}main{width:min(1120px,calc(100% - 32px));margin:42px auto}.eyebrow{color:#438467;font-size:12px;letter-spacing:.06em;font-weight:800}h1{font-size:clamp(30px,5vw,48px);margin:8px 0}p{color:#66766d;line-height:1.8}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin:25px 0}.card{background:#fff;border:1px solid #e0e8e2;border-radius:16px;padding:20px;box-shadow:0 8px 28px #183b2d08}.metric span{display:block;color:#68776e;font-size:13px}.metric strong{display:block;font-size:29px;margin-top:7px}.sections{display:grid;grid-template-columns:1fr 1fr;gap:16px}.section h2{margin:0 0 8px;font-size:20px;color:#174a36}.section p{margin:0 0 18px}.links{display:flex;flex-wrap:wrap;gap:9px}.button{display:inline-flex;padding:10px 15px;border-radius:9px;background:#16744e;color:#fff;text-decoration:none;font-weight:750;border:0;cursor:pointer}.button.secondary{background:#edf3ef;color:#315441}.notice{padding:14px 16px;border-radius:12px;background:#eaf4ee;color:#23543e;margin:16px 0;line-height:1.8}.notice.warn{background:#fff3d6;color:#78580e}.notice.error{background:#feecec;color:#902e2e}.small{font-size:13px}.hidden{display:none!important}@media(max-width:780px){.grid{grid-template-columns:repeat(2,1fr)}.sections{grid-template-columns:1fr}}@media(max-width:420px){main{margin-top:25px}.card{padding:15px}}
</style></head><body><header><strong>${copy.brand}</strong><nav><a href="/store/operations">${copy.openOperations}</a><a href="/store/marketing">${copy.openMarketing}</a><a href="/store/admin">${copy.admin}</a><a href="/store">${copy.storefront}</a></nav></header><main>
<div class="eyebrow">${copy.eyebrow}</div><h1>${copy.heading}</h1><p>${copy.intro}</p><div id="notice" class="notice">${copy.checking}</div>
<section class="grid"><div class="card metric"><span>${copy.reviews}</span><strong id="reviews">—</strong></div><div class="card metric"><span>${copy.campaigns}</span><strong id="campaigns">—</strong></div><div class="card metric"><span>${copy.jobs}</span><strong id="jobs">—</strong></div><div class="card metric"><span>${copy.worker}</span><strong id="worker">—</strong></div></section>
<div class="sections"><section class="card section"><h2>${copy.operations}</h2><p>${copy.operationsText}</p><div class="links"><a class="button" href="/store/operations">${copy.openOperations}</a></div></section><section class="card section"><h2>${copy.marketing}</h2><p>${copy.marketingText}</p><div class="links"><a class="button" href="/store/marketing">${copy.openMarketing}</a></div></section></div>
<div id="stateNotice" class="notice warn hidden"></div><p class="small">${copy.noSend}</p><button id="refresh" class="button secondary" type="button">${copy.refresh}</button>
</main><script>
const COPY=${JSON.stringify(copy)};let csrf='';const el=id=>document.getElementById(id);const api=async url=>{const response=await fetch(url,{credentials:'same-origin',headers:{'X-CSRF-Token':csrf}});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||COPY.requestError);return data};
async function load(){try{const session=await api('/api/store/admin/session');csrf=session.csrf||'';if(!session.authenticated){el('notice').textContent=COPY.signIn;el('notice').className='notice error';return}if(session.staff.role!=='admin'){el('notice').textContent=COPY.adminOnly;el('notice').className='notice error';return}const [ops,agents,marketing]=await Promise.all([api('/api/v1/admin/operations'),api('/api/v1/admin/agents'),api('/api/v1/admin/marketing/campaigns')]);el('notice').textContent=COPY.welcome+' '+session.staff.name+'، يتم تحديث الملخص تلقائياً كل 30 ثانية.';el('reviews').textContent=agents.tasks.filter(item=>item.status==='proposed').length;el('campaigns').textContent=marketing.campaigns.length;el('jobs').textContent=ops.jobs.filter(item=>item.status!=='done').reduce((sum,item)=>sum+Number(item.count),0);const age=ops.workerHeartbeatAgeMs;el('worker').textContent=age===null?COPY.noWorker:age<120000?COPY.workerOnline:COPY.workerStale;const controls=Object.fromEntries(agents.controls.map(item=>[item.agent,Boolean(item.paused)]));const warnings=[];if(controls.global)warnings.push(COPY.globalPaused);if(age===null||age>=120000)warnings.push(COPY.workerMissing);if(warnings.length){el('stateNotice').textContent=warnings.join(' ');el('stateNotice').classList.remove('hidden')}else el('stateNotice').classList.add('hidden')}catch(error){el('notice').textContent=error.message;el('notice').className='notice error'}}
el('refresh').onclick=load;load();setInterval(load,30000);
</script></body></html>`;
}
module.exports = { getManagerHtml };
