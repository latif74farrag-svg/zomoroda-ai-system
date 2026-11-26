// start_bot.js
// Simple wrapper to launch the Facebook publishing automation using the existing authenticated session.
// Usage: node scripts/start_bot.js [--publish-one] [--publish-today]
// If no flag is provided, defaults to publishing the scheduled posts for today.

const { spawn } = require('child_process');
const path = require('path');

const scriptPath = path.join(__dirname, 'facebook_browser_publisher.js');
const args = process.argv.slice(2);

let modeArgs;
if (args.includes('--publish-one')) {
  modeArgs = ['--publish-one'];
} else if (args.includes('--publish-today')) {
  modeArgs = ['--publish-today'];
} else {
  // default behaviour – run scheduled publishing for today
  modeArgs = ['--publish-today'];
}

console.log('🚀 Starting Facebook automation with args:', modeArgs.join(' '));

const child = spawn('node', [scriptPath, ...modeArgs], { stdio: 'inherit' });

child.on('close', (code) => {
  console.log(`✅ Automation process exited with code ${code}`);
  process.exit(code);
});
