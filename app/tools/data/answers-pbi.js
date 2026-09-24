// Expected answers for the Power BI practice tasks, computed from the same CSV files the learner
// loads into Power BI (data/files/powerbi/cedarline_star_schema + the store targets file).
// A "which one" answer must be clear: a tie or a lead under 1% stops the build.
import fs from 'node:fs';
import path from 'node:path';
import { FILES, round2 } from '../lib.js';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function parseCsv(text) {
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
      row.push(cell); cell = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}

const read = (rel) => parseCsv(fs.readFileSync(path.join(FILES, rel), 'utf8'));

/** The single largest entry of { name: value }; refuses ties and near-ties. */
export function clearTop(map, { lowest = false, what = 'answer', minLead = 0.01 } = {}) {
  const sorted = Object.entries(map).sort((a, b) => (lowest ? a[1] - b[1] : b[1] - a[1]));
  if (sorted.length < 2) return sorted[0][0];
  const [a, b] = sorted;
  const lead = Math.abs(a[1] - b[1]) / Math.max(Math.abs(a[1]), 1e-9);
  if (lead < minLead) throw new Error(`Ambiguous ${what}: ${a[0]}=${a[1]} vs ${b[0]}=${b[1]}`);
  return a[0];
}

const group = (rows, key, val) => {
  const m = {};
  for (const r of rows) { const k = key(r); m[k] = (m[k] || 0) + val(r); }
  return m;
};
const sum = (rows, f) => rows.reduce((a, r) => a + f(r), 0);
const distinct = (rows, f) => new Set(rows.map(f).filter((x) => x !== null && x !== undefined && x !== '')).size;
const pct = (a, b) => round2((a / b) * 100);

export function pbiAnswers() {
  const dir = 'powerbi/cedarline_star_schema';
  const products = read(`${dir}/dim_product.csv`);
  const stores = read(`${dir}/dim_store.csv`);
  const customers = read(`${dir}/dim_customer.csv`);
  const P = Object.fromEntries(products.map((p) => [p.product_id, p]));
  const S = Object.fromEntries(stores.map((s) => [s.store_id, s]));
  const C = Object.fromEntries(customers.map((c) => [c.customer_id, c]));
  const F = read(`${dir}/fact_sales.csv`).map((r) => {
    const d = new Date(`${r.order_date}T00:00:00Z`);
    const p = P[r.product_id];
    const c = r.customer_id ? C[r.customer_id] : null;
    return {
      order: r.order_id, date: r.order_date, y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, day: d.getUTCDate(), dow: d.getUTCDay(),
      cust: r.customer_id || null, prod: r.product_id, store: r.store_id, channel: r.channel,
      qty: Number(r.quantity), price: Number(r.unit_price), disc: Number(r.discount_pct), net: Number(r.net_revenue), cost: Number(r.cost),
      cat: p.category, pname: p.product_name, active: p.is_active === '1', list: Number(p.list_price),
      storeName: S[r.store_id].store_name, storeRegion: S[r.store_id].region,
      custRegion: c ? c.region : null, acq: c ? c.acquisition_channel : null,
    };
  });
  const rev = (rows) => sum(rows, (r) => r.net);
  const y = (yr) => F.filter((r) => r.y === yr);
  const jan2aug = (yr) => F.filter((r) => r.y === yr && r.m <= 8);
  const orders = (rows) => distinct(rows, (r) => r.order);
  const custs = (rows) => distinct(rows, (r) => r.cust);
  const a = {};

  // --------------------------------------------------------------- beginner
  a['pbi-intro-look'] = [F.length, products.length, stores.length];
  a['pbi-import-check'] = [round2(rev(F)), F.filter((r) => !r.cust).length, customers.filter((c) => !c.region).length];

  a['pbi-pq-shape'] = [y(2025).length, y(2026).length, F.filter((r) => r.disc > 0).length];
  {
    const byCat = group(products, (p) => p.category, () => 1);
    const activeTents = products.filter((p) => p.category === 'Tents' && p.is_active === '1');
    a['pbi-pq-products'] = [products.filter((p) => p.is_active === '1').length, clearTop(byCat, { what: 'category with most products' }),
      round2(sum(activeTents, (p) => Number(p.list_price)) / activeTents.length)];
  }
  a['pbi-pq-price'] = [F.filter((r) => r.price > r.list).length, F.filter((r) => r.price < r.list).length];

  {
    const r25 = y(2025);
    a['pbi-model-relate'] = [round2(rev(r25.filter((r) => r.cat === 'Footwear'))), round2(rev(r25.filter((r) => r.storeRegion === 'West'))), round2(rev(r25.filter((r) => r.store === 'ONLINE')))];
    a['pbi-model-region'] = [round2(rev(r25.filter((r) => r.custRegion === 'West'))), round2(rev(r25.filter((r) => !r.cust)))];
    // revenue per customer by acquisition channel (total revenue is a near tie, per customer is not)
    const known = r25.filter((r) => r.cust && r.acq);
    const byAcq = group(known, (r) => r.acq, (r) => r.net);
    const perCust = Object.fromEntries(Object.keys(byAcq).map((k) => [k, byAcq[k] / distinct(known.filter((r) => r.acq === k), (r) => r.cust)]));
    const top = clearTop(perCust, { what: 'top revenue per customer channel' });
    a['pbi-model-channel'] = [top, round2(perCust[top]), round2(rev(r25.filter((r) => r.cust && !r.acq)))];
  }
  {
    const soldIds = new Set(F.map((r) => r.prod));
    const buyers = new Set(F.map((r) => r.cust).filter(Boolean));
    a['pbi-star-orphans'] = [products.filter((p) => !soldIds.has(p.product_id)).length, customers.filter((c) => !buyers.has(c.customer_id)).length,
      distinct(y(2026), (r) => r.prod)];
  }

  // date tables: 2024-01-01 .. 2026-12-31
  {
    const r25 = y(2025);
    const byDow = group(r25, (r) => DAYS[r.dow], (r) => r.net);
    const byMonth = group(r25, (r) => MONTHS[r.m - 1], (r) => r.net);
    const fy = F.filter((r) => (r.y === 2025 && r.m >= 4) || (r.y === 2026 && r.m <= 3));
    // weekdays are almost level in this data, so the task asks for the weekend share, not "the best day"
    a['pbi-date-build'] = [366 + 365 + 365, round2(byDow.Saturday), pct(byDow.Saturday + byDow.Sunday, rev(r25))];
    a['pbi-date-periods'] = [round2(rev(r25.filter((r) => r.m >= 10))), clearTop(byMonth, { what: 'top month 2025' }), round2(rev(fy))];
    // a store that opened in September: per-day averages depend on which days you divide by
    const canyon = r25.filter((r) => r.store === 'W02');
    const firstSale = canyon.map((r) => r.date).sort()[0];
    if (firstSale < '2025-09-01') throw new Error('Canyon sold before it opened');
    const daysOpen = 30 + 31 + 30 + 31;          // 1 Sep - 31 Dec 2025
    a['pbi-date-gaps'] = [round2(rev(canyon)), round2(rev(canyon) / 365), round2(rev(canyon) / daysOpen)];
  }

  // visuals and report pages
  {
    const r25 = y(2025);
    const byCat = group(r25, (r) => r.cat, (r) => r.net);
    const byStore = group(r25.filter((r) => r.channel === 'In-Store'), (r) => r.storeName, (r) => r.net);
    const topStore = clearTop(byStore, { what: 'top store 2025' });
    a['pbi-vis-overview'] = [clearTop(byCat, { lowest: true, what: 'lowest category 2025' }), topStore, round2(byStore[topStore])];
    const r26 = jan2aug(2026);
    a['pbi-vis-slicers'] = [round2(rev(r26.filter((r) => r.channel === 'Online' && r.cat === 'Backpacks'))),
      round2(rev(r26.filter((r) => r.storeName === 'Northgate' && r.cat === 'Apparel')))];
    const onlineByMonth = group(r26.filter((r) => r.channel === 'Online'), (r) => MONTHS[r.m - 1], (r) => r.net);
    const cat25 = group(jan2aug(2025), (r) => r.cat, (r) => r.net);
    const cat26 = group(r26, (r) => r.cat, (r) => r.net);
    const change = Object.fromEntries(Object.keys(cat25).map((k) => [k, (cat26[k] || 0) - cat25[k]]));
    a['pbi-vis-page'] = [clearTop(onlineByMonth, { what: 'top online month 2026' }), pct(rev(r26.filter((r) => r.channel === 'Online')), rev(r26)),
      clearTop(change, { lowest: true, what: 'category with the biggest fall' })];
    const aug26 = F.filter((r) => r.y === 2026 && r.m === 8);
    const aug25 = F.filter((r) => r.y === 2025 && r.m === 8);
    a['pbi-rep-kpis'] = [round2(rev(aug26)), orders(aug26), round2(rev(aug26) / orders(aug26)), pct(rev(aug26) - rev(aug25), rev(aug25))];
  }

  // --------------------------------------------------------------- DAX
  {
    const r24 = y(2024);
    a['pbi-dax-core'] = [round2(rev(r24)), orders(r24), round2(rev(r24) / orders(r24)), custs(r24)];
    const r25 = y(2025);
    const cost = sum(r25, (r) => r.cost);
    a['pbi-dax-margin'] = [round2(cost), round2(rev(r25) - cost), pct(rev(r25) - cost, rev(r25))];
    const gross = sum(r25, (r) => r.qty * r.price);
    a['pbi-dax-discount'] = [round2(gross), round2(gross - rev(r25)), pct(gross - rev(r25), gross)];
    const linesPerOrder = group(r25, (r) => r.order, () => 1);
    const nOrders = Object.keys(linesPerOrder).length;
    a['pbi-dax-basket'] = [round2(sum(r25, (r) => r.qty) / nOrders), round2(r25.length / nOrders),
      pct(Object.values(linesPerOrder).filter((n) => n > 1).length, nOrders)];

    const on = r25.filter((r) => r.channel === 'Online');
    const inst = r25.filter((r) => r.channel === 'In-Store');
    a['pbi-ctx-customers'] = [custs(on), custs(inst), custs(r25)];
    const listRev = sum(r25, (r) => r.qty * r.list);
    a['pbi-ctx-rowctx'] = [round2(listRev), round2(listRev - rev(r25))];
    a['pbi-ctx-aov'] = [round2(rev(r25) / orders(r25)), round2(rev(on) / orders(on)), round2(rev(inst) / orders(inst))];

    a['pbi-calc-channel'] = [round2(rev(on)), pct(rev(on), rev(r25)), pct(orders(on), orders(r25))];
    a['pbi-calc-category'] = [pct(rev(r25.filter((r) => r.cat === 'Tents')), rev(r25)),
      pct(rev(inst.filter((r) => r.cat === 'Footwear')), rev(inst))];
  }
  {
    const r26 = jan2aug(2026);
    a['pbi-calc-active'] = [round2(rev(r26.filter((r) => r.active))), pct(rev(r26.filter((r) => !r.active)), rev(r26))];
    const summer = r26.filter((r) => r.m >= 6);
    const west = summer.filter((r) => r.storeRegion === 'West');
    a['pbi-calc-west'] = [round2(rev(west)), pct(rev(west), rev(summer.filter((r) => r.channel === 'In-Store'))),
      pct(rev(west.filter((r) => r.store === 'W02')), rev(west))];
  }

  // --------------------------------------------------------------- time intelligence
  {
    const ytd26 = rev(jan2aug(2026));
    const ytd25 = rev(jan2aug(2025));
    a['pbi-time-ytd'] = [round2(ytd26), round2(ytd25), pct(ytd26 - ytd25, ytd25)];
    const mtd = (yr) => rev(F.filter((r) => r.y === yr && r.m === 8 && r.day <= 15));
    a['pbi-time-mtd'] = [round2(mtd(2026)), round2(mtd(2025)), round2(rev(F.filter((r) => r.y === 2026 && r.m >= 6 && r.m <= 8)))];
    const inst = (rows) => rows.filter((r) => r.channel === 'In-Store');
    const all26 = rev(inst(jan2aug(2026))), all25 = rev(inst(jan2aug(2025)));
    const lfl26 = rev(inst(jan2aug(2026)).filter((r) => r.store !== 'W02'));
    const lfl25 = rev(inst(jan2aug(2025)).filter((r) => r.store !== 'W02'));
    if (rev(inst(jan2aug(2025)).filter((r) => r.store === 'W02')) !== 0) throw new Error('Canyon should have no 2025 Jan-Aug sales');
    a['pbi-time-lfl'] = [pct(all26 - all25, all25), pct(lfl26 - lfl25, lfl25)];
  }

  // --------------------------------------------------------------- ranking
  {
    const r25 = y(2025);
    const byProd = group(r25, (r) => r.pname, (r) => r.net);
    const top = clearTop(byProd, { what: 'top product 2025' });
    const ranked = Object.entries(byProd).sort((p, q) => q[1] - p[1]);
    const rankOf = (name) => {
      const v = byProd[name];
      if (ranked.filter(([, x]) => x === v).length > 1) throw new Error(`tie for ${name}`);
      return ranked.findIndex(([n]) => n === name) + 1;
    };
    a['pbi-rank-top'] = [top, round2(byProd[top]), rankOf('Ridgeline 1P Tent')];
    const footwear = group(r25.filter((r) => r.cat === 'Footwear'), (r) => r.pname, (r) => r.net);
    const top5 = ranked.slice(0, 5).reduce((s, [, v]) => s + v, 0);
    a['pbi-rank-cat'] = [clearTop(footwear, { what: 'top footwear product' }), pct(top5, rev(r25))];
    const stores26 = group(jan2aug(2026).filter((r) => r.channel === 'In-Store'), (r) => r.storeName, (r) => r.net);
    let running = 0, n = 0;
    for (const [, v] of ranked) { running += v; n++; if (running >= rev(r25) / 2) break; }
    a['pbi-rank-stores'] = [clearTop(stores26, { what: 'top store 2026' }), clearTop(stores26, { lowest: true, what: 'bottom store 2026' }), n];
  }

  // --------------------------------------------------------------- analysis: targets and growth
  {
    const targets = read('powerquery/store_targets_summer_2026.csv');
    const months = ['2026-06', '2026-07', '2026-08'];
    const target = {}, actual = {};
    for (const t of targets) {
      target[t.StoreCode] = sum(months, (mo) => Number(t[mo]));
      actual[t.StoreCode] = rev(F.filter((r) => r.store === t.StoreCode && r.y === 2026 && r.m >= 6 && r.m <= 8));
    }
    const attain = Object.fromEntries(Object.keys(target).map((k) => [S[k].store_name, actual[k] / target[k]]));
    const tTot = sum(Object.values(target), (x) => x), aTot = sum(Object.values(actual), (x) => x);
    a['pbi-an-target'] = [round2(tTot), round2(aTot), pct(aTot, tTot), clearTop(attain, { lowest: true, what: 'lowest attainment store' })];
    const c25 = group(jan2aug(2025), (r) => r.cat, (r) => r.net);
    const c26 = group(jan2aug(2026), (r) => r.cat, (r) => r.net);
    const delta = Object.fromEntries(Object.keys(c26).map((k) => [k, c26[k] - (c25[k] || 0)]));
    const topCat = clearTop(delta, { what: 'category with largest growth' });
    a['pbi-an-growth'] = [round2(rev(jan2aug(2026)) - rev(jan2aug(2025))), topCat, round2(delta[topCat])];
  }
  return a;
}
