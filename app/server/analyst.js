// Real Analyst mode: work requests, cross-tool challenges and mixed-skill assessments.
//
// A task is worked through part by part. A part opens only when the one before it has been
// checked, so the plan (what is the question, which tool, what is wrong with the data) comes
// before the specific questions. Choice parts are final once checked; findings can be checked
// again; a written conclusion is saved in two steps (what the app found, then the learner's ticks).
//
// Every checked part is evidence (engine.recordAttempt, source 'analyst' or 'assessment'). A
// finding is filed under the tool the learner said they used, because in this mode nobody tells
// them which tool to use.
import * as store from './store.js';
import * as engine from './engine.js';
import { content } from './content/index.js';
import { gradePart, TOOLS, TOOL_CRITERIA } from './grading/analyst.js';
import { REASONING } from './grading/reasoning.js';
import { criteriaProfile } from './content/criteria.js';
import { ANALYST_KINDS, LEVEL_NAME } from './content/analyst.js';
import { STATE, STATE_LABEL } from '../shared/lifecycle.js';

const FINAL_ONCE_CHECKED = new Set(['tools', 'select', 'scope']);
const nowIso = () => new Date().toISOString();
const DAY = 86400000;

export const PASS = 0.7;

function rows(taskId) {
  return Object.fromEntries(store.all('SELECT * FROM analyst_work WHERE task_id = ?', [taskId]).map((r) => [r.part_id, {
    answer: r.answer_json ? JSON.parse(r.answer_json) : null, score: r.score, result: r.result_json ? JSON.parse(r.result_json) : null,
    checks: r.checks || 0, firstScore: r.first_score, at: r.updated_at,
  }]));
}

const scored = (r) => r && r.score !== null && r.score !== undefined;

/** Where a task stands, and its score once every part is checked. */
export function taskStatus(task, saved = rows(task.id)) {
  const done = task.parts.filter((p) => scored(saved[p.id])).length;
  const started = done > 0 || task.parts.some((p) => saved[p.id]);
  const finished = done === task.parts.length;
  const score = finished ? task.parts.reduce((s, p) => s + saved[p.id].score, 0) / task.parts.length : null;
  const state = finished ? STATE.COMPLETED : started ? STATE.IN_PROGRESS : STATE.NOT_STARTED;
  const at = Object.values(saved).map((r) => r.at).filter(Boolean).sort().pop() || null;
  return { state, stateLabel: STATE_LABEL[state], done, parts: task.parts.length, score: score === null ? null : Math.round(score * 100) / 100, at };
}

/** Every finished task's result, for milestones and progress. */
export function results() {
  return content.analyst.map((t) => ({ task: t, ...taskStatus(t) })).filter((x) => x.state === STATE.COMPLETED);
}

/** The first open part: the one the learner is on. Parts after it stay hidden. */
function openIndex(task, saved) {
  const i = task.parts.findIndex((p) => !scored(saved[p.id]));
  return i < 0 ? task.parts.length : i;
}

/** The datasets the learner has already worked with (so an assessment can be on unfamiliar data). */
function datasetsUsed() {
  const used = new Set();
  const ids = store.all("SELECT DISTINCT item_id FROM attempts WHERE source NOT IN ('placement', 'card')").map((r) => r.item_id);
  for (const id of ids) {
    const it = content.items[id];
    if (it && it.dataset) used.add(it.dataset);
    const [owner] = String(id).split(':');
    for (const d of content.projectMap[owner]?.datasets || []) used.add(d);
    for (const d of content.analystMap[owner]?.data?.datasets || []) used.add(d);
  }
  return used;
}

/**
 * Is a mixed-skill assessment due? After enough practice across two skills, the first one comes
 * up; after that, one a week once there has been more practice since the last. The one offered is
 * on data the learner has not used, when there is one.
 */
export function assessmentStatus() {
  const all = store.get("SELECT COUNT(*) AS n, COUNT(DISTINCT skill_id) AS s FROM attempts WHERE source NOT IN ('placement', 'card')");
  const assessments = content.analyst.filter((t) => t.kind === 'assessment');
  const finished = assessments.map((t) => ({ t, st: taskStatus(t) })).filter((x) => x.st.state === STATE.COMPLETED).sort((a, b) => String(b.st.at).localeCompare(String(a.st.at)));
  const last = finished[0] || null;
  const since = last ? store.get("SELECT COUNT(*) AS n FROM attempts WHERE source NOT IN ('placement', 'card') AND ts > ?", [last.st.at]).n : all.n;
  const ready = all.n >= 40 && all.s >= 2;
  const waitDays = last ? Math.max(0, 7 - Math.floor((Date.now() - Date.parse(last.st.at)) / DAY)) : 0;
  const open = assessments.filter((t) => taskStatus(t).state !== STATE.COMPLETED);
  const used = datasetsUsed();
  const fresh = open.find((t) => !(t.data?.datasets || []).some((d) => used.has(d))) || open[0] || null;
  const due = !!fresh && ready && waitDays === 0 && (!last || since >= 30);
  let why;
  if (!fresh) why = 'You have done every assessment.';
  else if (!ready) {
    const more = Math.max(0, 40 - all.n);
    const skills = all.s < 2 ? 'once you have practised a second skill (it mixes skills, so it needs more than one)' : '';
    why = `The first one arrives ${[more ? `after ${more} more checked answers` : '', skills].filter(Boolean).join(', and ')}.`;
  }
  else if (waitDays) why = `The next one arrives in ${waitDays} day${waitDays === 1 ? '' : 's'}.`;
  else if (last && since < 30) why = `The next one arrives after ${30 - since} more checked answers.`;
  else why = 'An unfamiliar problem is waiting for you.';
  return { due, taskId: fresh ? fresh.id : null, title: fresh ? fresh.title : null, why };
}

/** The work request to do next: the lowest level not done, moving up once two at a level are passed. */
function recommendedRequest() {
  const reqs = content.analyst.filter((t) => t.kind === 'request');
  const st = Object.fromEntries(reqs.map((t) => [t.id, taskStatus(t)]));
  for (const level of [1, 2, 3]) {
    const atLevel = reqs.filter((t) => t.level === level);
    const passed = atLevel.filter((t) => st[t.id].state === STATE.COMPLETED && st[t.id].score >= PASS).length;
    const open = atLevel.find((t) => st[t.id].state !== STATE.COMPLETED);
    if (passed < 2 && open) return open.id;
  }
  return reqs.find((t) => st[t.id].state !== STATE.COMPLETED)?.id || null;
}

export function listTasks() {
  const rec = recommendedRequest();
  const assess = assessmentStatus();
  return {
    kinds: ANALYST_KINDS, levels: LEVEL_NAME, recommended: rec, assessment: assess,
    tasks: content.analyst.map((t) => ({
      id: t.id, kind: t.kind, kindLabel: ANALYST_KINDS[t.kind].label, title: t.title, level: t.level, levelName: LEVEL_NAME[t.level],
      difficulty: t.difficulty, minutes: t.minutes, business: t.business, from: t.from,
      preview: String(t.message).replace(/\*\*/g, '').split(/(?<=[.?!])\s/)[0].slice(0, 160),
      ...taskStatus(t), recommended: t.id === rec, due: assess.due && assess.taskId === t.id,
    })),
  };
}

function clientPart(part, saved) {
  const base = { id: part.id, type: part.type, title: part.title, prompt: part.prompt, criteria: part.criteria || [] };
  let shape = {};
  if (part.type === 'tools') shape = { tools: TOOLS.filter((t) => part.tools[t.id]).map((t) => ({ id: t.id, name: t.name })), criteriaHelp: TOOL_CRITERIA.map((c) => c.label) };
  if (part.type === 'select' || part.type === 'scope') shape = { options: part.options.map((o) => o.text) };
  if (part.type === 'numbers') shape = { questions: part.questions.map((q) => ({ label: q.label, unit: q.unit || null })) };
  if (part.type === 'conclusion') shape = { checklist: (part.checklist || []).map((c) => c.point), reasoning: REASONING.map((r) => ({ id: r.id, label: r.label, hint: r.hint })) };
  const s = saved[part.id] || null;
  return { ...base, ...shape, saved: s ? { answer: s.answer, score: s.score, result: s.result, checks: s.checks, final: FINAL_ONCE_CHECKED.has(part.type) && s.checks > 0 } : null };
}

/** A task as the browser sees it: no answers, and only the parts opened so far. */
export function clientTask(task) {
  const saved = rows(task.id);
  const status = taskStatus(task, saved);
  const open = openIndex(task, saved);
  const finished = status.state === STATE.COMPLETED;
  return {
    id: task.id, kind: task.kind, kindLabel: ANALYST_KINDS[task.kind].label, title: task.title, level: task.level, levelName: LEVEL_NAME[task.level],
    difficulty: task.difficulty, minutes: task.minutes, business: task.business, from: task.from, message: task.message, context: task.context || null,
    data: task.data || {}, objective: task.objective || null, constraints: task.constraints || [],
    ...status,
    // after the status, whose `parts` is only a count
    parts: task.parts.slice(0, Math.min(task.parts.length, open + 1)).map((p) => clientPart(p, saved)),
    totalParts: task.parts.length,
    summary: finished ? summaryOf(task, saved) : null,
  };
}

function summaryOf(task, saved) {
  const pieces = task.parts.map((p) => ({ criteria: p.criteria || [], score: saved[p.id]?.score ?? null }));
  const conclude = task.parts.find((p) => p.type === 'conclusion');
  const cr = conclude && saved[conclude.id]?.result;
  return {
    score: taskStatus(task, saved).score,
    criteria: criteriaProfile(pieces).filter((c) => c.state !== 'untested'),
    parts: task.parts.map((p) => ({ id: p.id, title: p.title, score: saved[p.id]?.score ?? null })),
    reasoning: cr?.reasoning ? cr.reasoning.map((r, i) => ({ label: r.label, detected: r.detected, ticked: !!(cr.ticks?.reasoning?.[i] ?? r.detected), warning: !!r.warning, note: r.note })) : null,
    debrief: task.debrief || null, routes: task.routes || [],
  };
}

/** Which tool the learner said they used, for filing findings under the right skill. */
function chosenTool(task, saved) {
  const t = saved.tools?.answer?.tools || [];
  return t.find((x) => TOOLS.some((k) => k.id === x)) || null;
}

function evidenceTarget(task, part, saved) {
  if (part.byTool) {
    const tool = chosenTool(task, saved);
    const pick = tool && part.byTool[tool];
    if (pick) return { topicId: pick[0], concept: pick[1] };
  }
  return { topicId: (part.topics || [])[0] || null, concept: part.concept || null };
}

/** Grade one part, keep it, and record it as evidence. */
export function checkPart(taskId, partId, body = {}) {
  const task = content.analystMap[taskId];
  if (!task) throw Object.assign(new Error('Unknown task'), { status: 404 });
  const idx = task.parts.findIndex((p) => p.id === partId);
  if (idx < 0) throw Object.assign(new Error('Unknown part'), { status: 404 });
  const part = task.parts[idx];
  const saved = rows(task.id);
  if (idx > openIndex(task, saved)) throw Object.assign(new Error('Finish the earlier parts first: they open in order.'), { status: 409 });
  const prev = saved[part.id];
  if (FINAL_ONCE_CHECKED.has(part.type) && prev && prev.checks > 0) throw Object.assign(new Error('That part is already checked: its answer is final.'), { status: 409 });
  // later parts can show what earlier ones were after, so once one is checked the earlier ones are final
  if (task.parts.slice(idx + 1).some((p) => (saved[p.id]?.checks || 0) > 0)) throw Object.assign(new Error('A later part is already checked, so this one is final.'), { status: 409 });

  const ticks = body.ticks || null;
  const r = gradePart(part, body.answer, { ticks });
  const result = { ...r, ticks: ticks || undefined };
  const score = r.score ?? null;
  const checks = (prev?.checks || 0) + (score !== null ? 1 : 0);
  store.run(`INSERT INTO analyst_work (task_id, part_id, answer_json, score, result_json, checks, first_score, updated_at) VALUES (?,?,?,?,?,?,?,?)
             ON CONFLICT(task_id, part_id) DO UPDATE SET answer_json = excluded.answer_json, score = excluded.score, result_json = excluded.result_json,
               checks = excluded.checks, first_score = COALESCE(analyst_work.first_score, excluded.first_score), updated_at = excluded.updated_at`,
  [task.id, part.id, JSON.stringify(body.answer ?? null), score, JSON.stringify(result), checks, score, nowIso()]);

  let recorded = null;
  if (score !== null) {
    const target = evidenceTarget(task, part, { ...saved, [part.id]: { answer: body.answer } });
    recorded = engine.recordAttempt({
      itemId: `${task.id}:${part.id}`, topicId: target.topicId, skillId: content.topicMap[target.topicId]?.skill || 'think',
      source: task.kind === 'assessment' ? 'assessment' : 'analyst', rawScore: score, hints: 0, seconds: body.seconds || null,
      concept: target.concept, mistakeLabel: `Real Analyst: ${part.title}`, noMistake: score >= 0.5,
      detail: { answer: typeof body.answer === 'string' ? body.answer.slice(0, 3000) : body.answer },
    });
  }
  const after = clientTask(task);
  return { part: after.parts.find((p) => p.id === part.id), result, recorded, task: after };
}
