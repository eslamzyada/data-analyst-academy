// Builds a test learner's progress file: a realistic, fixed starting point for manual testing and
// content checks, kept completely apart from the learner's real progress (app/data/academy.db).
//
//   node tools/fixture.js <folder> [--force]
//
// The learner "Test Learner" has skipped placement, finished the SELECT lesson and quiz, got a
// WHERE task wrong (an open mistake), started a quiz on WHERE and has a draft in the HR project.
// Items used by the browser tests are deliberately left untouched.
import fs from 'node:fs';
import path from 'node:path';
import { assertTestDataDir, APP_DIR } from '../server/safety.js';

const dir = process.argv[2];
assertTestDataDir(dir, 'the fixture builder');
fs.mkdirSync(dir, { recursive: true });
const file = path.join(dir, 'academy.db');
if (fs.existsSync(file)) {
  if (!process.argv.includes('--force')) { console.log(`Fixture already exists: ${file} (use --force to rebuild)`); process.exit(0); }
  fs.rmSync(file);
}

const store = await import('../server/store.js');
await store.openStore(dir);
const { loadContent, content } = await import('../server/content/index.js');
loadContent(path.join(APP_DIR, 'data'));
const engine = await import('../server/engine.js');
const quizsessions = await import('../server/quizsessions.js');
const workstate = await import('../server/workstate.js');
const { OUTCOME } = await import('../shared/lifecycle.js');

const placement = { at: new Date().toISOString(), skipped: true, fixture: true, roadmap: { excel: 'Beginner', sql: 'Beginner', pq: 'Beginner', think: 'Beginner', pbi: 'Not started' }, startSkill: 'sql' };
store.run("UPDATE profile SET name = 'Test Learner', onboarded = 1, placement_json = ? WHERE id = 1", [JSON.stringify(placement)]);

const item = (id) => content.items[id] || (() => { throw new Error(`fixture: unknown item ${id}`); })();
const attempt = (id, score, extra = {}) => {
  const it = item(id);
  return engine.recordAttempt({ itemId: it.id, topicId: it.topicId, skillId: it.skill, source: it.source === 'quiz' ? 'quiz' : 'practice', rawScore: score, concept: it.concept || null, mistakeLabel: it.mistake || null, seconds: 60, ...extra });
};

// SELECT: lesson read, practice solved, quiz finished and passed
engine.markLessonDone('sql-select');
for (const p of content.topicMap['sql-select'].practice.slice(0, 2)) {
  attempt(p.id, 1, { detail: { answer: p.answer } });
  workstate.saveState(`item:${p.id}`, { itemId: p.id, topicId: p.topicId, answer: p.answer, result: { outcome: OUTCOME.CORRECT, correct: true, score: 1 }, solvedBefore: true });
}
{
  const topic = content.topicMap['sql-select'];
  const qs = topic.quiz.filter((q) => ['mc', 'tf'].includes(q.type)).slice(0, 6);
  const sess = quizsessions.createSession({ key: 'topic:sql-select', topicId: topic.id, title: `${topic.title} quiz`, itemIds: qs.map((q) => q.id) });
  qs.forEach((q, i) => {
    const right = i !== 4;                    // one miss
    const given = q.type === 'tf' ? (right ? q.answer : !q.answer) : right ? q.answer : (q.answer + 1) % q.options.length;
    quizsessions.recordAnswer(sess.id, q.id, given, { outcome: right ? OUTCOME.CORRECT : OUTCOME.INCORRECT, correct: right, score: right ? 1 : 0 });
    attempt(q.id, right ? 1 : 0, { noMistake: right });
  });
  quizsessions.finishSession(sess.id);
}

// WHERE: a wrong practice answer (open mistake) and a quiz in progress
{
  const p = content.topicMap['sql-where'].practice[0];
  const wrongSql = 'SELECT * FROM orders';
  attempt(p.id, 0, { detail: { answer: wrongSql } });
  workstate.saveState(`item:${p.id}`, { itemId: p.id, topicId: p.topicId, answer: wrongSql, hints: 1, result: { outcome: OUTCOME.INCORRECT, correct: false, score: 0 } });
  const topic = content.topicMap['sql-where'];
  const qs = topic.quiz.filter((q) => ['mc', 'tf'].includes(q.type)).slice(0, 6);
  const sess = quizsessions.createSession({ key: 'topic:sql-where', topicId: topic.id, title: `${topic.title} quiz`, itemIds: qs.map((q) => q.id) });
  const q = qs[0];
  quizsessions.recordAnswer(sess.id, q.id, q.answer, { outcome: OUTCOME.CORRECT, correct: true, score: 1 });
  workstate.saveState('quiz:topic:sql-where', { sessionId: sess.id, index: 1, drafts: {} });
}

// Analyst thinking: one written answer self-checked
{
  const p = content.topicMap['think-trust'].practice[0];
  const ticks = (p.checklist || []).map((_, i) => i < 2);
  engine.recordAttempt({ itemId: p.id, topicId: p.topicId, skillId: p.skill, source: 'practice', rawScore: ticks.filter(Boolean).length / Math.max(1, ticks.length), concept: p.concept || null });
  workstate.saveState(`item:${p.id}`, { itemId: p.id, topicId: p.topicId, answer: 'Check the definition and the period first.', ticks, selfSaved: 0.5, result: { outcome: OUTCOME.NOT_EVALUABLE, correct: false, selfCheck: true } });
}

// a project draft
workstate.saveState('project:cap-hr', { drafts: { s1: ['12', ''] }, hints: {}, ticks: {} });
workstate.saveState('session:place', { route: '/topic/sql-where?tab=practice', label: 'SQL: WHERE' });

store.flushNow();
const n = store.get('SELECT COUNT(*) AS n FROM attempts').n;
console.log(`Fixture learner written to ${file} (${n} attempts).`);
process.exit(0);
