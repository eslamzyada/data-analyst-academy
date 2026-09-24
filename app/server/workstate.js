// Saved work in progress.
//
// Anything the learner has started but not finished is kept here: the answer typed into a task,
// how many hints were opened, time spent, the answers chosen so far in a quiz, project step
// drafts, and where they were last working. Every save is written to disk before the reply is
// sent, so "Saved" on screen means the work would survive pulling the plug.
import { all, get, run, flushNow } from './store.js';
import { STATE, taskState } from '../shared/lifecycle.js';

const KINDS = new Set(['item', 'quiz', 'project', 'session', 'analyst']);
const MAX_BYTES = 200_000;

const hasText = (a) => a !== undefined && a !== null && a !== '' && a !== '='
  && !(Array.isArray(a) && !a.some((x) => String(x ?? '').trim())) && String(a).trim() !== '';

export function keyKind(key) {
  const kind = String(key).split(':')[0];
  return KINDS.has(kind) ? kind : null;
}

/** Save one piece of work in progress. Returns the time it was stored. */
export function saveState(key, state) {
  const kind = keyKind(key);
  if (!kind) throw Object.assign(new Error('Unknown kind of saved work.'), { status: 400 });
  const json = JSON.stringify(state ?? null);
  if (json.length > MAX_BYTES) throw Object.assign(new Error('That answer is too long to save.'), { status: 413 });
  const at = new Date().toISOString();
  run(`INSERT INTO work_state (key, kind, state_json, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET state_json = excluded.state_json, updated_at = excluded.updated_at`,
  [String(key), kind, json, at]);
  flushNow();   // the reply may not claim "saved" before it is actually on disk
  return at;
}

function parse(row) {
  if (!row) return null;
  try { return { state: JSON.parse(row.state_json), updatedAt: row.updated_at }; }
  catch { return null; }
}

export function loadState(key) {
  return parse(get('SELECT * FROM work_state WHERE key = ?', [String(key)]));
}

/** All saved work of one kind, newest first: { key: { state, updatedAt } }. */
export function loadKind(kind) {
  const out = {};
  for (const row of all('SELECT * FROM work_state WHERE kind = ? ORDER BY updated_at DESC', [String(kind)])) {
    const v = parse(row);
    if (v) out[row.key] = v;
  }
  return out;
}

export function clearState(key) {
  run('DELETE FROM work_state WHERE key = ?', [String(key)]);
  flushNow();
}

/** Where the learner was last working, for "continue where you left off". */
export function lastPlace() {
  const s = loadState('session:place');
  return s && s.state && s.state.route ? { ...s.state, updatedAt: s.updatedAt } : null;
}

/** Unfinished work (started, not completed), newest first. */
export function unfinished(limit = 8) {
  const out = [];
  for (const row of all("SELECT * FROM work_state WHERE kind IN ('item','quiz','project') ORDER BY updated_at DESC LIMIT 60")) {
    const v = parse(row);
    if (!v || !v.state) continue;
    const st = v.state;
    let started;
    if (row.kind === 'quiz') {
      // topic/review quizzes save results + index; exams save answers
      started = !st.finished && (Object.keys(st.results || {}).length > 0 || (st.index || 0) > 0 || Object.keys(st.answers || {}).length > 0);
    } else if (row.kind === 'project') {
      started = Object.values(st.drafts || {}).some((d) => d !== null && d !== undefined && JSON.stringify(d).replace(/[\[\]{}",:\s]/g, '') !== '');
      if (started) {
        const done = get("SELECT 1 AS n FROM project_progress WHERE project_id = ? AND step_id = 'final' AND score IS NOT NULL", [row.key.slice('project:'.length)]);
        if (done) started = false;
      }
    } else {
      const result = st.result || null;
      const state = taskState({
        hasAnswer: hasText(st.answer) || (st.hints || 0) > 0,
        result,
        selfChecked: typeof st.selfSaved === 'number',
        selfMarked: result && result.selfMarked ? !!result.correct : null,
        solvedBefore: !!st.solvedBefore,
      });
      started = state !== STATE.NOT_STARTED && state !== STATE.COMPLETED;
    }
    if (!started) continue;
    out.push({ key: row.key, kind: row.kind, updatedAt: row.updated_at, state: st });
    if (out.length >= limit) break;
  }
  return out;
}
