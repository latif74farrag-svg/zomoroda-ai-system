// run_dual_facebook_campaign.js
// Executes both supply and moms Facebook campaigns in parallel.
// Usage: node scripts/run_dual_facebook_campaign.js

const { spawn } = require('child_process');
const path = require('path');

function launchCampaign(flag) {
  const scriptPath = path.join(__dirname, 'facebook_browser_publisher.js');
  const env = { ...process.env };
  // Use a fresh session directory per launch to avoid lock conflicts
  env.SESSION_DIR = path.join(__dirname, '..', `${flag}_session_${Date.now()}`);
  const child = spawn('node', [scriptPath, '--publish-today', `--${flag}`], {
    stdio: 'inherit',
    env,
  });
  child.on('close', code => {
    console.log(`✅ ${flag} campaign exited with code ${code}`);
  });
  return child;
}

console.log('🚀 Starting dual Facebook campaigns (supply & moms)');
const supply = launchCampaign('supply');
const moms = launchCampaign('moms');

// Wait for both to finish before exiting main process.
let finished = 0;
function checkDone() {
  finished += 1;
  if (finished === 2) process.exit(0);
}
[supply, moms].forEach(proc => proc.on('close', checkDone));
