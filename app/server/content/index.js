// Loads all training content, indexes it, and prepares answer-free copies for the browser.
import fs from 'node:fs';
import path from 'node:path';
import { SKILLS } from './skills.js';
import { CONCEPTS } from './concepts.js';
import { EXCEL } from './excel.js';
import { SQL_TOPICS } from './sql.js';
import { PQ } from './pq.js';
import { PBI } from './pbi.js';
import { THINK } from './think.js';
import { PLACEMENT } from './placement.js';
import { EXAMS } from './exams.js';
import { PROJECTS } from './projects.js';
import { ANALYST } from './analyst.js';
import { DATASETS } from './datasets.js';
import { DATABASES } from './databases.js';
import { BANK, PRACTICE_BANK, CHALLENGE_BANK } from './bank/index.js';
import { EXTRA_TOPICS } from './topics/index.js';
import { resolveGenerated } from './generated.js';
import { metaOf, metaProblems, kindOf } from './schema.js';

export { metaOf, kindOf };

export const content = {};

export function loadContent(dataDir) {
  const answersFile = path.join(dataDir, 'answers.json');
  const answers = fs.existsSync(answersFile) ? JSON.parse(fs.readFileSync(answersFile, 'utf8')) : {};
  const topics = withExtraTopics([...EXCEL, ...SQL_TOPICS, ...PQ, ...PBI, ...THINK], EXTRA_TOPICS);
  const items = {};
  const quizItems = [];
  const cards = [];
  const skillOrder = Object.fromEntries(SKILLS.map((s, i) => [s.id, i]));
  topics.forEach((t, i) => { t.order = i; });

  const addItem = (item, topic, source) => {
    if (!item) return;
    if (items[item.id]) throw new Error(`Duplicate item id ${item.id}`);
    item.topicId = topic ? topic.id : item.topicId || null;
    item.skill = topic ? topic.skill : item.skill || null;
    item.source = source;
    if (topic && topic.strict) item.strict = true;     // newer content: every quality check is an error
    if (item.answersKey) {
      const exp = answers[item.answersKey];
      if (!exp) throw new Error(`answers.json has no entry "${item.answersKey}" (run npm run build:data)`);
      item.expected = Array.isArray(exp) ? exp : exp;
    }
    items[item.id] = item;
    if (source === 'quiz') quizItems.push(item);
    // every question is described the same way; incomplete ones are reported, not silently served
    for (const p of metaProblems(metaOf(item, topic), { quiz: source === 'quiz' })) bankProblems.push({ id: item.id, problem: p });
  };
  const bankProblems = [];

  // Extra question banks live in their own files, keyed by topic, so the topic files stay readable.
  const byTopic = Object.fromEntries(topics.map((t) => [t.id, t]));
  for (const q of BANK) {
    const t = byTopic[q.topic];
    if (!t) throw new Error(`Bank question ${q.id} points at unknown topic ${q.topic}`);
    (t.quiz = t.quiz || []).push(q);
  }
  for (const p of PRACTICE_BANK) {
    const t = byTopic[p.topic];
    if (!t) throw new Error(`Bank practice ${p.id} points at unknown topic ${p.topic}`);
    (t.practice = t.practice || []).push(p);
  }
  for (const c of CHALLENGE_BANK) {
    const t = byTopic[c.topic];
    if (!t) throw new Error(`Bank challenge ${c.id} points at unknown topic ${c.topic}`);
    if (t.challenge) throw new Error(`Topic ${t.id} already has a challenge (${t.challenge.id}); ${c.id} would replace it`);
    t.challenge = c;
  }

  for (const t of topics) {
    if (!skillOrder.hasOwnProperty(t.skill)) throw new Error(`Topic ${t.id} has unknown skill ${t.skill}`);
    addItem(t.tryIt, t, 'tryit');
    for (const p of t.practice || []) addItem(p, t, 'practice');
    for (const q of t.quiz || []) addItem(q, t, 'quiz');
    addItem(t.challenge, t, 'challenge');
    for (const c of t.cards || []) cards.push({ ...c, topicId: t.id, skill: t.skill });
  }
  for (const q of PLACEMENT) addItem(q, null, 'placement');
  for (const p of PROJECTS) {
    for (const s of p.steps) {
      if (s.answersKey) {
        const exp = answers[s.answersKey];
        if (exp === undefined) throw new Error(`answers.json has no entry "${s.answersKey}"`);
        s.expected = s.pick ? s.pick(exp) : exp;
      }
    }
  }

  for (const task of ANALYST) {
    const exp = task.answersKey ? answers[task.answersKey] : null;
    if (task.answersKey && exp === undefined) throw new Error(`answers.json has no entry "${task.answersKey}" (run npm run build:extra)`);
    for (const part of task.parts) {
      if (part.pick) part.expected = part.pick(exp);
      if (part.reasoning && typeof part.reasoning.figures === 'function') part.reasoning = { ...part.reasoning, figures: part.reasoning.figures(exp) };
    }
  }

  Object.assign(content, {
    skills: SKILLS, skillMap: Object.fromEntries(SKILLS.map((s) => [s.id, s])),
    topics, topicMap: Object.fromEntries(topics.map((t) => [t.id, t])),
    items, quizItems, cards, concepts: CONCEPTS, placement: PLACEMENT, exams: EXAMS, projects: PROJECTS,
    projectMap: Object.fromEntries(PROJECTS.map((p) => [p.id, p])),
    analyst: ANALYST, analystMap: Object.fromEntries(ANALYST.map((t) => [t.id, t])),
    datasets: DATASETS, datasetMap: Object.fromEntries(DATASETS.map((d) => [d.id, d])),
    databases: DATABASES, databaseMap: Object.fromEntries(DATABASES.map((d) => [d.id, d])),
    answers, bankProblems,
  });
  const serious = bankProblems.filter((p) => p.problem !== 'no explanation');
  if (serious.length) console.warn('Question bank: ' + serious.length + ' incomplete question(s), e.g. ' + serious[0].id + ': ' + serious[0].problem + '. Run npm run validate.');
  return content;
}

/**
 * Topics added after the original paths was written. Each names the topic it follows (`after`),
 * so the learning path keeps a sensible order without rewriting the original files.
 */
function withExtraTopics(base, extras) {
  const out = base.slice();
  for (const t of extras) {
    if (out.some((x) => x.id === t.id)) throw new Error(`Duplicate topic id ${t.id}`);
    const i = out.findIndex((x) => x.id === t.after);
    if (i < 0) throw new Error(`Topic ${t.id} should follow ${t.after}, which does not exist`);
    if (out[i].skill !== t.skill) throw new Error(`Topic ${t.id} (${t.skill}) cannot follow ${t.after} (${out[i].skill})`);
    // after the named topic and any extras already placed behind it
    let j = i + 1;
    while (j < out.length && out[j].strict && out[j].after === t.after) j++;
    out.splice(j, 0, Object.assign(t, { strict: true }));
  }
  return out;
}

/** Any item by id: a stored one, or a generated question rebuilt from its seed. */
export function getItem(id) {
  if (!id) return null;
  return content.items[id] || resolveGenerated(id, content.topicMap || {});
}

/**
 * The kind of question (see schema.js), so a quiz can mix kinds rather than repeat one.
 * True/false is kept apart: a quiz of only true/false questions teaches little.
 */
export function questionStyle(item) {
  return item.type === 'tf' ? 'true-false' : kindOf(item);
}

// ------------------------------------------------------------------ the order options are shown in
// Questions are written with their options in any order (often the right one in the same place).
// Each multiple-choice question is shown in its own fixed order, worked out from its id, so the
// position of the right answer tells the learner nothing. Everything stored (answers, results,
// attempts) keeps the written order; only what the browser sees and sends is in display order.

function hashId(id) {
  let h = 2166136261;
  for (const ch of String(id)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function seededShuffle(n, seed) {
  let a = seed || 1;
  const rand = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const out = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

const orderCache = new Map();
/** For a multiple-choice item: display position → written option index. Null for other types. */
export function displayOrder(item) {
  if (!item || item.type !== 'mc' || !Array.isArray(item.options) || item.options.length < 2) return null;
  const key = `${item.id}|${item.options.length}`;
  if (!orderCache.has(key)) orderCache.set(key, seededShuffle(item.options.length, hashId(item.id)));
  return orderCache.get(key);
}

/** An answer as sent by the browser, turned into the written order used for grading and storage. */
export function toStoredAnswer(item, given) {
  const order = displayOrder(item);
  if (!order || given === null || given === undefined || given === '') return given;
  const d = Number(given);
  return Number.isInteger(d) && d >= 0 && d < order.length ? order[d] : given;   // e.g. "I don't know" stays out of range
}

/** A stored (written-order) answer, turned into the position the browser shows it in. */
export function toShownAnswer(item, stored) {
  const order = displayOrder(item);
  if (!order || stored === null || stored === undefined || stored === '') return stored;
  const i = order.indexOf(Number(stored));
  return i >= 0 ? i : stored;
}

/** Explanations that say "Option 2" or "Options 1 and 3" are renumbered to match what is shown. */
export function shownExplain(item, text) {
  const order = displayOrder(item);
  if (!order || !text) return text || null;
  return String(text).replace(/\b(Options?) ((?:[1-9](?:, | and | or )?)+)/g, (m, word, list) => {
    const nums = list.match(/[1-9]/g).map((d) => Number(d));
    if (nums.some((n) => n > order.length)) return m;
    const shown = nums.map((n) => order.indexOf(n - 1) + 1).sort((a, b) => a - b);
    const joined = shown.length === 1 ? String(shown[0]) : `${shown.slice(0, -1).join(', ')} and ${shown[shown.length - 1]}`;
    const tail = /(, | and | or )$/.exec(list);
    return `${word} ${joined}${tail ? tail[1] : ''}`;
  });
}

/** For an ordering question: the order its items start in (never already correct). */
export function startOrder(item) {
  if (!item || item.type !== 'order' || !Array.isArray(item.options)) return null;
  const n = item.options.length;
  let start = seededShuffle(n, hashId(`${item.id}#start`));
  const same = (a) => Array.isArray(item.answer) && a.every((v, i) => v === item.answer[i]);
  for (let k = 0; k < n && same(start); k++) start = [...start.slice(1), start[0]];
  return start;
}

/** Copy of an item that is safe to send to the browser (no answers, hints or solutions). */
export function clientItem(item) {
  if (!item) return null;
  const out = {
    id: item.id, type: item.type, title: item.title || null, prompt: item.prompt, context: item.context || null,
    difficulty: item.difficulty || 2, minutes: item.minutes || null, business: item.business || null,
    topicId: item.topicId, skill: item.skill, source: item.source,
    topicTitle: (content.topicMap && content.topicMap[item.topicId]?.title) || null,
    style: item.source === 'quiz' || item.generated ? questionStyle(item) : null,
    kind: metaOf(item).kind, format: metaOf(item).format,
    hints: (item.hints || []).length, hasExplain: !!item.explain, hasSolution: !!(item.solution || item.answer !== undefined || item.expected),
    options: displayOrder(item) ? displayOrder(item).map((i) => item.options[i]) : item.options || null,
    placeholder: item.placeholder || null, unit: item.unit || null,
  };
  if (item.type === 'formula') Object.assign(out, { grid: item.grid, target: item.target, fillTo: item.fillTo || null });
  if (item.type === 'sql') Object.assign(out, { db: item.db, starter: item.starter || '' });
  if (item.type === 'numbers' || item.type === 'file') {
    out.questions = item.questions.map((q) => ({ label: q.label, unit: q.unit || null, kind: typeof item.expected?.[item.questions.indexOf(q)] === 'number' ? 'number' : 'text' }));
    out.files = item.files || [];
    out.dataset = item.dataset || null;
    out.upload = item.type === 'file';
    out.db = item.db || null;
    out.tasks = item.tasks || null;
  }
  if (item.type === 'open') out.checklist = (item.checklist || []).map((c) => c.point);
  if (item.type === 'order') { out.options = item.options; out.start = startOrder(item); }
  if (item.dataset) out.dataset = item.dataset;
  if (item.files) out.files = item.files;
  if (item.tasks) out.tasks = item.tasks;
  if (item.db && !out.db) out.db = item.db;
  return out;
}
