// Excel + Power Query practice files. Each generator returns the expected answers,
// computed here from the same rows that are written to the file.
import path from 'node:path';
import { makeRng, ymd, iso, addDays, round2, writeWorkbook, writeCsv, FILES } from '../lib.js';

const XL = path.join(FILES, 'excel');
const PQ = path.join(FILES, 'powerquery');

// ----------------------------------------------------------------------------- 1. Summit Coffee (beginner, clean)
async function summitCoffee(R) {
  const products = [['Flat White', 'Coffee', 3.6], ['Latte', 'Coffee', 3.8], ['Espresso', 'Coffee', 2.6], ['Chai Latte', 'Tea', 3.9], ['Green Tea', 'Tea', 2.8],
    ['Croissant', 'Pastry', 2.9], ['Banana Bread', 'Pastry', 3.2], ['House Blend 250g', 'Beans', 9.5], ['Single Origin 250g', 'Beans', 12.0]];
  const stores = ['Harbour St', 'Mill Lane', 'Station Rd'];
  const rows = [];
  for (let i = 0; i < 60; i++) {
    const [p, c, price] = R.pick(products);
    rows.push([ymd(2026, 9, 1 + Math.floor(i / 5)), R.pick(stores), p, c, c === 'Beans' ? R.int(1, 3) : R.int(1, 6), price]);
  }
  rows.sort((a, b) => a[0] - b[0]);
  const rev = rows.map((r) => r[4] * r[5]);
  const total = round2(rev.reduce((s, x) => s + x, 0));
  const expected = [total, rows.length, round2(total / rows.length), round2(Math.max(...rev)), rows.filter((r) => r[3] === 'Beans').length,
    round2(rows.reduce((s, r, i) => s + (r[1] === 'Mill Lane' ? rev[i] : 0), 0))];
  await writeWorkbook(path.join(XL, 'summit_coffee_sales.xlsx'), [{
    name: 'Sales', freeze: true,
    columns: [{ header: 'Date', width: 12 }, { header: 'Store', width: 12 }, { header: 'Product', width: 20 }, { header: 'Category', width: 10 }, { header: 'Qty', width: 6 }, { header: 'Unit Price', numFmt: '0.00' }],
    rows,
  }], {
    questions: [
      { q: 'What is the total revenue? (Revenue = Qty x Unit Price. Tip: add a Revenue column first.)' },
      { q: 'How many transactions (rows) are there?' },
      { q: 'What is the average revenue per transaction? Round to 2 decimals.' },
      { q: 'What is the revenue of the single largest transaction?' },
      { q: 'How many transactions were for the Beans category?' },
      { q: 'What is the total revenue of the Mill Lane store?' },
    ],
  });
  return expected;
}

// ----------------------------------------------------------------------------- 2. Supplier price lookup (intermediate)
async function supplierLookup(R) {
  const suppliers = ['Northline Supply', 'Apex Wholesale', 'Brightway Traders', 'Keystone Parts'];
  const items = ['Gloves', 'Tape', 'Cable Ties', 'Batteries', 'Labels', 'Box', 'Pallet Wrap', 'Marker', 'Cutter', 'Scanner Strap', 'Shelf Bin', 'Hand Truck'];
  const price = [];
  for (let i = 0; i < 150; i++) {
    const sku = `SKU-${String(3000 + i * 7).padStart(5, '0')}`;
    price.push({ sku, desc: `${R.pick(items)} ${R.pick(['S', 'M', 'L', 'XL', 'Pro', 'Basic'])}`, supplier: R.pick(suppliers), cost: round2(R.uniform(1.2, 85)), lead: R.int(2, 21) });
  }
  const po = R.sample(price, 37).map((p, i) => ({ line: i + 1, sku: p.sku, desc: p.desc, qty: R.int(2, 60) }));
  const missing = [{ sku: 'SKU-04444', desc: 'Safety Vest L' }, { sku: 'SKU-05555', desc: 'Ear Plugs Pro' }, { sku: 'SKU-06666', desc: 'Knee Pads M' }];
  for (const m of missing) po.splice(R.int(3, po.length - 2), 0, { line: 0, sku: m.sku, desc: m.desc, qty: R.int(5, 40) });
  po.forEach((p, i) => { p.line = i + 1; });
  // two price-list SKUs have a stray trailing space (they should still match)
  const spaced = R.sample(po.filter((p) => !missing.find((m) => m.sku === p.sku)), 2).map((p) => p.sku);
  const priceRows = price.map((p) => [spaced.includes(p.sku) ? p.sku + ' ' : p.sku, p.desc, p.supplier, p.cost, p.lead]);
  const bySku = Object.fromEntries(price.map((p) => [p.sku, p]));
  let total = 0; const bySup = {}; let maxLead = 0;
  for (const l of po) {
    const p = bySku[l.sku];
    if (!p) continue;
    total += l.qty * p.cost;
    bySup[p.supplier] = (bySup[p.supplier] || 0) + l.qty * p.cost;
    maxLead = Math.max(maxLead, p.lead);
  }
  const topSup = Object.entries(bySup).sort((a, b) => b[1] - a[1])[0][0];
  await writeWorkbook(path.join(XL, 'supplier_price_lookup.xlsx'), [
    { name: 'PurchaseOrder', freeze: true, columns: [{ header: 'Line', width: 6 }, { header: 'SKU', width: 12 }, { header: 'Description', width: 20 }, { header: 'Qty', width: 7 }],
      rows: po.map((l) => [l.line, l.sku, l.desc, l.qty]) },
    { name: 'PriceList', freeze: true, columns: [{ header: 'SKU', width: 12 }, { header: 'Description', width: 20 }, { header: 'Supplier', width: 20 }, { header: 'Unit Cost', numFmt: '0.00' }, { header: 'Lead Time (days)', width: 16 }],
      rows: priceRows },
  ], {
    questions: [
      { q: 'How many purchase-order lines have NO price in the price list at all (truly missing, not just a typing difference)?' },
      { q: 'What is the total cost (Qty x Unit Cost) of all lines that do have a price? Round to 2 decimals.' },
      { q: 'Which supplier has the highest total value on this purchase order? (type the supplier name)' },
      { q: `What is the unit cost of ${spaced[0]}?` },
      { q: 'What is the longest lead time (in days) among the lines that have a price?' },
    ],
  });
  return [missing.length, round2(total), topSup, bySku[spaced[0]].cost, maxLead];
}

// ----------------------------------------------------------------------------- 3. Regional sales (intermediate SUMIFS/COUNTIFS)
async function regionalSales(R) {
  const regions = ['North', 'South', 'East', 'West'];
  const cats = ['Footwear', 'Apparel', 'Camping', 'Accessories'];
  const customers = Array.from({ length: 420 }, (_, i) => `C${String(10000 + i * 3)}`);
  const rows = [];
  for (let i = 0; i < 1200; i++) {
    const d = addDays(ymd(2026, 1, 1), R.int(0, 180));
    const cat = R.weighted(cats, [3, 4, 2, 3]);
    const base = { Footwear: 140, Apparel: 90, Camping: 260, Accessories: 45 }[cat];
    rows.push([`ORD-${50001 + i}`, d, R.weighted(regions, [3, 2.5, 2, 3]), R.weighted(['Online', 'Store'], [4.5, 5.5]), R.pick(customers), cat, round2(Math.max(8, R.normal(base, base * 0.45)) * R.int(1, 3))]);
  }
  rows.sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : 1));
  const inRange = (d, a, b) => d >= a && d < b;
  const westMar = round2(rows.filter((r) => r[2] === 'West' && inRange(r[1], ymd(2026, 3, 1), ymd(2026, 4, 1))).reduce((s, r) => s + r[6], 0));
  const east500 = rows.filter((r) => r[2] === 'East' && r[6] > 500).length;
  const onlQ1 = rows.filter((r) => r[3] === 'Online' && inRange(r[1], ymd(2026, 1, 1), ymd(2026, 4, 1)));
  const avgOnlineQ1 = round2(onlQ1.reduce((s, r) => s + r[6], 0) / onlQ1.length);
  const southFwQ2 = round2(rows.filter((r) => r[2] === 'South' && r[5] === 'Footwear' && inRange(r[1], ymd(2026, 4, 1), ymd(2026, 7, 1))).reduce((s, r) => s + r[6], 0));
  const distinct = new Set(rows.map((r) => r[4])).size;
  const byMonth = {};
  for (const r of rows) { const k = iso(r[1]).slice(0, 7); byMonth[k] = (byMonth[k] || 0) + r[6]; }
  const bestMonth = Object.entries(byMonth).sort((a, b) => b[1] - a[1])[0][0];
  await writeWorkbook(path.join(XL, 'regional_sales_2026.xlsx'), [{
    name: 'Orders', freeze: true,
    columns: [{ header: 'Order ID', width: 12 }, { header: 'Order Date', width: 12 }, { header: 'Region', width: 9 }, { header: 'Channel', width: 9 }, { header: 'Customer ID', width: 12 }, { header: 'Category', width: 12 }, { header: 'Revenue', numFmt: '#,##0.00' }],
    rows,
  }], {
    questions: [
      { q: 'What was West revenue in March 2026?' },
      { q: 'How many East orders were worth more than 500?' },
      { q: 'What was the average Online order revenue in Q1 2026 (January to March)? Round to 2 decimals.' },
      { q: 'What was Footwear revenue in the South region in Q2 2026 (April to June)?' },
      { q: 'How many distinct customers placed orders?' },
      { q: 'Which month had the highest total revenue? Type it as YYYY-MM (for example 2026-02).' },
    ],
  });
  return { answers: [westMar, east500, avgOnlineQ1, southFwQ2, distinct, bestMonth], rows };
}

// ----------------------------------------------------------------------------- 4. NGO donations (intermediate pivots / dynamic arrays)
async function ngoDonations(R) {
  const programs = ['Clean Water', 'Education', 'Health', 'Food Security'];
  const regions = ['East Africa', 'West Africa', 'South Asia', 'Middle East'];
  const fn = ['Alice', 'Bilal', 'Clara', 'Daniel', 'Esther', 'Farid', 'Greta', 'Hamza', 'Iris', 'Joel', 'Kemi', 'Lucas', 'Mira', 'Nabil', 'Olivia', 'Pedro', 'Rana', 'Simon', 'Tamar', 'Yusuf'];
  const ln = ['Hale', 'Moreno', 'Osei', 'Keller', 'Farah', 'Lind', 'Park', 'Qureshi', 'Rossi', 'Tanaka', 'Wolfe', 'Yeboah', 'Ahmed', 'Baird', 'Costa', 'Duran'];
  const seen = new Set();
  const donors = Array.from({ length: 260 }, (_, i) => {
    let name;
    do { name = `${R.pick(fn)} ${R.pick(ln)}`; } while (seen.has(name));
    seen.add(name);
    return { id: `D${4001 + i}`, name, recurring: R.chance(0.22), heavy: R.chance(0.05) };
  });
  const rows = [];
  let id = 1;
  for (const d of donors) {
    const n = d.recurring ? 12 : R.weighted([1, 2, 3, 4], [6, 2, 1, 0.5]);
    const prog = R.pick(programs);
    for (let k = 0; k < n; k++) {
      const date = d.recurring ? ymd(2025, k + 1, R.int(1, 5)) : addDays(ymd(2025, 1, 1), R.int(0, 364));
      const amount = d.recurring ? R.pick([10, 20, 25, 50]) : round2(d.heavy ? R.uniform(1000, 5000) : Math.max(5, R.normal(120, 90)));
      rows.push([`G-${String(id++).padStart(5, '0')}`, date, d.id, d.name, R.chance(0.8) ? prog : R.pick(programs), R.pick(regions), d.recurring ? 'Bank transfer' : R.weighted(['Online', 'Event', 'Bank transfer'], [5, 3, 2]), amount, d.recurring ? 'Y' : 'N']);
    }
  }
  rows.sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : 1));
  const total = round2(rows.reduce((s, r) => s + r[7], 0));
  const byProg = {}; const byDonor = {}; const cnt = {};
  for (const r of rows) { byProg[r[4]] = (byProg[r[4]] || 0) + r[7]; byDonor[r[3]] = (byDonor[r[3]] || 0) + r[7]; cnt[r[2]] = (cnt[r[2]] || 0) + 1; }
  const topProg = Object.entries(byProg).sort((a, b) => b[1] - a[1])[0][0];
  const topDonor = Object.entries(byDonor).sort((a, b) => b[1] - a[1])[0][0];
  const recurringShare = round2(rows.filter((r) => r[8] === 'Y').reduce((s, r) => s + r[7], 0) / total * 100);
  await writeWorkbook(path.join(XL, 'ngo_donations_2025.xlsx'), [{
    name: 'Donations', freeze: true,
    columns: [{ header: 'Gift ID', width: 10 }, { header: 'Date', width: 12 }, { header: 'Donor ID', width: 10 }, { header: 'Donor Name', width: 16 }, { header: 'Program', width: 15 }, { header: 'Region', width: 13 }, { header: 'Channel', width: 13 }, { header: 'Amount', numFmt: '#,##0.00' }, { header: 'Recurring', width: 10 }],
    rows,
  }], {
    questions: [
      { q: 'What is the total amount donated in 2025?' },
      { q: 'Which program received the most money? (type the program name)' },
      { q: 'How many unique donors gave in 2025?' },
      { q: 'How many donors gave more than once?' },
      { q: 'What percentage of the total came from recurring gifts? Type it as a percentage number, e.g. 18.5' },
      { q: 'Who is the top donor by total amount? (type the donor name)' },
    ],
  });
  // extra ground truth for the NGO capstone
  const byChannel = {}; const byRegion = {}; const byQuarter = {};
  const donorTotals = Object.entries(byDonor).map(([n, v]) => [n, round2(v)]).sort((a, b) => b[1] - a[1]);
  for (const r of rows) {
    byChannel[r[6]] = round2((byChannel[r[6]] || 0) + r[7]);
    byRegion[r[5]] = round2((byRegion[r[5]] || 0) + r[7]);
    const q = 'Q' + (Math.floor(new Date(r[1]).getMonth() / 3) + 1);
    byQuarter[q] = round2((byQuarter[q] || 0) + r[7]);
  }
  const top10Share = round2(donorTotals.slice(0, 10).reduce((a, b) => a + b[1], 0) / total * 100);
  const recurringDonors = new Set(rows.filter((r) => r[8] === 'Y').map((r) => r[2])).size;
  const recurringGiftCount = rows.filter((r) => r[8] === 'Y').length;
  const avgRecurringGift = round2(rows.filter((r) => r[8] === 'Y').reduce((a, r) => a + r[7], 0) / recurringGiftCount);
  const avgOneOffGift = round2(rows.filter((r) => r[8] === 'N').reduce((a, r) => a + r[7], 0) / rows.filter((r) => r[8] === 'N').length);
  const capstone = {
    total, topProgram: topProg, donors: Object.keys(cnt).length, gifts: rows.length,
    recurringShare, recurringDonors, recurringDonorShare: round2(recurringDonors / Object.keys(cnt).length * 100),
    avgRecurringGift, avgOneOffGift,
    top10Share, topDonor, topDonorTotal: donorTotals[0][1],
    byProgram: Object.entries(byProg).map(([k, v]) => [k, round2(v)]).sort((a, b) => b[1] - a[1]),
    byChannel: Object.entries(byChannel).sort((a, b) => b[1] - a[1]),
    byRegion: Object.entries(byRegion).sort((a, b) => b[1] - a[1]),
    byQuarter: Object.entries(byQuarter).sort(),
  };
  return { key: [total, topProg, Object.keys(cnt).length, Object.values(cnt).filter((c) => c > 1).length, recurringShare, topDonor], capstone };
}

// ----------------------------------------------------------------------------- 5. E-commerce product trends (advanced)
async function productTrends(R) {
  const cats = { Kitchen: ['Chef Knife', 'Cutting Board', 'Pour-Over Kettle', 'Spice Rack', 'Mixing Bowls', 'Cast Iron Pan', 'Salad Spinner'],
    Home: ['Linen Throw', 'Desk Lamp', 'Plant Pot', 'Wall Clock', 'Candle Set', 'Photo Frame', 'Storage Basket', 'Door Mat'],
    Fitness: ['Yoga Mat', 'Kettlebell 12kg', 'Resistance Bands', 'Foam Roller', 'Jump Rope', 'Water Bottle', 'Gym Towel', 'Ab Wheel'],
    Office: ['Notebook A5', 'Gel Pens', 'Monitor Stand', 'Desk Organizer', 'Laptop Sleeve', 'Webcam Cover', 'Sticky Notes'] };
  const products = [];
  let pid = 101;
  for (const [cat, names] of Object.entries(cats)) for (const n of names) products.push({ id: `P${pid++}`, name: n, cat, base: R.uniform(40, 400), price: round2(R.uniform(8, 90)), trend: R.uniform(-0.05, 0.25) });
  const decliners = R.sample(products, 5);
  for (const p of decliners) p.decline = R.uniform(0.3, 0.55);
  const spike = R.pick(products.filter((p) => !p.decline));
  const spikeMonth = '2025-11';
  const rows = [];
  for (let y = 2024; y <= 2026; y++) {
    for (let m = 1; m <= 12; m++) {
      if (y === 2026 && m > 8) break;
      const t = (y - 2024) * 12 + (m - 1);
      const season = [0.85, 0.8, 0.95, 1.0, 1.0, 0.95, 0.92, 0.95, 1.0, 1.05, 1.25, 1.45][m - 1];
      for (const p of products) {
        let units = p.base * season * (1 + p.trend * t / 12);
        if (p.decline && t >= 24) units *= 1 - p.decline * Math.min(1, (t - 23) / 4);
        units = Math.max(0, Math.round(units * R.uniform(0.9, 1.1)));
        const mk = `${y}-${String(m).padStart(2, '0')}`;
        if (p === spike && mk === spikeMonth) units *= 6;
        rows.push([ymd(y, m, 1), p.id, p.name, p.cat, units, p.price]);
      }
    }
  }
  const sumUnits = (p, months) => rows.filter((r) => r[1] === p.id && months.includes(iso(r[0]).slice(0, 7))).reduce((s, r) => s + r[4], 0);
  const changes = products.map((p) => {
    const now = sumUnits(p, ['2026-06', '2026-07', '2026-08']);
    const before = sumUnits(p, ['2025-06', '2025-07', '2025-08']);
    return { p, pct: (now - before) / before };
  });
  const declining = changes.filter((c) => c.pct <= -0.2);
  const worst = changes.slice().sort((a, b) => a.pct - b.pct)[0].p.name;
  const rev2025 = round2(rows.filter((r) => r[0].getUTCFullYear() === 2025).reduce((s, r) => s + r[4] * r[5], 0));
  const aug = rows.filter((r) => iso(r[0]).slice(0, 7) === '2026-08');
  const augRev = aug.reduce((s, r) => s + r[4] * r[5], 0);
  const scenario = round2(aug.reduce((s, r) => s + r[4] * 0.97 * r[5] * 1.05, 0));
  await writeWorkbook(path.join(XL, 'ecommerce_product_trends.xlsx'), [{
    name: 'MonthlySales', freeze: true,
    columns: [{ header: 'Month', width: 12, dateFmt: 'yyyy-mm' }, { header: 'Product ID', width: 11 }, { header: 'Product', width: 20 }, { header: 'Category', width: 10 }, { header: 'Units', width: 8 }, { header: 'Avg Price', numFmt: '0.00' }],
    rows,
  }], {
    questions: [
      { q: 'How many products sold at least 20% fewer units in Jun-Aug 2026 than in Jun-Aug 2025?' },
      { q: 'Which product had the largest % drop over that comparison? (type the product name)' },
      { q: 'One product has an impossible spike in a single month (a data error). Type its Product ID.' },
      { q: 'What was total revenue (Units x Avg Price) for calendar year 2025? Round to 2 decimals.' },
      { q: `Scenario: in August 2026 revenue was ${round2(augRev).toLocaleString('en-US')}. If every price had been 5% higher and units 3% lower, what would August revenue have been? Round to 2 decimals.` },
    ],
  });
  return { answers: [declining.length, worst, spike.id, rev2025, scenario], augRev: round2(augRev), declining: declining.map((c) => c.p.name), spikeMonth };
}

// ----------------------------------------------------------------------------- 6. Power Query: messy contacts CSV (beginner)
function messyContacts(R) {
  const first = ['Anna', 'Ben', 'Carla', 'David', 'Eva', 'Farid', 'Gloria', 'Hiro', 'Irene', 'Jamal', 'Kate', 'Leon', 'Mona', 'Nate', 'Olga', 'Paul', 'Rita', 'Sami', 'Tess', 'Victor'];
  const last = ['Stone', 'Rivera', 'Kaur', 'Mills', 'Okafor', 'Berg', 'Chen', 'Duarte', 'Sato', 'Wright', 'Hale', 'Nasser', 'Price', 'Frost', 'Lam'];
  const cities = ['Bayport', 'Easton', 'Harbor City', 'Marlow', 'Redwood Falls'];
  const people = [];
  const used = new Set();
  while (people.length < 230) {
    const f = R.pick(first), l = R.pick(last);
    if (used.has(f + l)) continue;
    used.add(f + l);
    const signup = addDays(ymd(2024, 1, 1), R.int(0, 900));
    people.push({ id: `CU-${2000 + people.length}`, f, l, city: R.pick(cities), email: R.chance(0.1) ? null : `${f}.${l}@mail.example`.toLowerCase(), phone: `0${R.int(100, 999)}${R.int(1000000, 9999999)}`, signup });
  }
  const rows = [];
  for (const [i, p] of people.entries()) {
    const city = i % 6 === 0 ? p.city.toUpperCase() : i % 7 === 0 ? ` ${p.city}` : i % 9 === 0 ? p.city.toLowerCase() : p.city;
    const email = p.email === null ? (i % 2 ? 'N/A' : '') : p.email;
    const phone = i % 5 === 0 ? `${p.phone.slice(0, 4)} ${p.phone.slice(4, 7)} ${p.phone.slice(7)}` : i % 8 === 0 ? `+44${p.phone.slice(1)}` : p.phone;
    const signup = i % 4 === 0 ? `${String(p.signup.getUTCDate()).padStart(2, '0')}/${String(p.signup.getUTCMonth() + 1).padStart(2, '0')}/${p.signup.getUTCFullYear()}` : iso(p.signup);
    rows.push([p.id, `${p.l}, ${p.f}`, email, phone, city, signup]);
  }
  for (const k of [20, 55, 90, 140, 199, 210]) rows.splice(k, 0, rows[k].slice());
  for (const k of [33, 120, 180]) rows.splice(k, 0, ['', '', '', '', '', '']);
  writeCsv(path.join(PQ, 'crm_contacts_export.csv'), ['Customer ID', 'Full Name', 'Email', 'Phone', 'City', 'Signup Date'], rows);
  return [people.length, people.filter((p) => !p.email).length, cities.length, people.filter((p) => p.signup.getUTCFullYear() === 2025).length,
    people.filter((p) => p.l === 'Chen').length];
}

// ----------------------------------------------------------------------------- 7. Power Query: wide department budget (intermediate)
async function budgetWide(R) {
  const depts = ['Operations', 'Transport', 'Customer Service', 'Sales', 'Finance', 'HR', 'IT'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const rows = depts.map((d) => [d, ...months.map(() => Math.round(R.uniform(20000, 140000) / 100) * 100)]);
  const q3 = rows.reduce((s, r) => s + r[7] + r[8] + r[9], 0);
  const q4 = rows.map((r) => [r[0], r[10] + r[11] + r[12]]).sort((a, b) => b[1] - a[1])[0][0];
  await writeWorkbook(path.join(PQ, 'department_budget_2026_wide.xlsx'), [{
    name: 'Budget', titleRows: [['Brightpath Logistics - 2026 budget by department (USD)'], ['Prepared by Finance - do not edit']],
    columns: [{ header: 'Department', width: 18 }, ...months.map((m) => ({ header: m, width: 10, numFmt: '#,##0' }))],
    rows,
  }]);
  return [depts.length * 12, q3, q4, rows.find((r) => r[0] === 'IT').slice(1).reduce((s, x) => s + x, 0)];
}

export async function buildPractice() {
  const R = makeRng(20260917);
  const out = {};
  out.summit = await summitCoffee(R);
  out.supplier = await supplierLookup(R);
  const regional = await regionalSales(R);
  out.regional = regional.answers;
  const ngo = await ngoDonations(R);
  out.ngo = ngo.key;
  out.ngoCapstone = ngo.capstone;
  const trends = await productTrends(R);
  out.trends = trends.answers;
  out.trendsInfo = { augRev: trends.augRev, declining: trends.declining, spikeMonth: trends.spikeMonth };
  out.contacts = messyContacts(R);
  out.budget = await budgetWide(R);
  return out;
}
