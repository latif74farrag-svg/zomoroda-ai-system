// start_bot.js
// Simple wrapper to launch the Facebook publishing automation using the existing authenticated session.
// Usage: node scripts/start_bot.js [--publish-one] [--publish-today]
// If no flag is provided, defaults to publishing the scheduled posts for today.

const { spawn } = require('child_process');
const path = require('path');

const scriptPath = path.join(__dirname, 'facebook_browser_publisher.js');
const args = process.argv.slice(2);

let modeArgs = [];
if (args.includes('--publish-one')) {
  modeArgs = ['--publish-one'];
} else if (args.includes('--publish-today')) {
  modeArgs = ['--publish-today'];
} else {
  // default behaviour – run scheduled publishing for today
  modeArgs = ['--publish-today'];
}

// Detect target mode flags and set environment variable for child process
let targetMode = '';
if (args.includes('--supply')) {
  targetMode = 'supply';
  modeArgs.push('--supply');
} else if (args.includes('--moms')) {
  targetMode = 'moms';
  modeArgs.push('--moms');
} else if (args.includes('--whatsapp')) {
  targetMode = 'whatsapp';
  modeArgs.push('--whatsapp');
}

console.log('🚀 Starting Facebook automation with args:', modeArgs.join(' '));

const childEnv = { ...process.env };
if (targetMode) {
  childEnv.TARGET_MODE = targetMode;
  // Define separate session directory per mode to avoid conflict
  const sessionDir = path.join(__dirname, '..', `${targetMode}_session`);
  childEnv.SESSION_DIR = sessionDir;
}

const child = spawn('node', [scriptPath, ...modeArgs], {
  stdio: 'inherit',
  env: childEnv,
});

child.on('close', (code) => {
  console.log(`✅ Automation process exited with code ${code}`);
  process.exit(code);
});
