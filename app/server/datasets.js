// Dataset previews for the in-app data viewer (CSV, XLSX sheets, or practice-database tables).
import fs from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { runSql } from './sqlrunner.js';

const cache = new Map();

function parseCsv(text) {
  const rows = [];
  let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cur); rows.push(row); row = []; cur = '';
    } else cur += c;
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

function cellOut(v) {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'object') {
    if ('result' in v) return cellOut(v.result);
    if (v.richText) return v.richText.map((t) => t.text).join('');
    if ('text' in v) return v.text;
    return null;
  }
  return v;
}

async function loadTable(filesDir, spec) {
  const key = JSON.stringify(spec);
  if (cache.has(key)) return cache.get(key);
  const file = path.join(filesDir, spec.path);
  let columns = [], rows = [];
  if (spec.path.endsWith('.csv')) {
    const all = parseCsv(fs.readFileSync(file, 'utf8'));
    const h = (spec.headerRow || 1) - 1;
    columns = all[h] || [];
    rows = all.slice(h + 1).map((r) => r.map((v) => (v === '' ? null : v)));
  } else {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(file);
    const ws = spec.sheet ? wb.getWorksheet(spec.sheet) : wb.worksheets[0];
    const h = spec.headerRow || 1;
    const width = ws.getRow(h).cellCount;
    columns = Array.from({ length: width }, (_, i) => String(cellOut(ws.getRow(h).getCell(i + 1).value) ?? `Column${i + 1}`));
    for (let r = h + 1; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      rows.push(Array.from({ length: width }, (_, i) => cellOut(row.getCell(i + 1).value)));
    }
  }
  const table = { columns, rows };
  cache.set(key, table);
  return table;
}

/** preview: { path, sheet?, headerRow? } or { db, table } */
export async function previewDataset(filesDir, preview, { offset = 0, limit = 100, search = '', sort = null, desc = false } = {}) {
  if (preview.db) {
    const cols = await runSql(preview.db, `SELECT * FROM ${preview.table} LIMIT 0`, 1);
    let where = '';
    if (search) {
      const s = search.replace(/'/g, "''");
      where = 'WHERE ' + cols.columns.map((c) => `CAST("${c}" AS TEXT) LIKE '%${s}%'`).join(' OR ');
    }
    const order = sort && cols.columns.includes(sort) ? `ORDER BY "${sort}" ${desc ? 'DESC' : 'ASC'}` : '';
    const count = await runSql(preview.db, `SELECT COUNT(*) FROM ${preview.table} ${where}`, 1);
    const res = await runSql(preview.db, `SELECT * FROM ${preview.table} ${where} ${order} LIMIT ${Number(limit)} OFFSET ${Number(offset)}`, limit);
    return { columns: res.columns, rows: res.rows, total: count.rows[0][0] };
  }
  const t = await loadTable(filesDir, preview);
  let rows = t.rows;
  if (search) {
    const s = search.toLowerCase();
    rows = rows.filter((r) => r.some((v) => v !== null && String(v).toLowerCase().includes(s)));
  }
  if (sort !== null && sort !== '') {
    const idx = t.columns.indexOf(sort);
    if (idx >= 0) {
      rows = rows.slice().sort((a, b) => {
        const x = a[idx], y = b[idx];
        if (x === y) return 0;
        if (x === null) return 1;
        if (y === null) return -1;
        const nx = Number(x), ny = Number(y);
        const cmp = !Number.isNaN(nx) && !Number.isNaN(ny) && typeof x !== 'boolean' ? nx - ny : String(x).localeCompare(String(y));
        return desc ? -cmp : cmp;
      });
    }
  }
  return { columns: t.columns, rows: rows.slice(offset, offset + limit), total: rows.length };
}
