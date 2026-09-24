// Quality checks for questions and tasks, used by tools/validate-content.js.
//
// Items from the newer banks are marked `strict` by the bank loader: for those, every finding
// here is an error. For older items the same findings are reported as warnings.
import { CONCEPTS, CONCEPT_SKILL } from '../../server/content/concepts.js';
import { DIFFICULTY_BY_LEVEL } from '../../server/content/targets.js';

// ---------------------------------------------------------------- near-duplicate detection
// Place names, channels and numbers are replaced before comparing, so "North" vs "South" or
// 12 vs 15 does not make two questions different.
const SWAPPABLE = /\b(north|south|east|west|downtown|riverside|airport|online|in-store|instore|store|london|leeds|manchester|bristol|january|february|march|april|may|june|july|august|september|october|november|december|monday|tuesday|wednesday|thursday|friday|saturday|sunday|q[1-4]|20\d\d)\b/g;

export function normaliseText(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/`[^`]*`/g, (m) => m.replace(/\d+(\.\d+)?/g, '0'))
    .replace(/[*_#>|]/g, ' ')
    .replace(/"[^"]*"|'[^']*'/g, ' q ')
    .replace(/[$£€]?\d[\d,]*(\.\d+)?%?/g, ' 0 ')
    .replace(SWAPPABLE, ' place ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function shingles(text, n = 3) {
  const w = text.split(' ').filter(Boolean);
  const out = new Set();
  if (w.length < n) { if (w.length) out.add(w.join(' ')); return out; }
  for (let i = 0; i + n <= w.length; i++) out.add(w.slice(i, i + n).join(' '));
  return out;
}

function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

/** The full "fingerprint" of a question: prompt plus options, normalised. */
function fingerprint(it) {
  const opts = Array.isArray(it.options) ? it.options.map((o) => normaliseText(o)).sort().join(' | ') : '';
  return { prompt: shingles(normaliseText(`${it.context || ''} ${it.prompt}`)), opts };
}

/**
 * Pairs of items that are the same question in different clothes. Compared within a skill.
 * Returns [{ a, b, similarity }].
 */
export function findNearDuplicates(items, { threshold = 0.8 } = {}) {
  const bySkill = {};
  for (const it of items) (bySkill[it.skill || 'none'] ||= []).push(it);
  const out = [];
  for (const group of Object.values(bySkill)) {
    const fps = group.map((it) => ({ it, fp: fingerprint(it) }));
    for (let i = 0; i < fps.length; i++) {
      for (let j = i + 1; j < fps.length; j++) {
        const A = fps[i], B = fps[j];
        if (A.it.type !== B.it.type) continue;
        let sim = jaccard(A.fp.prompt, B.fp.prompt);
        // the same options with a similar prompt is the same question
        if (A.fp.opts && A.fp.opts === B.fp.opts) sim = Math.max(sim, 0.5 + sim / 2);
        if (sim >= threshold) out.push({ a: A.it, b: B.it, similarity: Math.round(sim * 100) / 100 });
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------- single-item checks
const TELLTALE = /^(all|none) of the above$|^both (a|b)/i;

/** Problems with one item's wording, options, difficulty and concept. */
export function itemProblems(it, topic) {
  const out = [];
  const quizLike = it.source === 'quiz' || it.source === 'tryit';
  if (it.type === 'mc' || it.type === 'order') {
    const opts = (it.options || []).map((o) => String(o).trim());
    const norm = opts.map((o) => o.toLowerCase().replace(/\s+/g, ' '));
    if (new Set(norm).size !== norm.length) out.push('two options are the same');
    if (opts.some((o) => !o)) out.push('an option is empty');
    if (it.type === 'mc') {
      if (opts.length < 3) out.push(`only ${opts.length} options: add plausible distractors`);
      if (opts.length > 6) out.push(`${opts.length} options is too many to read`);
      if (opts.some((o) => TELLTALE.test(o))) out.push('uses "all/none of the above": write a real option instead');
      const right = opts[it.answer] || '';
      const others = opts.filter((_, i) => i !== it.answer);
      const longest = Math.max(...others.map((o) => o.length), 1);
      if (right.length > 45 && right.length > longest * 1.9) out.push('the correct option is much longer than every distractor (a give-away)');
    }
  }
  if (quizLike && String(it.explain || '').trim().length < 40) out.push('explanation missing or too short to teach anything');
  if (it.type === 'fill' && Array.isArray(it.answer) && it.answer.some((a) => !String(a).trim())) out.push('an accepted fill-in answer is empty');
  if (it.concept && !CONCEPTS[it.concept]) out.push(`unknown concept "${it.concept}"`);
  if (it.concept && topic && CONCEPT_SKILL[it.concept] && !['think', topic.skill].includes(CONCEPT_SKILL[it.concept]) && !it.crossConcept) {
    out.push(`concept "${it.concept}" belongs to ${CONCEPT_SKILL[it.concept]}, but the topic is ${topic.skill}`);
  }
  if (topic && DIFFICULTY_BY_LEVEL[topic.level]) {
    const [lo, hi] = DIFFICULTY_BY_LEVEL[topic.level];
    const d = it.difficulty || 2;
    if (d < lo || d > hi) out.push(`difficulty ${d} is outside ${lo}-${hi} for a ${topic.level} topic`);
  }
  return out;
}

// ---------------------------------------------------------------- answers proved by computation
const near = (a, b, tol) => Math.abs(Number(a) - Number(b)) <= Math.max(tol, Math.abs(Number(b)) * 1e-9);

export function sameAnswer(item, expected) {
  const a = item.answer;
  if (typeof expected === 'number' && typeof a === 'number') return near(a, expected, item.tolerance ?? 1e-6);
  if (typeof expected === 'string' && item.type === 'mc') return String(item.options[a]).trim() === expected.trim();
  return JSON.stringify(a) === JSON.stringify(expected);
}

/**
 * Items can prove their own answer:
 *   verify: () => answer                          (computed from the numbers in the question)
 *   verifySql: { db, sql, pick: (rows) => answer } (computed from a practice database)
 * For multiple choice, the proof may return the option index or the option text.
 */
export async function proveAnswer(item, runSql) {
  if (typeof item.verify === 'function') {
    const expected = item.verify();
    return sameAnswer(item, expected) ? null : `verify() gives ${JSON.stringify(expected)}, but the answer is ${JSON.stringify(item.type === 'mc' ? item.options[item.answer] : item.answer)}`;
  }
  if (item.verifySql) {
    const { db, sql, pick } = item.verifySql;
    const res = await runSql(db, sql, 5000);
    if (!res.ok) return `verifySql failed: ${res.error}`;
    const expected = pick(res.rows, res.columns);
    return sameAnswer(item, expected) ? null : `the data gives ${JSON.stringify(expected)}, but the answer is ${JSON.stringify(item.type === 'mc' ? item.options[item.answer] : item.answer)}`;
  }
  return undefined;   // nothing to prove with
}
