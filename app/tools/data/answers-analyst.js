// Expected answers for Real Analyst work (server/content/analyst.js): work requests and mixed-skill
// assessments. Database answers are computed with SQL against the practice databases the learner
// queries; file answers read the files exactly as they are downloaded, and are checked against the
// generator that wrote them. A "which one" answer must be clear, or the build stops.
import fs from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { APP, FILES, PRACTICE, sqlite, round2 } from '../lib.js';
import { clearTop } from './answers-pbi.js';
import { csvRows } from './answers-pq.js';

async function openDb(name) {
  const S = await sqlite();
  return new S.Database(fs.readFileSync(path.join(PRACTICE, `${name}.db`)));
}
const one = (db, sql) => db.exec(sql)[0].values[0];
const rowsOf = (db, sql) => { const r = db.exec(sql); return r.length ? r[0].values : []; };

function agree(what, got, want, tol = 0.011) {
  const bad = typeof want === 'number' ? Math.abs(got - want) > tol : got !== want;
  if (bad) throw new Error(`${what}: the file gives ${got}, the generator says ${want}`);
}

// ---------------------------------------------------------------- restaurant requests
async function restaurantRequests() {
  const db = await openDb('restaurant');
  const out = {};

  // Dairy Valley's May price rise: a fixed-basket index against April, and what it cost May to August
  const index = rowsOf(db, `
    WITH m AS (SELECT strftime('%Y-%m', delivery_date) mo, ingredient_id, SUM(qty) q, SUM(line_total) t
               FROM purchases WHERE supplier_id = 3 AND delivery_date BETWEEN '2026-01-01' AND '2026-08-31' GROUP BY 1, 2),
         apr AS (SELECT ingredient_id, q, t / q pr FROM m WHERE mo = '2026-04')
    SELECT m.mo, SUM(apr.q * m.t / m.q) * 100.0 / SUM(apr.q * apr.pr) - 100 FROM m JOIN apr USING (ingredient_id) GROUP BY 1 ORDER BY 1`);
  const monthly = Object.fromEntries(index.map(([mo, v]) => [mo, v]));
  // the first month that is clearly above the month before it
  const months = Object.keys(monthly).sort();
  const jump = months.find((mo, i) => i > 0 && monthly[mo] - monthly[months[i - 1]] > 4);
  if (jump !== '2026-05') throw new Error(`ra-dairy: expected the jump in May, found ${jump}`);
  const riser = clearTop(Object.fromEntries(rowsOf(db, `
    WITH p AS (SELECT supplier_id, ingredient_id, strftime('%Y-%m', delivery_date) mo, SUM(line_total) / SUM(qty) uc FROM purchases
               WHERE delivery_date BETWEEN '2026-04-01' AND '2026-05-31' GROUP BY 1, 2, 3)
    SELECT s.name, AVG(CASE WHEN mo = '2026-05' THEN uc END) / AVG(CASE WHEN mo = '2026-04' THEN uc END) - 1
    FROM p JOIN suppliers s USING (supplier_id) GROUP BY s.name`).filter(([, v]) => v !== null)), { what: 'supplier that raised prices in May', minLead: 0.3 });
  const extra = one(db, `
    WITH aprp AS (SELECT ingredient_id, SUM(line_total) / SUM(qty) pr FROM purchases WHERE supplier_id = 3 AND delivery_date BETWEEN '2026-04-01' AND '2026-04-30' GROUP BY 1)
    SELECT SUM(p.line_total - p.qty * aprp.pr) FROM purchases p JOIN aprp USING (ingredient_id)
    WHERE p.supplier_id = 3 AND p.delivery_date BETWEEN '2026-05-01' AND '2026-08-31'`)[0];
  out['ra-dairy'] = { month: jump, supplier: riser, risePct: round2(monthly['2026-05']), extraMayAug: round2(extra),
    spendMayAug: round2(one(db, "SELECT SUM(line_total) FROM purchases WHERE supplier_id = 3 AND delivery_date BETWEEN '2026-05-01' AND '2026-08-31'")[0]) };

  // Usage the recipes and the waste log do not explain (stock movement against recipes x dishes sold)
  const unexplained = (from, to, open, close) => Object.fromEntries(rowsOf(db, `
    WITH uc AS (SELECT restaurant_id, ingredient_id, SUM(line_total) / SUM(qty) c FROM purchases WHERE delivery_date BETWEEN '${from}' AND '${to}' GROUP BY 1, 2),
    theo AS (SELECT d.restaurant_id, r.ingredient_id, SUM(d.qty_sold * r.qty_per_portion) q FROM daily_sales d JOIN recipes r USING (menu_item_id)
             WHERE d.sale_date BETWEEN '${from}' AND '${to}' GROUP BY 1, 2),
    pur AS (SELECT restaurant_id, ingredient_id, SUM(qty) q FROM purchases WHERE delivery_date BETWEEN '${from}' AND '${to}' GROUP BY 1, 2),
    op AS (SELECT restaurant_id, ingredient_id, qty_on_hand q FROM inventory_counts WHERE count_date = '${open}'),
    cl AS (SELECT restaurant_id, ingredient_id, qty_on_hand q FROM inventory_counts WHERE count_date = '${close}'),
    w AS (SELECT restaurant_id, ingredient_id, SUM(qty) q FROM waste_log WHERE waste_date BETWEEN '${from}' AND '${to}' GROUP BY 1, 2)
    SELECT r.name, SUM((COALESCE(op.q, 0) + COALESCE(pur.q, 0) - COALESCE(cl.q, 0) - theo.q - COALESCE(w.q, 0)) * uc.c) * 100.0 / SUM(theo.q * uc.c)
    FROM theo JOIN uc USING (restaurant_id, ingredient_id) LEFT JOIN pur USING (restaurant_id, ingredient_id) LEFT JOIN op USING (restaurant_id, ingredient_id)
      LEFT JOIN cl USING (restaurant_id, ingredient_id) LEFT JOIN w USING (restaurant_id, ingredient_id) JOIN restaurants r USING (restaurant_id)
    GROUP BY r.name`).map(([n, v]) => [n, round2(v)]));
  const summer = unexplained('2026-06-01', '2026-08-31', '2026-05-31', '2026-08-31');
  const spring = unexplained('2026-01-01', '2026-05-31', '2025-12-31', '2026-05-31');
  const worst = clearTop(summer, { what: 'site with the most unexplained usage', minLead: 0.3 });
  if (worst !== 'Olive & Ember Airport') throw new Error(`ra-portion: expected the Airport, found ${worst}`);
  out['ra-portion'] = { summer, spring, worst, apSummer: summer['Olive & Ember Airport'], apSpring: spring['Olive & Ember Airport'], dtSummer: summer['Olive & Ember Downtown'] };

  // August management summary
  const aug = one(db, `
    WITH s AS (SELECT SUM(CASE WHEN sale_date BETWEEN '2026-08-01' AND '2026-08-31' THEN net_sales END) a26,
                      SUM(CASE WHEN sale_date BETWEEN '2025-08-01' AND '2025-08-31' THEN net_sales END) a25 FROM daily_sales)
    SELECT a26, a25, a26 * 100.0 / a25 - 100,
      ((SELECT SUM(value_at_cost) FROM inventory_counts WHERE count_date = '2026-07-31')
        + (SELECT SUM(line_total) FROM purchases WHERE delivery_date BETWEEN '2026-08-01' AND '2026-08-31')
        - (SELECT SUM(value_at_cost) FROM inventory_counts WHERE count_date = '2026-08-31')) * 100.0 / a26,
      (SELECT SUM(labor_cost) FROM labor_daily WHERE work_date BETWEEN '2026-08-01' AND '2026-08-31') * 100.0 / a26
    FROM s`);
  out['ra-monday'] = { aug26: round2(aug[0]), aug25: round2(aug[1]), yoyPct: round2(aug[2]), foodPct: round2(aug[3]), labourPct: round2(aug[4]) };
  db.close();
  return out;
}

// ---------------------------------------------------------------- the supplier statement
function invoiceRequest() {
  const dir = 'powerquery/prime_meats_invoices';
  const lines = [];
  for (const f of fs.readdirSync(path.join(FILES, dir)).filter((x) => x.endsWith('.csv')).sort()) {
    const rows = csvRows(fs.readFileSync(path.join(FILES, dir, f), 'utf8'));
    const head = rows[0];
    for (const r of rows.slice(1)) {
      const rec = Object.fromEntries(head.map((h, i) => [h, r[i] ?? '']));
      if (!rec.InvoiceNo) continue;                       // the July file's TOTAL line has no invoice number
      lines.push({ key: r.join('|'), invoice: rec.InvoiceNo, total: Number(rec.LineTotal) });
    }
  }
  const counts = {};
  for (const l of lines) counts[l.key] = (counts[l.key] || 0) + 1;
  const dups = Object.entries(counts).filter(([, n]) => n > 1);
  if (dups.length !== 1) throw new Error(`ra-invoices: expected one line billed twice, found ${dups.length}`);
  const statement = round2(lines.reduce((s, l) => s + l.total, 0));
  return { statement, dupInvoice: dups[0][0].split('|')[0], dupAmount: Number(dups[0][0].split('|').slice(-1)[0]), dupCount: dups.length };
}

async function invoiceAnswers() {
  const s = invoiceRequest();
  const db = await openDb('restaurant');
  const books = round2(one(db, "SELECT SUM(line_total) FROM purchases WHERE supplier_id = 1 AND delivery_date BETWEEN '2026-05-01' AND '2026-08-31'")[0]);
  db.close();
  const difference = round2(s.statement - books);
  if (Math.abs(difference - s.dupAmount) > 0.011) throw new Error(`ra-invoices: the difference ${difference} is not the duplicated line ${s.dupAmount}`);
  return { 'ra-invoices': { statement: s.statement, books, difference, dupInvoice: s.dupInvoice, dupCount: s.dupCount } };
}

// ---------------------------------------------------------------- retail: two revenue numbers
async function retailRequests() {
  const db = await openDb('cedarline');
  const Q2 = "o.order_date BETWEEN '2026-04-01' AND '2026-06-30' AND o.channel = 'Online'";
  const opsFigure = one(db, `SELECT SUM(oi.quantity * oi.unit_price) FROM orders o JOIN order_items oi USING (order_id) WHERE ${Q2}`)[0];
  const cancelled = one(db, `SELECT SUM(oi.quantity * oi.unit_price) FROM orders o JOIN order_items oi USING (order_id) WHERE ${Q2} AND o.status <> 'completed'`)[0];
  const discount = one(db, `SELECT SUM(oi.quantity * oi.unit_price * oi.discount_pct) FROM orders o JOIN order_items oi USING (order_id) WHERE ${Q2} AND o.status = 'completed'`)[0];
  const net = one(db, `SELECT SUM(oi.quantity * oi.unit_price * (1 - oi.discount_pct)) FROM orders o JOIN order_items oi USING (order_id) WHERE ${Q2} AND o.status = 'completed'`)[0];
  const refunds = one(db, `SELECT SUM(r.refund_amount) FROM returns r JOIN order_items oi USING (order_item_id) JOIN orders o USING (order_id) WHERE ${Q2} AND o.status = 'completed'`)[0];
  db.close();
  const financeFigure = net - refunds;
  const gap = opsFigure - financeFigure;
  if (Math.abs(gap - (cancelled + discount + refunds)) > 0.05) throw new Error('ra-two-revenues: the three parts do not add up to the gap');
  return { 'ra-two-revenues': { opsFigure: round2(opsFigure), financeFigure: round2(financeFigure), gap: round2(gap), cancelled: round2(cancelled), discount: round2(discount), refunds: round2(refunds) } };
}

// ---------------------------------------------------------------- HR: absence
async function hrRequests() {
  const db = await openDb('hr');
  const rate = (where) => round2(one(db, `SELECT SUM(a.days_absent) * 100.0 / SUM(a.scheduled_days) FROM attendance_monthly a JOIN employees e USING (employee_id) WHERE ${where}`)[0]);
  const y26 = "a.month BETWEEN '2026-01' AND '2026-08'";
  const byLocation = Object.fromEntries(rowsOf(db, `SELECT e.location, SUM(a.days_absent) * 100.0 / SUM(a.scheduled_days) FROM attendance_monthly a JOIN employees e USING (employee_id) WHERE ${y26} GROUP BY 1`).map(([k, v]) => [k, round2(v)]));
  const out = {
    all2024: rate("a.month LIKE '2024%'"), all2026: rate(y26),
    transport2026: rate(`${y26} AND e.department_id = 2`), others2026: rate(`${y26} AND e.department_id <> 2`),
    hubsOthers2026: rate(`${y26} AND e.department_id <> 2 AND e.location IN ('North Hub', 'South Hub')`),
    headOffice2026: rate(`${y26} AND e.location = 'Head Office'`), byLocation,
    transport2024: rate("a.month LIKE '2024%' AND e.department_id = 2"),
  };
  db.close();
  // the point of the request: the hubs only look worse because Transport works there
  if (Math.abs(out.hubsOthers2026 - out.headOffice2026) > 0.5) throw new Error('ra-absence: outside Transport the hubs should match head office');
  return { 'ra-absence': out };
}

// ---------------------------------------------------------------- NGO: does the programme work?
async function surveyRows() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.join(FILES, 'powerquery', 'bright_wells_school_survey.xlsx'));
  const rows = [];
  wb.getWorksheet('Survey').eachRow({ includeEmpty: true }, (r) => rows.push(r.values.slice(1).map((v) => (v && typeof v === 'object' && 'result' in v ? v.result : v ?? null))));
  const hi = rows.findIndex((r) => r[0] === 'Village');
  return rows.slice(hi + 1).filter((r) => r.some((c) => c !== null && c !== '')).map((r) => Object.fromEntries(rows[hi].map((h, i) => [h, r[i] ?? null])));
}

async function programmeAnswers() {
  const V = await surveyRows();
  const has = (v, y) => v[`${y} Enrolled`] !== null && v[`${y} Attending`] !== null;
  const both = V.filter((v) => has(v, 2024) && has(v, 2026));
  const rate = (list, y) => (list.reduce((s, v) => s + v[`${y} Attending`], 0) / list.reduce((s, v) => s + v[`${y} Enrolled`], 0)) * 100;
  const joined2026 = V.filter((v) => Number(v['Programme Start']) === 2026);
  if (joined2026.some((v) => has(v, 2024))) throw new Error('ra-programme: 2026 joiners should have no 2024 survey');
  return { 'ra-programme': { villages: V.length, both: both.length, rate2024: round2(rate(both, 2024)), rate2026: round2(rate(both, 2026)), noBefore: V.filter((v) => !has(v, 2024)).length, joined2026: joined2026.length } };
}

// ---------------------------------------------------------------- assessment: Fieldhouse Gyms
const CLUBS = { northgate: 'Northgate', riverside: 'Riverside', 'old town': 'Old Town', oldtown: 'Old Town' };
const isoFrom = (s) => {
  const t = String(s || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(t);          // the export is set to UK dates
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
};

function fieldhouseAnswers(gen) {
  const rows = csvRows(fs.readFileSync(path.join(FILES, 'assessment', 'fieldhouse_members_export.csv'), 'utf8'));
  const head = rows[0];
  const seen = new Set();
  const members = [];
  let blank = 0, footer = 0, duplicates = 0, tests = 0;
  for (const r of rows.slice(1)) {
    const rec = Object.fromEntries(head.map((h, i) => [h, (r[i] ?? '').trim()]));
    if (!rec.MemberID && !rec.Name) { blank++; continue; }
    if (!rec.Name && /^total/i.test(rec.MemberID)) { footer++; continue; }
    if (/@fieldhouse\.test$/i.test(rec.Email) || /test/i.test(rec.Name)) { tests++; continue; }

    if (seen.has(rec.MemberID)) { duplicates++; continue; }
    seen.add(rec.MemberID);
    members.push({ id: rec.MemberID, club: CLUBS[rec.Club.toLowerCase()], plan: rec.Plan, joined: isoFrom(rec.Joined), cancelled: isoFrom(rec.Cancelled) });
  }
  if (members.some((m) => !m.club || !m.joined)) throw new Error('fieldhouse: a row could not be read');
  agree('Fieldhouse members', members.length, gen.members.length, 0);
  agree('Fieldhouse test accounts', tests, gen.tests.length, 0);
  agree('Fieldhouse duplicate rows', duplicates, gen.dupes.length, 0);
  const active = (d, club = null) => members.filter((m) => (!club || m.club === club) && m.joined <= d && (!m.cancelled || m.cancelled > d)).length;
  const truthActive = (d) => gen.members.filter((m) => m.joined <= d && (!m.cancelled || m.cancelled > d)).length;
  agree('Fieldhouse active on 31 August', active('2026-08-31'), truthActive('2026-08-31'), 0);
  const change = Object.fromEntries(Object.values(CLUBS).filter((v, i, a) => a.indexOf(v) === i).map((c) => [c, active('2026-08-31', c) - active('2026-03-31', c)]));
  const lost = clearTop(Object.fromEntries(Object.entries(change).map(([k, v]) => [k, -v])), { what: 'club that lost most members', minLead: 0.5 });
  const cancels = (club, a, b, plan = null) => members.filter((m) => m.club === club && (!plan || m.plan === plan) && m.cancelled && m.cancelled >= a && m.cancelled <= b).length;
  return {
    'ax-fieldhouse': {
      rows: rows.length - 1, members: members.length, duplicates, tests, blank, footer,
      active0331: active('2026-03-31'), active0831: active('2026-08-31'),
      change, lostClub: lost, lostN: -change[lost],
      rsCancelBefore: cancels('Riverside', '2025-11-01', '2026-03-31'), rsCancelAfter: cancels('Riverside', '2026-04-01', '2026-08-31'),
      rsMonthlyAfter: cancels('Riverside', '2026-04-01', '2026-08-31', 'Monthly'),
    },
  };
}

// ---------------------------------------------------------------- assessment: the Cedarline Q2 export
function cedarlineAssessment() {
  const gt = JSON.parse(fs.readFileSync(path.join(APP, 'seed', 'cedarline_ground_truth.json'), 'utf8')).excel;
  return {
    'ax-cedarline': {
      truthLines: gt.truth_lines, completedNet: gt.completed_net_total, overstatement: gt.price_anomaly_overstatement,
      priceRows: gt.price_anomaly_rows.length, duplicateRows: gt.duplicate_copy_rows.length, westAttainment: gt.attainment_q2_pct.West,
      naiveTotal: gt.naive_sum_qty_x_price_x_1_minus_discount_all_rows,
    },
  };
}

export async function analystAnswers(built) {
  return Object.assign({},
    await restaurantRequests(), await invoiceAnswers(), await retailRequests(), await hrRequests(), await programmeAnswers(),
    fieldhouseAnswers(built.assess.fieldhouse), cedarlineAssessment());
}
