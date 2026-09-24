// Expected answers for the Excel practice tasks added by the content expansion, read from the
// files the learner downloads. Where a generator planted something, the reading must find it.
import fs from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { FILES, round2 } from '../lib.js';
import { clearTop } from './answers-pbi.js';
import { csvRows } from './answers-pq.js';
import { HP_EVENTS, HP_PROBLEMS } from './excel-extra.js';

const sum = (rows, f) => rows.reduce((a, r) => a + f(r), 0);
const group = (rows, key, val) => {
  const m = {};
  for (const r of rows) { const k = key(r); m[k] = (m[k] || 0) + val(r); }
  return m;
};
const pct = (a, b) => round2((a / b) * 100);
const isoOf = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10));
function agree(what, got, want, tol = 0.011) {
  const bad = typeof want === 'number' ? Math.abs(got - want) > tol : got !== want;
  if (bad) throw new Error(`${what}: the files give ${got}, expected ${want}`);
}
function csvTable(rel) {
  const [head, ...body] = csvRows(fs.readFileSync(path.join(FILES, rel), 'utf8')).filter((r) => r.some((c) => c !== ''));
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}
async function sheetObjects(rel, name) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.join(FILES, rel));
  const ws = wb.getWorksheet(name);
  const head = ws.getRow(1).values.slice(1);
  const out = [];
  for (let r = 2; r <= ws.rowCount; r++) {
    const v = ws.getRow(r).values;
    if (!v || v.length < 2) continue;
    out.push(Object.fromEntries(head.map((h, i) => [h, v[i + 1] ?? null])));
  }
  return out;
}
/** Excel's QUARTILE.INC / PERCENTILE.INC. */
export function quartileInc(values, q) {
  const s = [...values].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  return s[lo] + (s[Math.min(lo + 1, s.length - 1)] - s[lo]) * (pos - lo);
}
const median = (v) => quartileInc(v, 0.5);
const inEvent = (d) => HP_EVENTS.some((e) => d >= e.from && d <= e.to);

// ---------------------------------------------------------------- Harbor & Pine daily KPIs (new)
async function dailyAnswers(gen) {
  const D = (await sheetObjects('excel/harbor_pine_daily_kpis_2026.xlsx', 'Daily')).map((r) => ({
    date: isoOf(r.Date), sessions: r.Sessions, orders: r.Orders, revenue: r.Revenue, card: r['Card Orders'], refundValue: r['Refund Value'],
  }));
  agree('daily rows', D.length, gen.days.length, 0);
  agree('daily revenue', sum(D, (d) => d.revenue), sum(gen.days, (d) => d.revenue), 0.05);
  const byDate = (f) => Object.fromEntries(D.map((d) => [d.date, f(d)]));
  const out = {};

  const cr = D.map((d) => d.orders / d.sessions);
  const q1 = quartileInc(cr, 0.25), q3 = quartileInc(cr, 0.75), iqr = q3 - q1;
  const lo = q1 - 1.5 * iqr, hi = q3 + 1.5 * iqr;
  for (const v of cr) if (Math.min(Math.abs(v - lo), Math.abs(v - hi)) < iqr * 0.03) throw new Error(`a conversion rate (${v}) sits on an IQR fence`);
  const highest = clearTop(byDate((d) => d.orders / d.sessions), { what: 'highest conversion day', minLead: 0.1 });
  const lowest = clearTop(byDate((d) => d.orders / d.sessions), { lowest: true, what: 'lowest conversion day', minLead: 0.1 });
  agree('highest conversion day', highest, HP_PROBLEMS.duplicateImport);
  agree('lowest conversion day', lowest, HP_PROBLEMS.botTraffic);
  out['xl-hp-daily'] = [round2(median(cr) * 100), cr.filter((v) => v < lo || v > hi).length, highest, lowest];

  const outage = clearTop(byDate((d) => d.card / d.orders), { lowest: true, what: 'lowest card share', minLead: 0.2 });
  agree('card outage day', outage, HP_PROBLEMS.cardOutage);
  const refundDay = clearTop(byDate((d) => d.refundValue), { what: 'refund spike', minLead: 0.3 });
  agree('refund spike day', refundDay, HP_PROBLEMS.refundSpike);
  const medOrders = median(D.map((d) => d.orders));
  for (const d of D) if (Math.abs(d.orders / medOrders - 1.5) < 0.03) throw new Error(`${d.date} orders sit on the 1.5 × median line`);
  const big = D.filter((d) => d.orders > 1.5 * medOrders);
  const dup = D.find((d) => d.date === HP_PROBLEMS.duplicateImport);
  out['xl-hp-context'] = [outage, round2(D.find((d) => d.date === refundDay).refundValue), big.length, big.filter((d) => inEvent(d.date)).length,
    round2(sum(D, (d) => d.revenue) - dup.revenue / 2)];
  return out;
}

// ---------------------------------------------------------------- regional sales (existing file)
async function regionalAnswers(known) {
  const O = (await sheetObjects('excel/regional_sales_2026.xlsx', 'Orders')).map((r) => ({
    id: r['Order ID'], date: isoOf(r['Order Date']), region: r.Region, channel: r.Channel, category: r.Category, revenue: r.Revenue,
  }));
  agree('regional West March revenue', round2(sum(O.filter((o) => o.region === 'West' && o.date.startsWith('2026-03')), (o) => o.revenue)), known['xl-file-regional'][0]);
  const out = {};
  const top = clearTop(Object.fromEntries(O.map((o) => [o.id, o.revenue])), { what: 'largest order', minLead: 0.01 });
  const sorted = O.map((o) => o.revenue).sort((a, b) => b - a);
  out['xl-regional-sort'] = [round2(sorted[0]), top,
    O.filter((o) => o.region === 'West' && o.channel === 'Online' && o.category === 'Footwear').length,
    round2(sum(sorted.slice(0, 10), (v) => v)),
    O.filter((o) => o.region === 'North' && o.channel === 'Store' && o.revenue < 50).length];

  const regionRev = group(O, (o) => o.region, (o) => o.revenue);
  const onlineRev = group(O.filter((o) => o.channel === 'Online'), (o) => o.region, (o) => o.revenue);
  const share = Object.fromEntries(Object.keys(regionRev).map((r) => [r, (onlineRev[r] || 0) / regionRev[r]]));
  const topRegion = clearTop(share, { what: 'region with highest online share', minLead: 0.03 });
  const storeQ2 = sum(O.filter((o) => o.channel === 'Store' && o.date >= '2026-04-01' && o.date <= '2026-06-30'), (o) => o.revenue);
  out['xl-regional-pivot'] = [topRegion, round2(share[topRegion] * 100), round2(storeQ2)];
  return out;
}

// ---------------------------------------------------------------- Harbor & Pine search ads (PQ file)
function searchPivotAnswers() {
  const S = csvTable('powerquery/harbor_pine_ads/search_ads_2026-Q2.csv').map((r) => ({
    month: r.Date.slice(0, 7), name: r.Campaign.split('|')[1].trim(), cost: Number(r.Cost), value: Number(r.ConvValue),
  }));
  const june = sum(S.filter((r) => r.month === '2026-06'), (r) => r.cost);
  const campaign = clearTop(group(S, (r) => r.name, (r) => r.value), { what: 'campaign with most conversion value', minLead: 0.05 });
  return { 'xl-search-pivot': [round2(june), campaign, pct(sum(S.filter((r) => r.name === 'Brand Search'), (r) => r.cost), sum(S, (r) => r.cost))] };
}

// ---------------------------------------------------------------- Olive & Ember: close on Mondays? (existing files)
export const MONDAY_ASSUMPTIONS = { foodCostShare: 0.3, salesRecovered: 0.4 };
function mondayAnswers() {
  const monday = (d) => new Date(`${d}T00:00:00Z`).getUTCDay() === 1;
  const site = 'Olive & Ember Airport';
  const sales = csvTable('restaurant/sales_daily.csv').filter((r) => r.Restaurant === site && r.Date.startsWith('2026') && monday(r.Date));
  const labour = csvTable('restaurant/labor_daily.csv').filter((r) => r.Restaurant === site && r.Date.startsWith('2026') && monday(r.Date) && r.Role !== 'Management');
  const roles = new Set(csvTable('restaurant/labor_daily.csv').map((r) => r.Role));
  if (!roles.has('Management')) throw new Error('labor_daily.csv has no Management role any more');
  const monSales = sum(sales, (r) => Number(r['Net Sales']));
  const monLabour = sum(labour, (r) => Number(r['Labor Cost']));
  const { foodCostShare, salesRecovered } = MONDAY_ASSUMPTIONS;
  const change = -monSales * (1 - salesRecovered) * (1 - foodCostShare) + monLabour;
  if (Math.abs(change) < 1000) throw new Error('closing on Mondays is too close to break-even for a clear answer');
  return { 'xl-airport-monday': [round2(monSales), round2(monLabour), round2(change)] };
}

/** gen: the result of buildExcelExtraFiles(); known: the original answers. */
export async function excelAnswers(gen, known) {
  if (!known?.['xl-file-regional']) throw new Error('Excel answers need the original answer xl-file-regional');
  return Object.assign({}, await dailyAnswers(gen.hpDaily), await regionalAnswers(known), searchPivotAnswers(), mondayAnswers());
}
