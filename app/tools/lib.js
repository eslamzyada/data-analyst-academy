// Shared helpers for the data build scripts (seeded RNG, SQLite, CSV, Excel).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import initSqlJs from 'sql.js';
import ExcelJS from 'exceljs';

export const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DATA = path.join(APP, 'data');
export const FILES = path.join(DATA, 'files');
export const PRACTICE = path.join(DATA, 'practice');

export function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
  return p;
}

// ---------------------------------------------------------------- seeded random
export function makeRng(seed) {
  let a = seed >>> 0;
  const rand = () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const r = {
    rand,
    int: (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1)),
    pick: (arr) => arr[Math.floor(rand() * arr.length)],
    chance: (p) => rand() < p,
    uniform: (lo, hi) => lo + rand() * (hi - lo),
    weighted(items, weights) {
      const total = weights.reduce((s, w) => s + w, 0);
      let u = rand() * total;
      for (let i = 0; i < items.length; i++) {
        u -= weights[i];
        if (u <= 0) return items[i];
      }
      return items[items.length - 1];
    },
    normal(mu = 0, sd = 1) {
      const u = 1 - rand(), v = rand();
      return mu + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    },
    poisson(lambda) {
      if (lambda <= 0) return 0;
      if (lambda > 40) return Math.max(0, Math.round(r.normal(lambda, Math.sqrt(lambda))));
      const L = Math.exp(-lambda);
      let k = 0, p = 1;
      do { k++; p *= rand(); } while (p > L);
      return k - 1;
    },
    shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
    sample(arr, k) { return r.shuffle(arr).slice(0, k); },
  };
  return r;
}

// ---------------------------------------------------------------- dates
export const iso = (d) => d.toISOString().slice(0, 10);
export const addDays = (d, n) => new Date(d.getTime() + n * 86400000);
export const ymd = (y, m, d) => new Date(Date.UTC(y, m - 1, d));
export function* eachDay(from, to) {
  for (let d = from; d <= to; d = addDays(d, 1)) yield d;
}
export const monthKey = (d) => iso(d).slice(0, 7);
export const round2 = (x) => Math.round((x + Number.EPSILON) * 100) / 100;

// ---------------------------------------------------------------- SQLite
let SQL;
export async function sqlite() {
  if (!SQL) SQL = await initSqlJs();
  return SQL;
}

/** tables: [{ name, ddl, columns: [...names], rows: [[...]] }], indexes: [sql] */
export async function writeSqlite(outPath, tables, indexes = []) {
  const S = await sqlite();
  const db = new S.Database();
  db.run('PRAGMA foreign_keys = OFF;');
  for (const t of tables) db.run(t.ddl);
  db.run('BEGIN');
  for (const t of tables) {
    const stmt = db.prepare(`INSERT INTO ${t.name} (${t.columns.join(',')}) VALUES (${t.columns.map(() => '?').join(',')})`);
    for (const row of t.rows) stmt.run(row.map((v) => (v === undefined ? null : typeof v === 'boolean' ? (v ? 1 : 0) : v)));
    stmt.free();
  }
  db.run('COMMIT');
  for (const ix of indexes) db.run(ix);
  db.run('VACUUM');
  ensureDir(path.dirname(outPath));
  fs.writeFileSync(outPath, Buffer.from(db.export()));
  const counts = Object.fromEntries(tables.map((t) => [t.name, t.rows.length]));
  db.close();
  return counts;
}

// ---------------------------------------------------------------- CSV
export function toCsv(header, rows) {
  const esc = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [header, ...rows].map((r) => r.map(esc).join(',')).join('\r\n') + '\r\n';
}
export function writeCsv(file, header, rows) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, toCsv(header, rows), 'utf8');
}

// ---------------------------------------------------------------- Excel
const HEAD = { font: { bold: true, color: { argb: 'FF1F2937' } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } } };

/**
 * sheets: [{ name, columns: [{ header, key?, width?, numFmt? }], rows: [[...]], titleRows?: [[..]], freeze?: bool }]
 * answers?: { intro, questions: [{ q, hint? }] }  -> adds an "Answers" sheet with yellow input cells in column C
 */
export async function writeWorkbook(file, sheets, answers) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Data Analyst Academy';
  wb.created = new Date(Date.UTC(2026, 8, 15));
  wb.modified = wb.created;
  for (const s of sheets) {
    const ws = wb.addWorksheet(s.name);
    let r = 1;
    for (const tr of s.titleRows || []) {
      ws.getRow(r).values = tr;
      ws.getRow(r).font = { bold: r === 1, italic: r > 1, size: r === 1 ? 12 : 9 };
      r++;
    }
    const headerRow = r;
    ws.getRow(headerRow).values = s.columns.map((c) => c.header);
    ws.getRow(headerRow).eachCell((cell) => { cell.font = HEAD.font; cell.fill = HEAD.fill; });
    s.columns.forEach((c, i) => {
      ws.getColumn(i + 1).width = c.width || Math.max(10, Math.min(40, c.header.length + 4));
      if (c.numFmt) ws.getColumn(i + 1).numFmt = c.numFmt;
    });
    for (const row of s.rows) {
      r++;
      if (row === null) continue; // deliberate blank row
      const xr = ws.getRow(r);
      row.forEach((v, i) => {
        const cell = xr.getCell(i + 1);
        if (v instanceof Date) { cell.value = v; cell.numFmt = s.columns[i].dateFmt || 'yyyy-mm-dd'; }
        else cell.value = v === undefined ? null : v;
      });
    }
    if (s.freeze) ws.views = [{ state: 'frozen', ySplit: headerRow }];
  }
  if (answers) {
    const ws = wb.addWorksheet('Answers');
    ws.getColumn(1).width = 5; ws.getColumn(2).width = 78; ws.getColumn(3).width = 22; ws.getColumn(4).width = 40;
    ws.getCell('A1').value = 'Your answers';
    ws.getCell('A1').font = { bold: true, size: 13 };
    ws.getCell('A2').value = answers.intro || 'Type each answer (a number, a word, or a formula) in the yellow cell. Save the file, then upload it in the app.';
    ws.getCell('A2').font = { italic: true, color: { argb: 'FF4B5563' } };
    ws.getRow(4).values = ['#', 'Question', 'Your answer', 'Notes (optional)'];
    ws.getRow(4).eachCell((c) => { c.font = HEAD.font; c.fill = HEAD.fill; });
    answers.questions.forEach((q, i) => {
      const row = ws.getRow(5 + i);
      row.getCell(1).value = i + 1;
      row.getCell(2).value = q.q;
      row.getCell(2).alignment = { wrapText: true, vertical: 'top' };
      const c = row.getCell(3);
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3B0' } };
      c.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
      row.height = Math.max(20, Math.ceil(q.q.length / 80) * 16);
    });
  }
  ensureDir(path.dirname(file));
  await wb.xlsx.writeFile(file);
}
