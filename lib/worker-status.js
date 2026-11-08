async function status(db, now = Date.now()) {
    const rows = (await db.execute("SELECT key, value FROM system_state WHERE key IN ('worker_heartbeat', 'batch_worker_success', 'cron_worker_success')")).rows;
    const values = Object.fromEntries(rows.map(row => [row.key, Number(row.value)]));
    const cron = Boolean(process.env.VERCEL);
    const last = cron ? values.batch_worker_success : values.worker_heartbeat;
    const age = last ? Math.max(0, now - last) : null;
    const healthy = age !== null && age < (cron ? 26 * 3600000 : 120000);
    return {
        mode: cron ? 'daily' : 'continuous',
        configured: !cron || Boolean(process.env.CRON_SECRET),
        lastSuccessAt: values.batch_worker_success || null,
        lastCronSuccessAt: values.cron_worker_success || null,
        healthy,
        label: cron ? (!process.env.CRON_SECRET ? 'أضف CRON_SECRET في Vercel' : age === null ? 'بانتظار أول معالجة' : healthy ? 'المعالجة الدورية نجحت' : 'المعالجة الدورية متأخرة') : age === null ? 'غير متصل' : healthy ? 'متصل' : 'تحتاج متابعة'
    };
}
module.exports = { status };
