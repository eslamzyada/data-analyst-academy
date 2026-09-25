// Data Analyst Academy - local server. Serves the app and a small JSON API.
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { exec } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as store from './store.js';
import * as workstate from './workstate.js';
import * as activity from './activity.js';
import * as quizsessions from './quizsessions.js';
import { OUTCOME, isRecordable, outcomeOf } from '../shared/lifecycle.js';
import { loadContent, content, clientItem, getItem, toStoredAnswer, toShownAnswer, shownExplain } from './content/index.js';
import * as engine from './engine.js';
import { initSqlRunner, runSql } from './sqlrunner.js';
import { gradeSql, expectedResult } from './grading/sql.js';
import { gradeFormula, evaluate, setEvaluatorForTests, clearFormulaCache } from './grading/formula.js';
import { readAnswerCells, gradeParts } from './grading/excel.js';
import { autoCheck } from './grading/text.js';
import { answerMatches, textMatches, numbersMatch } from './grading/values.js';
import { previewDataset } from './datasets.js';
import { gradeSelect, gradeTools, TOOLS, TOOL_CRITERIA } from './grading/analyst.js';
import { detectReasoning, scoreReasoning, REASONING } from './grading/reasoning.js';
import { criteriaProfile, CRITERIA } from './content/criteria.js';
import * as mastery from './mastery.js';
import * as analyst from './analyst.js';
import { PLACEMENT_TOOLS, PLACEMENT_STAGES } from './content/placement.js';
import { COMPETENCY_MAP, CONCEPT_COMPETENCY } from './content/competencies.js';
import { adaptFor, guidanceNote } from './adaptive.js';
import { milestones } from './milestones.js';
import { guardServerDataDir } from './safety.js';

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = process.env.ACADEMY_DATA ? path.resolve(process.env.ACADEMY_DATA) : path.join(APP, 'data');
// a test run must never open the learner's real progress
{
  const refused = guardServerDataDir(DATA);
  if (refused) { console.error(refused); process.exit(2); }
}
const ASSETS = path.join(APP, 'data'); // practice databases + downloadable files ship with the app
const PORT = Number(process.env.PORT || 7700);
const OPEN = process.argv.includes('--open');
// 127.0.0.1 (not "localhost"): Windows sometimes tries IPv6 first, which this server doesn't listen on
const URL_ = `http://127.0.0.1:${PORT}`;

function openBrowser() {
  if (process.platform === 'win32') exec(`start "" "${URL_}"`);
  else if (process.platform === 'darwin') exec(`open ${URL_}`);
  else exec(`xdg-open ${URL_}`);
}

// If the academy is already running, just open it again.
async function alreadyRunning() {
  return new Promise((resolve) => {
    const req = http.get(`${URL_}/api/health`, { timeout: 800 }, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => resolve(body.includes('data-analyst-academy')));
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

if (await alreadyRunning()) {
  console.log(`Data Analyst Academy is already running at ${URL_}`);
  if (OPEN) openBrowser();
  process.exit(0);
}

fs.mkdirSync(DATA, { recursive: true });
await store.openStore(DATA);
loadContent(ASSETS);
initSqlRunner(path.join(ASSETS, 'practice'));
// quizzes saved by earlier versions become quiz attempts (once), so none is lost or reset
{
  const imported = quizsessions.importLegacyQuizzes();
  if (imported) { store.flushIfDirty(); console.log(`Kept ${imported} quiz(zes) saved by the previous version.`); }
}

const app = express();
app.use(express.json({ limit: '2mb' }));
// Every change is on disk before the app answers. What the learner sees as done (a checked answer,
// a finished quiz, a completed lesson) then survives even the app being killed a moment later.
app.use((req, res, next) => {
  const send = res.json.bind(res);
  res.json = (body) => {
    try { store.flushIfDirty(); } catch (e) { console.error(`Could not write progress to disk: ${e.message}`); }
    return send(body);
  };
  next();
});

const wrap = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch((e) => {
  console.error(e);
  res.status(e && e.status ? e.status : 500).json({ error: String(e.message || e) });
});
const nowIso = () => new Date().toISOString();

function profile() {
  const p = store.get('SELECT * FROM profile WHERE id = 1');
  return { name: p.name, onboarded: !!p.onboarded, placement: p.placement_json ? JSON.parse(p.placement_json) : null, lastActivity: p.last_activity_json ? JSON.parse(p.last_activity_json) : null };
}

function topicCard(t) {
  const s = engine.topicStatus(t);
  const v = mastery.topicView(t.id);
  return { id: t.id, title: t.title, summary: t.summary, skill: t.skill, level: t.level, minutes: t.minutes, prereqs: (t.prereqs || []).map((p) => content.topicMap[p]?.title), ...s,
    stage: v.stage, stageLabel: v.stageLabel };
}

/** A topic's stage with its four kinds of evidence and what would move it up. */
function topicMasteryPayload(t) {
  const v = mastery.topicView(t.id);
  const a = adaptFor(t.id, v);
  return { stage: v.stage, stageLabel: v.stageLabel, meaning: v.meaning, next: v.next,
    dims: Object.fromEntries(mastery.DIMENSIONS.map((d) => [d, { label: mastery.DIMENSION_LABEL[d], ...v.dims[d] }])),
    adapt: a ? { mode: a.mode, message: a.message, guidance: a.guidance } : null };
}

function skillSummary(sk) {
  const topics = content.topics.filter((t) => t.skill === sk.id);
  const next = engine.nextTopicInSkill(sk.id);
  const mv = mastery.skillView(sk.id);
  return {
    id: sk.id, name: sk.name, blurb: sk.blurb, color: sk.color, levels: sk.levels,
    masteryStage: mv.stage, masteryStageLabel: mv.stageLabel, masterySummary: mv.summary,
    progress: engine.skillProgress(sk.id), stage: engine.skillStage(sk.id),
    topics: topics.length, mastered: topics.filter((t) => engine.topicStatus(t).status === 'mastered').length,
    next: next ? { id: next.id, title: next.title } : null,
  };
}

// ------------------------------------------------------------------ basics
app.get('/api/health', (req, res) => res.json({ app: 'data-analyst-academy', ok: true }));

app.get('/api/home', wrap((req, res) => {
  const p = profile();
  const f = engine.focus();
  const topic = content.topicMap[f.topicId];
  const practice = engine.pickPractice(topic);
  const lvl = engine.currentLevel();
  const plan = store.get('SELECT plan_json, done_json FROM daily_plan WHERE day = ?', [new Date().toLocaleDateString('en-CA')]);
  res.json({
    profile: p, level: lvl, overall: engine.overallProgress(),
    skills: content.skills.map(skillSummary),
    focus: { ...f, topic: topicCard(topic), skillName: content.skillMap[topic.skill].name },
    practice: practice ? clientItem(practice) : null,
    mistakes: engine.openMistakes(4),
    reviewsDue: engine.dueReviews().slice(0, 4).map((t) => ({ id: t.id, title: t.title })),
    today: plan ? (() => { const x = planWithStates(engine.todayPlan()); return { steps: x.steps.length, done: x.steps.filter((st) => st.done).length }; })() : null,
    unfinished: unfinishedLinks(6),
    milestones: (() => { const m = milestones(); return { achieved: m.achieved, total: m.list.length, next: m.next, awarded: m.awarded.map((id) => m.list.find((x) => x.id === id)?.name || id) }; })(),
    analyst: (() => { const l = analyst.listTasks(); const rec = l.tasks.find((t) => t.recommended); return { assessment: l.assessment, readiness: analyst.readiness(), recommended: rec ? { id: rec.id, title: rec.title, levelName: rec.levelName, from: rec.from } : null }; })(),
    phase: engine.learnerPhase(),
    focusAdapt: (() => { const a = adaptFor(topic.id); return a && a.message ? { mode: a.mode, message: a.message } : null; })(),
  });
}));

app.post('/api/profile', wrap((req, res) => {
  const name = String(req.body.name || '').trim().slice(0, 40);
  store.run('UPDATE profile SET name = ? WHERE id = 1', [name || null]);
  res.json(profile());
}));

app.post('/api/activity', wrap((req, res) => {
  const a = req.body || {};
  const place = { path: String(a.path || '/'), label: String(a.label || '').slice(0, 80), at: nowIso() };
  store.run('UPDATE profile SET last_activity_json = ? WHERE id = 1', [JSON.stringify(place)]);
  workstate.saveState('session:place', { route: place.path, label: place.label });
  res.json({ ok: true });
}));

// ------------------------------------------------------------------ saved work in progress
// The client auto-saves here while the learner works; nothing is kept only in the browser.
app.get('/api/state/:key', wrap((req, res) => {
  res.json(workstate.loadState(req.params.key) || { state: null, updatedAt: null });
}));

// POST as well as PUT: sendBeacon (used when the tab is closing) can only POST.
const saveWork = wrap((req, res) => {
  const at = workstate.saveState(req.params.key, req.body && req.body.state);
  res.json({ saved: true, at });
});
app.put('/api/state/:key', saveWork);
app.post('/api/state/:key', express.json({ limit: '2mb', type: () => true }), saveWork);

app.delete('/api/state/:key', wrap((req, res) => {
  workstate.clearState(req.params.key);
  res.json({ ok: true });
}));

/** Quiz attempts that were started and not finished, as links. */
function unfinishedQuizzes() {
  return quizsessions.listSessions({ limit: 30 })
    .filter((q) => !q.finishedAt && !q.dismissedAt && q.answered > 0)
    .map((q) => {
      const [kind, ref] = q.key.split(/:(.*)/);
      const to = kind === 'topic' ? `/quiz/topic/${ref}` : kind === 'today' ? '/today?step=quiz' : '/quiz/review';
      return { key: `quiz-session:${q.id}`, kind: 'Quiz', label: q.title || 'Quiz', detail: `${q.answered} of ${q.itemIds.length} answered`, to, at: q.createdAt };
    });
}

/** Everything unfinished, newest first. */
function unfinishedLinks(limit) {
  return [...workstate.unfinished(30).map(describeWork).filter(Boolean), ...unfinishedQuizzes()]
    .sort((a, b) => String(b.at).localeCompare(String(a.at)))
    .slice(0, limit);
}

/** A saved piece of unfinished work, as a link the learner can follow. */
function describeWork(w) {
  const [kind, ...rest] = w.key.split(':');
  const id = rest.join(':');
  const s = w.state || {};
  if (kind === 'item') {
    const it = getItem(id);
    if (!it || isSessionQuestion(it, s)) return null;
    // solved in an earlier sitting: a newer draft does not make it unfinished
    if (activity.itemState(id) === activity.STATE.COMPLETED) return null;
    const title = it.title || s.title || 'Practice task';
    if (it.source === 'tryit') return { key: w.key, kind: 'Lesson exercise', label: content.topicMap[it.topicId]?.title || title, to: `/topic/${it.topicId}?tab=learn`, at: w.updatedAt };
    return { key: w.key, kind: it.source === 'challenge' ? 'Challenge' : 'Practice', label: title, to: `/task/${id}`, at: w.updatedAt };
  }
  if (kind === 'quiz') {
    const [sub, ref] = rest;
    const answered = Object.keys(s.answers || {}).length;
    const size = (s.ids || []).length;
    const progress = size ? `${answered} of ${size} answered` : null;
    if (sub === 'exam') {
      const exam = content.exams.find((e) => e.id === ref);
      return exam ? { key: w.key, kind: 'Exam', label: exam.title, detail: progress, to: `/exam/${ref}`, at: w.updatedAt } : null;
    }
    return null;
  }
  if (kind === 'project') {
    const p = content.projectMap[id];
    return p ? { key: w.key, kind: 'Project', label: p.title, to: `/projects/${id}`, at: w.updatedAt } : null;
  }
  return null;
}

/** Everything needed to put the learner back where they were. */
app.get('/api/session/resume', wrap((req, res) => {
  res.json({ place: workstate.lastPlace(), unfinished: workstate.unfinished(30).filter((w) => describeWork(w)), links: unfinishedLinks(12) });
}));

// ------------------------------------------------------------------ placement: "what do I already know?"
// Adaptive, one question at a time (see content/placement.js): the learner first says which tools
// they have used; "never" skips a tool. Each tool starts with the basics and goes further only while
// answers are right. "I haven't learned this yet" (answer 'idk') is never recorded as a wrong answer.
const PLACEMENT_ORDER = ['excel', 'sql', 'pq', 'pbi', 'think'];
const AREA_NAME = { excel: 'Excel', sql: 'SQL', pq: 'Power Query', pbi: 'Power BI', think: 'Analyst Thinking' };
const IDK = 'idk';
const placementItem = (id) => content.placement.find((q) => q.id === id);
async function placementRight(q, answer) {
  if (answer === undefined || answer === null || answer === IDK) return false;
  return !!(await gradeSafely(q, toStoredAnswer(q, answer))).correct;
}

/**
 * Walks the check with the answers so far: per area the stages passed, where it stopped, and the
 * next question to ask (or none when the check is complete).
 */
async function placementPlan(selfReport = {}, answers = {}, { finish = false } = {}) {
  const areas = {};
  let next = null;
  let asked = 0;
  for (const area of PLACEMENT_ORDER) {
    const a = { area, name: AREA_NAME[area], reported: selfReport[area] || null, passed: [], stoppedAt: null, skipped: false };
    areas[area] = a;
    if (area !== 'think' && a.reported === 'never') { a.skipped = true; continue; }
    for (const stage of PLACEMENT_STAGES[area]) {
      const qs = stage.ids.map(placementItem);
      const pending = qs.find((q) => !(q.id in answers));
      if (pending && !finish) {
        if (!next) next = { q: pending, area, stage: stage.tier };
        a.pending = true;
        break;
      }
      let right = 0;
      for (const q of qs) if (await placementRight(q, answers[q.id])) right++;
      asked += qs.length;
      if (right >= stage.pass) a.passed.push(stage.tier);
      else { a.stoppedAt = stage.tier; break; }
    }
    if (next) break;
  }
  return { areas, next, asked };
}

const STAGE_WORDS = { Basics: 'the basics', Beginner: 'beginner questions', Intermediate: 'intermediate questions', Advanced: 'advanced questions' };
function roadmapOf(a) {
  const topicTiers = a.passed.filter((t) => t !== 'Basics');
  if (a.skipped) {
    return { start: 'Not started', text: a.area === 'pbi' ? 'Not started yet: begins with "What Power BI is". Nothing to know in advance.' : `New to you: starts at the very first ${a.name} lesson.` };
  }
  if (a.area === 'pbi') {
    return a.passed.includes('Basics')
      ? { start: 'Beginner', text: 'You know what Power BI is for: the first topic is credited, and the path continues with getting data in.' }
      : { start: 'Beginner', text: 'Begins with "What Power BI is".' };
  }
  if (!a.passed.includes('Basics')) return { start: 'Beginner', text: `Starts at the very first ${a.name} lesson.` };
  if (!topicTiers.length) return { start: 'Beginner', text: `You know the basics: starts at the ${a.name} beginner topics.` };
  const tiers = ['Beginner', 'Intermediate', 'Advanced'];
  const lastIdx = tiers.indexOf(topicTiers[topicTiers.length - 1]);
  const start = tiers[Math.min(lastIdx + 1, tiers.length - 1)];
  const text = lastIdx >= tiers.length - 1 || !PLACEMENT_STAGES[a.area].some((s) => s.tier === tiers[lastIdx + 1])
    ? `${topicTiers.join(' and ')} topics credited: they come back as short reviews to confirm them.`
    : `${topicTiers.join(' and ')} topics credited: starts at ${start}. They come back as short reviews to confirm them.`;
  return { start, text };
}

app.get('/api/placement', wrap((req, res) => {
  res.json({ tools: PLACEMENT_TOOLS, version: 2, idk: IDK, questions: content.placement.map(clientItem) });
}));

// the next question, given what the learner said and answered so far (nothing is recorded here)
app.post('/api/placement/next', wrap(async (req, res) => {
  const { areas, next, asked } = await placementPlan(req.body.selfReport || {}, req.body.answers || {});
  if (!next) return res.json({ done: true, asked });
  res.json({
    done: false, number: Object.keys(req.body.answers || {}).length + 1,
    area: next.area, areaName: AREA_NAME[next.area], stage: next.stage, stageWords: STAGE_WORDS[next.stage],
    question: { ...clientItem(next.q), idkLabel: "I haven't learned this yet" },
    // the tools in order, with where the check is: done, now, still to come, or skipped
    areas: PLACEMENT_ORDER.map((id) => ({ area: id, name: AREA_NAME[id],
      state: id !== 'think' && (req.body.selfReport || {})[id] === 'never' ? 'skipped' : id === next.area ? 'now' : areas[id] ? 'done' : 'later' })),
  });
}));

app.post('/api/placement', wrap(async (req, res) => {
  const selfReport = req.body.selfReport || {};
  const answers = req.body.answers || {};
  const { areas } = await placementPlan(selfReport, answers, { finish: true });
  const results = [];
  // only real answers are evidence; "I haven't learned this yet" and unasked questions are not
  for (const [id, answer] of Object.entries(answers)) {
    const q = placementItem(id);
    if (!q || answer === IDK || answer === null || answer === undefined) continue;
    const correct = await placementRight(q, answer);
    results.push({ id, correct });
    engine.recordAttempt({ itemId: q.id, topicId: null, skillId: q.area, source: 'placement', rawScore: correct ? 1 : 0, concept: q.concept, noMistake: true });
  }
  const roadmap = {};
  const roadmapText = {};
  const passed = {};
  for (const a of Object.values(areas)) {
    const r = roadmapOf(a);
    roadmap[a.area] = r.start;
    roadmapText[a.area] = r.text;
    passed[a.area] = a.passed.filter((t) => t !== 'Basics');
    // a small starting credit (capped at 30% per topic) for every tier passed; its topics open,
    // and so does the next tier's
    const credited = a.area === 'pbi'
      ? (a.passed.includes('Basics') ? content.topics.filter((t) => t.id === 'pbi-intro') : [])
      : content.topics.filter((t) => t.skill === a.area && passed[a.area].includes(t.level));
    for (const t of credited) {
      engine.recordAttempt({ itemId: `placement:${t.id}`, topicId: t.id, skillId: a.area, source: 'placement', rawScore: 1, noMistake: true });
      engine.unlockTopic(t.id);
    }
    const tiers = ['Beginner', 'Intermediate', 'Advanced'];
    const last = passed[a.area][passed[a.area].length - 1];
    if (last) for (const t of content.topics.filter((x) => x.skill === a.area && x.level === tiers[tiers.indexOf(last) + 1])) engine.unlockTopic(t.id);
  }
  // credited topics come back as short review questions over the next days
  engine.schedulePlacementReviews(content.topics.filter((t) => (passed[t.skill] || []).includes(t.level)).map((t) => t.id));
  const score = (area) => {
    const mine = results.filter((r) => placementItem(r.id).area === area);
    return mine.length ? mine.filter((r) => r.correct).length / mine.length : 0;
  };
  // start with the first core tool whose beginner topics are not yet credited (Excel for a newcomer),
  // otherwise with the weakest of the three
  const core = ['excel', 'sql', 'pq'];
  const startSkill = core.find((a) => !passed[a].includes('Beginner')) || core.slice().sort((a, b) => score(a) - score(b))[0];
  const placement = { at: nowIso(), version: 2, selfReport, roadmap, roadmapText, passed, startSkill,
    scores: Object.fromEntries(PLACEMENT_ORDER.map((a) => [a, score(a)])), results };
  store.run('UPDATE profile SET onboarded = 1, placement_json = ? WHERE id = 1', [JSON.stringify(placement)]);
  const start = engine.nextTopicInSkill(startSkill);
  res.json({ ...placement, startTopic: start ? { id: start.id, title: start.title, skill: content.skillMap[startSkill].name } : null });
}));

app.post('/api/placement/skip', wrap((req, res) => {
  const first = (name) => `Starts at the very first ${name} lesson.`;
  const placement = { at: nowIso(), skipped: true, roadmap: { excel: 'Beginner', sql: 'Beginner', pq: 'Beginner', think: 'Beginner', pbi: 'Not started' },
    roadmapText: { excel: first('Excel'), sql: first('SQL'), pq: first('Power Query'), think: first('Analyst Thinking'), pbi: 'Not started yet: begins with "What Power BI is".' }, startSkill: 'excel' };
  store.run('UPDATE profile SET onboarded = 1, placement_json = ? WHERE id = 1', [JSON.stringify(placement)]);
  res.json(placement);
}));

// ------------------------------------------------------------------ learning path
app.get('/api/skills', wrap((req, res) => res.json(content.skills.map(skillSummary))));

app.get('/api/skills/:id', wrap((req, res) => {
  const sk = content.skillMap[req.params.id];
  if (!sk) return res.status(404).json({ error: 'Unknown skill' });
  const topics = content.topics.filter((t) => t.skill === sk.id).map(topicCard);
  const next = engine.nextTopicInSkill(sk.id);
  res.json({ ...skillSummary(sk), path: topics, recommended: next ? next.id : null });
}));

app.get('/api/topics/:id', wrap((req, res) => {
  const t = content.topicMap[req.params.id];
  if (!t) return res.status(404).json({ error: 'Unknown topic' });
  const steps = activity.topicSteps(t);
  const stateOf = Object.fromEntries(steps.map((x) => [x.itemId || x.key, x.state]));
  const solved = new Set(store.all('SELECT DISTINCT item_id FROM attempts WHERE correct = 1 AND topic_id = ?', [t.id]).map((r) => r.item_id));
  const adapt = adaptFor(t.id);
  const guide = adapt ? { guidance: adapt.guidance, guidanceNote: guidanceNote(adapt.guidance) } : {};
  const practice = (t.practice || []).map((p) => ({ ...clientItem(p), ...guide, solved: solved.has(p.id), status: stateOf[p.id] }));
  const challenge = t.challenge ? { ...clientItem(t.challenge), ...guide, solved: solved.has(t.challenge.id), status: stateOf[t.challenge.id] } : null;
  const lessonStep = steps.find((x) => x.key === 'lesson');
  const quizStep = steps.find((x) => x.key === 'quiz');
  res.json({
    ...topicCard(t), lesson: t.lesson, skillName: content.skillMap[t.skill].name,
    tryIt: clientItem(t.tryIt),
    practice, challenge,
    // the steps of this topic and where each stands (one source of truth for every page)
    checklist: steps.map((x) => ({ key: x.key, label: x.label, status: x.state, stateLabel: x.stateLabel, tab: x.tab, task: x.itemId && x.kind === 'practice' ? x.itemId : null })),
    lessonState: lessonStep.state,
    quizState: quizStep ? quizStep.state : null,
    quizKey: activity.quizKeyForTopic(t.id),
    quizCount: (t.quiz || []).length,
    cards: (t.cards || []).length,
    recommendedPractice: engine.pickPractice(t)?.id || null,
    mistakes: engine.openMistakes(20).filter((m) => m.topicId === t.id),
    next: activity.topicNext(t),
    afterLesson: activity.nextAfter('lesson', t.id),
    afterQuiz: activity.nextAfter('quiz', t.id),
    masteryView: topicMasteryPayload(t),
  });
}));

// Marking a lesson done answers with its new state and the next step, so the page can show both.
app.post('/api/topics/:id/lesson-done', wrap((req, res) => {
  const t = content.topicMap[req.params.id];
  if (!t) return res.status(404).json({ error: 'Unknown topic' });
  engine.markLessonDone(t.id);
  res.json({ ok: true, state: activity.lessonStateOf(t), next: activity.nextAfter('lesson', t.id) });
}));

/** The next step after any activity: ?kind=item|lesson|quiz|project&id=...&ctx=topic|task */
app.get('/api/next', wrap((req, res) => {
  const next = activity.nextAfter(String(req.query.kind || ''), String(req.query.id || ''), req.query.ctx === 'task' ? 'task' : 'topic');
  if (!next) return res.status(404).json({ error: 'Nothing to continue from' });
  res.json({ next });
}));

app.post('/api/topics/:id/unlock', wrap((req, res) => { engine.unlockTopic(req.params.id); res.json({ ok: true }); }));

app.get('/api/topics/:id/quiz', wrap((req, res) => {
  const t = content.topicMap[req.params.id];
  if (!t) return res.status(404).json({ error: 'Unknown topic' });
  res.json({ title: `${t.title} quiz`, items: engine.pickQuiz(t, Number(req.query.n || 6)).map(clientItem) });
}));

// ------------------------------------------------------------------ items: fetch, hints, grading
app.get('/api/items/:id', wrap((req, res) => {
  const it = getItem(req.params.id);
  if (!it) return res.status(404).json({ error: 'Unknown item' });
  const out = clientItem(it);
  // practice tasks and challenges step back their help once guided work is solved without it
  if (['practice', 'challenge'].includes(it.source) && it.topicId) {
    const a = adaptFor(it.topicId);
    if (a) Object.assign(out, { guidance: a.guidance, guidanceNote: guidanceNote(a.guidance) });
  }
  res.json(out);
}));

app.post('/api/items/:id/help', wrap((req, res) => {
  const it = getItem(req.params.id);
  if (!it) return res.status(404).json({ error: 'Unknown item' });
  const level = Number(req.body.level);
  if (level === 1 || level === 2) return res.json({ level, text: (it.hints || [])[level - 1] || 'No more hints for this one. Try the explanation.' });
  if (level === 3) return res.json({ level, text: shownExplain(it, it.explain) || 'Look at the lesson for this topic.' });
  return res.json({ level: 4, text: solutionText(it), answer: revealAnswer(it) });
}));

/** The right answer, as the browser shows it (options in display order). */
function revealAnswer(it) {
  switch (it.type) {
    case 'mc': return { option: toShownAnswer(it, it.answer) };
    case 'multi': return { options: it.answer };
    case 'tf': return { value: it.answer };
    case 'fill': return { text: Array.isArray(it.answer) ? it.answer[0] : it.answer };
    case 'number': return { number: it.answer };
    case 'formula': return { formula: it.answer };
    case 'sql': return { sql: it.answer };
    case 'order': return { order: it.answer };
    case 'numbers': case 'file': return { values: it.expected };
    default: return null;
  }
}
function solutionText(it) {
  if (it.solution) return it.solution;
  if (it.type === 'mc') return `The answer is **${it.options[it.answer]}**.\n\n${shownExplain(it, it.explain) || ''}`;
  if (it.type === 'tf') return `The statement is **${it.answer ? 'true' : 'false'}**.\n\n${it.explain || ''}`;
  if (it.type === 'formula') return `One correct formula:\n\n\`\`\`\n${it.answer}\n\`\`\`\n\n${it.explain || ''}`;
  if (it.type === 'sql') return `One correct query:\n\n\`\`\`sql\n${it.answer}\n\`\`\`\n\n${it.explain || ''}`;
  return it.explain || '';
}

async function gradeItem(it, answer) {
  switch (it.type) {
    case 'mc': return { correct: Number(answer) === it.answer, score: Number(answer) === it.answer ? 1 : 0 };
    case 'multi': {
      const a = new Set((answer || []).map(Number)); const e = new Set(it.answer);
      const ok = a.size === e.size && [...e].every((x) => a.has(x));
      return { correct: ok, score: ok ? 1 : 0 };
    }
    case 'tf': return { correct: answer === it.answer || String(answer) === String(it.answer), score: (answer === it.answer || String(answer) === String(it.answer)) ? 1 : 0 };
    case 'fill': { const ok = textMatches(answer, it.answer); return { correct: ok, score: ok ? 1 : 0 }; }
    case 'number': { const ok = numbersMatch(answer, it.answer, { tolerance: it.tolerance, percent: it.percent }); return { correct: ok, score: ok ? 1 : 0 }; }
    case 'order': { const ok = Array.isArray(answer) && answer.map(Number).join(',') === it.answer.join(','); return { correct: ok, score: ok ? 1 : 0 }; }
    case 'formula': return gradeFormula(it, answer);
    case 'sql': return gradeSql(it, answer);
    case 'numbers': case 'file': {
      const g = gradeParts(it.questions, it.expected, Array.isArray(answer) ? answer : []);
      return { ...g, correct: g.score >= 0.999, feedback: `${g.correct} of ${g.total} answers are right.` };
    }
    case 'open': return { correct: false, score: 0, detected: autoCheck(it.checklist || [], answer), selfCheck: true };
    default: return { correct: false, score: 0 };
  }
}

/**
 * The single way an answer is graded. It never throws: a crash inside a grader becomes an
 * EVALUATION_ERROR result (nothing recorded, nothing marked wrong), and every result carries
 * one explicit `outcome`.
 */
async function gradeSafely(it, answer) {
  let r;
  try {
    r = await gradeItem(it, answer);
  } catch (e) {
    console.error(`grading ${it.id} failed:`, e);
    r = {
      correct: false, score: 0, noMistake: true, needsReview: true, evaluationError: String(e.message || e),
      feedback: 'Something went wrong while checking this answer, so nothing has been marked wrong. Your work is saved. Try checking again.',
    };
  }
  return { ...r, outcome: outcomeOf(r) };
}

function isSessionQuestion(it, body = {}) {
  return ['quiz', 'placement'].includes(it.source) || !!it.generated || ['quiz', 'exam', 'review', 'quick'].includes(body.source);
}

/**
 * Keep the learner's own work next to its result. The client auto-saves as they type; this is
 * the belt-and-braces copy, written on the server the moment an answer is checked.
 */
function rememberItem(it, body, patch) {
  // quiz, exam, review and quick questions are saved as part of their own session, not as tasks
  if (isSessionQuestion(it, body)) return;
  try {
    const prev = (workstate.loadState(`item:${it.id}`) || {}).state || {};
    // merge: the browser's copy may hold more (opened hints, ticks) than this request carries
    workstate.saveState(`item:${it.id}`, {
      ...prev,
      itemId: it.id, topicId: it.topicId || null, title: it.title || prev.title || null,
      answer: body.answer !== undefined ? body.answer : prev.answer ?? null,
      hints: Math.max(body.hints || 0, prev.hints || 0),
      seconds: body.seconds || prev.seconds || 0,
      ...patch,
      at: nowIso(),
    });
  } catch (e) {
    console.error('could not save work state for', it.id, e.message);   // never fails a submission
  }
}

/** A stored copy of a result: enough to show it again after a refresh. */
const storedResult = (r) => ({
  outcome: r.outcome, correct: !!r.correct, score: r.score ?? null, feedback: r.feedback || null,
  needsReview: !!r.needsReview, unsupported: !!r.unsupported, selfCheck: !!r.selfCheck, parts: r.parts || null,
  cells: r.cells || null, spill: r.spill || null, error: r.error || null, engineError: r.engineError || r.evaluationError || null,
  method: r.method || null, explain: r.explain || null, solution: r.solution || null, model: r.model || null, answer: r.answer || null,
  detected: r.detected || null, formulasUsed: r.formulasUsed ?? null,
});

function afterGrade(it, r, body) {
  const source = ['exam', 'quick', 'review'].includes(body.source) ? body.source : it.source === 'placement' ? 'placement' : it.source;
  // Only a checked answer is evidence about the learner. An evaluation error or an answer that
  // cannot be checked automatically is not recorded at all.
  if (!isRecordable(r.outcome)) return null;
  const concept = r.concept || it.concept || null;
  return engine.recordAttempt({
    itemId: it.id, topicId: it.topicId, skillId: it.skill, source, rawScore: r.score, hints: body.hints || 0, seconds: body.seconds || null,
    concept, mistakeLabel: r.mistake || it.mistake || null, noMistake: !!r.noMistake,
    detail: { answer: typeof body.answer === 'string' ? body.answer.slice(0, 1500) : body.answer, parts: r.parts },
  });
}

/** State and next step for a task, sent with every result so the page never has to guess. */
function taskFollowUp(it, body) {
  if (isSessionQuestion(it, body)) return {};
  const state = activity.itemState(it.id);
  const ctx = body.ctx === 'task' ? 'task' : 'topic';
  return { state, next: activity.nextAfter('item', it.id, ctx) };
}

app.post('/api/items/:id/submit', wrap(async (req, res) => {
  const it = getItem(req.params.id);
  if (!it) return res.status(404).json({ error: 'Unknown item' });
  const body = req.body || {};
  const inSession = body.session !== undefined && body.session !== null;
  // a question inside a quiz attempt: the attempt is the record, and it must accept the answer
  if (inSession) {
    const refused = quizsessions.checkAnswerAllowed(body.session, it.id);
    if (refused) return res.status(409).json({ error: refused });
  }
  const stored = toStoredAnswer(it, body.answer);      // display position → written order
  const r = await gradeSafely(it, stored);
  if (inSession) quizsessions.recordAnswer(body.session, it.id, stored, r);
  const rec = afterGrade(it, r, { ...body, answer: stored });
  const quizLike = it.source === 'quiz' || ['exam', 'quick', 'review', 'quiz'].includes(body.source) || inSession;
  const reveal = r.correct || r.selfCheck || quizLike || r.outcome === OUTCOME.EVALUATION_ERROR;
  const out = {
    ...r, recorded: rec,
    explain: reveal ? shownExplain(it, it.explain) : null,
    solution: r.correct || r.selfCheck || r.outcome === OUTCOME.EVALUATION_ERROR ? solutionText(it) : null,
    model: r.selfCheck ? it.model || null : null,
    answer: quizLike && !r.correct ? revealAnswer(it) : null,
    masteryAfter: rec?.masteryAfter ?? null,
  };
  rememberItem(it, body, { result: storedResult(out) });
  res.json({ ...out, ...taskFollowUp(it, body) });
}));

// Used only when the grader could not reach a verdict: the learner compares with the model
// answer and records the outcome. Worth less than a checked answer, and never silently correct.
app.post('/api/items/:id/selfmark', wrap((req, res) => {
  const it = getItem(req.params.id);
  if (!it) return res.status(404).json({ error: 'Unknown item' });
  const correct = !!req.body.correct;
  const rec = engine.recordAttempt({
    itemId: it.id, topicId: it.topicId, skillId: it.skill, source: req.body.source || it.source,
    rawScore: correct ? 0.8 : 0, hints: req.body.hints || 0, seconds: req.body.seconds || null,
    concept: it.concept, mistakeLabel: correct ? null : it.mistake || null, noMistake: correct,
    detail: { answer: typeof req.body.answer === 'string' ? req.body.answer.slice(0, 1500) : req.body.answer, selfMarked: true },
  });
  const prev = ((workstate.loadState(`item:${it.id}`) || {}).state || {}).result || {};
  const result = { ...prev, outcome: correct ? OUTCOME.CORRECT : OUTCOME.INCORRECT, correct, score: correct ? 0.8 : 0, selfMarked: true, needsReview: false,
    feedback: correct ? 'Marked as right by you. It counts a little less than a checked answer.' : 'Marked as not right by you. It has been added to your mistakes to come back to.' };
  rememberItem(it, req.body, { result });
  res.json({ score: result.score, recorded: rec, selfMarked: true, result, ...taskFollowUp(it, req.body) });
}));

// written answers: the learner confirms which checklist points they covered
app.post('/api/items/:id/selfcheck', wrap((req, res) => {
  const it = getItem(req.params.id);
  if (!it) return res.status(404).json({ error: 'Unknown item' });
  const ticks = (req.body.ticks || []).map(Boolean);
  const total = (it.checklist || []).length || 1;
  const score = ticks.filter(Boolean).length / total;
  const rec = engine.recordAttempt({ itemId: it.id, topicId: it.topicId, skillId: it.skill, source: req.body.source || it.source, rawScore: score, hints: req.body.hints || 0,
    concept: it.concept, mistakeLabel: it.mistake || null, detail: { answer: String(req.body.answer || '').slice(0, 3000), ticks } });
  rememberItem(it, req.body, { selfSaved: score, ticks });
  res.json({ score, recorded: rec, ...taskFollowUp(it, req.body) });
}));

// Excel upload: raw .xlsx bytes in the body
app.post('/api/items/:id/upload', express.raw({ type: '*/*', limit: '25mb' }), wrap(async (req, res) => {
  const it = getItem(req.params.id);
  if (!it || it.type !== 'file') return res.status(404).json({ error: 'This task does not take a file.' });
  let cells;
  try { cells = await readAnswerCells(req.body, it.questions.length); } catch (e) { return res.status(400).json({ error: e.message }); }
  const g = gradeParts(it.questions, it.expected, cells.values);
  const graded = { ...g, correct: g.score >= 0.999, feedback: `${g.correct} of ${g.total} answers are right.`, formulasUsed: cells.formulas + cells.dataFormulas };
  const r = { ...graded, outcome: outcomeOf(graded) };
  const body = { source: req.query.source, hints: Number(req.query.hints || 0), ctx: req.query.ctx, answer: cells.values };
  const rec = afterGrade(it, r, body);
  const out = { ...r, recorded: rec, explain: r.correct ? it.explain || null : null, solution: r.correct ? solutionText(it) : null };
  rememberItem(it, body, { result: storedResult(out) });
  res.json({ ...out, ...taskFollowUp(it, body) });
}));

// Fault injection for the automated tests only (the server must be started with ACADEMY_TEST_FAULTS=1).
// It breaks the formula calculator on purpose, to prove a broken grader never marks anyone wrong.
if (process.env.ACADEMY_TEST_FAULTS === '1') {
  app.post('/api/test/faults', wrap((req, res) => {
    const mode = String(req.body.formula || 'ok');
    setEvaluatorForTests(mode === 'fail' ? () => ({ engineError: 'There is no AST with such key in the cache.' }) : null);
    clearFormulaCache();
    res.json({ formula: mode });
  }));
}

// formula playground: evaluate without grading
app.post('/api/formula/eval', wrap((req, res) => {
  const it = getItem(req.body.itemId);
  if (!it || it.type !== 'formula') return res.status(404).json({ error: 'Unknown item' });
  res.json(evaluate(it.grid, req.body.formula, it.target, it.fillTo));
}));

// ------------------------------------------------------------------ today, quick practice, quizzes, cards, exams
/**
 * Today's plan with each step's real state. A step is done when its activity is completed (the
 * lesson read, the task solved, today's quiz finished) or when the learner chose to skip it.
 */
function planWithStates(plan) {
  const topic = content.topicMap[plan.topicId];
  const marks = plan.done || {};
  const quizKey = `today:${plan.day}`;
  const quizFinished = quizsessions.listSessions({ key: quizKey, finishedOnly: true, limit: 1 }).length > 0;
  const steps = plan.steps.map((st) => {
    const state = st.key === 'learn' ? activity.lessonStateOf(topic)
      : st.key === 'quiz' ? quizsessions.quizStateFor(quizKey)
        : activity.itemState(st.itemId);
    const completed = state === activity.STATE.COMPLETED || (st.key === 'quiz' && quizFinished);
    return { ...st, state, done: completed || !!marks[st.key], skipped: !completed && !!marks[st.key] };
  });
  return { ...plan, steps, quizKey, done: Object.fromEntries(steps.filter((x) => x.done).map((x) => [x.key, true])) };
}

app.get('/api/today', wrap((req, res) => {
  const plan = planWithStates(engine.todayPlan(req.query.refresh === '1'));
  res.json({ ...plan, topic: topicCard(content.topicMap[plan.topicId]) });
}));
// marks a step as done for today (the lesson button, or skipping a step)
app.post('/api/today/step', wrap((req, res) => { engine.markPlanStep(String(req.body.step)); res.json(planWithStates(engine.todayPlan())); }));
// Used to rebuild a quiz that was interrupted: the same questions, in the same order.
app.post('/api/items/by-ids', wrap((req, res) => {
  res.json({ items: (req.body.ids || []).map((id) => clientItem(getItem(id))).filter(Boolean) });
}));
app.post('/api/today/quiz-items', wrap((req, res) => {
  res.json({ items: (req.body.ids || []).map((id) => clientItem(getItem(id))).filter(Boolean) });
}));

app.get('/api/quick', wrap((req, res) => {
  const it = engine.quickItem();
  res.json({ item: clientItem(it), topic: it ? { id: it.topicId, title: content.topicMap[it.topicId]?.title } : null });
}));

app.get('/api/quizzes', wrap((req, res) => {
  const bySkill = content.skills.map((sk) => ({
    id: sk.id, name: sk.name, color: sk.color,
    topics: content.topics.filter((t) => t.skill === sk.id && (t.quiz || []).length).map((t) => ({ id: t.id, title: t.title, level: t.level, count: t.quiz.length, mastery: engine.topicMastery(t.id), unlocked: engine.isUnlocked(t) })),
  }));
  const exams = content.exams.map((e) => {
    const last = store.get('SELECT score, ts FROM exam_results WHERE exam_id = ? ORDER BY ts DESC LIMIT 1', [e.id]);
    const best = store.get('SELECT MAX(score) AS s FROM exam_results WHERE exam_id = ?', [e.id]);
    return { id: e.id, title: e.title, skill: e.skill, tier: e.tier, count: e.count, minutes: e.minutes, pass: e.pass, last, best: best?.s ?? null };
  });
  const dueCards = content.cards.filter((c) => {
    if (!engine.isUnlocked(content.topicMap[c.topicId])) return false;
    const s = store.get('SELECT next_due FROM card_state WHERE card_id = ?', [c.id]);
    return !s || !s.next_due || new Date(s.next_due) <= new Date();
  }).length;
  res.json({ bySkill, exams, cards: { total: content.cards.length, due: dueCards } });
}));

// ------------------------------------------------------------------ quiz attempts
// A quiz lives on the server from the moment it is drawn: /open resumes the attempt the learner
// is on (or starts one), answers are added by /api/items/:id/submit with { session }, /finish
// fixes the score, and a finished attempt can always be reviewed.

function drawForKey(key, n) {
  const [kind, ref] = String(key).split(/:(.*)/);
  // a new attempt should not repeat the one before it
  const prev = quizsessions.currentSession(key);
  const avoid = new Set(prev ? prev.itemIds : []);
  if (kind === 'topic') {
    const t = content.topicMap[ref];
    if (!t) throw Object.assign(new Error('Unknown topic'), { status: 404 });
    const reasons = {};
    return { topicId: t.id, title: `${t.title} quiz`, items: engine.pickQuiz(t, n, { reasons, avoid }), reasons };
  }
  if (key === 'review') { const reasons = {}; return { topicId: null, title: 'Mixed review', items: engine.pickReviewQuiz(n, { reasons, avoid }), reasons }; }
  if (kind === 'today') {
    const plan = engine.todayPlan();
    if (ref !== plan.day) throw Object.assign(new Error("That quiz belongs to an earlier day's plan. Open today's plan instead."), { status: 409 });
    const step = plan.steps.find((x) => x.key === 'quiz');
    return { topicId: plan.topicId, title: "Today's quiz", items: (step ? step.itemIds : []).map((id) => getItem(id)).filter(Boolean) };
  }
  throw Object.assign(new Error(`Unknown quiz ${key}`), { status: 400 });
}

function sessionPayload(sess, { review = false } = {}) {
  if (!sess) return null;
  const items = sess.itemIds.map((id) => getItem(id)).filter(Boolean);
  const results = {};
  for (const it of items) {
    const r = sess.results[it.id];
    if (!r && !review) continue;
    results[it.id] = {
      ...(r || { outcome: null, correct: false, score: 0, feedback: null }),
      given: toShownAnswer(it, sess.answers[it.id] ?? null),
      explain: shownExplain(it, it.explain),
      answer: r && r.correct ? null : revealAnswer(it),
      solution: review ? solutionText(it) : null,
    };
  }
  const topicIds = sess.topicId ? [sess.topicId] : [];
  return {
    id: sess.id, key: sess.key, title: sess.title, topicId: sess.topicId, createdAt: sess.createdAt, finishedAt: sess.finishedAt,
    items: items.map(clientItem), itemIds: sess.itemIds, results, reasons: sess.reasons, correct: sess.correct, total: sess.total, score: sess.score,
    answered: sess.answered, state: sess.state, stateLabel: activity.STATE_LABEL[sess.state],
    next: sess.finishedAt && topicIds.length && sess.key.startsWith('topic:') ? activity.nextAfter('quiz', topicIds[0]) : null,
  };
}

const quizN = (n) => Math.min(20, Math.max(3, Number(n || 6)));

app.get('/api/quiz-sessions', wrap((req, res) => {
  res.json({ sessions: quizsessions.listSessions({ key: req.query.key || null, finishedOnly: req.query.finished === '1', limit: req.query.limit })
    .map((x) => ({ id: x.id, key: x.key, title: x.title, topicId: x.topicId, createdAt: x.createdAt, finishedAt: x.finishedAt, dismissedAt: x.dismissedAt, itemIds: x.itemIds, answered: x.answered, correct: x.correct, total: x.total, score: x.score, state: x.state })) });
}));

app.get('/api/quiz-sessions/current', wrap((req, res) => {
  res.json({ session: sessionPayload(quizsessions.currentSession(String(req.query.key || ''))) });
}));

/** Resume the attempt the learner is on, or start one. */
app.post('/api/quiz-sessions/open', wrap((req, res) => {
  const key = String(req.body.key || '');
  const cur = quizsessions.currentSession(key);
  if (cur) return res.json({ session: sessionPayload(cur), resumed: true });
  const d = drawForKey(key, quizN(req.body.n));
  const sess = quizsessions.createSession({ key, topicId: d.topicId, title: d.title, itemIds: d.items.map((it) => it.id), reasons: d.reasons });
  res.json({ session: sessionPayload(sess), resumed: false });
}));

/** A new attempt: the previous one is set aside and different questions are drawn. */
app.post('/api/quiz-sessions', wrap((req, res) => {
  const key = String(req.body.key || '');
  const d = drawForKey(key, quizN(req.body.n));
  const sess = quizsessions.createSession({ key, topicId: d.topicId, title: d.title, itemIds: d.items.map((it) => it.id), reasons: d.reasons });
  res.json({ session: sessionPayload(sess) });
}));

app.get('/api/quiz-sessions/:id', wrap((req, res) => {
  const sess = quizsessions.getSession(req.params.id);
  if (!sess) return res.status(404).json({ error: 'Unknown quiz' });
  res.json({ session: sessionPayload(sess) });
}));

app.post('/api/quiz-sessions/:id/finish', wrap((req, res) => {
  const sess = quizsessions.finishSession(req.params.id);
  if (sess.key.startsWith('today:')) engine.markPlanStep('quiz');
  res.json({ session: sessionPayload(sess) });
}));

/** Every question of a finished attempt with the answer given, the right answer and why. */
app.get('/api/quiz-sessions/:id/review', wrap((req, res) => {
  const sess = quizsessions.getSession(req.params.id);
  if (!sess) return res.status(404).json({ error: 'Unknown quiz' });
  if (!sess.finishedAt) return res.status(409).json({ error: 'Finish the quiz first, then review it.' });
  res.json({ session: sessionPayload(sess, { review: true }) });
}));

app.get('/api/review-quiz', wrap((req, res) => {
  const n = Math.min(20, Math.max(3, Number(req.query.n || 8)));
  res.json({ title: 'Mixed review', items: engine.pickReviewQuiz(n).map(clientItem) });
}));

app.get('/api/cards', wrap((req, res) => {
  const skill = req.query.skill;
  const now = new Date();
  const list = content.cards.filter((c) => (!skill || c.skill === skill) && engine.isUnlocked(content.topicMap[c.topicId])).map((c) => {
    const s = store.get('SELECT * FROM card_state WHERE card_id = ?', [c.id]);
    return { ...c, box: s?.box || 0, due: !s || !s.next_due || new Date(s.next_due) <= now, seen: s?.seen || 0 };
  });
  const due = list.filter((c) => c.due).sort((a, b) => a.box - b.box || a.seen - b.seen);
  res.json({ cards: (due.length ? due : list).slice(0, Number(req.query.n || 15)).map((c) => ({ id: c.id, front: c.front, back: c.back, kind: c.kind || 'concept', topicId: c.topicId, topicTitle: content.topicMap[c.topicId]?.title, skill: c.skill })), totalDue: due.length });
}));

app.post('/api/cards/:id', wrap((req, res) => {
  const card = content.cards.find((c) => c.id === req.params.id);
  if (!card) return res.status(404).json({ error: 'Unknown card' });
  const knew = !!req.body.knew;
  const s = store.get('SELECT * FROM card_state WHERE card_id = ?', [card.id]) || { box: 0, seen: 0, knew: 0 };
  const box = knew ? Math.min(5, (s.box || 0) + 1) : 0;
  const days = [0.01, 1, 3, 7, 14, 30][box];
  store.run(`INSERT INTO card_state (card_id, box, next_due, seen, knew) VALUES (?,?,?,?,?)
             ON CONFLICT(card_id) DO UPDATE SET box = excluded.box, next_due = excluded.next_due, seen = card_state.seen + 1, knew = card_state.knew + ?`,
    [card.id, box, new Date(Date.now() + days * 86400000).toISOString(), 1, knew ? 1 : 0, knew ? 1 : 0]);
  engine.recordAttempt({ itemId: card.id, topicId: card.topicId, skillId: card.skill, source: 'card', rawScore: knew ? 1 : 0, noMistake: true });
  res.json({ ok: true, box });
}));

function examItems(exam) {
  const topics = content.topics.filter((t) => t.skill === exam.skill && (!exam.tier || t.level === exam.tier));
  const pool = topics.flatMap((t) => (t.quiz || []).filter((q) => ['mc', 'tf', 'fill', 'number', 'formula', 'sql', 'multi', 'order'].includes(q.type)));
  // spread across topics: round-robin, shuffled
  const byTopic = topics.map((t) => pool.filter((q) => q.topicId === t.id).sort(() => Math.random() - 0.5));
  const out = [];
  while (out.length < exam.count && byTopic.some((l) => l.length)) for (const l of byTopic) if (l.length && out.length < exam.count) out.push(l.shift());
  return out;
}

app.get('/api/exams/:id', wrap((req, res) => {
  const exam = content.exams.find((e) => e.id === req.params.id);
  if (!exam) return res.status(404).json({ error: 'Unknown exam' });
  res.json({ ...exam, items: examItems(exam).map(clientItem) });
}));

app.post('/api/exams/:id', wrap(async (req, res) => {
  const exam = content.exams.find((e) => e.id === req.params.id);
  if (!exam) return res.status(404).json({ error: 'Unknown exam' });
  const answers = req.body.answers || {};
  const results = [];
  for (const [id, answer] of Object.entries(answers)) {
    const it = getItem(id);
    if (!it) continue;
    const stored = toStoredAnswer(it, answer);
    const r = await gradeSafely(it, stored);
    afterGrade(it, r, { source: 'exam', answer: stored, hints: (req.body.hints || {})[id] || 0 });
    results.push({ id, topicId: it.topicId, correct: !!r.correct, outcome: r.outcome, unchecked: !isRecordable(r.outcome), prompt: it.prompt, explain: shownExplain(it, it.explain), answer: r.correct ? null : revealAnswer(it), options: clientItem(it).options, type: it.type, feedback: r.feedback || null, given: answer });
  }
  // a question the grader could not check is left out of the score, not counted as wrong
  const unchecked = results.filter((r) => r.unchecked).length;
  const correct = results.filter((r) => r.correct).length;
  const total = Math.max(1, (req.body.total || results.length) - unchecked);
  const score = correct / total;
  const byTopic = {};
  for (const r of results.filter((x) => !x.unchecked)) { byTopic[r.topicId] ||= { right: 0, total: 0 }; byTopic[r.topicId].total++; if (r.correct) byTopic[r.topicId].right++; }
  const weak = Object.entries(byTopic).filter(([, v]) => v.right / v.total < 0.6).map(([t, v]) => ({ topicId: t, title: content.topicMap[t]?.title, right: v.right, total: v.total }));
  store.run('INSERT INTO exam_results (ts, exam_id, score, correct, total, detail_json) VALUES (?,?,?,?,?,?)', [nowIso(), exam.id, score, correct, total, JSON.stringify({ byTopic })]);
  // passing an exam counts as proof for the topics answered well
  if (score >= exam.pass / 100) {
    for (const [t, v] of Object.entries(byTopic)) if (v.right / v.total >= 0.7) engine.recordAttempt({ itemId: `${exam.id}:proof`, topicId: t, skillId: exam.skill, source: 'exam', rawScore: 1, noMistake: true });
  }
  res.json({ score, correct, total, unchecked, passed: score >= exam.pass / 100, weak, results, recommend: weak.length ? weak.map((w) => w.topicId) : [engine.nextTopicInSkill(exam.skill)?.id].filter(Boolean) });
}));

// ------------------------------------------------------------------ practice library & datasets
/** Kept for older pages: the same answer as /api/next for a task opened on its own. */
app.get('/api/practice/next', wrap((req, res) => {
  res.json({ next: getItem(req.query.after) ? activity.nextAfter('item', String(req.query.after), 'task') : null });
}));

app.get('/api/practice', wrap((req, res) => {
  const all = content.topics.flatMap((t) => [...(t.practice || []), ...(t.challenge ? [t.challenge] : [])].map((p) => ({ p, t })));
  const states = activity.itemStates(all.map(({ p }) => p.id));
  const tasks = all.map(({ p, t }) => {
    const status = states[p.id];
    return { ...clientItem(p), topicTitle: t.title, level: t.level, unlocked: engine.isUnlocked(t), status, stateLabel: activity.STATE_LABEL[status], solved: status === activity.STATE.COMPLETED, isChallenge: p === t.challenge };
  });
  const f = engine.focus();
  const rec = engine.pickPractice(content.topicMap[f.topicId]);
  res.json({ tasks, recommended: rec ? rec.id : null, reason: f.reason });
}));

app.get('/api/datasets', wrap((req, res) => res.json(content.datasets.map((d) => ({ ...d, preview: undefined, hasPreview: !!d.preview })))));
app.get('/api/datasets/:id/preview', wrap(async (req, res) => {
  const d = content.datasetMap[req.params.id];
  if (!d || !d.preview) return res.status(404).json({ error: 'No preview for this dataset' });
  const spec = req.query.part && d.parts ? d.parts.find((p) => p.key === req.query.part)?.preview || d.preview : d.preview;
  res.json(await previewDataset(path.join(ASSETS, 'files'), spec, {
    offset: Number(req.query.offset || 0), limit: Math.min(500, Number(req.query.limit || 100)),
    search: String(req.query.q || ''), sort: req.query.sort ?? null, desc: req.query.desc === '1',
  }));
}));
app.use('/files', express.static(path.join(ASSETS, 'files'), { fallthrough: false, setHeaders: (res) => res.setHeader('Content-Disposition', 'attachment') }));

// ------------------------------------------------------------------ SQL lab
app.get('/api/sql/dbs', wrap(async (req, res) => {
  const out = [];
  for (const d of content.databases) {
    const tables = [];
    for (const [name, info] of Object.entries(d.tables)) {
      const cols = await runSql(d.id, `SELECT name, type FROM pragma_table_info('${name}')`, 200);
      const cnt = await runSql(d.id, `SELECT COUNT(*) FROM ${name}`, 1);
      tables.push({ name, description: info.description, rows: cnt.ok ? cnt.rows[0][0] : null,
        columns: cols.ok ? cols.rows.map(([c, t]) => ({ name: c, type: t || '', description: info.columns?.[c] || '' })) : [] });
    }
    out.push({ id: d.id, title: d.title, business: d.business, description: d.description, notes: d.notes || [], tables });
  }
  res.json(out);
}));

app.post('/api/sql/run', wrap(async (req, res) => {
  const db = String(req.body.db || '');
  if (!content.databaseMap[db]) return res.status(400).json({ ok: false, error: 'Pick a database first.' });
  const r = await runSql(db, String(req.body.sql || ''), 1000);
  if (!r.ok) {
    const { explainSqlError } = await import('./grading/sql.js');
    return res.json({ ...r, error: explainSqlError(r.error) });
  }
  res.json(r);
}));

app.get('/api/sql/challenges', wrap((req, res) => {
  const solved = new Set(store.all('SELECT DISTINCT item_id FROM attempts WHERE correct = 1').map((r) => r.item_id));
  const list = Object.values(content.items).filter((i) => i.type === 'sql' && (!req.query.db || i.db === req.query.db) && i.source !== 'placement')
    .map((i) => ({ id: i.id, title: i.title || (i.prompt || '').split('\n')[0].slice(0, 90), difficulty: i.difficulty || 2, topicTitle: content.topicMap[i.topicId]?.title, db: i.db, solved: solved.has(i.id), unlocked: engine.isUnlocked(content.topicMap[i.topicId]) }));
  res.json(list);
}));

// ------------------------------------------------------------------ projects
app.get('/api/projects', wrap((req, res) => {
  res.json(content.projects.map((p) => {
    const rows = store.all('SELECT step_id, score FROM project_progress WHERE project_id = ?', [p.id]);
    const done = rows.filter((r) => r.score !== null).length;
    const final = rows.find((r) => r.step_id === 'final');
    const status = activity.projectStateOf(p);
    return {
      id: p.id, title: p.title, business: p.business, summary: p.summary, difficulty: p.difficulty, skills: p.skills,
      minutes: p.minutes || null, steps: p.steps.length, done, status, stateLabel: activity.STATE_LABEL[status],
      finalScore: final ? final.score : null, recommendedAfter: p.recommendedAfter,
      tool: p.db ? 'SQL Lab' : p.files && p.files.length ? 'Excel file' : null,
    };
  }));
}));

app.get('/api/projects/:id', wrap((req, res) => {
  const p = content.projectMap[req.params.id];
  if (!p) return res.status(404).json({ error: 'Unknown project' });
  // a checked step comes back with its explanation and per-part marks, so a refresh shows the same result
  const saved = Object.fromEntries(store.all('SELECT step_id, answer_json, score FROM project_progress WHERE project_id = ?', [p.id]).map((r) => {
    const step = p.steps.find((x) => x.id === r.step_id);
    const answer = r.answer_json ? JSON.parse(r.answer_json) : null;
    const checked = r.score !== null && step;
    const parts = checked && step.type === 'numbers' ? gradeParts(step.questions, step.expected, Array.isArray(answer) ? answer : []).parts : null;
    // a report handed in but not yet self-checked comes back at the self-check, not as a blank step
    const written = step && (step.type === 'report' || step.type === 'open') && answer;
    const text = written ? (typeof answer === 'object' ? Object.values(answer || {}).join('\n') : String(answer)) : '';
    const detected = written ? autoCheck(step.checklist || [], text) : null;
    const reasoning = written ? detectReasoning(text, reasoningSpec(p, step)) : null;
    const result = checked && step.type === 'select' ? gradeSelect(step, answer) : checked && step.type === 'tools' ? gradeTools(step, answer || {}) : null;
    return [r.step_id, { answer, score: r.score, parts, detected, reasoning, result, explain: checked ? step.explain || null : null, model: written ? step.model || null : null }];
  }));
  const state = activity.projectStateOf(p);
  res.json({
    id: p.id, title: p.title, business: p.business, summary: p.summary, brief: p.brief, files: p.files, db: p.db, datasets: p.datasets || [],
    steps: p.steps.map((s) => ({ id: s.id, title: s.title, type: s.type, prompt: s.prompt, questions: s.questions ? s.questions.map((q) => ({ label: q.label, unit: q.unit || null })) : null,
      // options go out as text only: a select step's objects carry the right answers
      options: s.options ? s.options.map((o) => (typeof o === 'string' ? o : o.text)) : null,
      tools: s.type === 'tools' ? TOOLS.filter((t) => s.tools[t.id]).map((t) => ({ id: t.id, name: t.name })) : null,
      criteriaHelp: s.type === 'tools' ? TOOL_CRITERIA.map((c) => c.label) : null,
      criteria: (s.criteria || []).map((c) => CRITERIA.find((x) => x.id === c)?.label).filter(Boolean),
      reasoningLabels: s.type === 'report' ? REASONING.map((r) => ({ id: r.id, label: r.label, hint: r.hint })) : null,
      checklist: s.checklist ? s.checklist.map((c) => c.point) : null, fields: s.fields || null, hints: (s.hints || []).length, saved: saved[s.id] || null })),
    criteria: state === activity.STATE.COMPLETED ? projectCriteria(p) : null,
    state, stateLabel: activity.STATE_LABEL[state], next: activity.nextAfter('project', p.id),
    summary: ((workstate.loadState(`project:${p.id}`) || {}).state || {}).summary || null,
  });
}));

/** What the reasoning rubric looks for in a project report: the project's own key figures. */
function reasoningSpec(p, step) {
  if (step.reasoning) return step.reasoning;
  const figures = p.steps.filter((x) => x.type === 'numbers' && Array.isArray(x.expected)).flatMap((x) => x.expected).filter((v) => typeof v === 'number');
  return { figures };
}

/** The ten criteria for a project, from each step's score (the report counts with its own score). */
function projectCriteria(p) {
  const got = Object.fromEntries(store.all('SELECT step_id, score FROM project_progress WHERE project_id = ?', [p.id]).map((r) => [r.step_id, r.score]));
  const summary = ((workstate.loadState(`project:${p.id}`) || {}).state || {}).summary || {};
  return criteriaProfile(p.steps.map((x) => ({ criteria: x.criteria || [], score: x.id === 'final' ? summary.reportScore ?? got.final ?? null : got[x.id] ?? null })));
}

/** Hints opened on a project step (kept with the project's saved work). */
function projectHints(p, stepId) {
  const st = (workstate.loadState(`project:${p.id}`) || {}).state || {};
  return ((st.hints || {})[stepId] || []).length;
}

app.post('/api/projects/:id/steps/:step', wrap((req, res) => {
  const p = content.projectMap[req.params.id];
  const s = p && p.steps.find((x) => x.id === req.params.step);
  if (!s) return res.status(404).json({ error: 'Unknown step' });
  const answer = req.body.answer;
  let score = null, parts = null, detected = null, result = null, reasoning = null, reasoningScore = null;
  // choosing steps are final once checked: their feedback shows the answer
  if (['select', 'tools'].includes(s.type) && store.get('SELECT 1 AS x FROM project_progress WHERE project_id = ? AND step_id = ? AND score IS NOT NULL', [p.id, s.id])) {
    return res.status(409).json({ error: 'That step is already checked: its answer is final.' });
  }
  if (s.type === 'select') {
    result = gradeSelect(s, answer);
    score = result.score;
  } else if (s.type === 'tools') {
    result = gradeTools(s, answer || {});
    score = result.score;
  } else if (s.type === 'numbers') {
    const g = gradeParts(s.questions, s.expected, Array.isArray(answer) ? answer : []);
    score = g.score; parts = g.parts;
  } else if (s.type === 'choice') {
    score = Number(answer) === s.answer ? 1 : 0;
  } else if (s.type === 'report' || s.type === 'open') {
    const text = typeof answer === 'object' ? Object.values(answer || {}).join('\n') : String(answer || '');
    detected = autoCheck(s.checklist || [], text);
    reasoning = detectReasoning(text, reasoningSpec(p, s));
    if (Array.isArray(req.body.ticks)) {
      const points = req.body.ticks.filter(Boolean).length / Math.max(1, (s.checklist || []).length);
      // the reasoning rubric counts once the learner has confirmed it; without it the key points decide
      if (Array.isArray(req.body.reasoningTicks)) {
        reasoningScore = Math.round(scoreReasoning(reasoning, req.body.reasoningTicks) * 100) / 100;
        score = 0.6 * points + 0.4 * reasoningScore;
      } else score = points;
    }
  }
  store.run(`INSERT INTO project_progress (project_id, step_id, answer_json, score, updated_at) VALUES (?,?,?,?,?)
             ON CONFLICT(project_id, step_id) DO UPDATE SET answer_json = excluded.answer_json, score = excluded.score, updated_at = excluded.updated_at`,
    [p.id, s.id, JSON.stringify(answer ?? null), score, nowIso()]);
  if (score !== null) {
    const hints = projectHints(p, s.id);
    for (const t of s.topics || []) engine.recordAttempt({ itemId: `${p.id}:${s.id}`, topicId: t, skillId: content.topicMap[t]?.skill, source: 'project', rawScore: score, hints, concept: s.concept || null, mistakeLabel: s.mistake || null, noMistake: score >= 0.5 });
  }
  // The project score is the average over EVERY step, so a skipped step counts as 0 rather than
  // quietly disappearing from the average. The report's own checklist score is kept separately.
  let summary = null;
  if (s.id === 'final' && score !== null) {
    const got = Object.fromEntries(store.all('SELECT step_id, score FROM project_progress WHERE project_id = ?', [p.id]).map((r) => [r.step_id, r.score]));
    const steps = p.steps.map((x) => ({
      id: x.id, title: x.title,
      score: x.id === 'final' ? score : (got[x.id] ?? null),
    }));
    const avg = steps.reduce((a, x) => a + (x.score || 0), 0) / steps.length;
    store.run("UPDATE project_progress SET score = ? WHERE project_id = ? AND step_id = 'final'", [avg, p.id]);
    const ticks = Array.isArray(req.body.ticks) ? req.body.ticks : [];
    const others = content.projects.filter((x) => x.id !== p.id && !store.get("SELECT 1 AS n FROM project_progress WHERE project_id = ? AND step_id = 'final' AND score IS NOT NULL", [x.id]));
    summary = {
      projectScore: avg, reportScore: score, reasoningScore,
      strong: steps.filter((x) => x.score !== null && x.score >= 0.999).map((x) => x.title),
      weak: steps.filter((x) => x.score !== null && x.score < 0.999).map((x) => ({ title: x.title, score: x.score })),
      skipped: steps.filter((x) => x.score === null).map((x) => x.title),
      covered: (s.checklist || []).filter((_, i) => ticks[i]).map((c) => c.point),
      missed: (s.checklist || []).filter((_, i) => !ticks[i]).map((c) => c.point),
      nextProject: others[0] ? { id: others[0].id, title: others[0].title } : null,
      reasoning: reasoning ? reasoning.map((r, i) => ({ label: r.label, detected: r.detected, warning: !!r.warning, note: r.note, ticked: Array.isArray(req.body.reasoningTicks) ? !!req.body.reasoningTicks[i] : null })) : null,
    };
    score = avg;
    // kept with the project's saved work, so the result screen survives a refresh
    const prev = (workstate.loadState(`project:${p.id}`) || {}).state || {};
    workstate.saveState(`project:${p.id}`, { ...prev, summary });
    summary.criteria = projectCriteria(p);
    workstate.saveState(`project:${p.id}`, { ...prev, summary });
  }
  const state = activity.projectStateOf(p);
  res.json({
    score, parts, detected, reasoning, result, summary, model: score !== null || detected ? s.model || null : null, explain: score !== null ? s.explain || null : null,
    state, next: state === activity.STATE.COMPLETED ? activity.nextAfter('project', p.id) : null,
  });
}));

app.post('/api/projects/:id/steps/:step/hint', wrap((req, res) => {
  const p = content.projectMap[req.params.id];
  const s = p && p.steps.find((x) => x.id === req.params.step);
  if (!s) return res.status(404).json({ error: 'Unknown step' });
  const level = Number(req.body.level || 1);
  res.json({ text: (s.hints || [])[level - 1] || 'No more hints for this step.' });
}));

// ------------------------------------------------------------------ progress
// "At a glance" on the Progress page: what the learner is learning now, getting better at, should
// practise more, and what comes next, in plain words. The detail stays below it.
function progressGlance() {
  const f = engine.focus();
  const topic = content.topicMap[f.topicId];
  const since = new Date(Date.now() - 14 * 86400000).toISOString();
  const recent = store.all("SELECT concept, COUNT(*) AS n FROM attempts WHERE source NOT IN ('placement', 'card') AND ts >= ? AND raw_score >= 0.8 AND concept IS NOT NULL GROUP BY concept", [since]);
  const byAbility = {};
  for (const r of recent) { const c = CONCEPT_COMPETENCY[r.concept]; if (c) byAbility[c] = (byAbility[c] || 0) + r.n; }
  const bestId = Object.entries(byAbility).sort((a, b) => b[1] - a[1])[0]?.[0];
  const better = bestId ? COMPETENCY_MAP[bestId] : null;
  const weak = engine.weaknesses()[0] || null;
  return {
    learning: { skill: content.skillMap[topic.skill].name, topic: topic.title, topicId: topic.id },
    betterAt: better ? { name: better.name, skill: content.skillMap[better.skill]?.name || null } : null,
    practiseMore: weak ? { title: weak.title, topicId: weak.topicId, why: weak.why } : null,
    next: { title: topic.title, reason: f.reason, to: `/topic/${topic.id}` },
  };
}

app.get('/api/progress', wrap((req, res) => {
  const attempts = store.get('SELECT COUNT(*) AS n, SUM(correct) AS c FROM attempts WHERE source NOT IN (\'placement\', \'card\')');
  const days = store.all("SELECT substr(ts,1,10) AS d, COUNT(*) AS n FROM attempts WHERE source <> 'placement' GROUP BY 1 ORDER BY 1 DESC LIMIT 28");
  const next = engine.focus();
  res.json({
    level: engine.currentLevel(), overall: engine.overallProgress(),
    skills: content.skills.map((sk) => ({ ...skillSummary(sk), tiers: sk.levels.map((tier) => ({ tier, avg: Math.round(engine.tierAverage(sk.id, tier)) })) })),
    strengths: engine.strengths(), weaknesses: engine.weaknesses(), mistakes: engine.openMistakes(12), recent: engine.recentMistakes(8),
    next: { ...next, title: content.topicMap[next.topicId]?.title },
    exams: store.all('SELECT exam_id, score, ts FROM exam_results ORDER BY ts DESC LIMIT 10').map((e) => ({ ...e, title: content.exams.find((x) => x.id === e.exam_id)?.title })),
    stats: { answered: attempts.n || 0, correct: attempts.c || 0, activeDays: days.length, days },
    topics: content.topics.map((t) => ({ id: t.id, title: t.title, skill: t.skill, level: t.level, ...engine.topicStatus(t), stage: mastery.topicView(t.id).stage, stageLabel: mastery.topicView(t.id).stageLabel })),
    mastery: mastery.masterySummary(),
    milestones: milestones(),
    glance: progressGlance(),
  });
}));

// ------------------------------------------------------------------ the Mastery Layer
app.get('/api/mastery', wrap((req, res) => res.json({ ...mastery.masterySummary(), milestones: milestones() })));
app.get('/api/mastery/topic/:id', wrap((req, res) => {
  const t = content.topicMap[req.params.id];
  if (!t) return res.status(404).json({ error: 'Unknown topic' });
  res.json(topicMasteryPayload(t));
}));
app.get('/api/milestones', wrap((req, res) => res.json(milestones())));

// ------------------------------------------------------------------ Real Analyst mode
app.get('/api/analyst', wrap((req, res) => res.json({ ...analyst.listTasks(), readiness: analyst.readiness() })));
app.get('/api/analyst/:id', wrap((req, res) => {
  const t = content.analystMap[req.params.id];
  if (!t) return res.status(404).json({ error: 'Unknown task' });
  res.json(analyst.clientTask(t));
}));
app.post('/api/analyst/:id/parts/:part', wrap((req, res) => {
  res.json(analyst.checkPart(req.params.id, req.params.part, req.body || {}));
}));

app.get('/api/mistakes', wrap((req, res) => res.json({ open: engine.openMistakes(50), recent: engine.recentMistakes(30) })));

// ------------------------------------------------------------------ settings
app.get('/api/backup', (req, res) => {
  res.setHeader('Content-Disposition', `attachment; filename="academy-progress-${new Date().toISOString().slice(0, 10)}.db"`);
  res.send(store.exportBytes());
});
app.post('/api/reset', wrap((req, res) => {
  if (req.body.confirm !== 'RESET') return res.status(400).json({ error: 'Type RESET to confirm.' });
  store.resetAll();
  res.json({ ok: true });
}));

// ------------------------------------------------------------------ the app itself
const DIST = path.join(APP, 'client', 'dist');
app.use(express.static(DIST));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
  const index = path.join(DIST, 'index.html');
  if (fs.existsSync(index)) res.sendFile(index);
  else res.status(503).send('The app has not been built yet. Run: npm run build');
});

const server = app.listen(PORT, '127.0.0.1', () => {
  console.log('');
  console.log('  Data Analyst Academy is running.');
  console.log(`  Open ${URL_} in your browser.`);
  console.log('  Keep this window open while you study. Close it to stop the app.');
  console.log('');
  if (OPEN) openBrowser();
});
server.on('error', (e) => { console.error(e.message); process.exit(1); });
const shutdown = () => { store.flushNow(); process.exit(0); };
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('exit', () => { try { store.flushNow(); } catch { /* ignore */ } });

export { expectedResult, answerMatches };
