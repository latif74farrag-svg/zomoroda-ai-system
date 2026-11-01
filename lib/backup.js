const crypto = require('node:crypto');
const fs = require('node:fs');
const identifier = name => {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) throw new Error('Unsupported database identifier');
    return '"' + name + '"';
};
function key(secret) {
    if (!secret || secret.length < 32) throw new Error('BACKUP_ENCRYPTION_KEY must contain at least 32 random characters');
    return crypto.createHash('sha256').update(secret).digest();
}
async function snapshot(database, secret) {
    const encryptionKey = key(secret);
    const tx = await database.transaction('read');
    let body;
    try {
        const schema = (await tx.execute("SELECT type, name, sql FROM sqlite_master WHERE type IN ('table', 'index', 'trigger', 'view') AND name NOT LIKE 'sqlite_%' AND sql IS NOT NULL ORDER BY type DESC, name")).rows;
        const tables = [];
        for (const entry of schema.filter(entry => entry.type === 'table')) tables.push({ name: entry.name, rows: (await tx.execute('SELECT * FROM ' + identifier(entry.name))).rows.map(row => ({ ...row })) });
        body = JSON.stringify({ version: 1, createdAt: new Date().toISOString(), schema: schema.map(row => ({ ...row })), tables });
        await tx.commit();
    } catch (error) { await tx.rollback(); throw error; }
    finally { await tx.close(); }
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv);
    const data = Buffer.concat([cipher.update(body, 'utf8'), cipher.final()]);
    return JSON.stringify({ version: 1, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: data.toString('base64') });
}
async function restore(backup, secret, destination) {
    const envelope = JSON.parse(backup);
    if (envelope.version !== 1) throw new Error('Unsupported backup');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key(secret), Buffer.from(envelope.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
    const body = JSON.parse(Buffer.concat([decipher.update(Buffer.from(envelope.data, 'base64')), decipher.final()]).toString('utf8'));
    if (body.version !== 1) throw new Error('Unsupported snapshot');
    const SQL = await require('sql.js')();
    const database = new SQL.Database();
    try {
        database.run('BEGIN');
        for (const entry of body.schema.filter(entry => entry.type === 'table')) database.run(entry.sql);
        for (const table of body.tables) {
            for (const row of table.rows) {
                const columns = Object.keys(row);
                database.run(`INSERT INTO ${identifier(table.name)} (${columns.map(identifier).join(',')}) VALUES (${columns.map(() => '?').join(',')})`, Object.values(row));
            }
            const result = database.exec('SELECT COUNT(*) FROM ' + identifier(table.name));
            if (result[0].values[0][0] !== table.rows.length) throw new Error('Restored row count mismatch');
        }
        for (const entry of body.schema.filter(entry => entry.type === 'index')) database.run(entry.sql);
        for (const entry of body.schema.filter(entry => ['view', 'trigger'].includes(entry.type))) database.run(entry.sql);
        database.run('COMMIT');
        if (database.exec('PRAGMA integrity_check')[0].values[0][0] !== 'ok') throw new Error('Restore integrity check failed');
        if (destination) fs.writeFileSync(destination, Buffer.from(database.export()), { flag: 'wx', mode: 0o600 });
        return { createdAt: body.createdAt, tables: body.tables.map(table => ({ name: table.name, count: table.rows.length })) };
    } finally { database.close(); }
}
module.exports = { snapshot, restore };
