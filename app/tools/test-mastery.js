// Tests for the Mastery Layer: stages from evidence, the four kinds of evidence, adaptive
// difficulty, the reasoning rubric, Real Analyst grading and service, and milestones.
// Runs in one process on a throw-away progress database: npm run test:mastery
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertTestDataDir } from '../server/safety.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = assertTestDataDir(fs.mkdtempSync(path.join(os.tmpdir(), 'academy-mastery-')), 'test-mastery');
const store = await import('../server/store.js');
await store.openStore(dir);
const { loadContent, content, kindOf, metaOf } = await import('../server/content/index.js');
loadContent(path.join(ROOT, 'data'));
const mastery = await import('../server/mastery.js');
const engine = await import('../server/engine.js');
const { adaptFor } = await import('../server/adaptive.js');
const { detectReasoning, scoreReasoning, numbersIn } = await import('../server/grading/reasoning.js');
const { gradeTools, gradeSelect, gradeScope } = await import('../server/grading/analyst.js');
const analyst = await import('../server/analyst.js');
const { milestones } = await import('../server/milestones.js');
const { COMPETENCY_MAP } = await import('../server/content/competencies.js');

let pass = 0; const failures = [];
const ok = (cond, label, extra = '') => {
  if (cond) { pass++; console.log(`PASS  ${label}`); }
  else { failures.push(label); console.log(`FAIL  ${label}  ${extra}`); }
};
const section = (name) => console.log(`\n-- ${name}`);
const DAY = 86400000;

// ---------------------------------------------------------------- helpers: a learner's history, written directly
let clock = Date.now() - 60 * DAY;
let seq = 0;
function put(itemId, source, raw, { hints = 0, topic = null, concept = null, skill = null, daysAgo = null } = {}) {
  const it = content.items[itemId];
  // answers come in order: either "just now" one after another, or on a given day, a second apart
  const ts = new Date(daysAgo === null ? (clock += 60000) : Date.now() - daysAgo * DAY + (seq += 1000)).toISOString();
  const topicId = topic || it?.topicId || null;
  store.run(`INSERT INTO attempts (ts, item_id, topic_id, skill_id, source, score, raw_score, correct, hints, seconds, weight, concept, detail_json)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  [ts, itemId, topicId, skill || it?.skill || content.topicMap[topicId]?.skill || null, source, raw * [1, 0.85, 0.7, 0.5, 0][hints], raw, raw >= 0.999 ? 1 : 0, hints, 30, 1, concept || it?.concept || null, null]);
}
const reset = () => { for (const t of ['attempts', 'mistakes', 'topic_state', 'analyst_work', 'milestones', 'project_progress', 'work_state']) store.run(`DELETE FROM ${t}`); };
const dimOf = (it) => mastery.dimensionOf(it.source, kindOf(it), !!metaOf(it)?.business_context);
const itemsOf = (topicId, dim, src = null) => Object.values(content.items).filter((i) => i.topicId === topicId && (!src || i.source === src) && dimOf(i) === dim && i.source !== 'challenge');

// ================================================================ the four kinds of evidence
section('what an answer is evidence of');
ok(mastery.dimensionOf('quiz', 'concept') === 'knowledge', 'a concept question is knowledge');
ok(mastery.dimensionOf('quiz', 'sql-writing') === 'skill', 'writing a query is skill');
ok(mastery.dimensionOf('practice', 'formula-writing') === 'skill', 'a practice formula is skill');
ok(mastery.dimensionOf('quiz', 'scenario') === 'application', 'a business scenario is application');
ok(mastery.dimensionOf('quiz', 'tool-selection', false) === 'knowledge' && mastery.dimensionOf('quiz', 'tool-selection', true) === 'application',
  'choosing a tool is knowledge in the abstract, application in a business situation');
ok(['challenge', 'project', 'analyst', 'assessment'].every((s) => mastery.dimensionOf(s, 'concept') === 'application'), 'challenges, projects and Real Analyst work are application');

// ================================================================ stages from evidence (pure)
section('stages: the rules');
const blankAvail = { knowledge: 5, skill: 5, application: 5, independence: 3 };
{
  const empty = mastery.judge(null, blankAvail);
  ok(empty.stage === 'none', 'no evidence: not started');
  ok(mastery.judge(null, blankAvail, { lessonDone: true }).stage === 'introduced', 'a lesson read, nothing answered: introduced, and no further');
}

// ================================================================ completion is not mastery (with a real topic)
section('completion is not mastery');
reset();
const T = 'xl-xlookup';
// questions from this topic that also belong to its ability, so topic and ability move together
const LOOKUP = new Set(COMPETENCY_MAP['c-xl-lookup'].concepts);
const K = itemsOf(T, 'knowledge', 'quiz').filter((i) => LOOKUP.has(i.concept));
const S = [...itemsOf(T, 'skill', 'practice'), ...itemsOf(T, 'skill', 'quiz')].filter((i) => LOOKUP.has(i.concept));
const A = itemsOf(T, 'application', 'quiz').filter((i) => LOOKUP.has(i.concept));
const CH = content.topicMap[T].challenge;
ok(K.length >= 3 && S.length >= 2 && A.length >= 2 && !!CH, `the test topic has items of every kind (${K.length}/${S.length}/${A.length}, challenge ${!!CH})`);
engine.markLessonDone(T);
for (const it of K.slice(0, 6)) put(it.id, 'quiz', 1);
let v = mastery.topicView(T);
ok(v.stage === 'practicing', `lesson read + every knowledge question right = Practicing, not Competent (${v.stage})`);
ok(v.dims.knowledge.state === 'shown' && v.dims.skill.state !== 'shown', 'knowledge shown, skill not');
ok(v.next.some((n) => n.dim === 'skill'), 'it says what is missing: hands-on work', JSON.stringify(v.next));
const oldPct = engine.topicMastery(T);
ok(oldPct > 0, `the topic percent still moves (${oldPct}%): the stage is what is honest about it`);

// hands-on work, with the answer shown, does not count as doing it
for (const it of S.slice(0, 2)) put(it.id, 'practice', 1, { hints: 4 });
ok(mastery.topicView(T).stage === 'practicing', 'tasks solved after the answer was shown do not prove skill');
// even with good recent scores, tasks done only with the answer shown are not counted as solved
{
  reset();
  for (const it of K.slice(0, 4)) put(it.id, 'quiz', 1);
  put(S[0].id, 'practice', 1, { hints: 4 });
  put(S[1].id, 'practice', 1, { hints: 4 });
  for (let r = 0; r < 4; r++) put(S[0].id, 'practice', 1);          // one task, redone on its own
  const w = mastery.topicView(T);
  ok(w.dims.skill.state !== 'shown' && w.dims.skill.have === 1, `only tasks solved without the answer count: 1 of 2, not 2 (${w.dims.skill.have})`);
  reset();
  engine.markLessonDone(T);
  for (const it of K.slice(0, 6)) put(it.id, 'quiz', 1);
  for (const it of S.slice(0, 2)) put(it.id, 'practice', 1, { hints: 4 });
}
// then solved on their own, again and again: recent work outweighs the shown answers
for (let r = 0; r < 2; r++) for (const it of S.slice(0, 2)) put(it.id, 'practice', 1, { hints: 0 });
v = mastery.topicView(T);
ok(v.stage === 'competent', `hands-on tasks solved with little help: Competent (${v.stage})`);
ok(v.next.some((n) => n.dim === 'application') && v.next.some((n) => n.dim === 'independence'), 'Competent says what Independent needs: real problems, and no help');

// application but a challenge done with a hint: still not independent
for (const it of A.slice(0, 2)) put(it.id, 'quiz', 1);
put(CH.id, 'challenge', 1, { hints: 1 });
v = mastery.topicView(T);
ok(v.dims.application.state === 'shown' && v.dims.independence.state !== 'shown' && v.stage === 'competent', 'a challenge solved with a hint is not "without help"');

// a challenge right only on the second check is not independent either
reset();
engine.markLessonDone(T);
for (const it of K.slice(0, 4)) put(it.id, 'quiz', 1);
for (const it of S.slice(0, 2)) put(it.id, 'practice', 1);
for (const it of A.slice(0, 2)) put(it.id, 'quiz', 1);
put(CH.id, 'challenge', 0.4);
put(CH.id, 'challenge', 1);
ok(mastery.topicView(T).dims.independence.state !== 'shown', 'a challenge right on the second check does not count as working alone');
// first check, no hints: independent
put('cap-retail:s2', 'project', 1, { topic: 'xl-xlookup', concept: 'xlookup' });
v = mastery.topicView(T);
ok(v.stage === 'independent', `an open task solved first time with no hints: Independent (${v.stage})`);
ok(v.stage !== 'strong', 'one good week is not Strong');

// Strong needs it to last: everything else in place, but all on one day
reset();
for (const it of K.slice(0, 4)) put(it.id, 'quiz', 1, { daysAgo: 1 });
for (const it of S.slice(0, 2)) put(it.id, 'practice', 1, { daysAgo: 1 });
for (const it of A.slice(0, 2)) put(it.id, 'quiz', 1, { daysAgo: 1 });
put(CH.id, 'challenge', 1, { daysAgo: 1 });
put('cap-retail:s2', 'project', 1, { topic: T, concept: 'xlookup', daysAgo: 1 });
v = mastery.topicView(T);
ok(v.stage === 'independent' && v.next.some((n) => /days/.test(n.text)), `all of it in one sitting is Independent, not Strong: it has to last (${v.stage})`);
reset();
for (const [i, it] of K.slice(0, 4).entries()) put(it.id, 'quiz', 1, { daysAgo: 20 - i });
for (const [i, it] of S.slice(0, 2).entries()) put(it.id, 'practice', 1, { daysAgo: 12 - i });
for (const it of A.slice(0, 2)) put(it.id, 'quiz', 1, { daysAgo: 5 });
put(CH.id, 'challenge', 1, { daysAgo: 4 });
put('cap-retail:s2', 'project', 1, { topic: T, concept: 'xlookup', daysAgo: 1 });
v = mastery.topicView(T);
ok(v.stage === 'strong', `two open tasks alone, success over three weeks, recent answers right, nothing open: Strong (${v.stage})`, JSON.stringify(v.next));
store.run('INSERT INTO mistakes (ts, item_id, topic_id, skill_id, concept, label) VALUES (?,?,?,?,?,?)', [new Date().toISOString(), K[0].id, T, 'excel', K[0].concept, 'x']);
ok(mastery.topicView(T).stage === 'independent', 'an open mistake holds Strong back');

// an idea with no hands-on tasks is not blocked by skill, but "without help" is never assumed
section('what the content cannot test');
{
  const g = mastery.judge(null, { knowledge: 3, skill: 0, application: 3, independence: 0 });
  ok(g.dims.skill.state === 'na' && g.dims.independence.state === 'na', 'dimensions the content has nothing for are "not applicable"');
  const all = mastery.availability();
  const stuck = Object.entries(all.byComp).filter(([, a]) => !a.independence).map(([k]) => k);
  ok(!stuck.length, 'every ability has at least one open task, so every one can reach Independent', stuck.join(', '));
}

// ================================================================ abilities and skills
section('abilities and skills');
reset();
{
  const sk = mastery.skillView('excel');
  ok(sk.competencies.length === 7 && sk.stage === 'none', 'a skill with no evidence is not started, with its seven abilities');
  const c = mastery.competencyView('c-xl-lookup');
  ok(c && c.topics.includes('xl-xlookup'), 'an ability knows the topics that teach it');
  for (const it of K.slice(0, 4)) put(it.id, 'quiz', 1);
  for (const it of S.slice(0, 2)) put(it.id, 'practice', 1);
  ok(mastery.competencyView('c-xl-lookup').stage === 'competent', 'topic evidence reaches the ability through the concepts');
  ok(mastery.skillView('excel').stage !== 'competent', 'one strong ability does not make the skill strong');
}

// ================================================================ adaptive difficulty
section('adaptive difficulty');
reset();
{
  for (const it of K.slice(0, 3)) put(it.id, 'quiz', 1);
  let a = adaptFor(T);
  ok(a.mode === 'step-up' && a.target > 1.8, `three right in a row: step up (${a.mode}, target ${a.target})`);
  put(S[0].id, 'practice', 0); put(S[1].id, 'practice', 0.2);
  a = adaptFor(T);
  ok(a.mode === 'step-back' && a.prefer.knowledge > 1 && a.guidance === 'full', `two of the last three wrong: step back to the ideas, help on hand (${a.mode})`);
  reset();
  for (const it of K.slice(0, 4)) put(it.id, 'quiz', 1);
  for (const it of S.slice(0, 2)) put(it.id, 'practice', 1, { hints: 1 });
  put(A[0].id, 'quiz', 0); put(A[1].id, 'quiz', 1); put(A[0].id, 'quiz', 0);
  put(K[0].id, 'quiz', 1);
  a = adaptFor(T);
  ok(a.mode === 'apply' && a.prefer.application > 2, `syntax known, business use not: scenario questions (${a.mode})`);
  // the draw really follows it
  const none = new Set();
  const app = engine.questionWeight(A[0], undefined, none, none, none, 50, Date.now(), a);
  const know = engine.questionWeight({ ...K[0], difficulty: A[0].difficulty }, undefined, none, none, none, 50, Date.now(), a);
  ok(app.w > know.w * 3, `in apply mode a scenario question is far more likely than an idea question (${app.w.toFixed(2)} vs ${know.w.toFixed(2)})`);
  const plain = engine.questionWeight(A[0], undefined, none, none, none, 50, Date.now());
  ok(plain.w > 0 && Math.abs(plain.w - engine.questionWeight(A[0], undefined, none, none, none, 50, Date.now(), null).w) < 1e-9, 'without adaptive advice the weighting is unchanged');
  // guidance steps back once guided tasks are solved without help
  reset();
  put(S[0].id, 'practice', 1, { hints: 1 }); put(S[1].id, 'practice', 1, { hints: 1 });
  ok(adaptFor(T).guidance === 'light', 'guided tasks solved with a little help: hints open after the first check');
  reset();
  put(S[0].id, 'practice', 1); put(S[1].id, 'practice', 1);
  ok(adaptFor(T).guidance === 'none', 'guided tasks solved with no help: hints wait for the second check');
  reset();
  ok(adaptFor(T).guidance === 'full' && adaptFor(T).mode === 'steady', 'a new topic: full help, no change of course');
}

// ================================================================ reasoning rubric
section('reasoning in a written answer');
{
  const spec = { figures: [6.03, 3.01, 1.51], question: [['airport'], ['usage', 'unexplained', 'portion']], overclaims: ['stealing'] };
  const good = 'Unexplained usage at the Airport rose from 3.0% to 6.0% of recipe usage, while Downtown stayed at 1.5%. Logged waste does not account for it, so the gap is likely portions or unrecorded use. The data cannot tell us which, so I recommend weighing plates for a week and counting stock weekly.';
  const bad = 'The Airport chefs are definitely stealing food and should be fired.';
  const dg = detectReasoning(good, spec), db = detectReasoning(bad, spec);
  ok(dg.every((d) => d.detected), 'a careful answer shows all six qualities', dg.filter((d) => !d.detected).map((d) => d.id).join(','));
  ok(db.find((d) => d.id === 'supported').warning && !db.find((d) => d.id === 'supported').detected, 'an unsupported claim is flagged by name');
  ok(scoreReasoning(dg) === 1 && scoreReasoning(db) < 0.4, `scores: careful 100%, unsupported low (${Math.round(scoreReasoning(db) * 100)}%)`);
  const ticked = scoreReasoning(db, db.map(() => true));
  ok(ticked < 0.7, `ticking every box over a poor answer still scores low (${ticked.toFixed(2)})`);
  ok(numbersIn('about 3.17m and 12.1% of 2,876,810').map((n) => n.value).join('|') === '3170000|12.1|2876810', 'numbers are read the way people write them');
}

// ================================================================ Real Analyst grading
section('grading a tool choice and a judgement');
{
  const part = content.analystMap['tc-one-off-roster'].parts[0];
  const xl = gradeTools(part, { tools: ['excel'], why: 'One file, never repeated, needed this afternoon, only 900 rows.' });
  const pq = gradeTools(part, { tools: ['pq'], why: 'Every step recorded and it copes with the volume; the question could come back.' });
  ok(xl.score === 1 && pq.score === 1, 'two different tools can both be fully right');
  const weak = gradeTools(part, { tools: ['sql'], why: 'because' });
  ok(weak.score <= 0.2, `a weak choice scores low (${weak.score})`);
  const mixed = gradeTools(part, { tools: ['excel', 'sql'], why: 'Rows and deadline decided it.' });
  ok(mixed.score < 1 && mixed.score > weak.score, `adding a weak tool to a good one costs marks (${mixed.score})`);
  const bare = gradeTools(part, { tools: ['excel'], why: '' });
  ok(bare.score < xl.score, 'a right choice without reasons scores less than one that says why');
  ok(xl.tools.every((t) => t.ratings.length === 6), 'every tool is rated on correctness, scalability, repeatability, clarity, volume and need');
  const sel = content.analystMap['ra-invoices'].parts.find((p) => p.id === 'issues');
  const right = sel.options.map((o, i) => (o.right ? i : -1)).filter((i) => i >= 0);
  ok(gradeSelect(sel, right).score === 1 && gradeSelect(sel, sel.options.map((_, i) => i)).score < 1 && gradeSelect(sel, right.slice(0, 2)).score === 0.5, 'picking data problems: exact 100%, everything less, half found 50%');
  const sc = content.analystMap['ra-two-revenues'].parts.find((p) => p.id === 'scope');
  ok(gradeScope(sc, 0).score === 1 && gradeScope(sc, 1).score === 0.5, 'a reading of the request that is partly right gets partial credit');
}

// ================================================================ Real Analyst: the service
section('Real Analyst work, part by part');
reset();
{
  const task = content.analystMap['ra-dairy'];
  let t = analyst.clientTask(task);
  ok(t.parts.length === 1 && t.totalParts === 3 && t.state === 'not-started', 'a task opens with only its first part');
  ok(!JSON.stringify(t).includes('"verdict"') && !JSON.stringify(t).includes('Dairy Valley'), 'nothing in the task gives an answer away');
  let refused = null;
  try { analyst.checkPart('ra-dairy', 'find', { answer: ['2026-05'] }); } catch (e) { refused = e.status; }
  ok(refused === 409, 'a later part cannot be checked before the earlier ones');
  const r1 = analyst.checkPart('ra-dairy', 'tools', { answer: { tools: ['excel'], why: 'Small enough to do by hand, and finance can follow a pivot.' } });
  ok(r1.result.score > 0.5 && r1.task.parts.length === 2, 'checking the approach opens the next part');
  try { analyst.checkPart('ra-dairy', 'tools', { answer: { tools: ['sql'], why: 'x' } }); refused = null; } catch (e) { refused = e.status; }
  ok(refused === 409, 'a choice is final once checked');
  const exp = task.parts.find((p) => p.id === 'find').expected;
  const r2 = analyst.checkPart('ra-dairy', 'find', { answer: exp.map(String) });
  ok(r2.result.score === 1, 'findings that match the data are right');
  const att = store.get("SELECT topic_id, concept, source FROM attempts WHERE item_id = 'ra-dairy:find'");
  ok(att && att.topic_id === 'xl-pivots' && att.source === 'analyst', `findings count towards the tool chosen (Excel → ${att?.topic_id})`);
  const text = 'Dairy Valley raised its prices by about 8.3% from May compared with April, so pizzas cost more to make. Against April prices that cost roughly $8,365 from May to August. I would ask them for a quote and compare another dairy supplier, because this is likely to last.';
  const r3 = analyst.checkPart('ra-dairy', 'conclude', { answer: text });
  ok(r3.result.score === null && r3.result.reasoning.length === 6 && r3.task.state !== 'completed', 'a written answer first comes back for its self-check');
  const r4 = analyst.checkPart('ra-dairy', 'conclude', { answer: text, ticks: { reasoning: r3.result.reasoning.map((x) => x.detected), points: r3.result.points.map((x) => x.detected) } });
  ok(r4.task.state === 'completed' && r4.task.summary && r4.task.summary.criteria.length >= 5 && r4.task.summary.debrief, 'with the self-check saved the task is done, with a criteria profile and a debrief');
  try { analyst.checkPart('ra-dairy', 'find', { answer: exp.map(String) }); refused = null; } catch (e) { refused = e.status; }
  ok(refused === 409, 'once a later part is checked, earlier findings are final');
  ok(analyst.results().some((x) => x.task.id === 'ra-dairy'), 'the finished task is part of the learner\'s results');
  // independence: the analyst parts were first tries with no hints
  ok(mastery.evidence().bySkill.excel?.independence.solved.has('ra-dairy:find'), 'a Real Analyst finding right first time counts as working alone');
}

section('mixed assessments arrive on their own');
reset();
{
  let s = analyst.assessmentStatus();
  ok(!s.due && /more checked answers/.test(s.why), 'a new learner has no assessment yet, and is told why');
  const pool = Object.values(content.items).filter((i) => i.source === 'quiz').slice(0, 45);
  pool.forEach((it, i) => put(it.id, 'quiz', 1, { skill: i % 2 ? 'excel' : 'sql' }));
  s = analyst.assessmentStatus();
  ok(s.due && s.taskId, `after practice in two skills one arrives (${s.taskId})`);
  // the one offered is on data the learner has not used
  const used = content.analystMap[s.taskId].data.datasets;
  ok(used.every((d) => !Object.values(content.items).some((i) => i.dataset === d && store.get('SELECT 1 AS x FROM attempts WHERE item_id = ?', [i.id]))), 'it is on data the learner has not worked with');
}

// ================================================================ milestones
section('milestones');
reset();
{
  // a lot of quiz work in Excel, all right: no milestone
  const xlQuiz = Object.values(content.items).filter((i) => i.skill === 'excel' && i.source === 'quiz');
  xlQuiz.slice(0, 150).forEach((it, i) => put(it.id, 'quiz', 1, { daysAgo: 30 - (i % 10) }));
  for (const t of content.topics.filter((x) => x.skill === 'excel')) engine.markLessonDone(t.id);
  let m = milestones();
  ok(m.achieved === 0, 'every Excel lesson read and 150 quiz answers right: no milestone');
  const xa = m.list.find((x) => x.id === 'excel-analyst');
  ok(xa.requirements.some((r) => !r.met && /solved on the first check/.test(r.label)), 'what is missing is named: work solved alone');

  // demonstrated work across abilities, days and open tasks: Excel Analyst
  let day = 25;
  for (const id of ['c-xl-lookup', 'c-xl-summarise', 'c-xl-formulas', 'c-xl-conditions']) {
    const concepts = new Set(COMPETENCY_MAP[id].concepts);
    const mine = Object.values(content.items).filter((i) => concepts.has(i.concept) && i.source !== 'placement');
    const k = mine.filter((i) => dimOf(i) === 'knowledge').slice(0, 3);
    const s2 = mine.filter((i) => dimOf(i) === 'skill' && i.source !== 'tryit').slice(0, 2);
    const a2 = mine.filter((i) => dimOf(i) === 'application' && i.source !== 'challenge').slice(0, 2);
    const ch = mine.filter((i) => i.source === 'challenge').slice(0, 1);
    for (const it of [...k, ...s2, ...a2]) put(it.id, it.source === 'practice' ? 'practice' : 'quiz', 1, { daysAgo: day });
    for (const it of ch) put(it.id, 'challenge', 1, { daysAgo: day - 1 });
    day -= 5;
  }
  m = milestones();
  const got = m.list.find((x) => x.id === 'excel-analyst');
  ok(got.achieved && m.awarded.includes('excel-analyst'), 'four abilities shown, two on their own, across days: Excel Analyst is awarded', JSON.stringify(got.requirements.map((r) => [r.label.slice(0, 40), r.have, r.need, r.met])));
  // a bad week does not take it away
  xlQuiz.slice(0, 12).forEach((it) => put(it.id, 'quiz', 0));
  ok(milestones().list.find((x) => x.id === 'excel-analyst').achieved, 'a milestone, once earned, is kept');
  store.run('DELETE FROM attempts');
  const after = milestones().list.find((x) => x.id === 'excel-analyst');
  ok(after.achieved && after.requirements.some((r) => !r.met), 'it is kept even when today\'s evidence would no longer earn it');
  ok(!milestones().list.find((x) => x.id === 'integrated-analyst').achieved, 'Integrated Data Analyst needs Real Analyst work, an assessment and projects, not one skill');
}

// ================================================================ cold start: basics first, ambition once there is evidence
section('cold start: a brand-new learner');
{
  reset();
  store.run('DELETE FROM daily_plan');
  store.run('UPDATE profile SET onboarded = 1, placement_json = ? WHERE id = 1', [JSON.stringify({ skipped: true, roadmap: {}, startSkill: 'excel' })]);
  ok(engine.learnerPhase().phase === 'new', 'nothing answered yet: the learner is new');
  const xl = content.topicMap['xl-basics'];
  put(xl.quiz[0].id, 'quiz', 1);
  const cal = engine.learnerPhase();
  ok(cal.phase === 'calibrating' && cal.answers === 1 && cal.needed === 25, 'after the first answers: getting to know the learner (1 of 25)', JSON.stringify(cal));
  xl.quiz.slice(1, 25).forEach((it) => put(it.id, 'quiz', 1));
  ok(engine.learnerPhase().phase === 'personalized', 'after 25 checked answers the adaptive rules take over');
}
{
  // quizzes: a topic whose bank is mostly harder questions
  reset();
  const topic = content.topicMap['xl-xlookup'];
  const hard = (items) => items.filter((i) => (i.difficulty || 2) > 2).length;
  const bankHard = hard(topic.quiz) / topic.quiz.length;
  const draw = (n) => {
    let h = 0; let tot = 0; let app = 0;
    for (let i = 0; i < n; i++) {
      const q = engine.drawQuiz([{ topic }], 6, { mark: false, generated: false });
      tot += q.length; h += hard(q); app += q.filter((it) => dimOf(it) === 'application').length;
    }
    return { share: h / tot, app: app / tot };
  };
  ok(adaptFor(topic.id).coldStart === true, 'a topic with no answers is in cold start');
  const cold = draw(40);
  ok(bankHard > 0.3 && cold.share < 0.15, `first quizzes stay basic: ${Math.round(cold.share * 100)}% harder questions drawn, although ${Math.round(bankHard * 100)}% of the bank is harder`);
  topic.quiz.filter((i) => (i.difficulty || 2) <= 2).slice(0, 3).forEach((it) => put(it.id, 'quiz', 1));
  const a = adaptFor(topic.id);
  ok(a.mode === 'step-up' && !a.coldStart, 'three right in a row ends cold start at once (step-up)', JSON.stringify({ mode: a.mode, coldStart: a.coldStart }));
  const warm = draw(40);
  ok(warm.share > 0.3 && warm.share > cold.share * 3, `...and harder questions then arrive: ${Math.round(warm.share * 100)}% (was ${Math.round(cold.share * 100)}%). Sequencing, not a lower ceiling`);
  ok(warm.app > cold.app, `business situations come in as evidence grows (${Math.round(cold.app * 100)}% -> ${Math.round(warm.app * 100)}%)`);
  reset();
  topic.quiz.slice(0, 6).forEach((it, i) => put(it.id, 'quiz', i % 2 ? 1 : 0));
  ok(!adaptFor(topic.id).coldStart, 'six answers in a topic are enough evidence: cold start is over, whatever the results');
}
{
  // today's plan: no random challenge on day one, and an honest reason
  reset();
  store.run('DELETE FROM daily_plan');
  const plan = engine.todayPlan(true);
  ok(!plan.steps.some((st) => st.key === 'challenge'), "a brand-new learner's first plan has no challenge (it used to add an Analyst Thinking challenge picked by the date)", JSON.stringify(plan.steps.map((st) => [st.key, st.itemId])));
  ok(/Start here/.test(plan.reason) && !/assessment showed/.test(plan.reason), 'a skipped assessment is not given as the reason', plan.reason);
  const thinkChallenges = new Set(content.topics.filter((t) => t.skill === 'think' && t.challenge).map((t) => t.challenge.id));
  const planned = plan.steps.flatMap((st) => [st.itemId, ...(st.itemIds || [])]).filter(Boolean);
  ok(!planned.some((id) => thinkChallenges.has(id)), 'nothing from Analyst Thinking challenges on day one');
  const first = content.items[plan.steps.find((st) => st.key === 'practice')?.itemId];
  ok(first && (first.difficulty || 2) <= 2, 'the first practice task is an easy one', JSON.stringify(first && [first.id, first.difficulty]));
  const qi = engine.quickItem();
  ok(qi && qi.topicId === engine.focus().topicId && (qi.difficulty || 2) <= 2, 'quick practice for a new learner: the current topic, an easier question', JSON.stringify(qi && [qi.id, qi.topicId, qi.difficulty]));
}
{
  // Real Analyst: suggested when the learner is ready, never locked
  reset();
  let r = analyst.readiness();
  ok(!r.ready && /deep end/.test(r.why || ''), 'a new learner is not pointed at Real Analyst work, and is told why in plain words', JSON.stringify(r));
  content.topicMap['xl-basics'].quiz.slice(0, 25).forEach((it) => put(it.id, 'quiz', 1));
  r = analyst.readiness();
  ok(!r.ready && /business challenge/.test(r.why || ''), '25 answers are not enough on their own: a first business challenge is needed too', JSON.stringify(r));
  const ch = content.topics.find((t) => t.skill === 'excel' && t.challenge).challenge;
  put(ch.id, 'challenge', 1);
  ok(analyst.readiness().ready, 'with a challenge solved, Real Analyst work is suggested');
  ok(analyst.listTasks().tasks.length > 0, 'the Real Analyst tasks stay available the whole time (suggested, not locked)');
}
{
  // Power BI from zero
  reset();
  const path = content.topics.filter((t) => t.skill === 'pbi').map((t) => t.id);
  ok(engine.nextTopicInSkill('pbi')?.id === 'pbi-intro', 'Power BI starts at "What Power BI is"');
  const at = (id) => path.indexOf(id);
  ok(at('pbi-import') < at('pbi-model') && at('pbi-model') < at('pbi-visuals') && at('pbi-visuals') < at('pbi-reports') && at('pbi-reports') < at('pbi-star') && at('pbi-reports') < at('pbi-dax'),
    'Power BI path: what it is, getting data in, how tables connect, a first simple report, and only then star schemas and DAX', path.join(' > '));
  const intro = content.topicMap['pbi-intro'];
  const qs = []; for (let i = 0; i < 20; i++) qs.push(...engine.drawQuiz([{ topic: intro }], 6, { mark: false, generated: false }));
  ok(qs.filter((q) => (q.difficulty || 2) > 2).length / qs.length < 0.1, 'a first Power BI quiz stays introductory (DAX and Import-vs-DirectQuery wait)');
}

store.flushNow();
fs.rmSync(dir, { recursive: true, force: true });
console.log(`\n${pass}/${pass + failures.length} checks passed.`);
if (failures.length) { console.log('Failed:\n - ' + failures.join('\n - ')); process.exit(1); }
process.exit(0);
