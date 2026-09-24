// Grades a learner query by running it and the reference query and comparing the results.
// Column names and (unless the task needs it) row order are ignored; numbers are compared
// with a small tolerance, so any correct method passes.
import { runSql, practiceStamp } from '../sqlrunner.js';

// Reference results, per item and per version of the practice database file. Failures are never
// cached, and a rebuilt database retires the old entries.
const expectedCache = new Map();

function normCell(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return v;
  const s = String(v).trim();
  const n = Number(s);
  if (s !== '' && Number.isFinite(n) && /^-?\d+(\.\d+)?$/.test(s)) return n;
  return s.toLowerCase();
}
const decimals = (x) => { const s = String(x); const i = s.indexOf('.'); return i === -1 ? 0 : s.length - i - 1; };
// a = learner value, b = expected value. Unrounded learner numbers still match a rounded answer.
const cellEq = (a, b) => {
  if (a === null || b === null) return a === b;
  if (typeof a === 'number' && typeof b === 'number') {
    if (Math.abs(a - b) <= Math.max(0.011, Math.abs(b) * 1e-6)) return true;
    const d = decimals(b);
    return d <= 2 && Math.abs(Number(a.toFixed(d)) - b) < 1e-9;
  }
  return a === b;
};
// sort key rounds numbers so that 13.8 and 13.8123 sort next to each other
const rowKey = (r) => JSON.stringify(r.map((c) => (typeof c === 'number' ? Math.round(c * 10) / 10 : c)));

function compareRows(user, exp, ordered) {
  if (user.length !== exp.length) return false;
  if (ordered) return user.every((r, i) => r.every((c, j) => cellEq(c, exp[i][j])));
  const sortRows = (rows) => rows.slice().sort((a, b) => (rowKey(a) < rowKey(b) ? -1 : rowKey(a) > rowKey(b) ? 1 : 0));
  const su = sortRows(user), se = sortRows(exp);
  return su.every((r, i) => r.every((c, j) => cellEq(c, se[i][j])));
}

function permutations(n) {
  if (n > 6) return [Array.from({ length: n }, (_, i) => i)];
  const res = [];
  const rec = (cur, rest) => {
    if (!rest.length) { res.push(cur); return; }
    rest.forEach((x, i) => rec([...cur, x], [...rest.slice(0, i), ...rest.slice(i + 1)]));
  };
  rec([], Array.from({ length: n }, (_, i) => i));
  return res;
}

/** true when the learner result matches the expected one (allowing columns in any order). */
export function resultsMatch(userRes, expRes, ordered = false) {
  const exp = expRes.rows.map((r) => r.map(normCell));
  const usr = userRes.rows.map((r) => r.map(normCell));
  if (userRes.columns.length !== expRes.columns.length) return false;
  for (const perm of permutations(expRes.columns.length)) {
    const permuted = usr.map((r) => perm.map((j) => r[j]));
    if (compareRows(permuted, exp, ordered)) return true;
  }
  return false;
}

export async function expectedResult(item) {
  const key = `${item.id}@${practiceStamp(item.db)}`;
  if (!expectedCache.has(key)) {
    const res = await runSql(item.db, item.answer, 5000);
    if (!res.ok) throw new Error(`Reference query for ${item.id} failed: ${res.error}`);
    expectedCache.set(key, res);
  }
  return expectedCache.get(key);
}

/** Same comparison, ignoring whitespace, case and trailing semicolons. Used when the engine is down. */
export function sameSqlText(a, b) {
  const norm = (s) => String(s || '').replace(/--[^\n]*/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\s+/g, ' ').replace(/\s*([(),;])\s*/g, '$1').replace(/;$/, '').trim().toLowerCase();
  return !!a && !!b && norm(a) === norm(b);
}

/** The grader could not reach a verdict. Not a wrong answer: nothing is recorded. */
function cannotCheck(item, sql, why) {
  if ([item.answer, ...(item.accept || [])].some((a) => sameSqlText(sql, a))) {
    return { correct: true, score: 1, checkedWithoutEngine: true, feedback: 'Correct. (The database was unavailable for a moment, so your query was matched against the model answer instead.)' };
  }
  return {
    correct: false, score: 0, noMistake: true, needsReview: true, engineError: why,
    feedback: 'The practice database could not run your query just now, so your answer was not checked. Your work is saved. Try Run again in a moment, or compare with the model solution and mark it yourself.',
  };
}

export async function gradeSql(item, sql) {
  const res = await runSql(item.db, sql, 5000);
  if (res.fault) return cannotCheck(item, sql, res.error);
  if (!res.ok) {
    // the learner's own SQL error is a real (checked) wrong answer; a query stopped for running
    // too long is too, but it is not logged as a concept mistake: a slow machine can cause it
    return { correct: false, score: 0, error: res.error, feedback: explainSqlError(res.error), mistake: null, noMistake: !!res.timeout, timeout: !!res.timeout };
  }
  let exp;
  try {
    exp = await expectedResult(item);
  } catch (e) {
    // the model answer itself would not run: that is our problem, not the learner's
    return cannotCheck(item, sql, String(e.message || e));
  }
  const preview = { columns: res.columns, rows: res.rows.slice(0, 50), total: res.total };
  if (resultsMatch(res, exp, !!item.ordered)) {
    return { correct: true, score: 1, feedback: 'Your result matches the expected answer.', result: preview };
  }
  // known wrong answers (traps) -> precise feedback and a named mistake
  for (const trap of item.traps || []) {
    const t = await runSql(item.db, trap.sql, 5000);
    if (t.ok && resultsMatch(res, t, !!item.ordered)) {
      return { correct: false, score: 0, feedback: trap.feedback, mistake: trap.mistake, concept: trap.concept, result: preview };
    }
  }
  // generic, still-useful hints
  const notes = [];
  if (res.columns.length !== exp.columns.length) {
    notes.push(`The answer needs ${exp.columns.length} column${exp.columns.length > 1 ? 's' : ''} (${exp.columns.join(', ')}); your query returned ${res.columns.length}.`);
  }
  if (res.total !== exp.total) {
    if (res.total > exp.total) notes.push(`You returned ${res.total} rows; the answer has ${exp.total}. A filter may be missing, or a join may be duplicating rows.`);
    else notes.push(`You returned ${res.total} rows; the answer has ${exp.total}. A filter may be too strict, or an INNER JOIN may be dropping rows.`);
  } else if (res.columns.length === exp.columns.length) {
    if (item.ordered && resultsMatch(res, exp, false)) notes.push('The right rows, but in the wrong order. Check your ORDER BY.');
    else notes.push('The shape is right (same number of rows and columns), but some values differ. Check your calculation, filters and rounding.');
  }
  return { correct: false, score: 0, feedback: notes.join(' '), result: preview, expectedShape: { columns: exp.columns, rows: exp.total } };
}

export function explainSqlError(msg) {
  const m = String(msg);
  if (/no such table/i.test(m)) return `${m}. Check the table name in the list of tables.`;
  if (/no such column/i.test(m)) return `${m}. Check the spelling, and which table the column belongs to (use table aliases like o.order_date).`;
  if (/ambiguous column/i.test(m)) return `${m}. Two tables have a column with this name, so write it as alias.column (for example o.customer_id).`;
  if (/misuse of aggregate/i.test(m)) return `${m}. You can't filter an aggregate (SUM, COUNT...) in WHERE. Use HAVING instead.`;
  if (/must appear in the GROUP BY|not an aggregate/i.test(m)) return `${m}. Every column in SELECT must either be in GROUP BY or be inside an aggregate like SUM().`;
  if (/syntax error/i.test(m)) return `${m}. Look just before the word mentioned for a missing comma, bracket or keyword.`;
  return m;
}
