// Read-only load probe. Run against staging; order concurrency is covered by isolated integration tests.
const { performance } = require('node:perf_hooks');
async function main() {
    const base = process.env.LOAD_TEST_URL || 'http://127.0.0.1:3000';
    const concurrency = Number(process.env.LOAD_TEST_CONCURRENCY || 100);
    const count = Number(process.env.LOAD_TEST_REQUESTS || 1000);
    if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 1000 || !Number.isInteger(count) || count < concurrency || count > 100000) throw new Error('Invalid load test settings');
    const timings = []; let index = 0; let failures = 0;
    const start = performance.now();
    await Promise.all(Array.from({ length: concurrency }, async () => {
        while (index++ < count) {
            const began = performance.now();
            try { const response = await fetch(new URL('/api/v1/products', base), { signal: AbortSignal.timeout(10000) }); await response.arrayBuffer(); if (!response.ok) failures++; }
            catch (_) { failures++; }
            timings.push(performance.now() - began);
        }
    }));
    timings.sort((a, b) => a - b);
    const p95 = timings[Math.ceil(timings.length * .95) - 1];
    console.log(JSON.stringify({ concurrency, requests: count, failures, p95Ms: Math.round(p95), requestsPerSecond: Math.round(count * 1000 / (performance.now() - start)) }));
    if (failures || p95 > 500) process.exitCode = 1;
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
