// Expected answers for the Power Query practice tasks added by the content expansion.
// Every function reads the files exactly as the learner downloads them and applies the cleaning the
// task asks for. Where a generator (or the original ground truth) knows the answer, the two readings
// must agree, or the build stops. A "which one" answer must be clear (see clearTop).
import fs from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { APP, FILES, round2 } from '../lib.js';
import { clearTop } from './answers-pbi.js';
import { MILES_TO_KM } from './pq-extra.js';

/** Raw CSV rows (arrays), keeping empty lines, so title lines and blank rows stay visible. */
export function csvRows(text) {
  const rows = [];
  let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}
const readRows = (rel) => csvRows(fs.readFileSync(path.join(FILES, rel), 'utf8'));
const isBlank = (r) => r.every((c) => c === '' || c === null || c === undefined);
/** Promote the header at headerIndex and drop fully blank rows, like Remove Blank Rows. */
function table(rows, headerIndex = 0) {
  const head = rows[headerIndex];
  return rows.slice(headerIndex + 1).filter((r) => !isBlank(r)).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}
const money = (s) => {
  if (s === null || s === undefined) return null;
  if (typeof s === 'number') return s;
  const t = String(s).replace(/[$,\s]/g, '');
  return t === '' ? null : Number(t);
};
const sum = (rows, f) => rows.reduce((a, r) => a + f(r), 0);
const group = (rows, key, val) => {
  const m = {};
  for (const r of rows) { const k = key(r); m[k] = (m[k] || 0) + val(r); }
  return m;
};
const pct = (a, b) => round2((a / b) * 100);
const ukToIso = (s) => (/^\d{2}\/\d{2}\/\d{4}$/.test(s) ? `${s.slice(6)}-${s.slice(3, 5)}-${s.slice(0, 2)}` : s);
const weekday = (isoDate) => new Date(`${isoDate}T00:00:00Z`).getUTCDay();
function agree(what, got, want, tol = 0.011) {
  const bad = typeof want === 'number' ? Math.abs(got - want) > tol : got !== want;
  if (bad) throw new Error(`${what}: the files give ${got}, the generator says ${want}`);
}
async function sheetRows(rel, sheet) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.join(FILES, rel));
  const ws = wb.getWorksheet(sheet);
  const out = [];
  for (let r = 1; r <= ws.rowCount; r++) {
    const v = ws.getRow(r).values;
    out.push(Array.from({ length: ws.columnCount }, (_, i) => (v[i + 1] === undefined ? null : v[i + 1])));
  }
  return out;
}

// ---------------------------------------------------------------- Swiftline depots (new)
function readSwiftline() {
  const dir = 'powerquery/swiftline_depot_exports';
  const files = fs.readdirSync(path.join(FILES, dir)).filter((f) => f.toLowerCase().endsWith('.csv')).sort();
  const out = [];
  for (const f of files) {
    const code = f.split('_')[1];
    const rows = readRows(`${dir}/${f}`);
    const hi = rows.findIndex((r) => r.includes('RunID'));
    for (const r of table(rows, hi)) {
      if (r.RunID === 'TOTAL') continue;
      const date = ukToIso(r.RunDate);
      const km = r.DistanceKm !== undefined ? Number(r.DistanceKm) : Number(r.DistanceMi) * MILES_TO_KM;
      const fuel = r.FuelLitres === 'n/a' || r.FuelLitres === '' ? null : Number(r.FuelLitres);
      out.push({ depot: code, date, driver: r.Driver, parcels: +r.Parcels, delivered: +r.Delivered, failed: +r.Failed, onTime: +r.OnTime, km, fuel, miles: r.DistanceMi !== undefined });
    }
  }
  return out;
}

function swiftlineAnswers(gen) {
  const S = readSwiftline();
  agree('Swiftline runs', S.length, gen.runs.length, 0);
  agree('Swiftline delivered', sum(S, (x) => x.delivered), sum(gen.runs, (x) => x.delivered), 0);
  agree('Swiftline km', sum(S, (x) => x.km), sum(gen.runs, (x) => x.km), 0.05);
  agree('Swiftline fuel', sum(S, (x) => x.fuel ?? 0), sum(gen.runs, (x) => x.fuel ?? 0), 0.05);
  const depots = Object.fromEntries(table(readRows('powerquery/swiftline_depots.csv')).map((d) => [d.DepotCode, d]));
  const rate = (rows) => sum(rows, (x) => x.failed) / sum(rows, (x) => x.parcels);
  const byDepot = (rows) => Object.fromEntries(Object.keys(depots).map((c) => [c, rows.filter((x) => x.depot === c)]));
  const D = byDepot(S);
  const worst = clearTop(Object.fromEntries(Object.entries(D).map(([c, rows]) => [depots[c].DepotName, rate(rows)])), { what: 'depot failure rate', minLead: 0.05 });
  const worstCode = Object.keys(depots).find((c) => depots[c].DepotName === worst);
  const out = {};
  out['pq-swift-combine'] = [S.length, sum(S, (x) => x.delivered), worst, pct(sum(D[worstCode], (x) => x.failed), sum(D[worstCode], (x) => x.parcels)),
    pct(sum(S, (x) => x.onTime), sum(S, (x) => x.delivered))];

  const late = S.filter((x) => x.date >= '2026-08-01');
  const mlLate = late.filter((x) => x.depot === 'ML');
  out['pq-swift-param'] = [late.length, sum(late, (x) => x.delivered), pct(sum(mlLate, (x) => x.onTime), sum(mlLate, (x) => x.delivered))];

  const driver = clearTop(group(S, (x) => x.driver, (x) => x.failed), { what: 'driver with most failed parcels', minLead: 0.03 });
  const regionVans = group(Object.values(depots), (d) => d.Region, (d) => Number(d.Vans));
  const regionDelivered = group(S, (x) => depots[x.depot].Region, (x) => x.delivered);
  const perVan = Object.fromEntries(Object.keys(regionVans).map((r) => [r, regionDelivered[r] / regionVans[r]]));
  const bestRegion = clearTop(perVan, { what: 'region delivered per van', minLead: 0.03 });
  out['pq-swift-score'] = [driver, pct(S.filter((x) => x.onTime === x.delivered).length, S.length), bestRegion, Math.round(perVan[bestRegion])];

  const et = D.ET;
  const withFuel = et.filter((x) => x.fuel !== null);
  out['pq-swift-fuel'] = [et.length - withFuel.length,
    round2((sum(withFuel, (x) => x.fuel) / sum(withFuel, (x) => x.km)) * 100),
    round2((sum(et, (x) => x.fuel ?? 0) / sum(et, (x) => x.km)) * 100)];

  out['pq-swift-km'] = [round2(sum(S, (x) => x.km)), round2(sum(et, (x) => x.km)), round2(sum(S, (x) => x.km) / S.length)];

  // ---- capstone: delivery promises. On-time is measured against parcels actually delivered,
  // the same convention as pq-swift-combine, so the two never disagree.
  const stats = (rows) => ({
    runs: rows.length,
    parcels: sum(rows, (x) => x.parcels),
    delivered: sum(rows, (x) => x.delivered),
    onTimePct: pct(sum(rows, (x) => x.onTime), sum(rows, (x) => x.delivered)),
    failedPct: pct(sum(rows, (x) => x.failed), sum(rows, (x) => x.parcels)),
    km: round2(sum(rows, (x) => x.km)),
    kmPerParcel: round2(sum(rows, (x) => x.km) / sum(rows, (x) => x.parcels)),
    parcelsPerRun: round2(sum(rows, (x) => x.parcels) / rows.length),
  });
  const byDepotStats = Object.fromEntries(Object.entries(D).map(([c, rows]) => [depots[c].DepotName, stats(rows)]));
  const worstOnTime = clearTop(Object.fromEntries(Object.entries(byDepotStats).map(([n, v]) => [n, v.onTimePct])),
    { lowest: true, what: 'depot with the worst on-time rate', minLead: 0.03 });
  const densest = clearTop(Object.fromEntries(Object.entries(byDepotStats).map(([n, v]) => [n, v.kmPerParcel])),
    { lowest: true, what: 'depot with the shortest distance per parcel', minLead: 0.05 });
  const exWorst = S.filter((x) => depots[x.depot].DepotName !== worstOnTime);
  out['cap-swiftline'] = {
    byDepot: byDepotStats, group: stats(S),
    worstOnTime, worstOnTimePct: byDepotStats[worstOnTime].onTimePct,
    worstKmPerParcel: byDepotStats[worstOnTime].kmPerParcel, worstParcelsPerRun: byDepotStats[worstOnTime].parcelsPerRun,
    densest, densestKmPerParcel: byDepotStats[densest].kmPerParcel, densestParcelsPerRun: byDepotStats[densest].parcelsPerRun,
    onTimePctExcludingWorst: pct(sum(exWorst, (x) => x.onTime), sum(exWorst, (x) => x.delivered)),
    footerRowsDropped: 1, missingFuelRuns: et.length - withFuel.length,
  };
  return out;
}

// ---------------------------------------------------------------- Harbor & Pine ads (new)
function readAds() {
  const dir = 'powerquery/harbor_pine_ads';
  const search = table(readRows(`${dir}/search_ads_2026-Q2.csv`)).map((r) => ({ label: r.Campaign, clicks: +r.Clicks, cost: money(r.Cost), conv: +r.Conversions, value: money(r.ConvValue) }));
  const social = table(readRows(`${dir}/social_ads_2026-Q2.csv`)).map((r) => ({ label: r['Campaign name'], clicks: +r['Link clicks'], cost: money(r['Amount spent (USD)']), conv: +r.Purchases, value: money(r['Purchase value']) }));
  const code = (r) => ({ ...r, code: r.label.split('|')[0].trim().toUpperCase() });
  const register = Object.fromEntries(table(readRows(`${dir}/campaign_register.csv`)).map((c) => [c.CampaignCode, c]));
  return { rows: [...search, ...social].map(code), social: social.map(code), register };
}

function adsAnswers(gen) {
  const { rows, social, register } = readAds();
  agree('ads rows', rows.length, gen.rows.length, 0);
  agree('ads spend', sum(rows, (r) => r.cost), sum(gen.rows, (r) => r.cost), 0.05);
  agree('ads value', sum(rows, (r) => r.value), sum(gen.rows, (r) => r.value), 0.05);
  const spend = sum(rows, (r) => r.cost), value = sum(rows, (r) => r.value);
  const out = {};
  out['pq-hp-append'] = [rows.length, round2(spend), sum(rows, (r) => r.conv), round2(value / spend)];

  const byCode = {};
  for (const r of rows) {
    const c = byCode[r.code] || (byCode[r.code] = { cost: 0, value: 0 });
    c.cost += r.cost; c.value += r.value;
  }
  const socialSpend = sum(rows.filter((r) => register[r.code]?.Channel === 'Social'), (r) => r.cost);
  const unregistered = sum(rows.filter((r) => !register[r.code]), (r) => r.cost);
  const over = Object.entries(byCode).filter(([c, v]) => register[c] && v.cost > Number(register[c].QuarterBudget));
  for (const [c, v] of Object.entries(byCode)) {
    if (!register[c]) continue;
    const gap = Math.abs(v.cost - Number(register[c].QuarterBudget)) / Number(register[c].QuarterBudget);
    if (gap < 0.02) throw new Error(`Campaign ${c} spend is within 2% of its budget: over/under is ambiguous`);
  }
  if (!over.length) throw new Error('No campaign is over budget: the question would be trivial');
  out['pq-hp-merge'] = [round2(socialSpend), round2(unregistered), over.length];

  const tier = (roas) => (roas >= 4 ? 'Scale' : roas >= 2 ? 'Keep' : 'Cut');
  for (const [c, v] of Object.entries(byCode)) {
    const roas = v.value / v.cost;
    if ([2, 4].some((b) => Math.abs(roas - b) < 0.1)) throw new Error(`Campaign ${c} ROAS ${roas.toFixed(2)} sits on a tier boundary`);
  }
  const cut = Object.entries(byCode).filter(([, v]) => tier(v.value / v.cost) === 'Cut');
  out['pq-hp-tiers'] = [cut.length, cut.filter(([c]) => register[c]?.Objective === 'Awareness').length, round2(sum(cut, ([, v]) => v.cost))];

  const f01 = rows.filter((r) => r.code === 'HP-F01');
  out['pq-hp-names'] = [new Set(social.map((r) => r.label)).size, new Set(social.map((r) => r.code)).size, round2(sum(f01, (r) => r.cost))];

  // ---- capstone: which campaigns are worth repeating?
  const chSpend = group(rows, (r) => (register[r.code]?.Channel || 'Unregistered'), (r) => r.cost);
  const chValue = group(rows, (r) => (register[r.code]?.Channel || 'Unregistered'), (r) => r.value);
  const channels = Object.fromEntries(['Search', 'Social'].map((c) => [c, { spend: round2(chSpend[c]), value: round2(chValue[c]), roas: round2(chValue[c] / chSpend[c]) }]));
  if (channels.Search.roas / channels.Social.roas < 1.15) throw new Error('Harbor & Pine: the two channels are too close to compare');
  const roas = Object.fromEntries(Object.entries(byCode).filter(([c]) => register[c]).map(([c, v]) => [c, v.value / v.cost]));
  const worstCode = clearTop(roas, { lowest: true, what: 'campaign with the worst ROAS', minLead: 0.1 });
  const awareness = Object.entries(byCode).filter(([c]) => register[c]?.Objective === 'Awareness');
  const overBy = Object.fromEntries(over.map(([c, v]) => [c, v.cost - Number(register[c].QuarterBudget)]));
  const worstOverCode = clearTop(overBy, { what: 'campaign that overspent most', minLead: 0.1 });
  const neverRan = Object.keys(register).filter((c) => !byCode[c]);
  out['cap-marketing'] = {
    channels, searchRoas: channels.Search.roas, socialRoas: channels.Social.roas,
    searchSpend: channels.Search.spend, socialSpend: channels.Social.spend,
    worstCampaign: worstCode, worstCampaignRoas: round2(roas[worstCode]), worstCampaignObjective: register[worstCode].Objective,
    awarenessSpend: round2(sum(awareness, ([, v]) => v.cost)), awarenessValue: round2(sum(awareness, ([, v]) => v.value)),
    overBudgetCount: over.length, worstOverCampaign: worstOverCode, worstOverAmount: round2(overBy[worstOverCode]),
    unregisteredSpend: round2(unregistered), neverRanCount: neverRan.length,
    neverRanBudget: round2(sum(neverRan, (c) => Number(register[c].QuarterBudget))),
    totalSpend: round2(spend), totalValue: round2(value),
  };
  return out;
}

// ---------------------------------------------------------------- Bright Wells survey (new)
async function surveyAnswers(gen) {
  const rows = await sheetRows('powerquery/bright_wells_school_survey.xlsx', 'Survey');
  const hi = rows.findIndex((r) => r[0] === 'Village');
  const head = rows[hi];
  const V = rows.slice(hi + 1).filter((r) => !isBlank(r)).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])));
  agree('survey villages', V.length, gen.villages.length, 0);
  const valueCols = head.filter((h) => /^\d{4} /.test(h));
  const cells = sum(V, (v) => valueCols.filter((h) => v[h] !== null && v[h] !== '').length);
  const both = (v, y) => v[`${y} Enrolled`] !== null && v[`${y} Attending`] !== null;
  const has26 = V.filter((v) => both(v, 2026));
  const out = {};
  out['pq-bw-unpivot'] = [cells, sum(V, (v) => v['2026 Enrolled'] ?? 0),
    pct(sum(has26, (v) => v['2026 Attending']), sum(has26, (v) => v['2026 Enrolled']))];

  const pair = V.filter((v) => both(v, 2024) && both(v, 2026));
  const rise = {};
  for (const region of new Set(V.map((v) => v.Region))) {
    const g = pair.filter((v) => v.Region === region);
    rise[region] = (sum(g, (v) => v['2026 Attending']) / sum(g, (v) => v['2026 Enrolled']) - sum(g, (v) => v['2024 Attending']) / sum(g, (v) => v['2024 Enrolled'])) * 100;
  }
  const top = clearTop(rise, { what: 'region attendance rise', minLead: 0.05 });
  const fell = pair.filter((v) => v['2026 Attending'] / v['2026 Enrolled'] < v['2024 Attending'] / v['2024 Enrolled']);
  out['pq-bw-regions'] = [top, round2(rise[top]), fell.length];
  return out;
}

// ---------------------------------------------------------------- Cedarline POS exports (existing files)
function readPos() {
  const dir = 'powerquery/cedarline_pos_exports';
  const out = [];
  for (const f of fs.readdirSync(path.join(FILES, dir)).sort()) {
    const rows = readRows(`${dir}/${f}`);
    const hi = rows.findIndex((r) => r[0] === 'Date');
    for (const r of table(rows, hi)) {
      if (r.Date === 'TOTAL') continue;
      const date = ukToIso(r.Date);
      out.push({ file: f, date, month: date.slice(0, 7), rawStore: r.StoreCode, store: r.StoreCode.trim().toUpperCase(), category: r.Category,
        units: Number(r.Units ?? r['Qty Sold']), net: Number(r.NetSales), rawDate: r.Date });
    }
  }
  return out;
}

function posAnswers() {
  const gt = JSON.parse(fs.readFileSync(path.join(APP, 'seed', 'cedarline_ground_truth.json'), 'utf8')).power_query;
  const P = readPos();
  agree('POS rows', P.length, gt.total_data_rows, 0);
  for (const m of ['2026-06', '2026-07', '2026-08']) agree(`POS ${m} net`, sum(P.filter((x) => x.month === m), (x) => x.net), gt.month_net[m]);
  const jul = P.filter((x) => x.file.includes('2026-07'));
  const day = (x) => Number(x.rawDate.slice(0, 2));
  agree('POS July rows', jul.length, gt.rows_per_file.jul, 0);
  agree('POS July day<=12 rows', jul.filter((x) => day(x) <= 12).length, gt.july_rows_day_le_12, 0);
  const out = {};
  out['pq-pos-july'] = [jul.length, jul.filter((x) => day(x) <= 12 && day(x) !== 7).length, jul.filter((x) => day(x) > 12).length,
    round2(sum(jul, (x) => x.net)), sum(jul, (x) => x.units)];

  const aug = P.filter((x) => x.month === '2026-08');
  const lower = aug.filter((x) => x.rawStore !== x.rawStore.toUpperCase()).length;
  agree('POS August lowercase rows', lower, gt.aug_rows_with_lowercase_w02, 0);
  const catMonth = (m) => group(P.filter((x) => x.month === m), (x) => x.category, (x) => x.net);
  const julC = catMonth('2026-07'), augC = catMonth('2026-08');
  const drop = clearTop(Object.fromEntries(Object.keys(julC).map((c) => [c, julC[c] - (augC[c] || 0)])), { what: 'category July to August drop', minLead: 0.05 });
  const targets = table(readRows('powerquery/store_targets_summer_2026.csv'));
  let met = 0;
  for (const t of targets) {
    for (const m of ['2026-06', '2026-07', '2026-08']) {
      const net = sum(P.filter((x) => x.store === t.StoreCode && x.month === m), (x) => x.net);
      const sm = gt.store_month.find((s) => s.store === t.StoreCode && s.month === m);
      agree(`POS ${t.StoreCode} ${m}`, net, sm.net_sales);
      if (net >= Number(t[m])) met++;
    }
  }
  out['pq-pos-reconcile'] = [sum(P, (x) => x.units), lower, round2(sum(P.filter((x) => x.category === 'Footwear'), (x) => x.net)), drop, met];
  return out;
}

// ---------------------------------------------------------------- CRM contacts (existing file)
function crmAnswers(answers) {
  const seen = new Set();
  const C = [];
  for (const r of table(readRows('powerquery/crm_contacts_export.csv'))) {
    const k = JSON.stringify(r);
    if (seen.has(k)) continue;
    seen.add(k);
    C.push(r);
  }
  agree('CRM unique contacts', C.length, answers['pq-file-contacts'][0], 0);
  const first = (r) => r['Full Name'].split(', ')[1].trim();
  const out = {};
  out['pq-crm-split'] = [C.filter((r) => first(r) === 'Anna').length, C.filter((r) => r.Phone.startsWith('+44')).length, C.filter((r) => r.Phone.includes(' ')).length];

  const city = (r) => r.City.trim().toLowerCase().replace(/\b\w/g, (ch) => ch.toUpperCase());
  const ready = C.filter((r) => r.Email.trim() !== '' && r.Email.trim() !== 'N/A' && ukToIso(r['Signup Date']) >= '2025-01-01');
  const byCity = group(ready, city, () => 1);
  const top = clearTop(byCity, { what: 'city with most campaign-ready contacts', minLead: 0.05 });
  out['pq-crm-campaign'] = [ready.length, top, pct(ready.length, C.length)];
  return out;
}

// ---------------------------------------------------------------- Brightpath roster (existing file)
async function rosterAnswers(answers) {
  const rows = await sheetRows('excel/brightpath_roster_messy.xlsx', 'Roster');
  const [head, ...body] = rows;
  const R = body.filter((r) => !isBlank(r)).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])));
  const textSalaries = R.filter((r) => typeof r.Salary === 'string').length;
  const unique = [];
  const ids = new Set();
  for (const r of R) if (!ids.has(r['Employee ID'])) { ids.add(r['Employee ID']); unique.push(r); }
  const [expUnique, , expAvg] = answers['xl-file-roster'];
  agree('roster unique employees', unique.length, expUnique, 0);
  const payroll = sum(unique, (r) => money(r.Salary));
  agree('roster average salary', round2(payroll / unique.length), expAvg);
  const dept = (r) => {
    const d = String(r.Department).trim().toLowerCase().replace(/\s+/g, ' ');
    if (['operations', 'ops'].includes(d)) return 'Operations';
    if (['customer service', 'cust. service', 'cs'].includes(d)) return 'Customer Service';
    throw new Error(`roster: unexpected department spelling "${r.Department}"`);
  };
  const hireYear = (r) => {
    const v = r['Hire Date'];
    if (v instanceof Date) return v.getUTCFullYear();
    return Number(ukToIso(String(v)).slice(0, 4));
  };
  return { 'pq-roster': [R.length, textSalaries, unique.filter((r) => dept(r) === 'Customer Service').length, payroll, unique.filter((r) => hireYear(r) < 2015).length] };
}

// ---------------------------------------------------------------- Olive & Ember files (existing)
function restaurantAnswers() {
  const sales = table(readRows('restaurant/sales_daily.csv')).filter((r) => r.Date.startsWith('2026'));
  const heavy = sales.filter((r) => Number(r.Discount) > 0.1 * Number(r['Gross Sales']));
  const airport = sales.filter((r) => r.Restaurant === 'Olive & Ember Airport');
  const weekend = airport.filter((r) => [0, 6].includes(weekday(r.Date)));
  return { 'pq-rest-discounts': [heavy.length, round2(sum(heavy, (r) => Number(r['Net Sales']))),
    pct(sum(weekend, (r) => Number(r['Net Sales'])), sum(airport, (r) => Number(r['Net Sales'])))] };
}

async function recipeAnswers() {
  const buys = table(readRows('restaurant/purchases.csv')).filter((r) => r['Delivery Date'].startsWith('2026-08'));
  const qty = group(buys, (r) => r.Ingredient, (r) => Number(r.Qty));
  const spend = group(buys, (r) => r.Ingredient, (r) => Number(r['Line Total']));
  const price = Object.fromEntries(Object.keys(qty).map((k) => [k, spend[k] / qty[k]]));
  const recipes = (await sheetRows('restaurant/menu_recipes_suppliers.xlsx', 'Recipes')).slice(1).filter((r) => !isBlank(r));
  const menu = (await sheetRows('restaurant/menu_recipes_suppliers.xlsx', 'Menu')).slice(1).filter((r) => !isBlank(r));
  const cost = {};
  for (const [dish, ing, q] of recipes) {
    if (!(ing in price)) throw new Error(`recipe costing: ${ing} was not bought in August 2026`);
    cost[dish] = (cost[dish] || 0) + q * price[ing];
  }
  const fc = Object.fromEntries(menu.map(([, dish, , p]) => [dish, (cost[dish] / p) * 100]));
  for (const [dish, v] of Object.entries(fc)) if (Math.abs(v - 35) < 1) throw new Error(`recipe costing: ${dish} sits on the 35% line (${v.toFixed(2)}%)`);
  const dearest = clearTop(cost, { what: 'dearest dish to make', minLead: 0.03 });
  return { 'pq-recipe-cost': [dearest, round2(cost[dearest]), round2(fc['Truffle Mushroom Burger']), Object.values(fc).filter((v) => v > 35).length] };
}

function readPrimeMeats() {
  const dir = 'powerquery/prime_meats_invoices';
  const out = [];
  const seen = new Set();
  const norm = (s) => s.trim().toLowerCase();
  for (const f of fs.readdirSync(path.join(FILES, dir)).sort()) {
    for (const r of table(readRows(`${dir}/${f}`))) {
      if (norm(r.Product) === 'total') continue;
      const row = { invoice: r.InvoiceNo, date: ukToIso(r.Date), site: norm(r.Site), product: norm(r.Product), qty: Number(r.Qty ?? r.Quantity), total: Number(r.LineTotal) };
      const k = JSON.stringify(row);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({ ...row, month: row.date.slice(0, 7) });
    }
  }
  return out;
}

function primeMeatsAnswers(answers) {
  const [expRows, expJul] = answers['pq-file-primemeats'];
  const PM = readPrimeMeats();
  agree('Prime Meats lines', PM.length, expRows, 0);
  agree('Prime Meats July spend', sum(PM.filter((x) => x.month === '2026-07'), (x) => x.total), expJul);
  const avg = (product, month) => {
    const g = PM.filter((x) => x.product === product && x.month === month);
    return sum(g, (x) => x.total) / sum(g, (x) => x.qty);
  };
  const products = [...new Set(PM.map((x) => x.product))];
  const change = Object.fromEntries(products.map((p) => [p, (avg(p, '2026-08') / avg(p, '2026-05') - 1) * 100]));
  for (const [p, c] of Object.entries(change)) if (Math.abs(c - 10) < 0.5) throw new Error(`Prime Meats: ${p} changed ${c.toFixed(2)}%, too close to the 10% line`);
  const risen = products.filter((p) => change[p] > 10);
  // what August cost on top of May prices, for the products that rose by more than 10%
  const extra = sum(risen, (p) => sum(PM.filter((x) => x.product === p && x.month === '2026-08'), (x) => x.qty) * (avg(p, '2026-08') - avg(p, '2026-05')));
  const out = {};
  out['pq-pm-audit'] = [risen.length, round2(extra), round2(change['ribeye steak'])];

  const chicken = group(PM.filter((x) => x.product === 'chicken breast'), (x) => x.month, (x) => x.total);
  out['pq-pm-function'] = [round2(sum(PM.filter((x) => x.product === 'ribeye steak'), (x) => x.qty)),
    clearTop(chicken, { what: 'month with most chicken spend', minLead: 0.02 }), round2(avg('lamb shoulder', '2026-08'))];
  return out;
}

/**
 * gen: the result of buildPqExtraFiles(), so the new files can be checked against their generator.
 * known: the original answers, to check the existing files are read the same way as before.
 */
export async function pqAnswers(gen, known) {
  for (const k of ['pq-file-contacts', 'xl-file-roster', 'pq-file-primemeats']) if (!known?.[k]) throw new Error(`Power Query answers need the original answer ${k}`);
  const parts = [swiftlineAnswers(gen.swift), adsAnswers(gen.hp), await surveyAnswers(gen.bw), posAnswers(), crmAnswers(known),
    await rosterAnswers(known), restaurantAnswers(), await recipeAnswers(), primeMeatsAnswers(known)];
  return Object.assign({}, ...parts);
}
