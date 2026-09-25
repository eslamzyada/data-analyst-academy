// Checks every piece of training content against the real engines:
//  - every reference SQL runs, returns rows and grades itself as correct; every trap differs
//  - every reference formula evaluates without errors and grades itself as correct
//  - every multiple-choice/order/number item is well-formed
//  - every file, dataset preview and answer key exists
// Run: npm run validate
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadContent, content, metaOf } from '../server/content/index.js';
import { initSqlRunner, runSql } from '../server/sqlrunner.js';
import { gradeSql, resultsMatch } from '../server/grading/sql.js';
import { gradeFormula, checkReference } from '../server/grading/formula.js';
import { previewDataset } from '../server/datasets.js';
import { itemProblems, findNearDuplicates, proveAnswer } from './lib/content-checks.js';
import { topicCoverage } from './lib/coverage.js';
import { textMatches } from '../server/grading/values.js';
import { gradeParts } from '../server/grading/excel.js';
import { checkAnalyst, checkTools, checkSelect, checkCriteria } from './lib/analyst-checks.js';
import { availability } from '../server/mastery.js';

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(APP, 'data');
const errors = [];
const warnings = [];
const err = (id, msg) => errors.push(`${id}: ${msg}`);
const warn = (id, msg) => warnings.push(`${id}: ${msg}`);

// A UTF-8 file saved as if it were Windows-1252 turns "÷" into "Ã·" and "café" into "cafÃ©".
// It is invisible in a diff and only shows up on screen, so check for it here.
for (const f of fs.readdirSync(path.join(APP, 'server', 'content'), { recursive: true }).filter((n) => String(n).endsWith('.js'))) {
  const text = fs.readFileSync(path.join(APP, 'server', 'content', f), 'utf8');
  const hits = text.match(/[ÃÂ][-¿‘-„€…]|â€|Î£/g);
  if (hits) err(f, `looks like broken text encoding (${[...new Set(hits)].slice(0, 5).join(' ')}). Re-save the file as UTF-8.`);
}

/**
 * An explanation that quotes a result ("the real average is about 17.03") must quote the
 * number the formula actually produces. A wrong number here teaches the wrong thing, and it
 * is the kind of mistake nothing else catches.
 */
function checkQuotedNumbers(id, it, graded) {
  const text = String(it.explain || '');
  const claim = /\b(?:is|gives|returns|equals|about|=)\s*[$£€]?\s*(\d[\d,]*\.\d+)\b/gi;
  const claimed = [...text.matchAll(claim)].map((m) => Number(m[1].replace(/,/g, ''))).filter(Number.isFinite);
  if (!claimed.length) return;
  const values = (graded.cells || []).map((c) => c.value).filter((v) => typeof v === 'number')
    .concat((graded.spill || []).flat().filter((v) => typeof v === 'number'));
  if (!values.length) return;
  const near = (a, b) => Math.abs(a - b) <= Math.max(0.02, Math.abs(b) * 0.005);
  for (const c of claimed) {
    // the claim may be a share, a percentage or a rounding of one of the results
    const matches = values.some((v) => near(c, v) || near(c, v * 100) || near(c, v / 100) || near(c, Math.round(v * 100) / 100));
    if (!matches) warn(id, `explanation quotes ${c}, but the formula produces ${values.slice(0, 4).map((v) => Math.round(v * 1000) / 1000).join(', ')}`);
  }
}

loadContent(DATA);
initSqlRunner(path.join(DATA, 'practice'));

const ids = new Set();
const byType = {};
let proved = 0;
for (const t of content.topics) {
  if (!t.lesson || t.lesson.trim().length < 200) err(t.id, 'lesson missing or too short');
  for (const p of t.prereqs || []) if (!content.topicMap[p]) err(t.id, `unknown prereq ${p}`);
  if (!(t.quiz || []).length) warn(t.id, 'no quiz questions');
  if (!t.tryIt) warn(t.id, 'no try-it exercise');
  for (const c of t.cards || []) { if (ids.has(c.id)) err(c.id, 'duplicate card id'); ids.add(c.id); if (!c.front || !c.back) err(c.id, 'card needs front and back'); }
}

function checkFile(id, rel) {
  if (!fs.existsSync(path.join(DATA, 'files', rel))) err(id, `missing file ${rel}`);
}

for (const it of Object.values(content.items)) {
  byType[it.type] = (byType[it.type] || 0) + 1;
  const id = it.id;
  switch (it.type) {
    case 'mc':
      if (!Array.isArray(it.options) || it.options.length < 2) err(id, 'mc needs options');
      else if (!(Number.isInteger(it.answer) && it.answer >= 0 && it.answer < it.options.length)) err(id, 'mc answer out of range');
      break;
    case 'multi':
      if (!Array.isArray(it.answer)) err(id, 'multi answer must be an array');
      break;
    case 'tf':
      if (typeof it.answer !== 'boolean') err(id, 'tf answer must be boolean');
      break;
    case 'fill':
      if (!Array.isArray(it.answer) || !it.answer.length) err(id, 'fill answer must be a non-empty array');
      break;
    case 'number':
      if (typeof it.answer !== 'number') err(id, 'number answer must be numeric');
      break;
    case 'order': {
      const ok = Array.isArray(it.answer) && it.answer.length === it.options.length && [...it.answer].sort().join() === it.options.map((_, i) => i).sort().join();
      if (!ok) err(id, 'order answer must be a permutation of option indexes');
      break;
    }
    case 'formula': {
      const refErr = checkReference(it);
      if (refErr) { err(id, `reference formula error: ${refErr}`); break; }
      const g = gradeFormula(it, it.answer);
      if (!g.correct) err(id, `reference formula does not grade as correct: ${g.feedback}`);
      else checkQuotedNumbers(id, it, g);
      break;
    }
    case 'sql': {
      if (!content.databaseMap[it.db]) { err(id, `unknown db ${it.db}`); break; }
      const r = await runSql(it.db, it.answer, 5000);
      if (!r.ok) { err(id, `reference SQL failed: ${r.error}`); break; }
      if (!r.total) err(id, 'reference SQL returns no rows');
      const self = await gradeSql(it, it.answer);
      if (!self.correct) err(id, `reference SQL does not grade itself as correct: ${self.feedback}`);
      for (const [k, trap] of (it.traps || []).entries()) {
        const t = await runSql(it.db, trap.sql, 5000);
        if (!t.ok) { err(id, `trap ${k} failed: ${t.error}`); continue; }
        if (resultsMatch(t, r, !!it.ordered)) err(id, `trap ${k} gives the SAME result as the answer (useless trap)`);
      }
      break;
    }
    case 'numbers':
    case 'file': {
      if (!Array.isArray(it.expected)) { err(id, 'no expected answers (answersKey)'); break; }
      if (it.expected.length !== it.questions.length) err(id, `expected ${it.expected.length} answers but ${it.questions.length} questions`);
      it.expected.forEach((v, i) => { if (v === null || v === undefined || Number.isNaN(v)) err(id, `expected[${i}] is empty`); });
      // a written-in list of accepted answers replaces the computed one: it must still accept it
      it.questions.forEach((q, i) => {
        if (q.accept && it.expected[i] !== undefined && !textMatches(String(it.expected[i]), q.accept)) err(id, `question ${i + 1}: accept list ${JSON.stringify(q.accept)} does not accept the computed answer ${JSON.stringify(it.expected[i])}`);
        if (typeof it.expected[i] === 'string' && !q.accept && !q.month && !q.date && /[-/&]/.test(it.expected[i]) && it.strict) err(id, `question ${i + 1}: the answer "${it.expected[i]}" has punctuation; give an accept list with the plain spelling too`);
      });
      it.questions.forEach((q, i) => {
        if (q.month && !/^\d{4}-\d{2}$/.test(String(it.expected[i]))) err(id, `question ${i + 1}: a month question needs a YYYY-MM answer, not ${JSON.stringify(it.expected[i])}`);
        if (q.date && !/^\d{4}-\d{2}-\d{2}$/.test(String(it.expected[i]))) err(id, `question ${i + 1}: a date question needs a YYYY-MM-DD answer, not ${JSON.stringify(it.expected[i])}`);
      });
      if (Array.isArray(it.expected) && it.expected.length === it.questions.length) {
        // the computed answers, typed the way a learner would, must be graded right
        const typed = it.expected.map((v) => (typeof v === 'number' ? String(v) : String(v)));
        const self = gradeParts(it.questions, it.expected, typed);
        self.parts.forEach((p, i) => { if (!p.correct) err(id, `question ${i + 1}: the computed answer ${JSON.stringify(it.expected[i])} is graded wrong`); });
        // and a clearly wrong number must not be accepted (a tolerance that wide checks nothing)
        it.expected.forEach((v, i) => {
          if (it.questions[i].date) {
            const next = new Date(`${v}T00:00:00Z`); next.setUTCDate(next.getUTCDate() + 1);
            if (gradeParts([it.questions[i]], [v], [next.toISOString().slice(0, 10)]).parts[0].correct) err(id, `question ${i + 1}: the day after ${v} is accepted`);
            return;
          }
          if (typeof v !== 'number' || it.questions[i].accept || it.questions[i].month) return;
          const wrong = v === 0 ? 5 : v * 1.25;
          if (gradeParts([it.questions[i]], [v], [String(wrong)]).parts[0].correct) err(id, `question ${i + 1}: ${wrong} is accepted for ${v}; the tolerance is too wide`);
        });
      }
      for (const f of it.files || []) checkFile(id, f.path);
      if (it.dataset && !content.datasetMap[it.dataset]) err(id, `unknown dataset ${it.dataset}`);
      break;
    }
    case 'open':
      if (!(it.checklist || []).length) err(id, 'open item needs a checklist');
      for (const c of it.checklist || []) if (!c.keywords || !c.keywords.length) warn(id, `checklist point without keywords: ${c.point}`);
      if (!it.model) warn(id, 'open item has no model answer');
      break;
    default:
      err(id, `unknown type ${it.type}`);
  }
  if (!['placement', 'quiz'].includes(it.source) && ['sql', 'formula', 'numbers', 'file'].includes(it.type) && !(it.hints || []).length) warn(id, 'task has no hints');
  if (it.source === 'quiz' && !it.explain) warn(id, 'quiz question has no explanation');

  // quality: wording, options, difficulty, concept. Strict (newer) items must be clean.
  const topic = content.topicMap[it.topicId];
  const report = it.strict ? err : warn;
  for (const p of itemProblems(it, topic)) report(id, p);
  if (it.strict && ['quiz', 'tryit'].includes(it.source) && !it.kind) err(id, 'newer questions must state their kind (concept, debugging, scenario, ...)');
  // proof: an answer computed from the question's own numbers or from a practice database
  const proof = await proveAnswer(it, runSql);
  if (proof) err(id, proof);
  if (proof === null) proved++;
}

// near duplicates: the same question with different names or numbers
{
  const dups = findNearDuplicates(Object.values(content.items));
  for (const d of dups) {
    const msg = `near-duplicate of ${d.b.id} (similarity ${d.similarity})`;
    if (d.a.strict || d.b.strict) err(d.a.id, msg); else warn(d.a.id, msg);
  }
}

// projects
for (const p of content.projects) {
  for (const f of p.files || []) checkFile(p.id, f.path);
  for (const s of p.steps) {
    if (s.type === 'numbers') {
      if (!Array.isArray(s.expected) || s.expected.length !== s.questions.length) err(`${p.id}/${s.id}`, 'expected answers do not match questions');
      else s.expected.forEach((v, i) => { if (v === null || v === undefined || Number.isNaN(v)) err(`${p.id}/${s.id}`, `expected[${i}] empty`); });
    }
    if (s.type === 'choice' && !(Number.isInteger(s.answer) && s.answer < s.options.length)) err(`${p.id}/${s.id}`, 'choice answer out of range');
    if (s.type === 'select') checkSelect(`${p.id}/${s.id}`, s, err);
    if (s.type === 'tools') checkTools(`${p.id}/${s.id}`, s, err);
    if (!(s.criteria || []).length) err(`${p.id}/${s.id}`, 'every project step names the criteria it gives evidence of');
    checkCriteria(`${p.id}/${s.id}`, s.criteria, err);
    // a later step must not print an earlier step's text answer: every step is on the same page
    for (const a of (s.expected || []).filter((v) => typeof v === 'string')) {
      const words = a.split(/\s+/).filter((w) => w.length > 4);
      if (!words.length) continue;
      for (const later of p.steps.slice(p.steps.indexOf(s) + 1)) {
        const visible = [later.title, later.prompt, ...(later.options || [])].join(' | ');
        if (words.every((w) => visible.includes(w))) err(`${p.id}/${later.id}`, `gives away the answer to ${s.id} ("${a}")`);
      }
    }
    for (const t of s.topics || []) if (!content.topicMap[t]) err(`${p.id}/${s.id}`, `unknown topic ${t}`);
  }
}

// Real Analyst work, and every ability reachable up to Independent
checkAnalyst({ content, err, warn, filesDir: path.join(DATA, 'files'), availability: availability() });

// cold start: a new learner starts at the first topic of a skill, and its first quizzes are drawn from
// the easy questions (adaptive.js coldStart). Content changes must leave enough of them there.
for (const sk of content.skills) {
  const first = content.topics.find((t) => t.skill === sk.id);
  const easy = (first?.quiz || []).filter((i) => (i.difficulty || 2) <= 2).length;
  if (easy < 10) err(first?.id || sk.id, `the first ${sk.name} topic needs at least 10 quiz questions of difficulty 1-2 (it has ${easy}): every new learner starts here`);
  if (first && !(first.practice || []).length && !first.tryIt) err(first.id, `the first ${sk.name} topic needs a guided example (tryIt) or a practice task`);
}

// exams: enough questions?
for (const e of content.exams) {
  const pool = content.topics.filter((t) => t.skill === e.skill && (!e.tier || t.level === e.tier)).flatMap((t) => t.quiz || []);
  if (pool.length < e.count) warn(e.id, `only ${pool.length} questions available for ${e.count}`);
}

// datasets
for (const d of content.datasets) {
  if (d.download) checkFile(d.id, d.download);
  for (const x of d.extra || []) checkFile(d.id, x.path);
  if (d.preview) {
    try {
      const pv = await previewDataset(path.join(DATA, 'files'), d.preview, { limit: 3 });
      if (!pv.columns.length) err(d.id, 'preview has no columns');
    } catch (e) { err(d.id, `preview failed: ${e.message}`); }
  }
}

// question bank metadata (server/content/schema.js): every question described the same way
for (const p of content.bankProblems) {
  if (p.problem === 'no explanation') continue;            // reported above as a warning
  err(p.id, `metadata: ${p.problem}`);
}

// coverage against server/content/targets.js (goals, so warnings; the full matrix: npm run coverage)
const coverage = topicCoverage(content);
for (const c of coverage) if (c.weak.length) warn(c.id, `below target: ${c.weak.join(', ')}`);
const bankByKind = {};
const bankByLevel = {};
for (const it of Object.values(content.items)) {
  const m = metaOf(it);
  bankByKind[m.kind] = (bankByKind[m.kind] || 0) + 1;
  if (m.level) bankByLevel[`${m.skill}/${m.level}`] = (bankByLevel[`${m.skill}/${m.level}`] || 0) + 1;
}
if (process.argv.includes('--coverage')) {
  console.log('\nCOVERAGE (see npm run coverage for the full matrix)');
  for (const c of coverage) console.log(`  ${c.id.padEnd(22)} ${c.level.padEnd(12)} quiz ${String(c.quiz).padStart(3)}/${c.quizTarget}  practice ${c.practice}/${c.practiceTarget}  challenge ${c.challenge ? 'yes' : 'no'}  kinds ${c.kindCount}  top format ${c.topFormat} ${c.topFormatShare}%`);
}

const summary = {
  topics: content.topics.length,
  bySkill: Object.fromEntries(content.skills.map((s) => [s.id, content.topics.filter((t) => t.skill === s.id).length])),
  items: Object.keys(content.items).length, answersProvedByComputation: proved, byType, byKind: bankByKind, byLevel: bankByLevel, cards: content.cards.length,
  placement: content.placement.length, exams: content.exams.length, projects: content.projects.length, datasets: content.datasets.length, analyst: content.analyst.length,
};
console.log(JSON.stringify(summary, null, 1));
if (warnings.length) console.log(`\nWARNINGS (${warnings.length}):\n  ` + warnings.join('\n  '));
if (errors.length) { console.log(`\nERRORS (${errors.length}):\n  ` + errors.join('\n  ')); process.exit(1); }
console.log('\nAll content checks passed.');
process.exit(0);
