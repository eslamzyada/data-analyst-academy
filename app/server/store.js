// Local progress database (SQLite via sql.js). One file: data/academy.db.
// Writes are flushed to disk shortly after each change (atomic rename).
import fs from 'node:fs';
import path from 'node:path';
import initSqlJs from 'sql.js';

let db;
let file;
let timer = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  name TEXT,
  created_at TEXT,
  onboarded INTEGER DEFAULT 0,
  placement_json TEXT,
  last_activity_json TEXT
);
CREATE TABLE IF NOT EXISTS attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL,
  item_id TEXT NOT NULL,
  topic_id TEXT,
  skill_id TEXT,
  source TEXT NOT NULL,          -- tryit | quiz | practice | challenge | exam | quick | review | placement | card | project
  score REAL NOT NULL,           -- 0..1 after hint penalties
  raw_score REAL,                -- 0..1 before hint penalties
  correct INTEGER NOT NULL,
  hints INTEGER DEFAULT 0,       -- 0 none, 1 hint1, 2 hint2, 3 explanation, 4 answer shown
  seconds INTEGER,
  weight REAL NOT NULL,
  concept TEXT,
  detail_json TEXT
);
CREATE INDEX IF NOT EXISTS ix_attempts_topic ON attempts (topic_id);
CREATE INDEX IF NOT EXISTS ix_attempts_item ON attempts (item_id);
CREATE TABLE IF NOT EXISTS mistakes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL,
  item_id TEXT,
  topic_id TEXT,
  skill_id TEXT,
  concept TEXT,
  label TEXT,
  detail TEXT,
  resolved_at TEXT
);
CREATE TABLE IF NOT EXISTS topic_state (
  topic_id TEXT PRIMARY KEY,
  lesson_done_at TEXT,
  unlocked_by_user INTEGER DEFAULT 0,
  review_box INTEGER DEFAULT 0,
  next_review_at TEXT,
  last_practiced_at TEXT
);
CREATE TABLE IF NOT EXISTS card_state (
  card_id TEXT PRIMARY KEY,
  box INTEGER DEFAULT 0,
  next_due TEXT,
  seen INTEGER DEFAULT 0,
  knew INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS daily_plan (
  day TEXT PRIMARY KEY,
  plan_json TEXT NOT NULL,
  done_json TEXT NOT NULL DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS exam_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL,
  exam_id TEXT NOT NULL,
  score REAL NOT NULL,
  correct INTEGER, total INTEGER,
  detail_json TEXT
);
-- Work in progress: draft answers, hints used, time spent, quiz sessions, the last place visited.
-- Everything the learner has done but not yet submitted lives here, so a refresh, a browser
-- restart or an app restart never loses it.
CREATE TABLE IF NOT EXISTS work_state (
  key TEXT PRIMARY KEY,          -- item:<id> | quiz:<id> | project:<id> | session
  kind TEXT NOT NULL,            -- item | quiz | project | session
  state_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_work_state_kind ON work_state (kind);
-- Every quiz attempt: which questions, what was answered, how each check went, the score.
-- The server is the record of a quiz, so a refresh or restart cannot lose one, and a finished
-- quiz can always be reviewed. A new attempt on the same quiz dismisses the previous one.
CREATE TABLE IF NOT EXISTS quiz_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quiz_key TEXT NOT NULL,          -- topic:<topic id> | review | today:<yyyy-mm-dd>
  topic_id TEXT,
  title TEXT,
  created_at TEXT NOT NULL,
  finished_at TEXT,
  dismissed_at TEXT,
  item_ids TEXT NOT NULL,          -- JSON array, in the order shown
  reasons TEXT,                    -- JSON { itemId: why it was chosen }
  answers TEXT NOT NULL DEFAULT '{}',
  results TEXT NOT NULL DEFAULT '{}',
  correct INTEGER,
  total INTEGER,
  score REAL
);
CREATE INDEX IF NOT EXISTS ix_quiz_sessions_key ON quiz_sessions (quiz_key);
-- Which quiz questions were shown and when, so the next quiz can pick different ones.
CREATE TABLE IF NOT EXISTS quiz_served (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL,
  quiz_key TEXT,
  item_id TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_quiz_served_item ON quiz_served (item_id);
-- Real Analyst work: one row per part of a work request, cross-tool challenge or assessment.
CREATE TABLE IF NOT EXISTS analyst_work (
  task_id TEXT NOT NULL,
  part_id TEXT NOT NULL,
  answer_json TEXT,
  score REAL,
  result_json TEXT,
  checks INTEGER NOT NULL DEFAULT 0,
  first_score REAL,
  updated_at TEXT,
  PRIMARY KEY (task_id, part_id)
);
-- Milestones: awarded once, from demonstrated work, and never taken away.
CREATE TABLE IF NOT EXISTS milestones (
  id TEXT PRIMARY KEY,
  achieved_at TEXT NOT NULL,
  evidence_json TEXT
);
CREATE TABLE IF NOT EXISTS project_progress (
  project_id TEXT NOT NULL,
  step_id TEXT NOT NULL,
  answer_json TEXT,
  score REAL,
  updated_at TEXT,
  PRIMARY KEY (project_id, step_id)
);
`;

export async function openStore(dataDir) {
  const SQL = await initSqlJs();
  file = path.join(dataDir, 'academy.db');
  db = fs.existsSync(file) ? new SQL.Database(fs.readFileSync(file)) : new SQL.Database();
  db.exec(SCHEMA);
  upgrade();
  if (!get('SELECT id FROM profile WHERE id = 1')) {
    run('INSERT INTO profile (id, created_at, onboarded) VALUES (1, ?, 0)', [new Date().toISOString()]);
  }
  flushNow();
  flushOnExit();
  return { file };
}

/**
 * Columns added after a progress file was first created. CREATE TABLE IF NOT EXISTS never
 * changes an existing table, so each later column is added here, once, without touching data.
 */
const LATER_COLUMNS = [
  ['quiz_sessions', 'reasons', 'TEXT'],
];
function upgrade() {
  for (const [table, column, type] of LATER_COLUMNS) {
    const cols = all(`PRAGMA table_info(${table})`).map((c) => c.name);
    if (!cols.includes(column)) db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  }
}

// The database lives in memory and is written to disk shortly after every change.
// `dirty` is true while some changes have not reached the disk yet.
let dirty = false;

function scheduleFlush() {
  dirty = true;
  if (timer) return;
  timer = setTimeout(() => { timer = null; flushSafely(); }, 150);
}

/**
 * Write the database to disk now. Throws if the disk write fails, so callers that promise
 * "saved" (the work-state endpoint) can report the truth.
 */
export function flushNow() {
  if (!db) return;
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, Buffer.from(db.export()));
  try {
    fs.renameSync(tmp, file);
  } catch (e) {
    // Windows: another program (antivirus, backup) can hold the file for a moment
    if (e.code !== 'EPERM' && e.code !== 'EBUSY' && e.code !== 'EACCES') throw e;
    fs.copyFileSync(tmp, file);
    fs.rmSync(tmp, { force: true });
  }
  dirty = false;
}

/** Background writes never crash the server: a failed write is retried shortly. */
function flushSafely(attempt = 1) {
  try {
    flushNow();
  } catch (e) {
    console.error(`Could not write progress to disk (attempt ${attempt}): ${e.message}`);
    if (attempt < 5) setTimeout(() => flushSafely(attempt + 1), 400 * attempt);
  }
}

/** Closing the app window, Ctrl+C or a shutdown must not lose the last change. */
function flushOnExit() {
  const finish = (code) => {
    clearTimeout(timer);
    timer = null;
    if (dirty) { try { flushNow(); } catch (e) { console.error(`Final save failed: ${e.message}`); } }
    if (code !== undefined) process.exit(code);
  };
  process.once('exit', () => finish());
  for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGBREAK']) {
    try { process.once(sig, () => finish(0)); } catch { /* signal not supported on this platform */ }
  }
}

/** Write now if anything changed since the last write. Throws like flushNow. */
export function flushIfDirty() {
  if (dirty) { clearTimeout(timer); timer = null; flushNow(); }
}

/** True when every change so far is on disk (used by tests). */
export function isFlushed() { return !dirty; }

/** Bumped on every write, so derived caches know when to recompute. */
export let version = 0;

export function run(sql, params = []) {
  db.run(sql, params);
  version++;
  scheduleFlush();
}

export function all(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

export function get(sql, params = []) {
  return all(sql, params)[0] || null;
}

export function lastId() {
  return db.exec('SELECT last_insert_rowid()')[0].values[0][0];
}

export function exportBytes() {
  return Buffer.from(db.export());
}

export function resetAll() {
  for (const t of ['attempts', 'mistakes', 'topic_state', 'card_state', 'daily_plan', 'exam_results', 'project_progress', 'work_state', 'quiz_served', 'quiz_sessions', 'analyst_work', 'milestones']) db.run(`DELETE FROM ${t}`);
  db.run('UPDATE profile SET onboarded = 0, placement_json = NULL, last_activity_json = NULL WHERE id = 1');
  version++;
  flushNow();
}
