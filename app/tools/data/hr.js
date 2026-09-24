// Brightpath Logistics (HR). Story: after the 2024 pay freeze for Transport and Operations,
// driver overtime rose and voluntary turnover in Transport roughly doubled in 2025-2026.
import path from 'node:path';
import { makeRng, ymd, iso, addDays, round2, writeSqlite, writeWorkbook, FILES, PRACTICE } from '../lib.js';

const DEPTS = [
  { id: 1, name: 'Operations', cc: 'CC-100', size: 180, titles: [['Warehouse Associate', 32000, 38000, 0.62], ['Forklift Operator', 36000, 42000, 0.22], ['Shift Supervisor', 46000, 54000, 0.12], ['Operations Manager', 70000, 85000, 0.04]] },
  { id: 2, name: 'Transport', cc: 'CC-200', size: 140, titles: [['Delivery Driver', 38000, 45000, 0.7], ['Senior Driver', 44000, 50000, 0.18], ['Fleet Coordinator', 48000, 56000, 0.08], ['Transport Manager', 72000, 88000, 0.04]] },
  { id: 3, name: 'Customer Service', cc: 'CC-300', size: 90, titles: [['CS Agent', 30000, 35000, 0.68], ['Senior CS Agent', 35000, 40000, 0.18], ['CS Team Lead', 44000, 50000, 0.1], ['CS Manager', 62000, 72000, 0.04]] },
  { id: 4, name: 'Sales', cc: 'CC-400', size: 35, titles: [['Account Executive', 45000, 60000, 0.6], ['Account Manager', 58000, 72000, 0.32], ['Sales Manager', 80000, 100000, 0.08]] },
  { id: 5, name: 'Finance', cc: 'CC-500', size: 15, titles: [['Accountant', 50000, 62000, 0.55], ['Financial Analyst', 55000, 68000, 0.35], ['Finance Manager', 85000, 100000, 0.1]] },
  { id: 6, name: 'HR', cc: 'CC-600', size: 10, titles: [['HR Coordinator', 40000, 46000, 0.5], ['HR Business Partner', 58000, 70000, 0.4], ['HR Manager', 75000, 90000, 0.1]] },
  { id: 7, name: 'IT', cc: 'CC-700', size: 20, titles: [['IT Support', 42000, 50000, 0.45], ['Data Analyst', 55000, 68000, 0.25], ['Developer', 65000, 85000, 0.25], ['IT Manager', 90000, 110000, 0.05]] },
];
const LOCATIONS = ['North Hub', 'South Hub', 'Head Office'];
const FIRST = ['Amir', 'Beth', 'Carlos', 'Dina', 'Elena', 'Femi', 'Grace', 'Hassan', 'Ivy', 'Jonah', 'Karim', 'Laila', 'Marco', 'Nadia', 'Owen', 'Priya', 'Quinn', 'Rania', 'Sam', 'Tara', 'Umar', 'Vera', 'Will', 'Xena', 'Yara', 'Zane', 'Aisha', 'Ben', 'Chloe', 'Dev', 'Eman', 'Finn', 'Gina', 'Hugo', 'Isla', 'Jack', 'Kira', 'Liam', 'Maya', 'Nico', 'Omar', 'Pia', 'Rosa', 'Sofia', 'Tom', 'Uma', 'Vik', 'Wendy', 'Yusuf', 'Zoe'];
const LAST = ['Adams', 'Baker', 'Chen', 'Diaz', 'Evans', 'Farah', 'Garcia', 'Hughes', 'Ibrahim', 'Jones', 'Khan', 'Lopez', 'Mensah', 'Nguyen', 'Okoro', 'Patel', 'Quinn', 'Reyes', 'Silva', 'Taylor', 'Usman', 'Vargas', 'Walsh', 'Young', 'Zhang', "O'Neill", 'Morales', 'Kowalczyk', 'Haddad', 'Novak', 'Ali', 'Brooks', 'Clarke', 'Dubois', 'Ellis', 'Fischer'];

const HIST_START = ymd(2019, 1, 1);
const END = ymd(2026, 8, 31);

export async function buildHR() {
  const R = makeRng(20260916);
  const employees = [];
  const salaryRows = [];
  let nextId = 1001;

  const pickTitle = (d) => R.weighted(d.titles, d.titles.map((t) => t[3]));
  function hire(dept, date, forced) {
    const t = forced || pickTitle(dept);
    const [title, lo, hi] = t;
    const e = {
      id: nextId++, first: R.pick(FIRST), last: R.pick(LAST), dept: dept.id, title, lo, hi,
      loc: dept.id <= 3 ? R.weighted(LOCATIONS.slice(0, 2), [0.55, 0.45]) : 'Head Office',
      hire: date, term: null, termType: null, reason: null,
      type: dept.id === 2 && R.chance(0.12) ? 'Contract' : dept.id === 3 && R.chance(0.15) ? 'Part-time' : 'Full-time',
      salary: Math.round(R.uniform(lo, (lo + hi) / 2) / 100) * 100,
    };
    salaryRows.push([e.id, iso(date), e.salary, 'Hire']);
    employees.push(e);
    return e;
  }

  // initial workforce (hired 2012-2018)
  for (const d of DEPTS) {
    for (let i = 0; i < d.size; i++) hire(d, ymd(R.int(2012, 2018), R.int(1, 12), R.int(1, 28)));
  }
  // monthly simulation 2019-01 .. 2026-08: raises, promotions, leavers, backfills
  for (let y = 2019; y <= 2026; y++) {
    for (let m = 1; m <= 12; m++) {
      const mDate = ymd(y, m, 1);
      if (mDate > END) break;
      // April pay review
      if (m === 4) {
        for (const e of employees) {
          if (e.term || e.hire > mDate) continue;
          const freeze = y === 2024 && (e.dept === 1 || e.dept === 2);
          const pct = freeze ? 0 : y === 2025 && e.dept === 2 ? 0.015 : R.uniform(0.02, 0.04);
          if (pct > 0) {
            e.salary = Math.round(e.salary * (1 + pct) / 100) * 100;
            salaryRows.push([e.id, iso(ymd(y, 4, 1)), e.salary, 'Annual raise']);
          }
        }
      }
      for (const d of DEPTS) {
        const active = employees.filter((e) => e.dept === d.id && !e.term && e.hire <= mDate);
        // annual turnover rate by department and period
        let annual = d.id === 2 ? (y >= 2025 ? 0.38 : y === 2024 ? 0.24 : 0.17) : d.id === 3 ? 0.3 : d.id === 1 ? (y >= 2025 ? 0.26 : 0.2) : 0.1;
        const monthly = 1 - Math.pow(1 - annual, 1 / 12);
        for (const e of active) {
          const tenureM = (mDate - e.hire) / (30.4 * 86400000);
          let p = monthly * (tenureM < 6 ? (d.id === 3 ? 2.2 : 1.5) : tenureM > 60 ? 0.6 : 1);
          if (e.title.includes('Manager')) p *= 0.4;
          if (R.chance(p)) {
            const day = ymd(y, m, R.int(1, 28));
            if (day > END) continue;
            e.term = day;
            e.termType = R.chance(0.82) ? 'Voluntary' : 'Involuntary';
            if (e.termType === 'Voluntary') {
              e.reason = d.id === 2 && y >= 2024 ? R.weighted(['Pay', 'Workload/overtime', 'Better offer', 'Manager', 'Relocation', 'Career growth'], [34, 30, 16, 8, 6, 6])
                : d.id === 3 ? R.weighted(['Career growth', 'Pay', 'Workload/overtime', 'Manager', 'Relocation', 'Better offer'], [26, 22, 18, 16, 8, 10])
                : R.weighted(['Career growth', 'Better offer', 'Pay', 'Relocation', 'Manager', 'Workload/overtime'], [28, 22, 18, 12, 10, 10]);
            }
          } else if (tenureM > 18 && R.chance(0.006) && !e.title.includes('Manager')) {
            // promotion to the next title in the ladder
            const idx = d.titles.findIndex((t) => t[0] === e.title);
            if (idx >= 0 && idx < d.titles.length - 2) {
              const nt = d.titles[idx + 1];
              e.title = nt[0]; e.lo = nt[1]; e.hi = nt[2];
              e.salary = Math.max(nt[1], Math.round(e.salary * 1.1 / 100) * 100);
              salaryRows.push([e.id, iso(ymd(y, m, 1)), e.salary, 'Promotion']);
            }
          }
        }
        // backfill to target size (with a lag)
        const nowActive = employees.filter((e) => e.dept === d.id && !e.term && e.hire <= mDate).length;
        const gap = d.size - nowActive;
        for (let i = 0; i < gap; i++) {
          if (R.chance(0.75)) {
            const ladder = d.titles.slice(0, 2);
            hire(d, ymd(y, m, R.int(1, 28)), R.weighted(ladder, ladder.map((t) => t[3])));
          }
        }
      }
    }
  }
  // managers: each non-manager reports to a manager/lead in the same department
  for (const d of DEPTS) {
    const inDept = employees.filter((e) => e.dept === d.id);
    const heads = inDept.filter((e) => /Manager|Lead|Supervisor/.test(e.title));
    for (const e of inDept) {
      if (e.title.includes('Manager')) { e.manager = null; continue; }
      const alive = heads.filter((h) => h !== e && h.hire <= (e.term || END) && (!h.term || h.term >= e.hire));
      e.manager = alive.length ? R.pick(alive).id : null;
    }
  }
  // attendance and performance for 2024-01 .. 2026-08
  const attendance = [];
  const reviews = [];
  for (const e of employees) {
    for (let y = 2024; y <= 2026; y++) {
      for (let m = 1; m <= 12; m++) {
        const ms = ymd(y, m, 1);
        const me = addDays(ymd(y, m + 1, 1), -1);
        if (ms > END || e.hire > me || (e.term && e.term < ms)) continue;
        const sched = e.type === 'Part-time' ? 12 : 21;
        const heavy = e.dept === 2 && y >= 2025 && e.title.includes('Driver');
        const ot = e.dept === 2 ? (heavy ? R.uniform(18, 36) : R.uniform(6, 16)) : e.dept === 1 ? R.uniform(2, 12) : R.uniform(0, 4);
        const absent = Math.min(sched, R.poisson((heavy ? 1.6 : 0.9) * (sched / 21)));
        attendance.push([e.id, `${y}-${String(m).padStart(2, '0')}`, sched, absent, round2(ot)]);
      }
      const reviewDate = ymd(y, 12, 15);
      if (reviewDate <= END && e.hire < ymd(y, 9, 1) && (!e.term || e.term > reviewDate)) {
        reviews.push([e.id, y, R.weighted([1, 2, 3, 4, 5], [4, 14, 48, 26, 8])]);
      }
    }
  }
  const exits = employees.filter((e) => e.termType === 'Voluntary' && e.term >= ymd(2022, 1, 1))
    .map((e) => [e.id, iso(e.term), e.reason, R.weighted(['Yes', 'No', 'Maybe'], [3, 5, 2])]);

  const deptName = Object.fromEntries(DEPTS.map((d) => [d.id, d.name]));
  const counts = await writeSqlite(path.join(PRACTICE, 'hr.db'), [
    { name: 'departments', ddl: 'CREATE TABLE departments (department_id INTEGER PRIMARY KEY, name TEXT NOT NULL, cost_center TEXT)',
      columns: ['department_id', 'name', 'cost_center'], rows: DEPTS.map((d) => [d.id, d.name, d.cc]) },
    { name: 'employees', ddl: `CREATE TABLE employees (employee_id INTEGER PRIMARY KEY, first_name TEXT, last_name TEXT, department_id INTEGER, job_title TEXT,
        location TEXT, manager_id INTEGER, employment_type TEXT, hire_date TEXT, termination_date TEXT, termination_type TEXT, current_salary INTEGER)`,
      columns: ['employee_id', 'first_name', 'last_name', 'department_id', 'job_title', 'location', 'manager_id', 'employment_type', 'hire_date', 'termination_date', 'termination_type', 'current_salary'],
      rows: employees.map((e) => [e.id, e.first, e.last, e.dept, e.title, e.loc, e.manager, e.type, iso(e.hire), e.term ? iso(e.term) : null, e.termType, e.salary]) },
    { name: 'salary_history', ddl: 'CREATE TABLE salary_history (employee_id INTEGER, effective_date TEXT, salary INTEGER, change_reason TEXT)',
      columns: ['employee_id', 'effective_date', 'salary', 'change_reason'], rows: salaryRows },
    { name: 'attendance_monthly', ddl: 'CREATE TABLE attendance_monthly (employee_id INTEGER, month TEXT, scheduled_days INTEGER, days_absent INTEGER, overtime_hours REAL)',
      columns: ['employee_id', 'month', 'scheduled_days', 'days_absent', 'overtime_hours'], rows: attendance },
    { name: 'performance_reviews', ddl: 'CREATE TABLE performance_reviews (employee_id INTEGER, review_year INTEGER, rating INTEGER)',
      columns: ['employee_id', 'review_year', 'rating'], rows: reviews },
    { name: 'exit_interviews', ddl: 'CREATE TABLE exit_interviews (employee_id INTEGER, exit_date TEXT, primary_reason TEXT, would_return TEXT)',
      columns: ['employee_id', 'exit_date', 'primary_reason', 'would_return'], rows: exits },
  ], ['CREATE INDEX ix_att_emp ON attendance_monthly (employee_id)', 'CREATE INDEX ix_sal_emp ON salary_history (employee_id)']);

  // Messy roster export for Excel cleaning practice: active Operations + Customer Service staff
  const roster = employees.filter((e) => !e.term && (e.dept === 1 || e.dept === 3)).slice(0, 140);
  const variants = { 1: ['Operations', 'operations', 'OPERATIONS', 'Operations ', 'Ops'], 3: ['Customer Service', 'customer service', 'Cust. Service', 'Customer  Service', 'CS'] };
  const rows = [];
  const truth = { unique: 0, ops: 0, cs: 0, salarySum: 0, hires2024: 0, missingEmail: 0 };
  roster.forEach((e, i) => {
    const name = `${e.first} ${e.last}`;
    const messyName = i % 9 === 0 ? `  ${name.toUpperCase()}` : i % 7 === 0 ? `${name.toLowerCase()}  ` : i % 11 === 0 ? name.replace(' ', '   ') : name;
    const dept = i % 4 === 0 ? R.pick(variants[e.dept]) : deptName[e.dept];
    const hireCell = i % 10 === 3 ? iso(e.hire) : i % 13 === 5 ? `${String(e.hire.getUTCDate()).padStart(2, '0')}/${String(e.hire.getUTCMonth() + 1).padStart(2, '0')}/${e.hire.getUTCFullYear()}` : e.hire;
    const salCell = i % 8 === 2 ? `$${e.salary.toLocaleString('en-US')}` : e.salary;
    const email = i % 17 === 4 ? null : `${e.first.toLowerCase()}.${e.last.toLowerCase().replace(/'/g, '')}@brightpath.example`;
    rows.push([e.id, messyName, dept, e.title, hireCell, salCell, email]);
    truth.unique++;
    if (e.dept === 1) truth.ops++; else truth.cs++;
    truth.salarySum += e.salary;
    if (e.hire.getUTCFullYear() === 2024) truth.hires2024++;
    if (!email) truth.missingEmail++;
  });
  // five duplicated rows (exported twice)
  for (const k of [12, 40, 77, 101, 133]) rows.splice(k + 1, 0, rows[k].slice());
  truth.avgSalary = round2(truth.salarySum / truth.unique);
  await writeWorkbook(path.join(FILES, 'excel', 'brightpath_roster_messy.xlsx'), [{
    name: 'Roster', freeze: true,
    columns: [{ header: 'Employee ID', width: 12 }, { header: 'Full Name', width: 26 }, { header: 'Department', width: 20 }, { header: 'Job Title', width: 22 }, { header: 'Hire Date', width: 13 }, { header: 'Salary', width: 12 }, { header: 'Email', width: 36 }],
    rows,
  }], {
    intro: 'Clean the roster first, then answer. Type a number (or a formula) in each yellow cell, save, and upload the file in the app.',
    questions: [
      { q: 'How many UNIQUE employees are in the roster (after removing duplicate rows)?' },
      { q: 'How many unique employees work in Operations (count every spelling of the department)?' },
      { q: 'What is the average salary of the unique employees? (Some salaries are stored as text like "$38,400".) Round to 2 decimals.' },
      { q: 'How many of the unique employees were hired in 2024?' },
      { q: 'How many of the unique employees have no email address?' },
    ],
  });
  return { counts, rosterTruth: truth, deptSizes: DEPTS.map((d) => d.size) };
}
