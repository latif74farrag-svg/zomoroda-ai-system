// Lets standalone agents (WhatsApp sender, social scraper, campaigns) report what they do
// into the shared audit_log so it shows up live on /store/activity.
// Never throws: reporting must not break the agent that is doing real work.
async function logActivity(agent, action, resource, details = {}) {
    try {
        const { getDatabase } = require('./storage');
        const database = await getDatabase();
        await database.execute({
            sql: 'INSERT INTO audit_log(actor, action, resource, details, created_at) VALUES (?, ?, ?, ?, ?)',
            args: [`agent:${agent}`, action, String(resource ?? '-'), JSON.stringify(details), Date.now()]
        });
    } catch (error) {
        console.error('تعذر تسجيل نشاط الوكيل:', error.message);
    }
}
module.exports = { logActivity };
