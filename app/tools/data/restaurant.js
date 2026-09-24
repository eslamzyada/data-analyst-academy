// Olive & Ember Kitchen (restaurant group, 3 sites, Jan 2025 - Aug 2026).
// Story built into the data (for the food-cost capstone):
//   * Prime Meats raised beef prices ~22% from 2026-06-01 (beef mince + ribeye).
//   * Dairy Valley raised dairy prices ~8% from 2026-05-01.
//   * Riverside switched produce supplier (GreenLeaf -> QuickVeg, ~18% dearer) from 2026-06-01.
//   * Airport: waste roughly 2.5x normal from June 2026, a fridge failure on 2026-07-12,
//     and portion creep (unrecorded usage) from June 2026.
//   * Menu prices unchanged since 2025-10-01, so nothing offsets the cost rises.
import path from 'node:path';
import { makeRng, ymd, iso, addDays, eachDay, monthKey, round2, writeSqlite, writeCsv, writeWorkbook, FILES, PRACTICE } from '../lib.js';

const START = ymd(2025, 1, 1);
const END = ymd(2026, 8, 31);

const RESTAURANTS = [
  { id: 1, code: 'DT', name: 'Olive & Ember Downtown', city: 'Harbor City', opened: '2019-04-01', seats: 120, base: 175,
    season: [0.88, 0.9, 0.97, 1.0, 1.03, 1.02, 0.95, 0.9, 1.0, 1.02, 1.0, 1.12], growth: 1.04, week: [0.8, 0.85, 0.92, 1.0, 1.25, 1.35, 1.1] },
  { id: 2, code: 'RV', name: 'Olive & Ember Riverside', city: 'Bayport', opened: '2021-06-15', seats: 90, base: 130,
    season: [0.8, 0.82, 0.9, 1.0, 1.1, 1.22, 1.3, 1.28, 1.05, 0.95, 0.88, 1.0], growth: 1.07, week: [0.78, 0.82, 0.9, 1.0, 1.28, 1.4, 1.15] },
  { id: 3, code: 'AP', name: 'Olive & Ember Airport', city: 'Easton', opened: '2023-09-01', seats: 70, base: 115,
    season: [0.95, 0.9, 0.98, 1.0, 1.02, 1.1, 1.18, 1.15, 1.0, 0.98, 0.95, 1.08], growth: 1.10, week: [0.97, 0.95, 0.96, 1.0, 1.08, 1.05, 1.02] },
];
// JS getUTCDay(): 0=Sun..6=Sat ; our week arrays are Mon..Sun
const weekIdx = (d) => (d.getUTCDay() + 6) % 7;

const SUPPLIERS = [
  { id: 1, name: 'Prime Meats Co.', category: 'Meat', terms: 'Net 14', days: [0, 3] },
  { id: 2, name: 'Harbor Seafood Traders', category: 'Seafood', terms: 'Net 7', days: [1, 4] },
  { id: 3, name: 'Dairy Valley', category: 'Dairy', terms: 'Net 14', days: [0, 2, 4] },
  { id: 4, name: 'GreenLeaf Farms', category: 'Produce', terms: 'Net 7', days: [0, 2, 4] },
  { id: 5, name: 'QuickVeg Wholesale', category: 'Produce', terms: 'Net 7', days: [0, 2, 4] },
  { id: 6, name: 'Pantry Staples Ltd.', category: 'Dry goods', terms: 'Net 30', days: [0] },
  { id: 7, name: 'Bevco Distributors', category: 'Beverages', terms: 'Net 30', days: [1] },
];
const SUPPLIER_FOR_CAT = { Meat: 1, Seafood: 2, Dairy: 3, Produce: 4, 'Dry goods': 6, Beverages: 7 };

const INGREDIENTS = [
  // name, category, unit, base cost (before calibration)
  ['Beef mince', 'Meat', 'kg', 13.5], ['Ribeye steak', 'Meat', 'kg', 28.0], ['Chicken breast', 'Meat', 'kg', 9.5],
  ['Pork sausage', 'Meat', 'kg', 9.0], ['Lamb shoulder', 'Meat', 'kg', 15.5],
  ['Salmon fillet', 'Seafood', 'kg', 26.0], ['Prawns', 'Seafood', 'kg', 19.0], ['Calamari', 'Seafood', 'kg', 12.5],
  ['Mozzarella', 'Dairy', 'kg', 9.2], ['Parmesan', 'Dairy', 'kg', 21.0], ['Butter', 'Dairy', 'kg', 8.0],
  ['Cream', 'Dairy', 'l', 4.6], ['Milk', 'Dairy', 'l', 1.2], ['Eggs', 'Dairy', 'each', 0.3], ['Mascarpone', 'Dairy', 'kg', 10.5],
  ['Tomatoes', 'Produce', 'kg', 2.9], ['Lettuce', 'Produce', 'kg', 3.4], ['Onions', 'Produce', 'kg', 1.3],
  ['Potatoes', 'Produce', 'kg', 1.05], ['Mushrooms', 'Produce', 'kg', 7.0], ['Lemons', 'Produce', 'kg', 3.1],
  ['Basil', 'Produce', 'kg', 24.0], ['Garlic', 'Produce', 'kg', 6.5],
  ['Pizza flour', 'Dry goods', 'kg', 1.1], ['Pasta', 'Dry goods', 'kg', 2.4], ['Arborio rice', 'Dry goods', 'kg', 3.2],
  ['Olive oil', 'Dry goods', 'l', 8.9], ['Burger buns', 'Dry goods', 'each', 0.42], ['Bread loaf', 'Dry goods', 'each', 1.6],
  ['Sugar', 'Dry goods', 'kg', 1.2], ['Chocolate', 'Dry goods', 'kg', 11.0], ['Truffle paste', 'Dry goods', 'kg', 85.0],
  ['Coffee beans', 'Beverages', 'kg', 19.0], ['Lemonade syrup', 'Beverages', 'l', 6.2],
].map(([name, category, unit, cost], i) => ({ id: i + 1, name, category, unit, base: cost }));
const ING = Object.fromEntries(INGREDIENTS.map((x) => [x.name, x]));

const MENU = [
  // name, category, 2025 price, popularity within category, recipe
  ['Garlic Bread', 'Starters', 6.9, 1.3, [['Bread loaf', 0.25], ['Butter', 0.03], ['Garlic', 0.01], ['Parmesan', 0.005]]],
  ['Calamari Fritti', 'Starters', 11.9, 1.0, [['Calamari', 0.16], ['Pizza flour', 0.05], ['Lemons', 0.03], ['Olive oil', 0.03]]],
  ['Bruschetta', 'Starters', 8.9, 1.1, [['Bread loaf', 0.2], ['Tomatoes', 0.12], ['Basil', 0.005], ['Olive oil', 0.02], ['Garlic', 0.005]]],
  ['Caesar Salad', 'Starters', 11.5, 0.9, [['Lettuce', 0.15], ['Chicken breast', 0.1], ['Parmesan', 0.02], ['Eggs', 1], ['Bread loaf', 0.05], ['Olive oil', 0.02]]],
  ['Ember Burger', 'Mains', 17.5, 2.2, [['Beef mince', 0.25], ['Burger buns', 1], ['Lettuce', 0.03], ['Tomatoes', 0.04], ['Onions', 0.03], ['Mozzarella', 0.04], ['Potatoes', 0.25]]],
  ['Truffle Mushroom Burger', 'Mains', 18.9, 1.2, [['Beef mince', 0.25], ['Burger buns', 1], ['Mushrooms', 0.06], ['Truffle paste', 0.008], ['Mozzarella', 0.04], ['Potatoes', 0.25]]],
  ['Ribeye Steak', 'Mains', 34.0, 1.0, [['Ribeye steak', 0.3], ['Potatoes', 0.25], ['Butter', 0.03], ['Garlic', 0.005], ['Mushrooms', 0.05]]],
  ['Grilled Salmon', 'Mains', 27.5, 1.0, [['Salmon fillet', 0.22], ['Potatoes', 0.2], ['Lemons', 0.03], ['Butter', 0.02], ['Lettuce', 0.04]]],
  ['Chicken Milanese', 'Mains', 19.9, 1.1, [['Chicken breast', 0.22], ['Pizza flour', 0.03], ['Eggs', 1], ['Bread loaf', 0.1], ['Parmesan', 0.01], ['Lettuce', 0.04], ['Lemons', 0.02], ['Potatoes', 0.2]]],
  ['Lamb Ragu Pappardelle', 'Mains', 22.5, 0.8, [['Lamb shoulder', 0.18], ['Pasta', 0.14], ['Tomatoes', 0.1], ['Onions', 0.03], ['Parmesan', 0.015], ['Olive oil', 0.015]]],
  ['Prawn Linguine', 'Mains', 23.5, 0.9, [['Prawns', 0.16], ['Pasta', 0.14], ['Tomatoes', 0.08], ['Garlic', 0.01], ['Olive oil', 0.02], ['Basil', 0.003]]],
  ['Sausage & Mash', 'Mains', 17.9, 0.8, [['Pork sausage', 0.24], ['Potatoes', 0.3], ['Butter', 0.03], ['Milk', 0.05], ['Onions', 0.05]]],
  ['Mushroom Risotto', 'Mains', 18.5, 0.7, [['Arborio rice', 0.1], ['Mushrooms', 0.12], ['Parmesan', 0.03], ['Butter', 0.03], ['Onions', 0.03], ['Cream', 0.03], ['Truffle paste', 0.003]]],
  ['Margherita Pizza', 'Pizza', 13.5, 1.6, [['Pizza flour', 0.2], ['Tomatoes', 0.1], ['Mozzarella', 0.14], ['Basil', 0.004], ['Olive oil', 0.01]]],
  ['Pepperoni Pizza', 'Pizza', 15.5, 1.4, [['Pizza flour', 0.2], ['Tomatoes', 0.1], ['Mozzarella', 0.14], ['Pork sausage', 0.08]]],
  ['Funghi Pizza', 'Pizza', 14.9, 0.9, [['Pizza flour', 0.2], ['Tomatoes', 0.1], ['Mozzarella', 0.14], ['Mushrooms', 0.08]]],
  ['Prawn & Chilli Pizza', 'Pizza', 18.5, 0.6, [['Pizza flour', 0.2], ['Tomatoes', 0.1], ['Mozzarella', 0.12], ['Prawns', 0.1], ['Garlic', 0.005]]],
  ['Tiramisu', 'Desserts', 8.9, 1.3, [['Mascarpone', 0.08], ['Eggs', 1], ['Sugar', 0.03], ['Coffee beans', 0.01], ['Chocolate', 0.01]]],
  ['Chocolate Fondant', 'Desserts', 9.5, 1.1, [['Chocolate', 0.06], ['Butter', 0.04], ['Eggs', 1], ['Sugar', 0.03], ['Pizza flour', 0.02], ['Cream', 0.03]]],
  ['Lemon Tart', 'Desserts', 8.5, 0.7, [['Lemons', 0.06], ['Butter', 0.04], ['Eggs', 1], ['Sugar', 0.04], ['Pizza flour', 0.05]]],
  ['Espresso', 'Drinks', 3.2, 1.0, [['Coffee beans', 0.018]]],
  ['Cappuccino', 'Drinks', 4.0, 1.3, [['Coffee beans', 0.018], ['Milk', 0.2]]],
  ['Homemade Lemonade', 'Drinks', 4.9, 1.1, [['Lemonade syrup', 0.05], ['Lemons', 0.03], ['Sugar', 0.02]]],
  ['Fries', 'Sides', 4.9, 1.4, [['Potatoes', 0.3], ['Olive oil', 0.02]]],
  ['Side Salad', 'Sides', 4.5, 0.8, [['Lettuce', 0.08], ['Tomatoes', 0.05], ['Olive oil', 0.01]]],
].map(([name, category, price, pop, recipe], i) => ({ id: i + 1, name, category, price, pop, recipe }));
const CAT_RATE = { Starters: 0.35, Mains: 0.52, Pizza: 0.36, Desserts: 0.25, Drinks: 0.75, Sides: 0.3 };
const PRICE_RISE = ymd(2025, 10, 1);
const priceOn = (item, d) => (d >= PRICE_RISE ? Math.round(item.price * 1.04 * 10) / 10 : item.price);

const WASTE_RATE = { Produce: 0.05, Seafood: 0.04, Dairy: 0.03, Meat: 0.02, 'Dry goods': 0.005, Beverages: 0.005 };
const STOCK_DAYS = { Produce: 1.5, Seafood: 1.5, Dairy: 2.5, Meat: 2.5, 'Dry goods': 10, Beverages: 12 };

export async function buildRestaurant() {
  const R = makeRng(20260915);

  // ---- item mix per cover
  const catPop = {};
  for (const m of MENU) catPop[m.category] = (catPop[m.category] || 0) + m.pop;
  const rateOf = (m) => CAT_RATE[m.category] * m.pop / catPop[m.category];

  // ---- calibrate ingredient costs so theoretical plate cost ~ 24.5% of menu price at the average mix
  const plateBase = (m) => m.recipe.reduce((s, [n, q]) => s + ING[n].base * q, 0);
  const mixCost = MENU.reduce((s, m) => s + rateOf(m) * plateBase(m), 0);
  const mixRev = MENU.reduce((s, m) => s + rateOf(m) * m.price, 0);
  const K = 0.245 / (mixCost / mixRev);
  for (const ing of INGREDIENTS) ing.cost = round2(ing.base * K);

  // ---- price of an ingredient from a supplier on a date (before invoice noise)
  function unitPrice(ing, supplierId, d) {
    const yrs = (d - START) / (365.25 * 86400000);
    let p = ing.cost * (1 + 0.02 * yrs);
    if ((ing.name === 'Beef mince' || ing.name === 'Ribeye steak') && d >= ymd(2026, 6, 1)) p *= 1.22;
    if (ing.category === 'Dairy' && d >= ymd(2026, 5, 1)) p *= 1.08;
    if (ing.name === 'Tomatoes') p *= [1.12, 1.12, 1.05, 1.0, 0.95, 0.88, 0.88, 0.88, 0.92, 1.0, 1.08, 1.12][d.getUTCMonth()];
    if (ing.name === 'Lettuce') p *= [1.1, 1.1, 1.05, 1.0, 0.97, 0.95, 0.95, 0.95, 0.98, 1.0, 1.05, 1.1][d.getUTCMonth()];
    if (supplierId === 5) p *= 1.18;
    return p;
  }
  const produceSupplier = (restId, d) => (restId === 2 && d >= ymd(2026, 6, 1) ? 5 : 4);
  const supplierOf = (ing, restId, d) => (ing.category === 'Produce' ? produceSupplier(restId, d) : SUPPLIER_FOR_CAT[ing.category]);

  // ---- daily sales and ingredient usage
  const sales = [];
  const usage = new Map(); // key rest|date -> Float64Array(ingredients)
  const covers = new Map();
  for (const r of RESTAURANTS) {
    for (const d of eachDay(START, END)) {
      const yearF = d.getUTCFullYear() === 2026 ? r.growth : 1;
      const lam = r.base * r.season[d.getUTCMonth()] * r.week[weekIdx(d)] * yearF;
      const cv = R.poisson(lam);
      covers.set(`${r.id}|${iso(d)}`, cv);
      const use = new Float64Array(INGREDIENTS.length + 1);
      for (const m of MENU) {
        let rate = rateOf(m);
        if (r.code === 'AP' && (m.name.includes('Burger') || m.category === 'Drinks')) rate *= 1.25;
        if (r.code === 'AP' && m.name === 'Ribeye Steak') rate *= 0.6;
        if (r.code === 'RV' && [5, 6, 7].includes(d.getUTCMonth()) && /Salmon|Prawn|Calamari/.test(m.name)) rate *= 1.5;
        const qty = R.poisson(cv * rate);
        if (qty === 0) continue;
        const price = priceOn(m, d);
        const gross = round2(qty * price);
        const promo = weekIdx(d) < 4 && ['Drinks', 'Starters'].includes(m.category) ? R.uniform(0, 0.12) : R.uniform(0, 0.02);
        const disc = round2(gross * promo);
        sales.push([iso(d), r.id, m.id, qty, price, gross, disc, round2(gross - disc)]);
        for (const [n, q] of m.recipe) use[ING[n].id] += qty * q;
      }
      usage.set(`${r.id}|${iso(d)}`, use);
    }
  }

  // ---- consumption (usage + portion creep + waste), purchasing, inventory
  const purchases = [], waste = [], counts = [];
  let purchaseId = 1;
  const invoiceNo = (sid, d, code) => `${['PM', 'HS', 'DV', 'GL', 'QV', 'PS', 'BV'][sid - 1]}-${iso(d).replace(/-/g, '')}-${code}`;
  const days = [...eachDay(START, END)];
  for (const r of RESTAURANTS) {
    const inv = new Float64Array(INGREDIENTS.length + 1);
    const lastCost = new Float64Array(INGREDIENTS.length + 1);
    const weeklyWaste = new Map(); // ing id -> {qty, reasons}
    // opening stock = target stock
    for (const ing of INGREDIENTS) {
      const avg = days.slice(0, 14).reduce((s, d) => s + usage.get(`${r.id}|${iso(d)}`)[ing.id], 0) / 14;
      inv[ing.id] = avg * STOCK_DAYS[ing.category];
      lastCost[ing.id] = unitPrice(ing, supplierOf(ing, r.id, START), START);
    }
    for (let di = 0; di < days.length; di++) {
      const d = days[di];
      const key = `${r.id}|${iso(d)}`;
      const use = usage.get(key);
      const apBad = r.code === 'AP' && d >= ymd(2026, 6, 1);
      const creep = r.code === 'DT' ? 0.015 : r.code === 'RV' ? 0.02 : apBad ? 0.06 : 0.03;
      // deliveries first (morning)
      const bySupplier = new Map();
      for (const ing of INGREDIENTS) {
        const sid = supplierOf(ing, r.id, d);
        const sup = SUPPLIERS[sid - 1];
        if (!sup.days.includes(weekIdx(d))) continue;
        // forecast next few days of consumption
        const gap = sup.days.length === 1 ? 7 : sup.days.length === 2 ? 3.5 : 2.3;
        let fc = 0;
        for (let k = 0; k < Math.ceil(gap); k++) {
          const dd = days[Math.min(days.length - 1, di + k)];
          fc += usage.get(`${r.id}|${iso(dd)}`)[ing.id];
        }
        fc = fc * (gap / Math.ceil(gap)) * (1 + creep + WASTE_RATE[ing.category] * (apBad ? 2.5 : 1)) * R.uniform(0.94, 1.08);
        const target = (fc / gap) * STOCK_DAYS[ing.category];
        let qty = Math.max(0, fc + target - inv[ing.id]);
        if (qty <= 0) continue;
        qty = ing.unit === 'each' ? Math.ceil(qty) : Math.ceil(qty * 10) / 10;
        const cost = round2(unitPrice(ing, sid, d) * R.uniform(0.985, 1.015));
        inv[ing.id] += qty;
        lastCost[ing.id] = cost;
        if (!bySupplier.has(sid)) bySupplier.set(sid, []);
        bySupplier.get(sid).push([ing, qty, cost]);
      }
      for (const [sid, lines] of bySupplier) {
        const no = invoiceNo(sid, d, r.code);
        for (const [ing, qty, cost] of lines) {
          purchases.push([purchaseId++, no, iso(d), r.id, sid, ing.id, qty, ing.unit, cost, round2(qty * cost)]);
        }
      }
      // consumption through the day
      for (const ing of INGREDIENTS) {
        const u = use[ing.id];
        let wasted = u * WASTE_RATE[ing.category] * (apBad && ing.category !== 'Dry goods' && ing.category !== 'Beverages' ? 2.5 : 1) * R.uniform(0.6, 1.4);
        const need = u * (1 + creep) + wasted;
        if (need > inv[ing.id]) {
          // emergency top-up bought at a 10% premium
          const qty = ing.unit === 'each' ? Math.ceil(need - inv[ing.id]) : Math.ceil((need - inv[ing.id]) * 10) / 10;
          const sid = supplierOf(ing, r.id, d);
          const cost = round2(unitPrice(ing, sid, d) * 1.1);
          purchases.push([purchaseId++, invoiceNo(sid, d, r.code) + '-X', iso(d), r.id, sid, ing.id, qty, ing.unit, cost, round2(qty * cost)]);
          inv[ing.id] += qty;
        }
        inv[ing.id] -= need;
        if (wasted > 0) {
          const w = weeklyWaste.get(ing.id) || { qty: 0 };
          w.qty += wasted;
          weeklyWaste.set(ing.id, w);
        }
      }
      // fridge failure at the Airport
      if (r.code === 'AP' && iso(d) === '2026-07-12') {
        for (const [n, q] of [['Salmon fillet', 14], ['Prawns', 11], ['Mozzarella', 18], ['Cream', 16], ['Butter', 6], ['Mascarpone', 5], ['Milk', 20]]) {
          const ing = ING[n];
          const qq = Math.min(q, inv[ing.id]);
          inv[ing.id] -= qq;
          waste.push([iso(d), r.id, ing.id, round2(qq), ing.unit, 'Equipment failure']);
        }
      }
      // weekly waste log entry every Sunday
      if (weekIdx(d) === 6 || di === days.length - 1) {
        for (const [ingId, w] of weeklyWaste) {
          const ing = INGREDIENTS[ingId - 1];
          if (w.qty < (ing.unit === 'each' ? 1 : 0.05)) continue;
          const reason = ing.category === 'Produce' ? R.weighted(['Spoiled', 'Over-prepared', 'Expired'], [5, 3, 2])
            : ing.category === 'Seafood' || ing.category === 'Meat' ? R.weighted(['Expired', 'Over-prepared', 'Dropped/damaged'], [4, 4, 1])
            : R.weighted(['Expired', 'Spoiled', 'Dropped/damaged'], [5, 3, 1]);
          waste.push([iso(d), r.id, ing.id, ing.unit === 'each' ? Math.round(w.qty) : round2(w.qty), ing.unit, reason]);
        }
        weeklyWaste.clear();
      }
      // month-end stock count
      const next = addDays(d, 1);
      if (next.getUTCDate() === 1 || di === days.length - 1) {
        for (const ing of INGREDIENTS) {
          const counted = Math.max(0, inv[ing.id] * R.uniform(0.99, 1.01));
          const q = ing.unit === 'each' ? Math.round(counted) : round2(counted);
          counts.push([iso(d), r.id, ing.id, q, ing.unit, round2(q * lastCost[ing.id])]);
        }
      }
    }
  }

  // ---- labour and operating costs
  const labor = [];
  const opCosts = [];
  const monthNet = new Map();
  for (const s of sales) monthNet.set(`${s[1]}|${s[0].slice(0, 7)}`, (monthNet.get(`${s[1]}|${s[0].slice(0, 7)}`) || 0) + s[7]);
  for (const r of RESTAURANTS) {
    for (const d of eachDay(START, END)) {
      const cv = covers.get(`${r.id}|${iso(d)}`);
      const raise = d >= ymd(2026, 4, 1) ? 1.05 : 1;
      const k = round2((6 + cv * 0.12) * R.uniform(0.95, 1.05));
      const f = round2((8 + cv * 0.15) * R.uniform(0.95, 1.05));
      const ot = r.code === 'AP' && d >= ymd(2026, 6, 1) ? 0.12 : 0.02;
      labor.push([iso(d), r.id, 'Kitchen', k, round2(k * 17.5 * raise * (1 + ot * 0.5))]);
      labor.push([iso(d), r.id, 'Front of house', f, round2(f * 15.0 * raise)]);
      labor.push([iso(d), r.id, 'Management', 10, round2(10 * 24 * raise)]);
    }
    for (let m = new Date(START); m <= END; m = ymd(m.getUTCFullYear(), m.getUTCMonth() + 2, 1)) {
      const mk = monthKey(m);
      const net = monthNet.get(`${r.id}|${mk}`) || 0;
      const rent = r.code === 'DT' ? 16000 : r.code === 'RV' ? 11000 : round2(9000 + net * 0.08);
      const util = round2((r.code === 'DT' ? 3200 : r.code === 'RV' ? 2400 : 2100) * [1.15, 1.12, 1.0, 0.95, 0.95, 1.1, 1.18, 1.18, 1.0, 0.95, 1.05, 1.15][m.getUTCMonth()] * R.uniform(0.97, 1.03));
      const mkt = r.code === 'RV' && mk === '2026-06' ? 4000 : 1500;
      opCosts.push([mk, r.id, 'Rent', rent], [mk, r.id, 'Utilities', util], [mk, r.id, 'Marketing', mkt]);
      const maint = r.code === 'AP' && mk === '2026-07' ? 6800 : round2(R.uniform(300, 900));
      opCosts.push([mk, r.id, 'Maintenance', maint]);
    }
  }

  // ---- write SQLite
  const menuRows = MENU.map((m) => [m.id, m.name, m.category, Math.round(m.price * 1.04 * 10) / 10, 1]);
  const priceRows = [];
  for (const m of MENU) priceRows.push([m.id, '2025-01-01', m.price], [m.id, '2025-10-01', Math.round(m.price * 1.04 * 10) / 10]);
  const recipeRows = [];
  for (const m of MENU) for (const [n, q] of m.recipe) recipeRows.push([m.id, ING[n].id, q]);
  const tables = [
    { name: 'restaurants', ddl: `CREATE TABLE restaurants (restaurant_id INTEGER PRIMARY KEY, code TEXT NOT NULL, name TEXT NOT NULL, city TEXT, opened_on TEXT, seats INTEGER)`,
      columns: ['restaurant_id', 'code', 'name', 'city', 'opened_on', 'seats'], rows: RESTAURANTS.map((r) => [r.id, r.code, r.name, r.city, r.opened, r.seats]) },
    { name: 'suppliers', ddl: `CREATE TABLE suppliers (supplier_id INTEGER PRIMARY KEY, name TEXT NOT NULL, category TEXT, payment_terms TEXT)`,
      columns: ['supplier_id', 'name', 'category', 'payment_terms'], rows: SUPPLIERS.map((s) => [s.id, s.name, s.category, s.terms]) },
    { name: 'ingredients', ddl: `CREATE TABLE ingredients (ingredient_id INTEGER PRIMARY KEY, name TEXT NOT NULL, category TEXT, unit TEXT)`,
      columns: ['ingredient_id', 'name', 'category', 'unit'], rows: INGREDIENTS.map((x) => [x.id, x.name, x.category, x.unit]) },
    { name: 'menu_items', ddl: `CREATE TABLE menu_items (menu_item_id INTEGER PRIMARY KEY, name TEXT NOT NULL, category TEXT, current_price REAL, is_active INTEGER)`,
      columns: ['menu_item_id', 'name', 'category', 'current_price', 'is_active'], rows: menuRows },
    { name: 'menu_price_history', ddl: `CREATE TABLE menu_price_history (menu_item_id INTEGER, effective_from TEXT, price REAL)`,
      columns: ['menu_item_id', 'effective_from', 'price'], rows: priceRows },
    { name: 'recipes', ddl: `CREATE TABLE recipes (menu_item_id INTEGER, ingredient_id INTEGER, qty_per_portion REAL)`,
      columns: ['menu_item_id', 'ingredient_id', 'qty_per_portion'], rows: recipeRows },
    { name: 'daily_sales', ddl: `CREATE TABLE daily_sales (sale_date TEXT, restaurant_id INTEGER, menu_item_id INTEGER, qty_sold INTEGER, unit_price REAL, gross_sales REAL, discount_amount REAL, net_sales REAL)`,
      columns: ['sale_date', 'restaurant_id', 'menu_item_id', 'qty_sold', 'unit_price', 'gross_sales', 'discount_amount', 'net_sales'], rows: sales },
    { name: 'purchases', ddl: `CREATE TABLE purchases (purchase_id INTEGER PRIMARY KEY, invoice_no TEXT, delivery_date TEXT, restaurant_id INTEGER, supplier_id INTEGER, ingredient_id INTEGER, qty REAL, unit TEXT, unit_cost REAL, line_total REAL)`,
      columns: ['purchase_id', 'invoice_no', 'delivery_date', 'restaurant_id', 'supplier_id', 'ingredient_id', 'qty', 'unit', 'unit_cost', 'line_total'], rows: purchases },
    { name: 'waste_log', ddl: `CREATE TABLE waste_log (waste_date TEXT, restaurant_id INTEGER, ingredient_id INTEGER, qty REAL, unit TEXT, reason TEXT)`,
      columns: ['waste_date', 'restaurant_id', 'ingredient_id', 'qty', 'unit', 'reason'], rows: waste },
    { name: 'inventory_counts', ddl: `CREATE TABLE inventory_counts (count_date TEXT, restaurant_id INTEGER, ingredient_id INTEGER, qty_on_hand REAL, unit TEXT, value_at_cost REAL)`,
      columns: ['count_date', 'restaurant_id', 'ingredient_id', 'qty_on_hand', 'unit', 'value_at_cost'], rows: counts },
    { name: 'labor_daily', ddl: `CREATE TABLE labor_daily (work_date TEXT, restaurant_id INTEGER, role TEXT, hours REAL, labor_cost REAL)`,
      columns: ['work_date', 'restaurant_id', 'role', 'hours', 'labor_cost'], rows: labor },
    { name: 'operating_costs', ddl: `CREATE TABLE operating_costs (month TEXT, restaurant_id INTEGER, cost_type TEXT, amount REAL)`,
      columns: ['month', 'restaurant_id', 'cost_type', 'amount'], rows: opCosts },
  ];
  const counts2 = await writeSqlite(path.join(PRACTICE, 'restaurant.db'), tables, [
    'CREATE INDEX ix_sales_date ON daily_sales (sale_date)', 'CREATE INDEX ix_sales_item ON daily_sales (menu_item_id)',
    'CREATE INDEX ix_purch_date ON purchases (delivery_date)', 'CREATE INDEX ix_purch_ing ON purchases (ingredient_id)',
  ]);

  // ---- downloadable capstone pack (CSV + one reference workbook)
  const dir = path.join(FILES, 'restaurant');
  const R_ = Object.fromEntries(RESTAURANTS.map((r) => [r.id, r.name]));
  const M_ = Object.fromEntries(MENU.map((m) => [m.id, m]));
  const I_ = Object.fromEntries(INGREDIENTS.map((x) => [x.id, x]));
  const S_ = Object.fromEntries(SUPPLIERS.map((s) => [s.id, s.name]));
  writeCsv(path.join(dir, 'sales_daily.csv'), ['Date', 'Restaurant', 'Menu Item', 'Category', 'Qty Sold', 'Unit Price', 'Gross Sales', 'Discount', 'Net Sales'],
    sales.map((s) => [s[0], R_[s[1]], M_[s[2]].name, M_[s[2]].category, s[3], s[4], s[5], s[6], s[7]]));
  writeCsv(path.join(dir, 'purchases.csv'), ['Purchase ID', 'Invoice No', 'Delivery Date', 'Restaurant', 'Supplier', 'Ingredient', 'Qty', 'Unit', 'Unit Cost', 'Line Total'],
    purchases.map((p) => [p[0], p[1], p[2], R_[p[3]], S_[p[4]], I_[p[5]].name, p[6], p[7], p[8], p[9]]));
  writeCsv(path.join(dir, 'waste_log.csv'), ['Date', 'Restaurant', 'Ingredient', 'Qty', 'Unit', 'Reason'],
    waste.map((w) => [w[0], R_[w[1]], I_[w[2]].name, w[3], w[4], w[5]]));
  writeCsv(path.join(dir, 'inventory_counts.csv'), ['Count Date', 'Restaurant', 'Ingredient', 'Qty On Hand', 'Unit', 'Value At Cost'],
    counts.map((c) => [c[0], R_[c[1]], I_[c[2]].name, c[3], c[4], c[5]]));
  writeCsv(path.join(dir, 'labor_daily.csv'), ['Date', 'Restaurant', 'Role', 'Hours', 'Labor Cost'],
    labor.map((l) => [l[0], R_[l[1]], l[2], l[3], l[4]]));
  writeCsv(path.join(dir, 'operating_costs.csv'), ['Month', 'Restaurant', 'Cost Type', 'Amount'],
    opCosts.map((o) => [o[0], R_[o[1]], o[2], o[3]]));
  await writeWorkbook(path.join(dir, 'menu_recipes_suppliers.xlsx'), [
    { name: 'Menu', columns: [{ header: 'Menu Item ID', width: 13 }, { header: 'Menu Item', width: 26 }, { header: 'Category', width: 12 }, { header: 'Current Price', numFmt: '0.00' }],
      rows: MENU.map((m) => [m.id, m.name, m.category, Math.round(m.price * 1.04 * 10) / 10]), freeze: true },
    { name: 'Recipes', columns: [{ header: 'Menu Item', width: 26 }, { header: 'Ingredient', width: 18 }, { header: 'Qty per Portion', numFmt: '0.000' }, { header: 'Unit' }],
      rows: recipeRows.map(([mi, ii, q]) => [M_[mi].name, I_[ii].name, q, I_[ii].unit]), freeze: true },
    { name: 'Ingredients', columns: [{ header: 'Ingredient ID', width: 13 }, { header: 'Ingredient', width: 18 }, { header: 'Category', width: 12 }, { header: 'Unit' }],
      rows: INGREDIENTS.map((x) => [x.id, x.name, x.category, x.unit]), freeze: true },
    { name: 'Suppliers', columns: [{ header: 'Supplier ID', width: 12 }, { header: 'Supplier', width: 26 }, { header: 'Category', width: 12 }, { header: 'Payment Terms', width: 14 }],
      rows: SUPPLIERS.map((s) => [s.id, s.name, s.category, s.terms]) },
    { name: 'Restaurants', columns: [{ header: 'Restaurant ID', width: 13 }, { header: 'Restaurant', width: 26 }, { header: 'City', width: 14 }, { header: 'Opened', width: 12 }, { header: 'Seats' }],
      rows: RESTAURANTS.map((r) => [r.id, r.name, r.city, r.opened, r.seats]) },
  ]);

  // ---- Power Query practice: Prime Meats invoice exports, one file per month, formats drift
  const pq = path.join(FILES, 'powerquery', 'prime_meats_invoices');
  const pm = purchases.filter((p) => p[4] === 1 && p[2] >= '2026-05-01');
  const byMonth = (mm) => pm.filter((p) => p[2].slice(0, 7) === mm);
  writeCsv(path.join(pq, 'PrimeMeats_2026-05.csv'), ['InvoiceNo', 'Date', 'Site', 'Product', 'Qty', 'Unit', 'UnitPrice', 'LineTotal'],
    byMonth('2026-05').map((p) => [p[1], p[2], R_[p[3]], I_[p[5]].name, p[6], p[7], p[8], p[9]]));
  writeCsv(path.join(pq, 'PrimeMeats_2026-06.csv'), ['InvoiceNo', 'Date', 'Site', 'Product', 'Quantity', 'Unit', 'UnitPrice', 'LineTotal'],
    byMonth('2026-06').map((p) => [p[1], p[2].split('-').reverse().join('/'), R_[p[3]].toUpperCase(), I_[p[5]].name.toUpperCase(), p[6], p[7], p[8], p[9]]));
  const jul = byMonth('2026-07').map((p) => [p[1], p[2], R_[p[3]], ' ' + I_[p[5]].name + ' ', p[6], p[7], p[8], p[9]]);
  jul.push(['', '', '', 'TOTAL', '', '', '', round2(byMonth('2026-07').reduce((s, p) => s + p[9], 0))]);
  writeCsv(path.join(pq, 'PrimeMeats_2026-07.csv'), ['InvoiceNo', 'Date', 'Site', 'Product', 'Qty', 'Unit', 'UnitPrice', 'LineTotal'], jul);
  const aug = byMonth('2026-08');
  const augRows = aug.map((p) => [p[1], p[2], R_[p[3]], I_[p[5]].name, p[6], p[7], p[8], p[9]]);
  // a duplicated invoice line (re-sent by the supplier)
  augRows.splice(10, 0, augRows[9].slice());
  writeCsv(path.join(pq, 'PrimeMeats_2026-08.csv'), ['InvoiceNo', 'Date', 'Site', 'Product', 'Qty', 'Unit', 'UnitPrice', 'LineTotal'], augRows);

  return { counts: counts2, K: round2(K) };
}
