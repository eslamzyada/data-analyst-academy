// Expected answers for the Analyst Thinking practice tasks, computed with SQL on the practice
// databases the learner uses in SQL Lab.
import fs from 'node:fs';
import path from 'node:path';
import { PRACTICE, sqlite, round2 } from '../lib.js';
import { clearTop } from './answers-pbi.js';

const REV = 'oi.quantity * oi.unit_price * (1 - oi.discount_pct)';

export async function thinkAnswers() {
  const S = await sqlite();
  const open = (n) => new S.Database(fs.readFileSync(path.join(PRACTICE, `${n}.db`)));
  const c = open('cedarline'), h = open('hr'), r = open('restaurant');
  const one = (db, sql) => { const x = db.exec(sql); if (!x.length) throw new Error(`no result: ${sql}`); return x[0].values[0]; };
  const rows = (db, sql) => (db.exec(sql)[0] || { values: [] }).values;
  const pct = (a, b) => round2((a / b) * 100);
  const a = {};

  // ---------------------------------------------------------------- data quality (Cedarline customers)
  {
    const [dupRows, people, extra] = one(c, `WITH d AS (SELECT lower(trim(email)) e, COUNT(*) n FROM customers GROUP BY 1 HAVING n > 1)
      SELECT SUM(n), COUNT(*), SUM(n) - COUNT(*) FROM d`);
    a['think-q-dupes'] = [dupRows, people, extra];
    const [early, earlyCust] = one(c, `SELECT COUNT(*), COUNT(DISTINCT o.customer_id) FROM orders o JOIN customers cu USING(customer_id) WHERE o.order_date < cu.signup_date`);
    const earliestGap = one(c, `SELECT MAX(julianday(cu.signup_date) - julianday(o.order_date)) FROM orders o JOIN customers cu USING(customer_id) WHERE o.order_date < cu.signup_date`)[0];
    a['think-q-dates'] = [early, earlyCust, Math.round(earliestGap)];
    const [noChannel, total] = one(c, `SELECT SUM(acquisition_channel IS NULL), COUNT(*) FROM customers`);
    const noChannelRev = one(c, `SELECT SUM(${REV}) FROM orders o JOIN order_items oi USING(order_id) JOIN customers cu USING(customer_id)
      WHERE o.status = 'completed' AND cu.acquisition_channel IS NULL AND o.order_date LIKE '2025%'`)[0];
    a['think-q-missing'] = [noChannel, pct(noChannel, total), round2(noChannelRev)];
  }
  // same-day salary records (HR)
  {
    const pairs = one(h, `SELECT COUNT(*) FROM (SELECT employee_id, effective_date FROM salary_history GROUP BY 1, 2 HAVING COUNT(*) > 1)`)[0];
    const promoHigher = one(h, `SELECT COUNT(*) FROM (SELECT employee_id, effective_date,
        MAX(CASE WHEN change_reason = 'Promotion' THEN salary END) p, MAX(CASE WHEN change_reason <> 'Promotion' THEN salary END) o
        FROM salary_history GROUP BY 1, 2 HAVING COUNT(*) > 1) WHERE p > o`)[0];
    const [rowsAll] = one(h, 'SELECT COUNT(*) FROM salary_history');
    if (promoHigher !== pairs) throw new Error('expected every same-day pair to be raise + higher promotion');
    a['think-q-salary'] = [pairs, promoHigher, rowsAll - pairs];
  }

  // ---------------------------------------------------------------- averages and outliers
  {
    const refunds = rows(c, 'SELECT refund_amount FROM returns ORDER BY 1').map((x) => x[0]);
    const n = refunds.length;
    const median = n % 2 ? refunds[(n - 1) / 2] : (refunds[n / 2 - 1] + refunds[n / 2]) / 2;
    a['think-avg-refund'] = [round2(refunds.reduce((s, x) => s + x, 0) / n), median, refunds.filter((x) => x > 200).length];

    const sal = rows(h, 'SELECT current_salary FROM employees WHERE termination_date IS NULL ORDER BY 1').map((x) => x[0]);
    const m = sal.length;
    const med = m % 2 ? sal[(m - 1) / 2] : (sal[m / 2 - 1] + sal[m / 2]) / 2;
    a['think-avg-salary'] = [m, round2(sal.reduce((s, x) => s + x, 0) / m), med, sal.filter((x) => x > 2 * med).length];

    const sites = rows(r, `SELECT r.name, SUM(s.net_sales) / SUM(s.qty_sold) FROM daily_sales s JOIN restaurants r USING(restaurant_id)
      WHERE s.sale_date LIKE '2026-07%' GROUP BY 1`);
    const simple = sites.reduce((s, x) => s + x[1], 0) / sites.length;
    const overall = one(r, `SELECT SUM(net_sales) / SUM(qty_sold) FROM daily_sales WHERE sale_date LIKE '2026-07%'`)[0];
    const top = clearTop(Object.fromEntries(sites), { what: 'highest price per item site' });
    a['think-avg-price'] = [round2(simple), round2(overall), top];
  }

  // ---------------------------------------------------------------- interpreting results
  {
    const perDay = (dow) => one(r, `SELECT SUM(net_sales) / COUNT(DISTINCT sale_date) FROM daily_sales
      WHERE restaurant_id = 1 AND sale_date LIKE '2026-07%' AND strftime('%w', sale_date) = '${dow}'`)[0];
    const sat = perDay(6), mon = perDay(1);
    a['think-int-weekday'] = [round2(sat), round2(mon), pct(sat - mon, mon)];
    const month = (mo) => one(r, `SELECT SUM(net_sales) FROM daily_sales WHERE restaurant_id = 2 AND sale_date LIKE '${mo}%'`)[0];
    const dec25 = month('2025-12'), jan26 = month('2026-01'), jan25 = month('2025-01');
    a['think-int-season'] = [round2(jan26), pct(jan26 - dec25, dec25), pct(jan26 - jan25, jan25)];
    // discounts are heavier on slow days: the classic reverse-causation trap
    const dayStats = (dow) => one(r, `SELECT SUM(gross_sales) / COUNT(DISTINCT sale_date), SUM(discount_amount) / SUM(gross_sales)
      FROM daily_sales WHERE sale_date LIKE '2026%' AND strftime('%w', sale_date) = '${dow}'`);
    const [monGross, monDisc] = dayStats(1);
    const [satGross, satDisc] = dayStats(6);
    a['think-cause-discount'] = [round2(monGross), round2(satGross), round2(monDisc * 100), round2(satDisc * 100)];
  }

  // ---------------------------------------------------------------- definitions
  {
    const rev = (where) => one(c, `SELECT SUM(${REV}) FROM orders o JOIN order_items oi USING(order_id) WHERE o.order_date LIKE '2025%' AND ${where}`)[0];
    const completed = rev(`o.status = 'completed'`);
    const allStatus = rev('1 = 1');
    const refunds = one(c, `SELECT SUM(rt.refund_amount) FROM returns rt JOIN order_items oi USING(order_item_id) JOIN orders o USING(order_id)
      WHERE o.status = 'completed' AND o.order_date LIKE '2025%'`)[0];
    a['think-def-revenue'] = [round2(completed), round2(allStatus), round2(refunds), round2(completed - refunds)];

    const active = (d) => one(h, `SELECT COUNT(*) FROM employees WHERE hire_date <= '${d}' AND (termination_date IS NULL OR termination_date > '${d}')`)[0];
    const ends = ['2025-01-31', '2025-02-28', '2025-03-31', '2025-04-30', '2025-05-31', '2025-06-30', '2025-07-31', '2025-08-31', '2025-09-30', '2025-10-31', '2025-11-30', '2025-12-31'];
    const avgHead = ends.reduce((s, d) => s + active(d), 0) / ends.length;
    const vol = one(h, `SELECT COUNT(*) FROM employees WHERE termination_date LIKE '2025%' AND termination_type = 'Voluntary'`)[0];
    a['think-def-headcount'] = [active('2025-12-31'), round2(avgHead), vol, pct(vol, avgHead)];

    const custRows = one(c, 'SELECT COUNT(*) FROM customers')[0];
    const emails = one(c, 'SELECT COUNT(DISTINCT lower(trim(email))) FROM customers')[0];
    const buyers = one(c, `SELECT COUNT(DISTINCT customer_id) FROM orders WHERE status = 'completed' AND order_date LIKE '2025%'`)[0];
    a['think-def-customers'] = [custRows, emails, buyers];
  }

  // ---------------------------------------------------------------- choosing metrics
  {
    const units = (ch) => one(c, `SELECT SUM(oi.quantity) FROM orders o JOIN order_items oi USING(order_id) WHERE o.status = 'completed' AND o.order_date LIKE '2025%' AND o.channel = '${ch}'`)[0];
    const returned = (ch) => one(c, `SELECT SUM(rt.quantity_returned), SUM(rt.refund_amount) FROM returns rt JOIN order_items oi USING(order_item_id) JOIN orders o USING(order_id)
      WHERE o.status = 'completed' AND o.order_date LIKE '2025%' AND o.channel = '${ch}'`);
    const net = (ch) => one(c, `SELECT SUM(${REV}) FROM orders o JOIN order_items oi USING(order_id) WHERE o.status = 'completed' AND o.order_date LIKE '2025%' AND o.channel = '${ch}'`)[0];
    const [onUnits, onRefund] = returned('Online');
    const [inUnits] = returned('In-Store');
    a['think-kpi-returns'] = [pct(onUnits, units('Online')), pct(inUnits, units('In-Store')), pct(onRefund, net('Online'))];

    const lab = rows(r, `SELECT rs.name, l.lc / s.ns FROM
        (SELECT restaurant_id, SUM(net_sales) ns FROM daily_sales WHERE sale_date LIKE '2026-07%' GROUP BY 1) s
        JOIN (SELECT restaurant_id, SUM(labor_cost) lc FROM labor_daily WHERE work_date LIKE '2026-07%' GROUP BY 1) l USING(restaurant_id)
        JOIN restaurants rs USING(restaurant_id)`);
    const byName = Object.fromEntries(lab.map(([n, v]) => [n, v * 100]));
    a['think-kpi-labour'] = [round2(byName['Olive & Ember Downtown']), round2(byName['Olive & Ember Airport']),
      clearTop(byName, { what: 'highest labour % site' })];
  }

  // ---------------------------------------------------------------- validating your own analysis
  {
    const [orders, shipOrder] = one(c, `SELECT COUNT(*), SUM(shipping_fee) FROM orders WHERE status = 'completed' AND order_date LIKE '2025%'`);
    const [lines, shipJoined] = one(c, `SELECT COUNT(*), SUM(o.shipping_fee) FROM orders o JOIN order_items oi USING(order_id) WHERE o.status = 'completed' AND o.order_date LIKE '2025%'`);
    a['think-val-fanout'] = [orders, lines, round2(shipOrder), round2(shipJoined)];
    const [events, distinctLines] = one(c, 'SELECT COUNT(*), COUNT(DISTINCT order_item_id) FROM returns');
    const twice = one(c, 'SELECT COUNT(*) FROM (SELECT order_item_id FROM returns GROUP BY 1 HAVING COUNT(*) > 1)')[0];
    a['think-val-returns'] = [events, distinctLines, twice];
  }

  c.close(); h.close(); r.close();
  return a;
}
