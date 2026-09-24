// The Mastery Layer: what the learner's own graded work shows they can do.
//
// Completing an activity is not the same as mastering it. Every graded answer is sorted into one
// of four kinds of evidence:
//
//   knowledge     understands it: concept, sequence and calculation questions
//   skill         can do it: writing formulas and queries, debugging, hands-on tasks
//   application   uses it on a real problem: scenario and interpretation questions, challenges,
//                 project steps, Real Analyst work
//   independence  does that without help: a challenge, project step or Real Analyst task solved
//                 on the first check, with no hint
//
// From that evidence each topic, each ability (content/competencies.js) and each skill gets one of
// six stages: Introduced, Learning, Practicing, Competent, Independent, Strong. A stage says what
// has been shown, never what has been clicked through, and every stage below Strong comes with the
// plain-language list of what would move it up.
//
// Nothing here changes how answers are graded or stored: it only reads the attempts table.
import * as store from './store.js';
import { content, getItem, kindOf, metaOf } from './content/index.js';
import { COMPETENCIES, COMPETENCY_MAP, CONCEPT_COMPETENCY } from './content/competencies.js';

export const STAGES = ['introduced', 'learning', 'practicing', 'competent', 'independent', 'strong'];
export const STAGE_LABEL = Object.freeze({
  none: 'Not started', introduced: 'Introduced', learning: 'Learning', practicing: 'Practicing',
  competent: 'Competent', independent: 'Independent', strong: 'Strong',
});
export const STAGE_MEANING = Object.freeze({
  none: 'Nothing done here yet.',
  introduced: 'You have met it, but there is no evidence yet of what you can do.',
  learning: 'You are still getting the ideas right.',
  practicing: 'You understand it; now it needs doing, by hand, on your own.',
  competent: 'You can do it when the task tells you what to do.',
  independent: 'You can use it on a real problem without being told how.',
  strong: 'You use it on your own, it has lasted over time, and nothing about it is still open.',
});
export const DIMENSIONS = ['knowledge', 'skill', 'application', 'independence'];
export const DIMENSION_LABEL = Object.freeze({
  knowledge: 'Understands it', skill: 'Can do it', application: 'Uses it on real problems', independence: 'Does it without help',
});
/** How much evidence each kind needs before it counts as shown (capped by what the content offers). */
export const NEED = Object.freeze({ knowledge: 3, skill: 2, application: 2, independence: 1, strongIndependent: 2, strongDays: 3, strongSpanDays: 7 });
const RATE = Object.freeze({ knowledge: 0.7, skill: 0.7, application: 0.6 });

const OPEN_TASK = new Set(['challenge', 'project', 'analyst', 'assessment']);
const SKIP_SOURCE = new Set(['placement', 'card']);
const DAY = 86400000;

export const stageIndex = (s) => STAGES.indexOf(s);        // 'none' → -1

// ------------------------------------------------------------------ what one attempt is evidence of

/** The item behind an attempt, including project steps (project:step) and Real Analyst parts. */
function describeAttempt(a) {
  const it = getItem(a.item_id);
  if (it) return { item: it, kind: kindOf(it), difficulty: it.difficulty || 2, business: !!metaOf(it)?.business_context };
  const [owner, part] = String(a.item_id).split(':');
  const project = content.projectMap && content.projectMap[owner];
  if (project) {
    const step = project.steps.find((s) => s.id === part);
    return { item: null, kind: step?.type === 'choice' ? 'scenario' : step?.type === 'numbers' ? 'analysis' : 'scenario', difficulty: project.difficulty || 3, business: true };
  }
  const task = content.analystMap && content.analystMap[owner];
  if (task) return { item: null, kind: 'scenario', difficulty: task.difficulty || 3, business: true };
  return { item: null, kind: 'concept', difficulty: 2, business: false };
}

/** knowledge | skill | application, from where the answer was given and what the question tests. */
export function dimensionOf(source, kind, business = false) {
  if (OPEN_TASK.has(source)) return 'application';
  if (kind === 'scenario' || kind === 'interpretation') return 'application';
  if (kind === 'tool-selection') return business ? 'application' : 'knowledge';
  if (['formula-writing', 'sql-writing', 'debugging', 'analysis'].includes(kind)) return 'skill';
  if (source === 'practice' || source === 'tryit') return 'skill';
  return 'knowledge';
}

// ------------------------------------------------------------------ what the content offers
// A dimension the content cannot test (no hands-on tasks for an idea, say) is "not applicable"
// rather than a wall the learner can never climb.

let offerCache = null;
function offered() {
  if (offerCache && offerCache.items === content.items) return offerCache;
  const blank = () => ({ knowledge: new Set(), skill: new Set(), application: new Set(), independence: new Set() });
  const byTopic = {}, byComp = {};
  const add = (map, key, dim, id) => { if (key) (map[key] ||= blank())[dim].add(id); };
  for (const it of Object.values(content.items)) {
    if (it.source === 'placement') continue;
    const dim = dimensionOf(it.source, kindOf(it), !!metaOf(it)?.business_context);
    const comp = CONCEPT_COMPETENCY[it.concept];
    add(byTopic, it.topicId, dim, it.id);
    add(byComp, comp, dim, it.id);
    if (it.source === 'challenge') { add(byTopic, it.topicId, 'independence', it.id); add(byComp, comp, 'independence', it.id); }
  }
  for (const p of content.projects || []) {
    for (const s of p.steps) {
      const id = `${p.id}:${s.id}`;
      for (const t of s.topics || []) {
        add(byTopic, t, 'application', id); add(byTopic, t, 'independence', id);
        const comp = CONCEPT_COMPETENCY[s.concept] || primaryCompetency(t);
        add(byComp, comp, 'application', id); add(byComp, comp, 'independence', id);
      }
    }
  }
  for (const task of content.analyst || []) {
    for (const part of task.parts || []) {
      const id = `${task.id}:${part.id}`;
      // a finding is filed under the tool the learner chose, so every tool's target counts
      const targets = [...(part.topics || []).map((t) => [t, part.concept]), ...Object.values(part.byTool || {})];
      for (const [t, concept] of targets) {
        add(byTopic, t, 'application', id); add(byTopic, t, 'independence', id);
        const comp = CONCEPT_COMPETENCY[concept] || primaryCompetency(t);
        add(byComp, comp, 'application', id); add(byComp, comp, 'independence', id);
      }
    }
  }
  offerCache = { items: content.items, byTopic, byComp };
  return offerCache;
}

const primaryCache = new Map();
/** The ability a topic mostly teaches, for evidence that names a topic but no concept. */
export function primaryCompetency(topicId) {
  if (primaryCache.has(topicId) && primaryCache.get(topicId).items === content.items) return primaryCache.get(topicId).id;
  const t = content.topicMap?.[topicId];
  const counts = {};
  for (const it of [t?.tryIt, ...(t?.practice || []), ...(t?.quiz || []), t?.challenge].filter(Boolean)) {
    const c = CONCEPT_COMPETENCY[it.concept];
    if (c) counts[c] = (counts[c] || 0) + 1;
  }
  const id = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  primaryCache.set(topicId, { id, items: content.items });
  return id;
}

// ------------------------------------------------------------------ the evidence, gathered once per change

function blankGroup() {
  const dim = () => ({ n: 0, recent: [], solved: new Set(), days: new Set(), maxDifficulty: 0 });
  return { knowledge: dim(), skill: dim(), application: dim(), independence: { n: 0, solved: new Set(), days: new Set() },
    attempts: 0, successDays: new Set(), firstSuccess: null, lastSuccess: null, last: [], topDifficulty: 0 };
}

let cache = null;
/** Every graded attempt, sorted into topics, abilities and skills. Recomputed when progress changes. */
export function evidence() {
  if (cache && cache.at === store.version && cache.items === content.items) return cache;
  const rows = store.all(`SELECT item_id, topic_id, skill_id, source, score, raw_score, correct, hints, ts, concept
                          FROM attempts ORDER BY ts, id`);
  const byTopic = {}, byComp = {}, bySkill = {};
  const seen = new Set();
  for (const a of rows) {
    if (SKIP_SOURCE.has(a.source) || String(a.item_id).endsWith(':proof') || String(a.item_id).startsWith('placement:')) continue;
    const firstTry = !seen.has(a.item_id);
    seen.add(a.item_id);
    const d = describeAttempt(a);
    const dim = dimensionOf(a.source, d.kind, d.business);
    const raw = a.raw_score ?? a.score;
    const clean = raw >= 0.8 && (a.hints || 0) <= 1;                // right, with at most a small nudge
    const unguided = OPEN_TASK.has(a.source) && raw >= 0.8 && (a.hints || 0) === 0 && firstTry;
    const day = String(a.ts).slice(0, 10);
    const concept = a.concept || d.item?.concept || null;
    const comp = CONCEPT_COMPETENCY[concept] || (a.topic_id ? primaryCompetency(a.topic_id) : null);
    const skill = a.skill_id || d.item?.skill || content.topicMap?.[a.topic_id]?.skill || null;
    for (const g of [a.topic_id && (byTopic[a.topic_id] ||= blankGroup()), comp && (byComp[comp] ||= blankGroup()), skill && (bySkill[skill] ||= blankGroup())].filter(Boolean)) {
      const s = g[dim];
      s.n++;
      s.recent.unshift(a.score);
      if (s.recent.length > 10) s.recent.pop();
      // a lesson's worked example is practice, not proof: it never counts as a solved task
      if (clean && a.source !== 'tryit') { s.solved.add(a.item_id); s.days.add(day); s.maxDifficulty = Math.max(s.maxDifficulty, d.difficulty); }
      if (unguided) { g.independence.n++; g.independence.solved.add(a.item_id); g.independence.days.add(day); }
      g.attempts++;
      g.last.unshift(a.score);
      if (g.last.length > 8) g.last.pop();
      if (clean) {
        g.successDays.add(day);
        g.firstSuccess ||= a.ts;
        g.lastSuccess = a.ts;
        g.topDifficulty = Math.max(g.topDifficulty, d.difficulty);
      }
    }
  }
  cache = { at: store.version, items: content.items, byTopic, byComp, bySkill };
  return cache;
}

/** Recent performance, newest counting most. */
function recentRate(scores) {
  if (!scores.length) return null;
  let num = 0, den = 0;
  scores.forEach((s, i) => { const w = Math.pow(0.85, i); num += w * s; den += w; });
  return num / den;
}

// ------------------------------------------------------------------ from evidence to a stage

function dimState(g, dim, available) {
  const need = Math.min(NEED[dim], available);
  if (!available) return { state: 'na', have: 0, need: 0 };
  const s = g[dim];
  const have = s.solved.size;
  if (dim === 'independence') return { state: have >= need ? 'shown' : s.n || g.application.n ? 'started' : 'none', have, need };
  const rate = recentRate(s.recent);
  const shown = have >= need && rate !== null && rate >= RATE[dim];
  return { state: shown ? 'shown' : s.n ? 'started' : 'none', have, need, rate: rate === null ? null : Math.round(rate * 100) };
}

const PLURAL = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const WHAT = {
  knowledge: (n) => `Answer ${PLURAL(n, 'question', 'different questions')} about the ideas correctly`,
  skill: (n) => `Solve ${PLURAL(n, 'hands-on task', 'hands-on tasks')} (formulas, queries or data) with at most one hint`,
  application: (n) => `Get ${PLURAL(n, 'business scenario or challenge', 'business scenarios or challenges')} right`,
  independence: (n) => `Solve ${PLURAL(n, 'challenge, project step or Real Analyst task', 'challenges, project steps or Real Analyst tasks')} on the first check with no hints`,
};

/**
 * The stage one group of evidence has reached, what is shown in each of the four kinds, and what
 * would move it up. `available` says how many items of each kind the content has for the group.
 */
export function judge(g, available, { lessonDone = false, openMistakes = 0 } = {}) {
  g ||= blankGroup();
  const dims = Object.fromEntries(DIMENSIONS.map((d) => [d, dimState(g, d, available[d] || 0)]));
  // an idea the content cannot test by hand (no hands-on tasks) is not held against the learner,
  // but "without help" is never assumed: with nothing open to do, the stage stops at Competent
  const shown = (d) => dims[d].state === 'shown' || (dims[d].state === 'na' && d !== 'independence');
  const todo = [];
  const want = (d) => {
    if (shown(d) || dims[d].state === 'na') return;
    const x = dims[d];
    // enough solved, but the recent answers are not reliable yet: say that, not "4 of 2"
    if (x.have >= x.need && x.rate !== null && x.rate !== undefined) {
      todo.push({ dim: d, text: `${DIMENSION_LABEL[d]}: your recent answers here are at ${x.rate}%. Get them to ${Math.round(RATE[d] * 100)}% or better`, have: x.rate, need: Math.round(RATE[d] * 100), unit: '%' });
    } else todo.push({ dim: d, text: WHAT[d](x.need), have: x.have, need: x.need });
  };

  let stage;
  if (!g.attempts) stage = lessonDone ? 'introduced' : 'none';
  else if (!shown('knowledge')) stage = g.attempts >= 2 ? 'learning' : 'introduced';
  else if (!shown('skill')) stage = 'practicing';
  else if (!shown('application') || !shown('independence')) stage = dims.skill.state === 'na' && !shown('application') ? 'practicing' : 'competent';
  else stage = 'independent';

  if (stage === 'none' || stage === 'introduced' || stage === 'learning') { want('knowledge'); }
  if (stage === 'practicing') { want('skill'); if (dims.skill.state === 'na') want('application'); }
  if (stage === 'competent') { want('application'); want('independence'); }

  // Strong: independent more than once, lasting over time, recently reliable, nothing left open
  if (stage === 'independent') {
    const span = g.firstSuccess && g.lastSuccess ? (Date.parse(g.lastSuccess) - Date.parse(g.firstSuccess)) / DAY : 0;
    const recent = recentRate(g.last) ?? 0;
    const needInd = Math.min(NEED.strongIndependent, available.independence || 0);
    const checks = [
      { ok: g.independence.solved.size >= needInd, text: `Solve ${PLURAL(needInd, 'open task', 'different open tasks')} on your own`, have: g.independence.solved.size, need: needInd },
      { ok: g.successDays.size >= NEED.strongDays && span >= NEED.strongSpanDays, text: `Keep getting it right on ${NEED.strongDays} different days, at least a week apart`, have: g.successDays.size, need: NEED.strongDays },
      { ok: recent >= 0.8, text: 'Keep your recent answers at 80% or better', have: Math.round(recent * 100), need: 80 },
      { ok: openMistakes === 0, text: 'Clear the mistakes that are still open here', have: openMistakes, need: 0 },
    ];
    if (checks.every((c) => c.ok)) stage = 'strong';
    else for (const c of checks.filter((x) => !x.ok)) todo.push({ dim: 'strong', text: c.text, have: c.have, need: c.need });
  }
  return { stage, stageLabel: STAGE_LABEL[stage], meaning: STAGE_MEANING[stage], dims, next: todo, attempts: g.attempts };
}

const count = (sets) => Object.fromEntries(DIMENSIONS.map((d) => [d, sets?.[d]?.size || 0]));

function openMistakesBy() {
  const byConcept = {}, byTopic = {};
  for (const m of store.all('SELECT concept, topic_id, COUNT(*) AS n FROM mistakes WHERE resolved_at IS NULL GROUP BY concept, topic_id')) {
    if (m.concept) byConcept[m.concept] = (byConcept[m.concept] || 0) + m.n;
    if (m.topic_id) byTopic[m.topic_id] = (byTopic[m.topic_id] || 0) + m.n;
  }
  return { byConcept, byTopic };
}

// ------------------------------------------------------------------ views used by the API

export function topicView(topicId) {
  return topicViews()[topicId] || judge(null, {}, {});
}

let viewsCache = null;
/** Every topic's stage at once (one pass, kept until progress changes), for lists. */
export function topicViews() {
  if (viewsCache && viewsCache.at === store.version && viewsCache.items === content.items) return viewsCache.views;
  const ev = evidence();
  const lessons = new Set(store.all('SELECT topic_id FROM topic_state WHERE lesson_done_at IS NOT NULL').map((r) => r.topic_id));
  const mistakes = openMistakesBy().byTopic;
  const offer = offered().byTopic;
  const views = Object.fromEntries(content.topics.map((t) => [t.id, judge(ev.byTopic[t.id], count(offer[t.id]), { lessonDone: lessons.has(t.id), openMistakes: mistakes[t.id] || 0 })]));
  viewsCache = { at: store.version, items: content.items, views };
  return views;
}

let compCache = null;
export function competencyView(id) {
  const c = COMPETENCY_MAP[id];
  if (!c) return null;
  if (!compCache || compCache.at !== store.version || compCache.items !== content.items) {
    compCache = { at: store.version, items: content.items, views: {},
      mistakes: openMistakesBy().byConcept,
      lessons: new Set(store.all('SELECT topic_id FROM topic_state WHERE lesson_done_at IS NOT NULL').map((r) => r.topic_id)) };
  }
  if (compCache.views[id]) return compCache.views[id];
  const ev = evidence();
  const topics = topicsOf(c);
  const v = judge(ev.byComp[id], count(offered().byComp[id]), {
    lessonDone: topics.some((t) => compCache.lessons.has(t)),
    openMistakes: c.concepts.reduce((s, k) => s + (compCache.mistakes[k] || 0), 0),
  });
  compCache.views[id] = { id, skill: c.skill, name: c.name, can: c.can, core: !!c.core, topics, ...v };
  return compCache.views[id];
}

const topicsCache = new Map();
/** The topics that teach an ability (where its questions live). */
export function topicsOf(c) {
  const hit = topicsCache.get(c.id);
  if (hit && hit.items === content.items) return hit.list;
  const set = new Set(c.concepts);
  const counts = {};
  for (const it of Object.values(content.items)) if (set.has(it.concept) && it.topicId) counts[it.topicId] = (counts[it.topicId] || 0) + 1;
  const list = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([t]) => t);
  topicsCache.set(c.id, { items: content.items, list });
  return list;
}

/**
 * A skill's stage: the highest stage that at least 60% of its abilities have reached. One strong
 * ability does not make a strong skill, and one weak one does not hide the rest.
 */
export function skillView(skillId) {
  const comps = COMPETENCIES.filter((c) => c.skill === skillId).map((c) => competencyView(c.id));
  const need = Math.ceil(comps.length * 0.6);
  let stage = comps.some((c) => c.attempts) ? 'introduced' : comps.some((c) => c.stage === 'introduced') ? 'introduced' : 'none';
  for (const s of STAGES) if (comps.filter((c) => stageIndex(c.stage) >= stageIndex(s)).length >= need) stage = s;
  const atLeast = (s) => comps.filter((c) => stageIndex(c.stage) >= stageIndex(s)).length;
  const nextStage = STAGES[stageIndex(stage) + 1] || null;
  return {
    id: skillId, name: content.skillMap?.[skillId]?.name || skillId, stage, stageLabel: STAGE_LABEL[stage], meaning: STAGE_MEANING[stage],
    competencies: comps,
    summary: comps.length ? `${atLeast('competent')} of ${comps.length} abilities are Competent or better` : '',
    next: nextStage ? { stage: nextStage, stageLabel: STAGE_LABEL[nextStage], have: atLeast(nextStage), need,
      text: stage === 'none' ? `Start the first ${content.skillMap?.[skillId]?.name || ''} topic`.replace('  ', ' ')
        : `${need} of ${comps.length} abilities at ${STAGE_LABEL[nextStage]} or better (you have ${atLeast(nextStage)})` } : null,
  };
}

export function masterySummary() {
  return {
    stages: STAGES.map((s) => ({ id: s, label: STAGE_LABEL[s], meaning: STAGE_MEANING[s] })),
    dimensions: DIMENSIONS.map((d) => ({ id: d, label: DIMENSION_LABEL[d] })),
    skills: (content.skills || []).map((s) => skillView(s.id)),
  };
}

/** How many items of each kind of evidence the content offers, per topic and per ability (for checks). */
export function availability() {
  const o = offered();
  return { byTopic: Object.fromEntries(Object.entries(o.byTopic).map(([k, v]) => [k, count(v)])), byComp: Object.fromEntries(Object.entries(o.byComp).map(([k, v]) => [k, count(v)])) };
}

/** Test hook: forget the cached evidence (the store version normally does this). */
export function _resetForTests() { cache = null; offerCache = null; viewsCache = null; compCache = null; primaryCache.clear(); topicsCache.clear(); }
