// Runs SQL in a worker thread, one query at a time, with an 8 second limit per query.
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
    finish({ ok: false, timeout: true, error: 'Your query ran for more than 8 seconds and was stopped. This usually means a join is missing its ON condition, so every row was matched with every other row.' });
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

export function runSql(db, sql, maxRows = 1000) {
  const statements = splitStatements(sql || '');
  if (statements.length === 0) return Promise.resolve({ ok: false, error: 'Write a query first.' });
  if (statements.length > 1) return Promise.resolve({ ok: false, error: 'Please run one query at a time (remove the extra statements after the first semicolon).' });
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
