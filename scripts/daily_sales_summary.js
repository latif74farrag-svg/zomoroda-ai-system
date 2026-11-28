// daily_sales_summary.js
// Generates a markdown summary of today's sales from Turso DB
// Requires environment variables TURSO_URL and TURSO_TOKEN provided by Vercel

const fs = require('fs');
const { createClient } = require('@libsql/client');

async function generate() {
  const url = process.env.TURSO_URL;
  const token = process.env.TURSO_TOKEN;
  if (!url || !token) {
    console.error('Missing TURSO_URL or TURSO_TOKEN environment variables');
    process.exit(1);
  }
  const client = createClient({ url, authToken: token });
  const query = `
    SELECT DATE(created_at) AS day, sector,
           COUNT(*) AS total_orders,
           SUM(total_amount) AS total_sales,
           SUM(CASE WHEN status='Confirmed' THEN total_amount ELSE 0 END) AS confirmed_sales,
           SUM(CASE WHEN status='Pending' THEN total_amount ELSE 0 END) AS pending_sales
    FROM orders
    WHERE DATE(created_at) = DATE('now')
    GROUP BY day, sector;
  `;
  const result = await client.execute(query);
  const rows = result.rows;
  const date = new Date().toISOString().split('T')[0];
  let md = `# ملخص مبيعات اليوم (${date})\n\n| التاريخ | القطاع | عدد الطلبات | إجمالي المبيعات (ج.م) | مبيعات مؤكدة | مبيعات معلقة |\n|---|---|---|---|---|---|\n`;
  for (const r of rows) {
    md += `| ${r.day} | ${r.sector} | ${r.total_orders} | ${r.total_sales} | ${r.confirmed_sales} | ${r.pending_sales} |\n`;
  }
  fs.writeFileSync('daily_sales_summary.md', md, 'utf8');
  console.log('Summary written to daily_sales_summary.md');
}

generate().catch(err => {
  console.error('Error generating summary:', err);
  process.exit(1);
});
