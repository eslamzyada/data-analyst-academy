// Runs learner SQL against the practice databases in a separate thread, so a runaway
// query can be stopped. Every statement runs inside a savepoint that is rolled back,
// which keeps the practice databases untouched.
import { parentPort, workerData } from 'node:worker_threads';
import fs from 'node:fs';
import path from 'node:path';
import initSqlJs from 'sql.js';

const SQL = await initSqlJs();
const dbs = new Map();

function addFunctions(d) {
  const num = (x) => (x === null || x === undefined ? null : Number(x));
  d.create_function('SQRT', (x) => (x === null ? null : Math.sqrt(num(x))));
  d.create_function('POWER', (x, y) => (x === null || y === null ? null : Math.pow(num(x), num(y))));
  d.create_function('LN', (x) => (x === null ? null : Math.log(num(x))));
  d.create_function('EXP', (x) => (x === null ? null : Math.exp(num(x))));
  d.create_function('FLOOR', (x) => (x === null ? null : Math.floor(num(x))));
  d.create_function('CEIL', (x) => (x === null ? null : Math.ceil(num(x))));
  d.create_function('CEILING', (x) => (x === null ? null : Math.ceil(num(x))));
  if (typeof d.create_aggregate === 'function') {
    d.create_aggregate('MEDIAN', {
      init: () => [],
      step: (acc, v) => { if (v !== null && v !== undefined) acc.push(Number(v)); return acc; },
      finalize: (acc) => {
        if (!acc.length) return null;
        const s = acc.slice().sort((a, b) => a - b);
        const m = Math.floor(s.length / 2);
        return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
      },
    });
    d.create_aggregate('STDEV', {
      init: () => [],
      step: (acc, v) => { if (v !== null && v !== undefined) acc.push(Number(v)); return acc; },
      finalize: (acc) => {
        if (acc.length < 2) return null;
        const mean = acc.reduce((s, x) => s + x, 0) / acc.length;
        return Math.sqrt(acc.reduce((s, x) => s + (x - mean) ** 2, 0) / (acc.length - 1));
      },
    });
  }
}

/** A problem with the practice setup, not with the learner's SQL. */
class SetupError extends Error {}

function getDb(name) {
  if (!/^[a-z0-9_-]+$/i.test(String(name))) throw new SetupError(`Unknown practice database "${name}"`);
  const file = path.join(workerData.practiceDir, `${name}.db`);
  if (!fs.existsSync(file)) throw new SetupError(`Practice database "${name}" is missing`);
  const stamp = fs.statSync(file).mtimeMs;
  // a rebuilt practice database is picked up without restarting the app
  if (dbs.has(name) && dbs.get(name).stamp !== stamp) { try { dbs.get(name).close(); } catch { /* already closed */ } dbs.delete(name); }
  if (!dbs.has(name)) {
    const d = new SQL.Database(fs.readFileSync(file));
    addFunctions(d);
    d.stamp = stamp;
    dbs.set(name, d);
  }
  return dbs.get(name);
}

parentPort.on('message', ({ id, db, sql, maxRows = 1000 }) => {
  const started = Date.now();
  let d;
  try {
    d = getDb(db);
  } catch (e) {
    parentPort.postMessage({ id, ok: false, fault: true, error: String(e.message || e), ms: Date.now() - started });
    return;
  }
  try {
    d.exec('SAVEPOINT learner');
    const stmt = d.prepare(sql);
    const columns = stmt.getColumnNames();
    const rows = [];
    let total = 0;
    while (stmt.step()) {
      total++;
      if (rows.length < maxRows) rows.push(stmt.get());
    }
    stmt.free();
    const changed = d.getRowsModified();
    d.exec('ROLLBACK TO learner; RELEASE learner');
    parentPort.postMessage({ id, ok: true, columns, rows, total, truncated: total > rows.length, ms: Date.now() - started, changed });
  } catch (e) {
    try { d && d.exec('ROLLBACK TO learner; RELEASE learner'); } catch { /* nothing to roll back */ }
    parentPort.postMessage({ id, ok: false, error: String(e.message || e), ms: Date.now() - started });
  }
});
