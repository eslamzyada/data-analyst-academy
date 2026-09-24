// Extra Power Query files (content expansion). Three seeded datasets from new industries:
//   - Swiftline Couriers: one CSV per delivery depot, each exported a little differently (logistics)
//   - Harbor & Pine: search-ads and social-ads exports plus a campaign register (marketing)
//   - Bright Wells: a wide "one column per year and measure" survey sheet (NGO)
// Each builder writes its files and returns what it generated, so tools/data/answers-pq.js can
// check its own reading of the files against the generator.
import fs from 'node:fs';
import path from 'node:path';
import JSZip from 'jszip';
import { FILES, makeRng, ensureDir, toCsv, writeCsv, writeWorkbook, round2, iso, ymd, eachDay } from '../lib.js';

async function zipDir(dir, outFile) {
  const zip = new JSZip();
  for (const f of fs.readdirSync(dir).sort()) zip.file(f, fs.readFileSync(path.join(dir, f)));
  fs.writeFileSync(outFile, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
}
const dmy = (d) => `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

// ============================================================================ Swiftline depots
export const SWIFTLINE_DEPOTS = [
  { code: 'HC', name: 'Harbor City', region: 'Metro', vans: 8, manager: 'Priya Nair', routes: 6, parcels: [140, 190], fail: 0.034, onTime: 0.945, km: [70, 115], l100: 12.4 },
  { code: 'BP', name: 'Bayport', region: 'Coast', vans: 5, manager: 'Tom Okafor', routes: 4, parcels: [110, 150], fail: 0.046, onTime: 0.915, km: [90, 140], l100: 13.1 },
  { code: 'ML', name: 'Marlow', region: 'Metro', vans: 6, manager: 'Lena Brandt', routes: 5, parcels: [135, 180], fail: 0.029, onTime: 0.958, km: [60, 100], l100: 12.0 },
  { code: 'ET', name: 'Easton', region: 'Rural', vans: 4, manager: 'Sam Reyes', routes: 3, parcels: [70, 100], fail: 0.071, onTime: 0.862, km: [150, 210], l100: 14.6 },
];
const DRIVERS = {
  HC: ['Aisha Khan', 'Ben Carter', 'Chloe Wu', 'Dev Patel', 'Ella Novak', 'Finn Walsh', 'Gus Moreno'],
  BP: ['Hana Sato', 'Ivan Petrov', 'Jade Moss', 'Kofi Mensah', 'Luis Ortega'],
  ML: ['Mia Lund', 'Noor Haddad', 'Owen Price', 'Pablo Ruiz', 'Quinn Adler', 'Rosa Diaz'],
  ET: ['Sanjay Rao', 'Tara Byrne', 'Uma Castell', 'Victor Hale'],
};
export const MILES_TO_KM = 1.609344;

export function buildSwiftline() {
  const R = makeRng(26093001);
  const runs = [];
  for (const d of SWIFTLINE_DEPOTS) {
    for (const day of eachDay(ymd(2026, 7, 1), ymd(2026, 9, 30))) {
      if (day.getUTCDay() === 0) continue; // no Sunday runs
      for (let r = 1; r <= d.routes; r++) {
        if (R.chance(0.02)) continue; // route cancelled
        const regular = DRIVERS[d.code][r - 1];
        const driver = R.chance(0.14) ? R.pick(DRIVERS[d.code]) : regular;
        const saturday = day.getUTCDay() === 6;
        const parcels = Math.round(R.int(d.parcels[0], d.parcels[1]) * (saturday ? 0.7 : 1));
        const failRate = d.fail * R.uniform(0.4, 1.6) * (driver === regular ? 1 : 1.5);
        const failed = Math.min(parcels, Math.round(parcels * failRate));
        const delivered = parcels - failed;
        const onTime = Math.round(delivered * clamp(R.normal(d.onTime, 0.035), 0.6, 1));
        const km = Math.round(R.uniform(d.km[0], d.km[1]) * (saturday ? 0.8 : 1) * 10) / 10;
        const fuel = Math.round(km * d.l100 / 100 * R.uniform(0.92, 1.08) * 10) / 10;
        runs.push({ depot: d.code, date: day, id: `${d.code}-${iso(day).replace(/-/g, '')}-R${r}`, route: `${d.code}-R${r}`, driver, parcels, delivered, failed, onTime, km, fuel });
      }
    }
  }
  const dir = path.join(FILES, 'powerquery', 'swiftline_depot_exports');
  fs.rmSync(dir, { recursive: true, force: true });
  ensureDir(dir);
  const of = (code) => runs.filter((x) => x.depot === code);

  // Harbor City: the reference layout
  const STD = ['RunID', 'RunDate', 'Route', 'Driver', 'Parcels', 'Delivered', 'Failed', 'OnTime', 'DistanceKm', 'FuelLitres'];
  fs.writeFileSync(path.join(dir, 'Swiftline_HC_2026-Q3.csv'),
    toCsv(STD, of('HC').map((x) => [x.id, iso(x.date), x.route, x.driver, x.parcels, x.delivered, x.failed, x.onTime, x.km.toFixed(1), x.fuel.toFixed(1)])));

  // Bayport: other column order, a Notes column, and a few empty lines
  const BPH = ['RunDate', 'RunID', 'Driver', 'Route', 'Parcels', 'Failed', 'Delivered', 'OnTime', 'FuelLitres', 'DistanceKm', 'Notes'];
  const bp = of('BP').map((x) => [iso(x.date), x.id, x.driver, x.route, x.parcels, x.failed, x.delivered, x.onTime, x.fuel.toFixed(1), x.km.toFixed(1),
    R.chance(0.06) ? R.pick(['Van swap', 'Road closure on A12', 'Late trailer', 'Customer complaint']) : '']);
  const empty = Array(BPH.length).fill('');
  for (const k of [57, 181, 244]) bp.splice(k, 0, empty);
  fs.writeFileSync(path.join(dir, 'Swiftline_BP_2026-Q3.csv'), toCsv(BPH, bp));

  // Marlow: title lines above the header and UK dates
  const ml = toCsv(STD, of('ML').map((x) => [x.id, dmy(x.date), x.route, x.driver, x.parcels, x.delivered, x.failed, x.onTime, x.km.toFixed(1), x.fuel.toFixed(1)]));
  fs.writeFileSync(path.join(dir, 'Swiftline_ML_2026-Q3.csv'),
    'Swiftline Couriers - depot run report\r\nDepot: Marlow | Period: Q3 2026 | Exported 01/10/2026 07:30\r\n\r\n' + ml);

  // Easton: distance in miles, unreadable fuel cards, and a TOTAL row
  const ETH = ['RunID', 'RunDate', 'Route', 'Driver', 'Parcels', 'Delivered', 'Failed', 'OnTime', 'DistanceMi', 'FuelLitres'];
  const et = of('ET');
  for (const x of et) {
    x.miles = Math.round((x.km / MILES_TO_KM) * 10) / 10;
    x.km = x.miles * MILES_TO_KM; // the file is the truth: km comes from the miles written
    if (R.chance(0.13)) x.fuel = null;
  }
  const etRows = et.map((x) => [x.id, iso(x.date), x.route, x.driver, x.parcels, x.delivered, x.failed, x.onTime, x.miles.toFixed(1), x.fuel === null ? 'n/a' : x.fuel.toFixed(1)]);
  const tot = (f) => et.reduce((s, x) => s + f(x), 0);
  etRows.push(['TOTAL', '', '', '', tot((x) => x.parcels), tot((x) => x.delivered), tot((x) => x.failed), tot((x) => x.onTime), round2(tot((x) => x.miles)).toFixed(1), '']);
  fs.writeFileSync(path.join(dir, 'Swiftline_ET_2026-Q3.csv'), toCsv(ETH, etRows));

  fs.writeFileSync(path.join(dir, 'README.txt'),
    'Swiftline Couriers - depot exports\r\nEach depot system drops its quarterly run export here.\r\nDo not rename the files: the depot code is part of the name.\r\n');
  writeCsv(path.join(FILES, 'powerquery', 'swiftline_depots.csv'), ['DepotCode', 'DepotName', 'Region', 'Vans', 'Manager'],
    SWIFTLINE_DEPOTS.map((d) => [d.code, d.name, d.region, d.vans, d.manager]));
  return { runs, dir };
}

// ============================================================================ Harbor & Pine ads
export const HP_CAMPAIGNS = [
  { code: 'HP-S01', name: 'Brand Search', ch: 'Search', obj: 'Sales', owner: 'Maya Chen', budget: 8500, from: '2026-04-01', to: '2026-06-30', imps: [1500, 2300], ctr: 0.105, cpc: 0.42, cvr: 0.06, aov: 88 },
  { code: 'HP-S02', name: 'Generic - Bedding', ch: 'Search', obj: 'Sales', owner: 'Maya Chen', budget: 15500, from: '2026-04-01', to: '2026-06-30', imps: [4200, 5600], ctr: 0.046, cpc: 0.78, cvr: 0.034, aov: 112 },
  { code: 'HP-S03', name: 'Generic - Lighting', ch: 'Search', obj: 'Sales', owner: 'Omar Haddad', budget: 12500, from: '2026-04-01', to: '2026-06-30', imps: [3000, 4400], ctr: 0.041, cpc: 0.83, cvr: 0.016, aov: 76 },
  { code: 'HP-S04', name: 'Competitor Terms', ch: 'Search', obj: 'Sales', owner: 'Omar Haddad', budget: 5200, from: '2026-04-01', to: '2026-06-30', imps: [1100, 1700], ctr: 0.032, cpc: 1.35, cvr: 0.019, aov: 95 },
  { code: 'HP-S05', name: 'Spring Sale', ch: 'Search', obj: 'Sales', owner: 'Maya Chen', budget: 6000, from: '2026-04-01', to: '2026-05-15', imps: [2500, 3600], ctr: 0.062, cpc: 0.61, cvr: 0.061, aov: 97 },
  { code: 'HP-S06', name: 'Summer Sale', ch: 'Search', obj: 'Sales', owner: 'Maya Chen', budget: 4500, from: '2026-06-01', to: '2026-06-30', imps: [2800, 3900], ctr: 0.058, cpc: 0.64, cvr: 0.052, aov: 104 },
  { code: 'HP-S07', name: 'Outdoor Furniture', ch: 'Search', obj: 'Sales', owner: 'Omar Haddad', budget: 2500, from: null, to: null },
  { code: 'HP-F01', name: 'Prospecting - Lookalike', rename: { from: '2026-05-01', name: 'Prospecting LAL', lower: true }, ch: 'Social', obj: 'Sales', owner: 'Jess Park', budget: 8000, from: '2026-04-01', to: '2026-06-30', imps: [9000, 13000], ctr: 0.011, cpc: 0.62, cvr: 0.024, aov: 91 },
  { code: 'HP-F02', name: 'Retargeting - Cart', ch: 'Social', obj: 'Sales', owner: 'Jess Park', budget: 3500, from: '2026-04-01', to: '2026-06-30', imps: [2600, 3500], ctr: 0.024, cpc: 0.48, cvr: 0.05, aov: 102 },
  { code: 'HP-F03', name: 'Summer Lookbook', ch: 'Social', obj: 'Awareness', owner: 'Jess Park', budget: 4200, from: '2026-05-01', to: '2026-06-30', imps: [16000, 22000], ctr: 0.007, cpc: 0.55, cvr: 0.006, aov: 84 },
  { code: 'HP-F04', name: 'Brand Video', ch: 'Social', obj: 'Awareness', owner: 'Omar Haddad', budget: 4500, from: '2026-04-01', to: '2026-06-30', imps: [14000, 19000], ctr: 0.004, cpc: 0.66, cvr: 0.004, aov: 80 },
  { code: 'HP-F05', name: 'Influencer Test', ch: 'Social', obj: 'Sales', owner: 'Jess Park', budget: null, from: '2026-05-20', to: '2026-06-30', imps: [5000, 7200], ctr: 0.014, cpc: 0.71, cvr: 0.011, aov: 86, unregistered: true },
];
const money = (x) => `$${x.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function buildHarborPine() {
  const R = makeRng(26093002);
  const rows = [];
  for (const c of HP_CAMPAIGNS) {
    if (!c.from) continue;
    for (const day of eachDay(new Date(`${c.from}T00:00:00Z`), new Date(`${c.to}T00:00:00Z`))) {
      const weekend = [0, 6].includes(day.getUTCDay());
      const imps = Math.round(R.int(c.imps[0], c.imps[1]) * (weekend ? 1.12 : 1));
      const clicks = Math.max(0, Math.round(imps * c.ctr * R.uniform(0.8, 1.2)));
      const cost = round2(clicks * c.cpc * R.uniform(0.85, 1.15));
      const conv = R.poisson(clicks * c.cvr);
      const value = round2(conv * c.aov * R.uniform(0.75, 1.25));
      const renamed = c.rename && iso(day) >= c.rename.from;
      const label = renamed ? `${c.rename.lower ? c.code.toLowerCase() : c.code} | ${c.rename.name}` : `${c.code} | ${c.name}`;
      rows.push({ code: c.code, ch: c.ch, date: day, label, imps, clicks, cost, conv, value });
    }
  }
  const dir = path.join(FILES, 'powerquery', 'harbor_pine_ads');
  fs.rmSync(dir, { recursive: true, force: true });
  ensureDir(dir);
  fs.writeFileSync(path.join(dir, 'search_ads_2026-Q2.csv'),
    toCsv(['Date', 'Campaign', 'Impressions', 'Clicks', 'Cost', 'Conversions', 'ConvValue'],
      rows.filter((r) => r.ch === 'Search').map((r) => [iso(r.date), r.label, r.imps, r.clicks, r.cost.toFixed(2), r.conv, r.value.toFixed(2)])));
  fs.writeFileSync(path.join(dir, 'social_ads_2026-Q2.csv'),
    toCsv(['Day', 'Campaign name', 'Impressions', 'Link clicks', 'Amount spent (USD)', 'Purchases', 'Purchase value'],
      rows.filter((r) => r.ch === 'Social').map((r) => [iso(r.date), r.label, r.imps, r.clicks, money(r.cost), r.conv, r.value.toFixed(2)])));
  writeCsv(path.join(dir, 'campaign_register.csv'), ['CampaignCode', 'Channel', 'Objective', 'Owner', 'QuarterBudget'],
    HP_CAMPAIGNS.filter((c) => !c.unregistered).map((c) => [c.code, c.ch, c.obj, c.owner, c.budget]));
  return { rows, dir };
}

// ============================================================================ Bright Wells survey
const REGIONS = [
  { name: 'Northern', base: [0.58, 0.7], gain: [0.04, 0.08] },
  { name: 'Coastal', base: [0.62, 0.74], gain: [0.03, 0.06] },
  { name: 'Highlands', base: [0.5, 0.62], gain: [0.07, 0.11] },
  { name: 'Lakes', base: [0.6, 0.72], gain: [0.02, 0.05] },
];
const SYL_A = ['Ka', 'Lu', 'Mo', 'Na', 'Ti', 'Se', 'Bu', 'Ra', 'Ki', 'Wa', 'Zo', 'Pe'];
const SYL_B = ['mba', 'ndi', 'songo', 'wele', 'rumi', 'bati', 'kolo', 'nzima', 'lala', 'hoti', 'mera', 'dugu'];

export async function buildBrightWells() {
  const R = makeRng(26093003);
  const names = new Set();
  while (names.size < 36) names.add(R.pick(SYL_A) + R.pick(SYL_B));
  const list = [...names];
  const villages = list.map((v, i) => {
    const region = REGIONS[i % 4];
    const start = i % 9 < 5 ? 2024 : i % 9 < 7 ? 2025 : 2026;
    let enrolled = R.int(80, 320);
    let rate = R.uniform(region.base[0], region.base[1]);
    const years = {};
    for (const y of [2024, 2025, 2026]) {
      if (y > 2024) {
        enrolled = Math.round(enrolled * (y >= start ? R.uniform(1.03, 1.08) : R.uniform(0.98, 1.02)));
        rate = clamp(rate + (y >= start ? R.uniform(region.gain[0], region.gain[1]) : R.uniform(-0.02, 0.02)), 0.3, 0.97);
      }
      years[y] = { enrolled, attending: Math.round(enrolled * rate) };
    }
    return { village: v, region: region.name, start, years };
  });
  // a flood closed schools in one Lakes village in 2026
  const flooded = villages.find((v) => v.region === 'Lakes' && v.start === 2024);
  flooded.years[2026].attending = Math.round(flooded.years[2026].enrolled * 0.41);
  // villages that joined in 2026 were not surveyed in 2024; two more survey gaps
  for (const v of villages) if (v.start === 2026) v.years[2024] = { enrolled: null, attending: null };
  villages[5].years[2025].attending = null;
  villages[22].years[2025] = { enrolled: null, attending: null };

  const rows = villages.map((v) => [v.village, v.region, v.start,
    v.years[2024].enrolled, v.years[2024].attending, v.years[2025].enrolled, v.years[2025].attending, v.years[2026].enrolled, v.years[2026].attending]);
  const file = path.join(FILES, 'powerquery', 'bright_wells_school_survey.xlsx');
  await writeWorkbook(file, [{
    name: 'Survey',
    titleRows: [['Bright Wells - school programme survey by village'], ['Figures at the end of each school year. Blank = not surveyed.']],
    columns: [{ header: 'Village', width: 16 }, { header: 'Region', width: 12 }, { header: 'Programme Start', width: 16 },
      ...[2024, 2025, 2026].flatMap((y) => [{ header: `${y} Enrolled`, width: 14 }, { header: `${y} Attending`, width: 14 }])],
    rows,
  }]);
  return { villages, file };
}

export async function buildPqExtraFiles() {
  const swift = buildSwiftline();
  await zipDir(swift.dir, path.join(FILES, 'swiftline_depot_exports.zip'));
  const hp = buildHarborPine();
  await zipDir(hp.dir, path.join(FILES, 'harbor_pine_ads.zip'));
  const bw = await buildBrightWells();
  return { swift, hp, bw };
}
