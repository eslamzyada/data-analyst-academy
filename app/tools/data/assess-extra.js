// Data for the mixed-skill assessments (Real Analyst mode). Seeded, so every build is identical.
//
//   Fieldhouse Gyms: one membership export from the club system, as it really arrives: exported
//   twice in places, test accounts left in, club names typed three ways, two date formats, fees
//   with and without a currency sign, and a footer line. The story inside it: Riverside raised its
//   monthly fee on 1 April 2026 and its monthly members started leaving; the other two clubs did not.
//
// The builder returns what it generated, so tools/data/answers-assess.js can check its own
// reading of the file (done the way a learner would) against the truth.
import path from 'node:path';
import { FILES, makeRng, writeCsv, iso, ymd, addDays } from '../lib.js';

export const FIELDHOUSE_CLUBS = [
  { code: 'NG', name: 'Northgate', joins: 21 },
  { code: 'RS', name: 'Riverside', joins: 19 },
  { code: 'OT', name: 'Old Town', joins: 15 },
];
export const FIELDHOUSE_PLANS = [
  { name: 'Monthly', fee: 45, weight: 50 },
  { name: 'Annual', fee: 38, weight: 20 },
  { name: 'Student', fee: 29, weight: 15 },
  { name: 'Corporate', fee: 35, weight: 15 },
];
export const RIVERSIDE_RISE = { from: '2026-04-01', fee: 52 };
export const FIELDHOUSE_END = '2026-08-31';

const FIRST = ['Ava', 'Ben', 'Cara', 'Dan', 'Eve', 'Farid', 'Gia', 'Hugo', 'Iris', 'Jon', 'Kemi', 'Leo', 'Maya', 'Nils', 'Ola', 'Pia', 'Raj', 'Sana', 'Theo', 'Uma', 'Vik', 'Wren', 'Yusuf', 'Zara', 'Amir', 'Bea', 'Caleb', 'Dina'];
const LAST = ['Adams', 'Bello', 'Costa', 'Dunn', 'Ekwueme', 'Fox', 'Grant', 'Hale', 'Ito', 'Jensen', 'Kaur', 'Lowe', 'Mills', 'Nowak', 'Ortiz', 'Park', 'Quinn', 'Reid', 'Shah', 'Tan', 'Varga', 'Wood', 'Young', 'Zhou'];

const dmy = (s) => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`;

function monthsBetween(fromIso, toIso) {
  const out = [];
  let y = Number(fromIso.slice(0, 4)), m = Number(fromIso.slice(5, 7));
  const ey = Number(toIso.slice(0, 4)), em = Number(toIso.slice(5, 7));
  while (y < ey || (y === ey && m <= em)) { out.push([y, m]); m++; if (m > 12) { m = 1; y++; } }
  return out;
}

export function buildFieldhouse() {
  const R = makeRng(26092401);
  const members = [];
  let id = 10001;
  for (const [y, m] of monthsBetween('2024-01-01', FIELDHOUSE_END)) {
    for (const club of FIELDHOUSE_CLUBS) {
      const season = m === 1 ? 1.6 : m === 9 ? 1.25 : m === 8 || m === 12 ? 0.75 : 1;
      const n = Math.max(0, Math.round(club.joins * season * R.uniform(0.8, 1.2)));
      for (let k = 0; k < n; k++) {
        const dim = new Date(Date.UTC(y, m, 0)).getUTCDate();
        const joined = iso(ymd(y, m, R.int(1, dim)));
        if (joined > FIELDHOUSE_END) continue;
        const plan = R.weighted(FIELDHOUSE_PLANS, FIELDHOUSE_PLANS.map((p) => p.weight));
        const first = R.pick(FIRST), last = R.pick(LAST);
        members.push({ id: `FH${id++}`, name: `${first} ${last}`, email: `${first}.${last}${R.int(1, 99)}@mail.example`.toLowerCase(), club: club.name, plan: plan.name, joined, cancelled: null });
      }
    }
  }
  // cancellations, month by month after joining
  for (const mem of members) {
    for (const [y, m] of monthsBetween(mem.joined, FIELDHOUSE_END)) {
      const monthStart = iso(ymd(y, m, 1));
      if (monthStart.slice(0, 7) === mem.joined.slice(0, 7)) continue;          // nobody leaves in their first month
      let hazard = mem.plan === 'Annual' ? 0.008 : 0.027;
      if (mem.club === 'Riverside' && mem.plan === 'Monthly' && monthStart >= RIVERSIDE_RISE.from) hazard = monthStart < '2026-07-01' ? 0.11 : 0.07;
      if (R.chance(hazard)) {
        const dim = new Date(Date.UTC(y, m, 0)).getUTCDate();
        const c = iso(ymd(y, m, R.int(1, dim)));
        if (c <= FIELDHOUSE_END) { mem.cancelled = c; break; }
      }
    }
    // the fee the system shows today: Riverside monthly members still with the club after the rise pay the new fee
    const plan = FIELDHOUSE_PLANS.find((p) => p.name === mem.plan);
    const rose = mem.club === 'Riverside' && mem.plan === 'Monthly' && (!mem.cancelled || mem.cancelled >= RIVERSIDE_RISE.from);
    mem.fee = rose ? RIVERSIDE_RISE.fee : plan.fee;
  }

  // ---- the export, with everything an export really comes with
  const rows = members.map((mm) => ({ ...mm, clubText: mm.club, feeText: mm.fee.toFixed(2), joinedText: mm.joined, cancelledText: mm.cancelled || '', status: mm.cancelled ? 'Cancelled' : 'Active' }));
  const pickRows = (n, pred = () => true) => {
    const pool = rows.filter(pred);
    const out = new Set();
    while (out.size < Math.min(n, pool.length)) out.add(pool[R.int(0, pool.length - 1)]);
    return [...out];
  };
  for (const r of pickRows(34, (x) => x.club === 'Old Town')) r.clubText = R.pick(['Oldtown', 'OLD TOWN', 'Old Town ']);
  for (const r of pickRows(12, (x) => x.club === 'Riverside' && x.clubText === 'Riverside')) r.clubText = 'Riverside ';
  for (const r of pickRows(46)) r.joinedText = dmy(r.joined);
  for (const r of pickRows(15, (x) => !!x.cancelled)) r.cancelledText = dmy(r.cancelled);
  for (const r of pickRows(31)) r.feeText = `$${r.fee.toFixed(2)}`;
  for (const r of pickRows(18, (x) => !x.cancelled)) r.cancelledText = 'n/a';
  const out = rows.map((r) => [r.id, r.name, r.email, r.clubText, r.plan, r.feeText, r.joinedText, r.cancelledText, r.status]);
  // test accounts the front desk set up and never removed
  const tests = [];
  for (let t = 1; t <= 6; t++) {
    const club = FIELDHOUSE_CLUBS[t % 3].name;
    const row = [`TEST${t}`, t % 2 ? 'TEST ACCOUNT' : 'zz test member', `frontdesk${t}@fieldhouse.test`, club, 'Monthly', '0.00', iso(addDays(ymd(2026, 2, 1), t * 17)), '', 'Active'];
    tests.push(row);
    out.splice(R.int(50, out.length - 50), 0, row);
  }
  // the same members exported twice
  const dupes = [];
  for (let d = 0; d < 14; d++) {
    const i = R.int(20, out.length - 20);
    if (String(out[i][0]).startsWith('TEST')) { d--; continue; }
    dupes.push(out[i][0]);
    out.splice(i + R.int(1, 3), 0, [...out[i]]);
  }
  out.splice(R.int(200, 400), 0, ['', '', '', '', '', '', '', '', '']);
  out.splice(R.int(700, 900), 0, ['', '', '', '', '', '', '', '', '']);
  out.push(['', '', '', '', '', '', '', '', '']);
  out.push([`Total rows: ${out.filter((r) => r[0]).length}`, '', '', '', '', '', '', '', '']);

  const file = path.join(FILES, 'assessment', 'fieldhouse_members_export.csv');
  writeCsv(file, ['MemberID', 'Name', 'Email', 'Club', 'Plan', 'MonthlyFee', 'Joined', 'Cancelled', 'Status'], out);
  return { members, tests: tests.map((t) => t[0]), dupes, file, rows: out.length };
}

export async function buildAssessFiles() {
  return { fieldhouse: buildFieldhouse() };
}
