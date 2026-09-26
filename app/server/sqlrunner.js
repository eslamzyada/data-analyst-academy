// Runs SQL in a worker thread, one query at a time, with a time limit per query (8 seconds;
// ACADEMY_SQL_LIMIT_MS changes it for tests).
//
// Queries wait in a queue and each one's clock starts only when it actually starts running,
// so a slow query never makes the next one look slow. If a query runs too long the worker is
// replaced and the queue carries on.
//
// Every result is { ok, ... }. `fault: true` marks a failure of the engine or the practice
// setup (never a wrong answer by the learner); `timeout: true` marks a query that was stopped.
import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const WORKER = fileURLToPath(new URL('./sql-worker.js', import.meta.url));
const LIMIT_MS = Number(process.env.ACADEMY_SQL_LIMIT_MS || 8000);
let worker = null;
let seq = 0;
let practiceDir;
const queue = [];
let running = null;

function spawn() {
  const w = new Worker(WORKER, { workerData: { practiceDir } });
  w.on('message', (msg) => {
    if (w !== worker || !running || msg.id !== running.id) return;
    finish(msg);
  });
  const lost = (why) => {
    if (w !== worker) return;          // an old worker we already replaced
    worker = null;
    if (running) finish({ ok: false, fault: true, error: `The SQL engine stopped unexpectedly (${why}).` });
  };
  w.on('error', (err) => lost(String(err.message || err)));
  w.on('exit', (code) => lost(`exit code ${code}`));
  worker = w;
}

function finish(msg) {
  const job = running;
  running = null;
  clearTimeout(job.timer);
  job.resolve(msg);
  pump();
}

function pump() {
  if (running || !queue.length) return;
  if (!worker) {
    try { spawn(); } catch (e) {
      const error = `The SQL engine could not start: ${e.message || e}`;
      while (queue.length) queue.shift().resolve({ ok: false, fault: true, error });
      return;
    }
  }
  running = queue.shift();
  running.timer = setTimeout(() => {
    const w = worker;
    worker = null;                      // the handlers above ignore the dying worker
    w.terminate().catch(() => {});
    // what made it slow is not known here: the help (sqlhelp.js) looks at the query itself
    finish({ ok: false, timeout: true, limitMs: LIMIT_MS, error: `Your query ran for more than ${LIMIT_MS / 1000} seconds and was stopped. Queries on these practice databases normally finish in well under a second, so something in this one repeats far too often.` });
  }, LIMIT_MS);
  worker.postMessage({ id: running.id, db: running.db, sql: running.sql, maxRows: running.maxRows });
}

export function initSqlRunner(dir) {
  practiceDir = dir;
  spawn();
}

/** Split on semicolons that are outside quotes/comments; returns the non-empty statements. */
export function splitStatements(sql) {
  const out = [];
  let cur = '';
  let q = null;
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i];
    const n = sql[i + 1];
    if (!q && c === '-' && n === '-') { const j = sql.indexOf('\n', i); cur += sql.slice(i, j === -1 ? sql.length : j); i = j === -1 ? sql.length : j - 1; continue; }
    if (!q && c === '/' && n === '*') { const j = sql.indexOf('*/', i + 2); cur += sql.slice(i, j === -1 ? sql.length : j + 2); i = j === -1 ? sql.length : j + 1; continue; }
    if (q) { if (c === q) q = null; cur += c; continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; cur += c; continue; }
    if (c === ';') { if (stripComments(cur).trim()) out.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  if (stripComments(cur).trim()) out.push(cur.trim());
  return out;
}
const stripComments = (s) => s.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

// Test hook (tests only): 'missing' makes every practice database unavailable, as if its file were gone.
let testFault = null;
export function setSqlFaultForTests(mode) { testFault = mode || null; }

export function runSql(db, sql, maxRows = 1000) {
  const statements = splitStatements(sql || '');
  if (statements.length === 0) return Promise.resolve({ ok: false, empty: true, error: 'Write a query first.' });
  if (statements.length > 1) return Promise.resolve({ ok: false, several: true, error: 'Please run one query at a time (remove the extra statements after the first semicolon).' });
  if (testFault === 'missing') return Promise.resolve({ ok: false, fault: true, error: `Practice database "${db}" is missing (a fault injected by the tests)` });
  return new Promise((resolve) => {
    queue.push({ id: ++seq, db, sql: statements[0], maxRows, resolve });
    pump();
  });
}

/** Changes whenever a practice database file is rebuilt, so cached results can be retired. */
export function practiceStamp(db) {
  try {
    return String(fs.statSync(path.join(practiceDir, `${db}.db`)).mtimeMs);
  } catch {
    return 'missing';
  }
}
