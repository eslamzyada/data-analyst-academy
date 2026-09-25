// Quiz attempts, kept on the server.
//
// A quiz is created on the server with a fixed list of questions. Each checked answer is added
// to it as it happens, and finishing it fixes the score. Because of that, a refresh or an app
// restart puts the learner back on the same questions with the same answers, a finished quiz
// stays finished (and reviewable), and "try another" starts a genuinely new attempt.
import { all, get, run, lastId } from './store.js';
import { OUTCOME, quizState, outcomeOf, QUIZ_PASS } from '../shared/lifecycle.js';

const nowIso = () => new Date().toISOString();
const parse = (s, fallback) => { try { return s ? JSON.parse(s) : fallback; } catch { return fallback; } };

function rowOut(r) {
  if (!r) return null;
  const itemIds = parse(r.item_ids, []);
  const answers = parse(r.answers, {});
  const results = parse(r.results, {});
  const finished = !!r.finished_at;
  return {
    id: r.id, key: r.quiz_key, topicId: r.topic_id, title: r.title,
    createdAt: r.created_at, finishedAt: r.finished_at, dismissedAt: r.dismissed_at,
    itemIds, answers, results, reasons: parse(r.reasons, {}),
    correct: r.correct, total: r.total, score: r.score,
    answered: Object.keys(results).length,
    state: quizState({ started: true, answered: Object.keys(results).length, finished, score: r.score }),
  };
}

export function createSession({ key, topicId = null, title = null, itemIds, reasons = {} }) {
  if (!key || !Array.isArray(itemIds) || !itemIds.length) throw Object.assign(new Error('A quiz needs at least one question.'), { status: 400 });
  // the previous attempt on this quiz is set aside, finished or not
  run('UPDATE quiz_sessions SET dismissed_at = ? WHERE quiz_key = ? AND dismissed_at IS NULL', [nowIso(), key]);
  run('INSERT INTO quiz_sessions (quiz_key, topic_id, title, created_at, item_ids, reasons, total) VALUES (?,?,?,?,?,?,?)',
    [key, topicId, title, nowIso(), JSON.stringify(itemIds), JSON.stringify(reasons || {}), itemIds.length]);
  return getSession(lastId());
}

export function getSession(id) {
  return rowOut(get('SELECT * FROM quiz_sessions WHERE id = ?', [Number(id)]));
}

/** The attempt the learner is on for this quiz (unfinished, or finished and not yet set aside). */
export function currentSession(key) {
  return rowOut(get('SELECT * FROM quiz_sessions WHERE quiz_key = ? AND dismissed_at IS NULL ORDER BY id DESC LIMIT 1', [key]));
}

export function listSessions({ key = null, finishedOnly = false, limit = 20 } = {}) {
  const where = [];
  const params = [];
  if (key) { where.push('quiz_key = ?'); params.push(key); }
  if (finishedOnly) where.push('finished_at IS NOT NULL');
  const sql = `SELECT * FROM quiz_sessions ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY id DESC LIMIT ?`;
  return all(sql, [...params, Math.min(100, Number(limit) || 20)]).map(rowOut);
}

/**
 * Store one checked answer. Returns a reason (and stores nothing) when the answer cannot be
 * accepted: the question is not part of this attempt, the attempt is finished, or the question
 * already has a checked answer. Only an answer the app could not check may be sent again.
 */
export function checkAnswerAllowed(sessionId, itemId) {
  const s = getSession(sessionId);
  if (!s) return 'This quiz no longer exists.';
  if (s.finishedAt) return 'This quiz is already finished.';
  if (!s.itemIds.includes(itemId)) return 'This question is not part of this quiz.';
  const prev = s.results[itemId];
  if (prev && [OUTCOME.CORRECT, OUTCOME.INCORRECT].includes(prev.outcome)) return 'This question has already been answered in this quiz.';
  return null;
}

export function recordAnswer(sessionId, itemId, given, result) {
  if (checkAnswerAllowed(sessionId, itemId)) return false;
  const s = getSession(sessionId);
  s.answers[itemId] = given ?? null;
  s.results[itemId] = {
    outcome: result.outcome, correct: !!result.correct, score: result.score ?? (result.correct ? 1 : 0),
    feedback: result.feedback || null, reason: result.reason || null, notice: result.notice || null, at: nowIso(),
  };
  run('UPDATE quiz_sessions SET answers = ?, results = ? WHERE id = ?', [JSON.stringify(s.answers), JSON.stringify(s.results), s.id]);
  return true;
}

/**
 * The score of an attempt. Unanswered questions count as not right. Questions the app could not
 * check are left out of the score rather than counted against the learner.
 */
function scoreOf(s) {
  const unchecked = s.itemIds.filter((id) => s.results[id] && [OUTCOME.EVALUATION_ERROR, OUTCOME.NOT_EVALUABLE].includes(s.results[id].outcome)).length;
  const correct = s.itemIds.filter((id) => s.results[id] && s.results[id].correct).length;
  const total = Math.max(1, s.itemIds.length - unchecked);
  return { correct, total, score: correct / total };
}

function markFinished(s, at) {
  const { correct, total, score } = scoreOf(s);
  run('UPDATE quiz_sessions SET finished_at = ?, correct = ?, total = ?, score = ? WHERE id = ?', [at, correct, total, score, s.id]);
}

/** Finish an attempt and fix its score. Finishing twice changes nothing. */
export function finishSession(sessionId) {
  const s = getSession(sessionId);
  if (!s) throw Object.assign(new Error('Unknown quiz'), { status: 404 });
  if (s.finishedAt) return s;
  markFinished(s, nowIso());
  return getSession(s.id);
}

/**
 * Quizzes saved by earlier versions of the app lived only in the page's saved work
 * (`quiz:<key>` with ids, results, index, finished). Each one becomes a quiz attempt, once, so a
 * quiz finished before the update stays finished and one in progress carries on where it was.
 * The saved work is then rewritten in the current form ({ sessionId, index, drafts }).
 */
export function importLegacyQuizzes() {
  let imported = 0;
  for (const row of all("SELECT key, state_json, updated_at FROM work_state WHERE kind = 'quiz' AND key NOT LIKE 'quiz:exam:%'")) {
    const st = parse(row.state_json, null);
    if (!st || st.sessionId || !Array.isArray(st.ids) || !st.ids.length) continue;
    const key = row.key.slice('quiz:'.length);
    const at = st.at || row.updated_at || nowIso();
    const answers = {};
    const results = {};
    for (const [id, r] of Object.entries(st.results || {})) {
      if (!st.ids.includes(id) || !r) continue;
      answers[id] = r.given ?? null;
      results[id] = { outcome: outcomeOf(r), correct: !!r.correct, score: r.score ?? (r.correct ? 1 : 0), feedback: r.feedback || null, at };
    }
    run('UPDATE quiz_sessions SET dismissed_at = ? WHERE quiz_key = ? AND dismissed_at IS NULL', [nowIso(), key]);
    run('INSERT INTO quiz_sessions (quiz_key, topic_id, title, created_at, item_ids, reasons, answers, results, total) VALUES (?,?,?,?,?,?,?,?,?)',
      [key, key.startsWith('topic:') ? key.slice('topic:'.length) : null, st.title || null, at, JSON.stringify(st.ids), '{}', JSON.stringify(answers), JSON.stringify(results), st.ids.length]);
    const id = lastId();
    if (st.finished) markFinished(getSession(id), at);   // with the time it was really finished
    const index = Math.min(Math.max(0, Number(st.index) || 0), st.ids.length - 1);
    run('UPDATE work_state SET state_json = ? WHERE key = ?', [JSON.stringify({ sessionId: id, index, drafts: {} }), row.key]);
    imported++;
  }
  return imported;
}

/** Where a quiz stands: its best finished attempt, or the one in progress. */
export function quizStateFor(key) {
  const best = get('SELECT MAX(score) AS score FROM quiz_sessions WHERE quiz_key = ? AND finished_at IS NOT NULL', [key]);
  const passed = best && best.score !== null ? quizState({ finished: true, score: best.score }) : null;
  if (passed === quizState({ finished: true, score: 1 })) return passed;   // passed once: stays completed
  const cur = currentSession(key);
  if (cur && !cur.finishedAt && cur.answered > 0) return cur.state;      // a new try under way
  return passed || quizState({});
}

export { QUIZ_PASS };
