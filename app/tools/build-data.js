// Builds every practice database and downloadable file, then computes the expected answers
// (with SQL against the finished databases) into data/answers.json. Run: npm run build:data
import fs from 'node:fs';
import path from 'node:path';
import JSZip from 'jszip';
import { APP, DATA, FILES, PRACTICE, sqlite, round2 } from './lib.js';
import { buildCedarline } from './data/cedarline.js';
import { buildRestaurant } from './data/restaurant.js';
import { buildHR } from './data/hr.js';
import { buildPractice } from './data/excel-practice.js';
import { buildExtra } from './data/extra.js';

async function openDb(name) {
  const S = await sqlite();
  return new S.Database(fs.readFileSync(path.join(PRACTICE, `${name}.db`)));
}
const one = (db, sql) => db.exec(sql)[0].values[0];

async function zipFolder(dir, outFile, filter = () => true) {
  const zip = new JSZip();
  const walk = (d, rel) => {
    for (const f of fs.readdirSync(d)) {
      const p = path.join(d, f);
      if (fs.statSync(p).isDirectory()) walk(p, path.join(rel, f));
      else if (filter(f)) zip.file(path.join(rel, f).replace(/\\/g, '/'), fs.readFileSync(p));
    }
  };
  walk(dir, '');
  fs.writeFileSync(outFile, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
}

const t0 = Date.now();
fs.rmSync(FILES, { recursive: true, force: true });
fs.rmSync(PRACTICE, { recursive: true, force: true });

const log = {};
log.cedarline = await buildCedarline();
log.restaurant = await buildRestaurant();
log.hr = await buildHR();
const practice = await buildPractice();

// ------------------------------------------------------------------ expected answers from SQL
const answers = {};
answers['xl-file-summit'] = practice.summit;
answers['xl-file-supplier'] = practice.supplier;
answers['xl-file-regional'] = practice.regional;
answers['xl-file-ngo'] = practice.ngo;
answers['xl-file-trends'] = practice.trends;
answers['xl-file-roster'] = [log.hr.rosterTruth.unique, log.hr.rosterTruth.ops, log.hr.rosterTruth.avgSalary, log.hr.rosterTruth.hires2024, log.hr.rosterTruth.missingEmail];
answers['pq-file-contacts'] = practice.contacts;
answers['pq-file-budget'] = practice.budget;

// Cedarline messy Q2 export + POS exports: ground truth from the original generator
const gt = JSON.parse(fs.readFileSync(path.join(APP, 'seed', 'cedarline_ground_truth.json'), 'utf8'));
answers['xl-file-cedarline-q2'] = [gt.excel.truth_lines, gt.excel.text_dates, gt.excel.unmatched_sku_after_trim,
  gt.excel.completed_net_total, gt.excel.price_anomaly_rows.length, gt.excel.attainment_q2_pct.West];
const w02jul = gt.power_query.store_month.find((r) => r.store === 'W02' && r.month === '2026-07');
answers['pq-file-pos'] = [gt.power_query.total_data_rows, gt.power_query.month_net['2026-06'], gt.power_query.month_net['2026-07'],
  gt.power_query.month_net['2026-08'], 'W02', w02jul.attainment_pct];

// raw CRM export shape (Power Query intro)
{
  const lines = fs.readFileSync(path.join(FILES, 'powerquery', 'crm_contacts_export.csv'), 'utf8').split('\r\n').filter((l, i, a) => !(i === a.length - 1 && l === ''));
  answers['pq-contacts-raw'] = [lines.length - 1, lines[0].split(',').length];
}

// Retail capstone: West region
{
  const db = await openDb('cedarline');
  const inStore = (store, a, b) => one(db, `SELECT SUM(oi.quantity*oi.unit_price*(1-oi.discount_pct)) FROM orders o JOIN order_items oi USING(order_id) WHERE o.status='completed' AND o.channel='In-Store' AND o.store_id='${store}' AND o.order_date BETWEEN '${a}' AND '${b}'`)[0] || 0;
  const s25 = inStore('W01', '2025-01-01', '2025-08-31'), s26 = inStore('W01', '2026-01-01', '2026-08-31'), c26 = inStore('W02', '2026-01-01', '2026-08-31');
  answers['cap-retail'] = {
    westAttainment: gt.excel.attainment_q2_pct.West, westGap: round2(gt.excel.region_q2_net.West - gt.excel.target_q2.West),
    summit2025: round2(s25), summit2026: round2(s26), summitChangePct: round2((s26 / s25 - 1) * 100),
    canyon2026: round2(c26), westInstoreGrowthPct: round2(((s26 + c26) / s25 - 1) * 100),
  };
  db.close();
}

// Power BI pack (Cedarline star schema)
{
  const db = await openDb('cedarline');
  const rev2025 = one(db, `SELECT ROUND(SUM(oi.quantity*oi.unit_price*(1-oi.discount_pct)),2) FROM order_items oi JOIN orders o USING(order_id) WHERE o.status='completed' AND o.order_date BETWEEN '2025-01-01' AND '2025-12-31'`)[0];
  const cust2025 = one(db, `SELECT COUNT(DISTINCT customer_id) FROM orders o WHERE status='completed' AND customer_id IS NOT NULL AND order_date BETWEEN '2025-01-01' AND '2025-12-31' AND EXISTS (SELECT 1 FROM order_items i WHERE i.order_id=o.order_id)`)[0];
  const ord2025 = one(db, `SELECT COUNT(DISTINCT o.order_id) FROM orders o JOIN order_items i USING(order_id) WHERE o.status='completed' AND o.order_date BETWEEN '2025-01-01' AND '2025-12-31'`)[0];
  const m = (a, b) => one(db, `SELECT SUM(oi.quantity*oi.unit_price*(1-oi.discount_pct)) FROM order_items oi JOIN orders o USING(order_id) WHERE o.status='completed' AND o.order_date BETWEEN '${a}' AND '${b}'`)[0];
  const yoy = round2((m('2026-06-01', '2026-06-30') / m('2025-06-01', '2025-06-30') - 1) * 100);
  const topCat = one(db, `SELECT p.category FROM order_items oi JOIN orders o USING(order_id) JOIN products p USING(product_id) WHERE o.status='completed' AND o.order_date BETWEEN '2025-01-01' AND '2025-12-31' GROUP BY p.category ORDER BY SUM(oi.quantity*oi.unit_price*(1-oi.discount_pct)) DESC LIMIT 1`)[0];
  answers['pbi-cedarline-pack'] = [rev2025, cust2025, round2(rev2025 / ord2025), yoy, topCat];
  db.close();
}

// Restaurant: Prime Meats invoices (Power Query) and capstone key numbers
{
  const db = await openDb('restaurant');
  const pmRows = one(db, `SELECT COUNT(*) FROM purchases WHERE supplier_id=1 AND delivery_date BETWEEN '2026-05-01' AND '2026-08-31'`)[0];
  const pmJul = one(db, `SELECT ROUND(SUM(line_total),2) FROM purchases WHERE supplier_id=1 AND delivery_date BETWEEN '2026-07-01' AND '2026-07-31'`)[0];
  const beef = (a, b) => one(db, `SELECT SUM(line_total)/SUM(qty) FROM purchases p JOIN ingredients i USING(ingredient_id) WHERE i.name='Beef mince' AND supplier_id=1 AND delivery_date BETWEEN '${a}' AND '${b}'`)[0];
  const beefPct = round2((beef('2026-06-01', '2026-06-30') / beef('2026-05-01', '2026-05-31') - 1) * 100);
  const topSiteAug = one(db, `SELECT r.name FROM purchases p JOIN ingredients i USING(ingredient_id) JOIN restaurants r USING(restaurant_id) WHERE i.name='Beef mince' AND supplier_id=1 AND delivery_date BETWEEN '2026-08-01' AND '2026-08-31' GROUP BY r.name ORDER BY SUM(qty) DESC LIMIT 1`)[0];
  answers['pq-file-primemeats'] = [pmRows, pmJul, beefPct, topSiteAug];

  // actual food cost % = (opening stock + purchases - closing stock) / net sales
  const foodCostPct = (from, to, openCount, closeCount, rest = null) => {
    const f = rest ? ` AND restaurant_id=${rest}` : '';
    const open = one(db, `SELECT SUM(value_at_cost) FROM inventory_counts WHERE count_date='${openCount}'${f}`)[0];
    const close = one(db, `SELECT SUM(value_at_cost) FROM inventory_counts WHERE count_date='${closeCount}'${f}`)[0];
    const buy = one(db, `SELECT SUM(line_total) FROM purchases WHERE delivery_date BETWEEN '${from}' AND '${to}'${f}`)[0];
    const sales = one(db, `SELECT SUM(net_sales) FROM daily_sales WHERE sale_date BETWEEN '${from}' AND '${to}'${f}`)[0];
    return round2((open + buy - close) / sales * 100);
  };
  const before = foodCostPct('2026-01-01', '2026-05-31', '2025-12-31', '2026-05-31');
  const after = foodCostPct('2026-06-01', '2026-08-31', '2026-05-31', '2026-08-31');
  const byRest = [1, 2, 3].map((r) => [foodCostPct('2026-01-01', '2026-05-31', '2025-12-31', '2026-05-31', r), foodCostPct('2026-06-01', '2026-08-31', '2026-05-31', '2026-08-31', r)]);
  const wasteJul = db.exec(`
    WITH cost AS (SELECT restaurant_id, ingredient_id, SUM(line_total)/SUM(qty) AS unit_cost
                  FROM purchases WHERE delivery_date BETWEEN '2026-07-01' AND '2026-07-31' GROUP BY 1,2)
    SELECT r.name, ROUND(SUM(w.qty * c.unit_cost),2) AS waste_cost
    FROM waste_log w JOIN cost c USING(restaurant_id, ingredient_id) JOIN restaurants r USING(restaurant_id)
    WHERE w.waste_date BETWEEN '2026-07-01' AND '2026-07-31' GROUP BY r.name ORDER BY waste_cost DESC`)[0].values;
  // the supplier switch is hidden by seasonal tomato prices; compare Riverside with Downtown in the SAME month
  const tomato = (rest, a, b) => one(db, `SELECT SUM(p.line_total)/SUM(p.qty) FROM purchases p JOIN ingredients i USING(ingredient_id) WHERE i.name='Tomatoes' AND p.restaurant_id=${rest} AND p.delivery_date BETWEEN '${a}' AND '${b}'`)[0];
  const tomPct = round2((tomato(2, '2026-07-01', '2026-07-31') / tomato(1, '2026-07-01', '2026-07-31') - 1) * 100);
  const tomNaive = round2((tomato(2, '2026-06-01', '2026-08-31') / tomato(2, '2026-03-01', '2026-05-31') - 1) * 100);
  answers['cap-restaurant'] = {
    foodCostBefore: before, foodCostAfter: after, byRestaurant: byRest, beefPct,
    wasteJul, topWasteJul: wasteJul[0][0], riversideVsDowntownTomatoJul: tomPct, riversideTomatoNaive: tomNaive,
    menuPriceChanges2026: one(db, `SELECT COUNT(*) FROM menu_price_history WHERE effective_from >= '2026-01-01'`)[0],
  };
  db.close();
}

// HR: key facts for the attrition project
{
  const db = await openDb('hr');
  const rate = (dept, y) => {
    const [leavers] = one(db, `SELECT COUNT(*) FROM employees WHERE department_id=${dept} AND termination_type='Voluntary' AND strftime('%Y', termination_date)='${y}'`);
    const [avgHead] = one(db, `SELECT (SUM(CASE WHEN hire_date <= '${y}-01-01' AND (termination_date IS NULL OR termination_date > '${y}-01-01') THEN 1 ELSE 0 END)
                                     + SUM(CASE WHEN hire_date <= '${y}-12-31' AND (termination_date IS NULL OR termination_date > '${y}-12-31') THEN 1 ELSE 0 END)) / 2.0
                               FROM employees WHERE department_id=${dept}`);
    return round2(leavers / avgHead * 100);
  };
  answers['cap-hr'] = {
    transportVol2023: rate(2, 2023), transportVol2025: rate(2, 2025), opsVol2025: rate(1, 2025), csVol2025: rate(3, 2025),
    topReasonTransport: one(db, `SELECT primary_reason FROM exit_interviews x JOIN employees e USING(employee_id) WHERE e.department_id=2 AND x.exit_date >= '2025-01-01' GROUP BY 1 ORDER BY COUNT(*) DESC LIMIT 1`)[0],
    driverOT2025: round2(one(db, `SELECT AVG(overtime_hours) FROM attendance_monthly a JOIN employees e USING(employee_id) WHERE e.job_title LIKE '%Driver%' AND a.month LIKE '2025-%'`)[0]),
    driverOT2024: round2(one(db, `SELECT AVG(overtime_hours) FROM attendance_monthly a JOIN employees e USING(employee_id) WHERE e.job_title LIKE '%Driver%' AND a.month LIKE '2024-%'`)[0]),
  };
  db.close();
}

answers['cap-ngo'] = practice.ngoCapstone;

// Returns capstone: why online returns cost so much
{
  const db = await openDb('cedarline');
  const rate = (where) => {
    const [lines, rets] = one(db, `
      SELECT COUNT(DISTINCT oi.order_item_id), COUNT(DISTINCT r.return_id)
      FROM orders o JOIN order_items oi USING(order_id)
      LEFT JOIN returns r ON r.order_item_id = oi.order_item_id
      WHERE o.status='completed' AND ${where}`);
    return round2(rets * 100 / lines);
  };
  const catRates = db.exec(`
    SELECT p.category, ROUND(COUNT(DISTINCT r.return_id)*100.0/COUNT(DISTINCT oi.order_item_id), 2) pct
    FROM order_items oi JOIN products p USING(product_id)
    LEFT JOIN returns r ON r.order_item_id = oi.order_item_id
    GROUP BY p.category ORDER BY pct DESC`)[0].values;
  const onlineRev = one(db, `SELECT SUM(oi.quantity*oi.unit_price*(1-oi.discount_pct)) FROM orders o JOIN order_items oi USING(order_id) WHERE o.status='completed' AND o.channel='Online'`)[0];
  const onlineRefund = one(db, `SELECT SUM(r.refund_amount) FROM returns r JOIN order_items oi USING(order_item_id) JOIN orders o USING(order_id) WHERE o.channel='Online'`)[0];
  const worst = db.exec(`
    SELECT p.product_name, ROUND(COUNT(DISTINCT r.return_id)*100.0/COUNT(DISTINCT oi.order_item_id),1) pct
    FROM order_items oi JOIN products p USING(product_id) LEFT JOIN returns r ON r.order_item_id = oi.order_item_id
    GROUP BY p.product_id HAVING COUNT(DISTINCT oi.order_item_id) >= 80 ORDER BY pct DESC LIMIT 1`)[0].values[0];
  answers['cap-returns'] = {
    onlinePct: rate("o.channel='Online'"), inStorePct: rate("o.channel='In-Store'"),
    topCategory: catRates[0][0], topCategoryPct: catRates[0][1], catRates,
    topReason: one(db, `SELECT reason FROM returns GROUP BY reason ORDER BY COUNT(*) DESC LIMIT 1`)[0],
    topReasonShare: round2(one(db, `SELECT COUNT(*) FROM returns WHERE reason='Wrong size'`)[0] * 100 / one(db, `SELECT COUNT(*) FROM returns`)[0]),
    wrongSizeCategories: db.exec(`SELECT DISTINCT p.category FROM returns r JOIN order_items oi USING(order_item_id) JOIN products p USING(product_id) WHERE r.reason='Wrong size'`)[0].values.map((v) => v[0]),
    onlineRefund: round2(onlineRefund), onlineRefundPctOfRevenue: round2(onlineRefund * 100 / onlineRev),
    worstProduct: worst[0], worstProductPct: worst[1],
  };
  db.close();
}

// Retention capstone: the cohort-maturity trap
{
  const db = await openDb('cedarline');
  const lifetime = db.exec(`
    WITH o AS (SELECT customer_id, COUNT(DISTINCT order_id) n FROM orders WHERE status='completed' AND customer_id IS NOT NULL GROUP BY 1)
    SELECT strftime('%Y', c.signup_date) cohort, COUNT(*) custs,
           ROUND(SUM(CASE WHEN o.n > 1 THEN 1 ELSE 0 END)*100.0/COUNT(*), 1) repeat_pct
    FROM o JOIN customers c USING(customer_id) GROUP BY 1 ORDER BY 1`)[0].values;
  // like-for-like: did they order again within 90 days of their first order?
  const mature = db.exec(`
    WITH f AS (SELECT customer_id, MIN(order_date) first_o FROM orders WHERE status='completed' AND customer_id IS NOT NULL GROUP BY 1),
    r AS (SELECT f.customer_id, f.first_o,
                 MAX(CASE WHEN o.order_date > f.first_o AND julianday(o.order_date) - julianday(f.first_o) <= 90 THEN 1 ELSE 0 END) repeated
          FROM f JOIN orders o ON o.customer_id = f.customer_id AND o.status='completed' GROUP BY 1)
    SELECT strftime('%Y', first_o) cohort, COUNT(*) custs, ROUND(SUM(repeated)*100.0/COUNT(*), 1) repeat90
    FROM r WHERE julianday('2026-08-31') - julianday(first_o) >= 90 GROUP BY 1 ORDER BY 1`)[0].values;
  const byChannel = db.exec(`
    WITH o AS (SELECT customer_id, COUNT(DISTINCT order_id) n FROM orders WHERE status='completed' AND customer_id IS NOT NULL GROUP BY 1)
    SELECT COALESCE(c.acquisition_channel, 'Not recorded') ch, COUNT(*) custs,
           ROUND(SUM(CASE WHEN o.n > 1 THEN 1 ELSE 0 END)*100.0/COUNT(*), 1) repeat_pct
    FROM o JOIN customers c USING(customer_id) GROUP BY 1 ORDER BY repeat_pct DESC`)[0].values;
  answers['cap-retention'] = {
    lifetime, mature, byChannel,
    naiveFirst: lifetime[0][2], naiveLast: lifetime[lifetime.length - 1][2],
    mature2024: mature.find((r) => r[0] === '2024')[2], mature2026: mature.find((r) => r[0] === '2026')[2],
    bestChannel: byChannel[0][0], bestChannelPct: byChannel[0][1 + 1],
    duplicateEmails: one(db, `SELECT COUNT(*) FROM (SELECT email FROM customers WHERE email IS NOT NULL GROUP BY LOWER(TRIM(email)) HAVING COUNT(*) > 1)`)[0],
  };
  db.close();
}

// Inventory & waste capstone
{
  const db = await openDb('restaurant');
  const bySite = db.exec(`
    WITH c AS (SELECT restaurant_id, ingredient_id, SUM(line_total)/SUM(qty) uc FROM purchases WHERE delivery_date BETWEEN '2026-06-01' AND '2026-08-31' GROUP BY 1,2),
    w AS (SELECT w.restaurant_id, SUM(w.qty*c.uc) wc FROM waste_log w JOIN c USING(restaurant_id, ingredient_id) WHERE w.waste_date BETWEEN '2026-06-01' AND '2026-08-31' GROUP BY 1),
    p AS (SELECT restaurant_id, SUM(line_total) pc FROM purchases WHERE delivery_date BETWEEN '2026-06-01' AND '2026-08-31' GROUP BY 1)
    SELECT r.name, ROUND(w.wc, 2), ROUND(w.wc*100.0/p.pc, 2)
    FROM w JOIN p USING(restaurant_id) JOIN restaurants r USING(restaurant_id) ORDER BY 3 DESC`)[0].values;
  const byReason = db.exec(`
    WITH c AS (SELECT restaurant_id, ingredient_id, SUM(line_total)/SUM(qty) uc FROM purchases WHERE delivery_date >= '2026-01-01' GROUP BY 1,2)
    SELECT w.reason, ROUND(SUM(w.qty*c.uc), 2) cost FROM waste_log w JOIN c USING(restaurant_id, ingredient_id)
    WHERE w.waste_date >= '2026-01-01' GROUP BY 1 ORDER BY cost DESC`)[0].values;
  const byIngredient = db.exec(`
    WITH c AS (SELECT restaurant_id, ingredient_id, SUM(line_total)/SUM(qty) uc FROM purchases WHERE delivery_date >= '2026-01-01' GROUP BY 1,2)
    SELECT i.name, ROUND(SUM(w.qty*c.uc), 2) cost FROM waste_log w JOIN c USING(restaurant_id, ingredient_id) JOIN ingredients i USING(ingredient_id)
    WHERE w.waste_date >= '2026-01-01' GROUP BY 1 ORDER BY cost DESC LIMIT 5`)[0].values;
  answers['cap-waste'] = {
    bySite, byReason, byIngredient,
    worstSite: bySite[0][0], worstSitePct: bySite[0][2], bestSitePct: bySite[bySite.length - 1][2],
    topReason: byReason[0][0], topReasonCost: byReason[0][1],
    topIngredient: byIngredient[0][0],
    equipmentFailureEvents: one(db, `SELECT COUNT(*) FROM waste_log WHERE reason='Equipment failure' AND waste_date >= '2026-01-01'`)[0],
  };
  db.close();
}

// Supplier performance capstone
{
  const db = await openDb('restaurant');
  const spend = db.exec(`
    SELECT s.name, ROUND(SUM(p.line_total), 2) total
    FROM purchases p JOIN suppliers s USING(supplier_id)
    WHERE p.delivery_date BETWEEN '2026-01-01' AND '2026-08-31' GROUP BY 1 ORDER BY total DESC`)[0].values;
  const totalSpend = spend.reduce((a, r) => a + r[1], 0);
  const priceChange = db.exec(`
    WITH p AS (SELECT supplier_id, ingredient_id, strftime('%Y-%m', delivery_date) mo, SUM(line_total)/SUM(qty) uc FROM purchases GROUP BY 1,2,3)
    SELECT s.name, ROUND(AVG(CASE WHEN p.mo='2026-08' THEN p.uc END)/AVG(CASE WHEN p.mo='2026-05' THEN p.uc END)*100 - 100, 1)
    FROM p JOIN suppliers s USING(supplier_id) WHERE p.mo IN ('2026-05','2026-08') GROUP BY s.name ORDER BY 2 DESC`)[0].values.filter((r) => r[1] !== null);
  // same produce items, same months: how much dearer is QuickVeg than GreenLeaf?
  const premium = one(db, `
    WITH p AS (SELECT supplier_id, ingredient_id, SUM(qty) q, SUM(line_total) t FROM purchases WHERE delivery_date BETWEEN '2026-06-01' AND '2026-08-31' GROUP BY 1,2),
    common AS (SELECT ingredient_id FROM p WHERE supplier_id IN (4,5) GROUP BY 1 HAVING COUNT(DISTINCT supplier_id) = 2)
    SELECT ROUND(SUM(CASE WHEN supplier_id=5 THEN t END)/SUM(CASE WHEN supplier_id=5 THEN q END)
               / (SUM(CASE WHEN supplier_id=4 THEN t END)/SUM(CASE WHEN supplier_id=4 THEN q END)) * 100 - 100, 1)
    FROM p WHERE ingredient_id IN (SELECT ingredient_id FROM common)`)[0];
  answers['cap-supplier'] = {
    spend, priceChange, quickVegPremiumPct: premium,
    topSupplier: spend[0][0], topSupplierSpend: spend[0][1],
    topSupplierShare: round2(spend[0][1] * 100 / totalSpend),
    biggestRiser: priceChange[0][0], biggestRiserPct: priceChange[0][1],
    quickVegSpend: round2((spend.find((r) => r[0] === 'QuickVeg Wholesale') || [0, 0])[1]),
  };
  db.close();
}

// Sales-growth capstone (SQL + Power BI): is the growth real, and what is driving it?
{
  const db = await openDb('restaurant');
  const P25 = "BETWEEN '2025-01-01' AND '2025-08-31'";
  const P26 = "BETWEEN '2026-01-01' AND '2026-08-31'";
  const group = one(db, `
    SELECT ROUND(SUM(CASE WHEN sale_date ${P25} THEN net_sales END), 2),
           ROUND(SUM(CASE WHEN sale_date ${P26} THEN net_sales END), 2),
           ROUND(SUM(CASE WHEN sale_date ${P26} THEN net_sales END) * 100.0 / SUM(CASE WHEN sale_date ${P25} THEN net_sales END) - 100, 2),
           SUM(CASE WHEN sale_date ${P25} THEN qty_sold END),
           SUM(CASE WHEN sale_date ${P26} THEN qty_sold END),
           ROUND(SUM(CASE WHEN sale_date ${P26} THEN qty_sold END) * 100.0 / SUM(CASE WHEN sale_date ${P25} THEN qty_sold END) - 100, 2)
    FROM daily_sales`);
  const bySite = db.exec(`
    SELECT r.name,
           ROUND(SUM(CASE WHEN d.sale_date ${P26} THEN d.net_sales END), 2) sales26,
           ROUND(SUM(CASE WHEN d.sale_date ${P26} THEN d.net_sales END) * 100.0 / SUM(CASE WHEN d.sale_date ${P25} THEN d.net_sales END) - 100, 2) growth,
           ROUND(SUM(CASE WHEN d.sale_date ${P26} THEN d.qty_sold END) * 100.0 / SUM(CASE WHEN d.sale_date ${P25} THEN d.qty_sold END) - 100, 2) qtyGrowth
    FROM daily_sales d JOIN restaurants r USING(restaurant_id) GROUP BY r.name ORDER BY growth DESC`)[0].values;
  const byDish = db.exec(`
    SELECT m.name, ROUND(SUM(d.net_sales), 2), ROUND(SUM(d.net_sales) * 100.0 / (SELECT SUM(net_sales) FROM daily_sales WHERE sale_date ${P26}), 2)
    FROM daily_sales d JOIN menu_items m USING(menu_item_id) WHERE d.sale_date ${P26} GROUP BY 1 ORDER BY 2 DESC LIMIT 5`)[0].values;
  const byCategory = db.exec(`
    SELECT m.category, ROUND(SUM(d.net_sales), 2) sales, ROUND(SUM(d.net_sales) * 100.0 / (SELECT SUM(net_sales) FROM daily_sales WHERE sale_date ${P26}), 2) share, SUM(d.qty_sold) units
    FROM daily_sales d JOIN menu_items m USING(menu_item_id) WHERE d.sale_date ${P26} GROUP BY 1 ORDER BY sales DESC`)[0].values;
  const byMonth = db.exec(`
    SELECT strftime('%Y-%m', sale_date), ROUND(SUM(net_sales), 2) FROM daily_sales WHERE sale_date ${P26} GROUP BY 1 ORDER BY 2 DESC`)[0].values;
  const mostUnits = [...byCategory].sort((a, b) => b[3] - a[3])[0];
  // the two leaders must be far enough apart for a "which one" answer to be fair
  if (bySite[0][2] - bySite[1][2] < 1) throw new Error('cap-sales: site growth leaders are too close');
  if (byDish[0][2] / byDish[1][2] < 1.15) throw new Error('cap-sales: top two dishes are too close');
  if (byCategory[0][1] / byCategory[1][1] < 1.15) throw new Error('cap-sales: top two categories are too close');
  answers['cap-sales'] = {
    bySite, byDish, byCategory, byMonth,
    sales25: group[0], sales26: group[1], growthPct: group[2],
    qty25: group[3], qty26: group[4], qtyGrowthPct: group[5],
    bestSite: bySite[0][0], bestSiteGrowthPct: bySite[0][2], bestSiteQtyGrowthPct: bySite[0][3],
    topDish: byDish[0][0], topDishSales: byDish[0][1], topDishSharePct: byDish[0][2],
    topCategory: byCategory[0][0], topCategorySharePct: byCategory[0][2],
    mostUnitsCategory: mostUnits[0], mostUnitsCategoryUnits: mostUnits[3], mostUnitsCategorySharePct: mostUnits[2],
    peakMonth: byMonth[0][0], peakMonthSales: byMonth[0][1],
    troughMonth: byMonth[byMonth.length - 1][0], troughMonthSales: byMonth[byMonth.length - 1][1],
    priceRisePct: one(db, `SELECT ROUND(AVG(b.price * 100.0 / a.price) - 100, 2) FROM menu_price_history a JOIN menu_price_history b USING(menu_item_id)
                           WHERE a.effective_from = '2025-01-01' AND b.effective_from = '2025-10-01'`)[0],
  };
  db.close();
}

// Site profitability capstone (SQL + Excel): which site actually makes money, and why
{
  const db = await openDb('restaurant');
  const pl = db.exec(`
    WITH s AS (SELECT restaurant_id, SUM(net_sales) ns FROM daily_sales WHERE sale_date BETWEEN '2026-01-01' AND '2026-08-31' GROUP BY 1),
    p AS (SELECT restaurant_id, SUM(line_total) pur FROM purchases WHERE delivery_date BETWEEN '2026-01-01' AND '2026-08-31' GROUP BY 1),
    o AS (SELECT restaurant_id, SUM(value_at_cost) v FROM inventory_counts WHERE count_date = '2025-12-31' GROUP BY 1),
    c AS (SELECT restaurant_id, SUM(value_at_cost) v FROM inventory_counts WHERE count_date = '2026-08-31' GROUP BY 1),
    lv AS (SELECT restaurant_id, SUM(labor_cost) lc FROM labor_daily WHERE work_date BETWEEN '2026-01-01' AND '2026-08-31' AND role <> 'Management' GROUP BY 1),
    lf AS (SELECT restaurant_id, SUM(labor_cost) lc FROM labor_daily WHERE work_date BETWEEN '2026-01-01' AND '2026-08-31' AND role = 'Management' GROUP BY 1),
    oc AS (SELECT restaurant_id, SUM(amount) a FROM operating_costs WHERE month LIKE '2026%' GROUP BY 1),
    rent AS (SELECT restaurant_id, SUM(amount) a FROM operating_costs WHERE month LIKE '2026%' AND cost_type = 'Rent' GROUP BY 1)
    SELECT r.name, ROUND(s.ns, 2), ROUND(o.v + p.pur - c.v, 2), ROUND(lv.lc + lf.lc, 2), ROUND(oc.a, 2),
           ROUND(s.ns - (o.v + p.pur - c.v) - lv.lc - lf.lc - oc.a, 2) profit,
           ROUND((s.ns - (o.v + p.pur - c.v) - lv.lc - lf.lc - oc.a) * 100.0 / s.ns, 2) margin,
           ROUND(rent.a, 2), ROUND(rent.a * 100.0 / s.ns, 2),
           ROUND((lv.lc + lf.lc) * 100.0 / s.ns, 2),
           ROUND(oc.a + lf.lc, 2) fixed,
           ROUND((oc.a + lf.lc) / (1 - (o.v + p.pur - c.v + lv.lc) / s.ns), 2) breakeven
    FROM restaurants r JOIN s USING(restaurant_id) JOIN p USING(restaurant_id) JOIN o USING(restaurant_id) JOIN c USING(restaurant_id)
    JOIN lv USING(restaurant_id) JOIN lf USING(restaurant_id) JOIN oc USING(restaurant_id) JOIN rent USING(restaurant_id)
    ORDER BY margin DESC`)[0].values;
  const worst = pl[pl.length - 1];
  const bestRentPct = Math.min(...pl.map((r) => r[8]));
  const cheapestRent = pl.find((r) => r[8] === bestRentPct);
  if (pl[pl.length - 2][6] - worst[6] < 3) throw new Error('cap-profit: the worst margin is not clearly worst');
  const profitOnCheapRent = round2(worst[5] + worst[7] - cheapestRent[7]);
  answers['cap-profit'] = {
    pl,
    worstSite: worst[0], worstSales: worst[1], worstProfit: worst[5], worstMargin: worst[6],
    worstRent: worst[7], worstRentPct: worst[8], worstLabourPct: worst[9],
    worstBreakEven: worst[11], worstTimesOverBreakEven: round2(worst[1] / worst[11]),
    cheapestRentSite: cheapestRent[0], cheapestRent: cheapestRent[7], cheapestRentPct: cheapestRent[8],
    profitOnCheapRent, marginOnCheapRent: round2(profitOnCheapRent * 100 / worst[1]),
    groupProfit: round2(pl.reduce((a, r) => a + r[5], 0)),
    bestMargin: pl[0][6], bestSite: pl[0][0],
  };
  db.close();
}

// data and answers added by the content expansion (tools/data/extra.js)
{
  const extra = await buildExtra(answers);
  for (const [k, v] of Object.entries(extra.answers)) {
    if (k in answers) throw new Error(`extra answer key ${k} clashes with an original one`);
    answers[k] = v;
  }
}

fs.writeFileSync(path.join(DATA, 'answers.json'), JSON.stringify(answers, null, 1));

// ------------------------------------------------------------------ zip packs for one-click download
await zipFolder(path.join(FILES, 'restaurant'), path.join(FILES, 'olive_ember_capstone_pack.zip'));
await zipFolder(path.join(FILES, 'powerquery', 'cedarline_pos_exports'), path.join(FILES, 'cedarline_pos_exports.zip'));
await zipFolder(path.join(FILES, 'powerquery', 'prime_meats_invoices'), path.join(FILES, 'prime_meats_invoices.zip'));
await zipFolder(path.join(FILES, 'powerbi', 'cedarline_star_schema'), path.join(FILES, 'cedarline_powerbi_pack.zip'));

console.log(JSON.stringify({ seconds: (Date.now() - t0) / 1000, ...log, answers }, null, 1));
