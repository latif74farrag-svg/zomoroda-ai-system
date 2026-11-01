const fs = require('node:fs');
const path = require('node:path');
const { createClient } = require('@libsql/client/web');

function production() { return process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL); }
function configured() {
    return Boolean(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) || !production();
}

// One sql.js owner per local database. Serialize transactions so async callbacks cannot interleave.
async function localDatabase(filename) {
    const SQL = await require('sql.js')();
    let unlock = () => {};
    if (filename !== ':memory:') {
        fs.mkdirSync(path.dirname(filename), { recursive: true });
        const lock = filename + '.lock';
        if (fs.existsSync(lock)) {
            const pid = Number(fs.readFileSync(lock, 'utf8'));
            if (!Number.isSafeInteger(pid) || pid < 1) throw new Error('Invalid local database lock; inspect it before removal');
            try { process.kill(pid, 0); }
            catch (error) { if (error.code === 'ESRCH') fs.unlinkSync(lock); else throw error; }
        }
        try { fs.writeFileSync(lock, String(process.pid), { flag: 'wx', mode: 0o600 }); }
        catch (error) { throw new Error('Local commerce database already has an owner. Use Turso for separate server and worker processes.', { cause: error }); }
        unlock = () => { if (fs.existsSync(lock) && fs.readFileSync(lock, 'utf8') === String(process.pid)) fs.unlinkSync(lock); };
        process.once('exit', unlock);
    }
    let database = fs.existsSync(filename) ? new SQL.Database(fs.readFileSync(filename)) : new SQL.Database();
    let queue = Promise.resolve();
    const execute = async statement => {
        const { sql, args = [] } = typeof statement === 'string' ? { sql: statement } : statement;
        const stmt = database.prepare(sql);
        try {
            stmt.bind(args);
            const rows = [];
            while (stmt.step()) rows.push(stmt.getAsObject());
            return { rows, rowsAffected: database.getRowsModified() };
        } finally { stmt.free(); }
    };
    const persist = () => {
        if (filename === ':memory:') return;
        fs.mkdirSync(path.dirname(filename), { recursive: true });
        const temporary = filename + '.tmp';
        fs.writeFileSync(temporary, Buffer.from(database.export()), { mode: 0o600 });
        fs.renameSync(temporary, filename);
    };
    const transaction = async () => {
        let release;
        const previous = queue;
        queue = new Promise(resolve => { release = resolve; });
        await previous;
        const before = database.export();
        database.run('BEGIN IMMEDIATE');
        let finished = false;
        const finish = async commit => {
            if (finished) return;
            finished = true;
            try {
                database.run(commit ? 'COMMIT' : 'ROLLBACK');
                if (commit) persist();
            } catch (error) {
                database.close();
                database = new SQL.Database(before);
                throw error;
            } finally { release(); }
        };
        return { execute, commit: () => finish(true), rollback: () => finish(false), close: () => finish(false) };
    };
    const batch = async statements => {
        const tx = await transaction();
        try {
            const results = [];
            for (const statement of statements) results.push(await tx.execute(statement));
            await tx.commit();
            return results;
        } catch (error) { await tx.rollback(); throw error; }
    };
    return {
        execute: async statement => (await batch([statement]))[0],
        batch, transaction,
        close: () => { database.close(); process.removeListener('exit', unlock); unlock(); }
    };
}

let connection;
async function getDatabase() {
    if (!configured()) throw Object.assign(new Error('Persistent database is required in production'), { status: 503 });
    if (!connection) {
        connection = process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN
            ? Promise.resolve(createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN }))
            : localDatabase(process.env.COMMERCE_DB_PATH || path.join(__dirname, '..', '.runtime', 'commerce.db'));
        connection.catch(() => { connection = undefined; });
    }
    return connection;
}

async function transaction(database, operation) {
    const tx = await database.transaction('write');
    try {
        const result = await operation(tx);
        await tx.commit();
        return result;
    } catch (error) { await tx.rollback(); throw error; }
    finally { await tx.close(); }
}
module.exports = { getDatabase, localDatabase, transaction, production, configured };
