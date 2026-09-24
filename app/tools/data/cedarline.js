// Cedarline Outdoor Supply (retail). Reuses the data generated for the old diagnostic:
// converts the PostgreSQL script to SQLite and copies the messy Excel/CSV exports.
import fs from 'node:fs';
import path from 'node:path';
import { APP, FILES, PRACTICE, sqlite, ensureDir, writeCsv } from '../lib.js';

export async function buildCedarline() {
  const src = fs.readFileSync(path.join(APP, 'seed', 'cedarline_retail.sql'), 'utf8');
  const sql = src
    .split('\n')
    .filter((l) => !/^\s*(SET |DROP SCHEMA|CREATE SCHEMA|COMMENT ON)/i.test(l))
    .join('\n')
    .replace(/NUMERIC\(\d+,\d+\)/g, 'REAL')
    .replace(/\bDATE\b/g, 'TEXT') // uppercase type keyword only; column names are lowercase
    .replace(/\bBOOLEAN\b/g, 'INTEGER')
    .replace(/\bVARCHAR\(\d+\)/g, 'TEXT');
  const S = await sqlite();
  const db = new S.Database();
  db.exec(sql);
  db.exec('VACUUM');
  const out = path.join(PRACTICE, 'cedarline.db');
  ensureDir(PRACTICE);
  fs.writeFileSync(out, Buffer.from(db.export()));
  const counts = {};
  for (const t of ['stores', 'employees', 'customers', 'products', 'orders', 'order_items', 'returns']) {
    counts[t] = db.exec(`SELECT COUNT(*) FROM ${t}`)[0].values[0][0];
  }

  // Power BI starter pack: a star schema extracted from the database
  const pbi = path.join(FILES, 'powerbi', 'cedarline_star_schema');
  const q = (s) => db.exec(s)[0];
  const dump = (name, s) => { const r = q(s); writeCsv(path.join(pbi, name), r.columns, r.values); return r.values.length; };
  dump('fact_sales.csv', `
    SELECT oi.order_item_id AS sales_line_id, o.order_id, o.order_date, o.customer_id, p.product_id,
           COALESCE(o.store_id, 'ONLINE') AS store_id, o.channel, oi.quantity, oi.unit_price, oi.discount_pct,
           ROUND(oi.quantity * oi.unit_price * (1 - oi.discount_pct), 2) AS net_revenue,
           ROUND(oi.quantity * p.unit_cost, 2) AS cost
    FROM order_items oi JOIN orders o USING (order_id) JOIN products p USING (product_id)
    WHERE o.status = 'completed' ORDER BY oi.order_item_id`);
  dump('dim_product.csv', `SELECT product_id, sku, product_name, category, unit_cost, list_price, is_active FROM products ORDER BY product_id`);
  dump('dim_store.csv', `SELECT store_id, store_name, region, opened_on FROM stores UNION ALL SELECT 'ONLINE', 'Online shop', 'Online', '2021-03-01'`);
  dump('dim_customer.csv', `SELECT customer_id, city, region, signup_date, acquisition_channel FROM customers ORDER BY customer_id`);
  db.close();

  // Messy exports reused as-is
  const retail = ensureDir(path.join(FILES, 'retail'));
  fs.copyFileSync(path.join(APP, 'seed', 'cedarline_q2_2026_order_lines.xlsx'), path.join(retail, 'cedarline_q2_2026_order_lines.xlsx'));
  const pos = ensureDir(path.join(FILES, 'powerquery', 'cedarline_pos_exports'));
  for (const f of fs.readdirSync(path.join(APP, 'seed', 'pos_exports'))) {
    fs.copyFileSync(path.join(APP, 'seed', 'pos_exports', f), path.join(pos, f));
  }
  for (const f of ['stores.csv', 'store_targets_summer_2026.csv']) {
    fs.copyFileSync(path.join(APP, 'seed', f), path.join(FILES, 'powerquery', f));
  }
  return counts;
}
