const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
function files(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        if (entry.name.startsWith('.') || ['node_modules', 'backups', 'coverage'].includes(entry.name)) return [];
        const filename = path.join(directory, entry.name);
        return entry.isDirectory() ? files(filename) : filename.endsWith('.js') ? [filename] : [];
    });
}
let failed = false;
for (const filename of files('.')) {
    const result = spawnSync(process.execPath, ['--check', filename], { encoding: 'utf8' });
    if (result.status !== 0) { failed = true; console.error(result.stderr); }
}
const configuration = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
const included = configuration.builds[0].config.includeFiles;
if (included.some(file => /\.(?:db|xlsx|pdf)$/.test(file) || file === 'config.json')) { failed = true; console.error('Sensitive data included in Vercel bundle'); }
if (failed) process.exitCode = 1;
else console.log('JavaScript syntax and deployment bundle checks passed');
