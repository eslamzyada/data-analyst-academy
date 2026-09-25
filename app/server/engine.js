// The adaptive brain: mastery from evidence, topic status, reviews, mistakes, levels,
// and what to do next. Nothing here is shown to the learner as a formula; the UI only
// gets plain-language results.
import * as store from './store.js';
import { content, getItem, questionStyle, kindOf, metaOf } from './content/index.js';
import { generatorsFor, newGeneratedId } from './content/generated.js';
import { dimensionOf } from './mastery.js';
import { adaptFor } from './adaptive.js';

export const WEIGHT = { tryit: 1, quiz: 1, quick: 1, review: 1, practice: 2, challenge: 3, exam: 2, placement: 1.5, card: 0.3, project: 3, analyst: 3, assessment: 3 };
const HINT_FACTOR = [1, 0.85, 0.7, 0.5, 0];
const REVIEW_DAYS = [1, 1, 3, 7, 14, 30];
const DAY = 86400000;

const nowIso = () => new Date().toISOString();
const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// ------------------------------------------------------------------ recording evidence
export function recordAttempt({ itemId, topicId, skillId, source, rawScore, hints = 0, seconds = null, concept = null, mistakeLabel = null, detail = null, noMistake = false }) {
  const h = Math.max(0, Math.min(4, hints | 0));
  const score = Math.max(0, Math.min(1, rawScore * HINT_FACTOR[h]));
  const correct = rawScore >= 0.999 ? 1 : 0;
  const weight = WEIGHT[source] ?? 1;
  const before = topicId ? topicMastery(topicId) : null;
  store.run(`INSERT INTO attempts (ts, item_id, topic_id, skill_id, source, score, raw_score, correct, hints, seconds, weight, concept, detail_json)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [nowIso(), itemId, topicId, skillId, source, score, rawScore, correct, h, seconds, weight, concept, detail ? JSON.stringify(detail) : null]);

  let mistakeLogged = false;
  if (!correct && !noMistake && source !== 'card' && rawScore < 0.7) {
    store.run('INSERT INTO mistakes (ts, item_id, topic_id, skill_id, concept, label, detail) VALUES (?,?,?,?,?,?,?)',
      [nowIso(), itemId, topicId, skillId, concept, mistakeLabel || defaultMistakeLabel(concept, topicId), detail ? JSON.stringify(detail).slice(0, 2000) : null]);
    mistakeLogged = true;
  }
  if (correct && h <= 1 && concept) resolveMistakes(concept);

  if (topicId) {
    touchTopic(topicId);
    scheduleReview(topicId, correct === 1 && h <= 2, before);
  }
  const after = topicId ? topicMastery(topicId) : null;
  return { score, correct: !!correct, masteryBefore: before, masteryAfter: after, mistakeLogged };
}

function defaultMistakeLabel(concept, topicId) {
  const c = content.concepts[concept];
  if (c) return `Trouble with ${c}`;
  const t = content.topicMap[topicId];
  return t ? `Mistake in ${t.title}` : 'Mistake';
}

function resolveMistakes(concept) {
  const open = store.all('SELECT id, ts FROM mistakes WHERE concept = ? AND resolved_at IS NULL ORDER BY ts', [concept]);
  if (!open.length) return;
  const since = open[0].ts;
  const good = store.get('SELECT COUNT(*) AS n FROM attempts WHERE concept = ? AND correct = 1 AND hints <= 1 AND ts > ?', [concept, since]).n;
  if (good >= 2) store.run('UPDATE mistakes SET resolved_at = ? WHERE concept = ? AND resolved_at IS NULL', [nowIso(), concept]);
}

function touchTopic(topicId) {
  store.run(`INSERT INTO topic_state (topic_id, last_practiced_at) VALUES (?, ?)
             ON CONFLICT(topic_id) DO UPDATE SET last_practiced_at = excluded.last_practiced_at`, [topicId, nowIso()]);
}

function scheduleReview(topicId, success, before) {
  const st = store.get('SELECT review_box, next_review_at FROM topic_state WHERE topic_id = ?', [topicId]) || { review_box: 0 };
  const m = topicMastery(topicId);
  const due = !st.next_review_at || new Date(st.next_review_at) <= new Date();
  if (m < 50) {
    // not learned yet. Only topics credited by the placement check have a review date here:
    // a correct answer confirms them for a week, a wrong one brings them back tomorrow.
    if (st.next_review_at && due) {
      const next = new Date(Date.now() + (success ? 7 : 1) * DAY).toISOString();
      store.run('UPDATE topic_state SET next_review_at = ? WHERE topic_id = ?', [next, topicId]);
    }
    return;
  }
  let box = st.review_box || 0;
  if (box === 0) box = 1;
  else if (due && success) box = Math.min(REVIEW_DAYS.length - 1, box + 1);
  else if (!success) box = 1;
  else return; // correct but not due: keep the schedule
  const next = new Date(Date.now() + REVIEW_DAYS[box] * DAY).toISOString();
  store.run('UPDATE topic_state SET review_box = ?, next_review_at = ? WHERE topic_id = ?', [box, next, topicId]);
}

export function markLessonDone(topicId) {
  store.run(`INSERT INTO topic_state (topic_id, lesson_done_at) VALUES (?, ?)
             ON CONFLICT(topic_id) DO UPDATE SET lesson_done_at = COALESCE(topic_state.lesson_done_at, excluded.lesson_done_at)`, [topicId, nowIso()]);
}

export function unlockTopic(topicId) {
  store.run(`INSERT INTO topic_state (topic_id, unlocked_by_user) VALUES (?, 1)
             ON CONFLICT(topic_id) DO UPDATE SET unlocked_by_user = 1`, [topicId]);
}

/** Topics credited by the placement check come back as review questions, two a day. */
export function schedulePlacementReviews(topicIds) {
  topicIds.forEach((id, i) => {
    const at = new Date(Date.now() + (1 + Math.floor(i / 2)) * DAY).toISOString();
    store.run(`INSERT INTO topic_state (topic_id, next_review_at) VALUES (?, ?)
               ON CONFLICT(topic_id) DO UPDATE SET next_review_at = excluded.next_review_at`, [id, at]);
  });
}

// ------------------------------------------------------------------ mastery
let cache = null;
function snapshot() {
  if (cache && cache.at === store.version) return cache;
  const attempts = store.all('SELECT topic_id, source, score, weight, ts, correct FROM attempts WHERE topic_id IS NOT NULL ORDER BY ts DESC, id DESC');
  const byTopic = {};
  for (const a of attempts) (byTopic[a.topic_id] ||= []).push(a);
  const states = Object.fromEntries(store.all('SELECT * FROM topic_state').map((s) => [s.topic_id, s]));
  cache = { at: store.version, byTopic, states, mastery: {} };
  return cache;
}

export function topicMastery(topicId) {
  const snap = snapshot();
  if (topicId in snap.mastery) return snap.mastery[topicId];
  const list = snap.byTopic[topicId] || [];
  let num = 0, den = 0, evidence = 0, practiced = false, proven = false, onlyPlacement = true;
  list.slice(0, 15).forEach((a, i) => { const w = a.weight * Math.pow(0.88, i); num += w * a.score; den += w; });
  for (const a of list) {
    evidence += a.weight;
    if (a.source !== 'placement') onlyPlacement = false;
    if (['practice', 'challenge', 'project', 'analyst', 'assessment'].includes(a.source) && a.score >= 0.7) practiced = true;
    if (['challenge', 'exam', 'project', 'analyst', 'assessment'].includes(a.source) && a.score >= 0.7) proven = true;
  }
  let m = den ? 100 * (num / den) * Math.min(1, evidence / 6) : 0;
  if (onlyPlacement) m = Math.min(m, 30); // a placement answer is a starting point, not mastery
  if (!practiced) m = Math.min(m, 60);
  if (!proven) m = Math.min(m, 85);
  snap.mastery[topicId] = Math.round(m);
  return snap.mastery[topicId];
}

export function topicStatus(topic) {
  const snap = snapshot();
  const st = snap.states[topic.id] || {};
  const m = topicMastery(topic.id);
  const list = snap.byTopic[topic.id] || [];
  const attempts = list.length;
  const unlocked = isUnlocked(topic);
  let status;
  if (!unlocked) status = 'locked';
  else if (!attempts && !st.lesson_done_at) status = 'new';
  else if (attempts && list.every((a) => a.source === 'placement')) status = 'placed';
  else if (m < 50) status = 'learning';
  else if (m < 80) status = 'practicing';
  else if (m >= 90 && (st.review_box || 0) >= 3) status = 'mastered';
  else status = 'good';
  const due = unlocked && st.next_review_at && new Date(st.next_review_at) <= new Date();
  return { status, mastery: m, unlocked, lessonDone: !!st.lesson_done_at, attempts, reviewDue: !!due, nextReview: st.next_review_at || null };
}

export function isUnlocked(topic) {
  const snap = snapshot();
  const st = snap.states[topic.id] || {};
  if (st.unlocked_by_user || (snap.byTopic[topic.id] || []).length) return true;
  if (!topic.prereqs || !topic.prereqs.length) return true;
  return topic.prereqs.every((p) => topicMastery(p) >= 50);
}

export function skillProgress(skillId) {
  const topics = content.topics.filter((t) => t.skill === skillId);
  if (!topics.length) return 0;
  return Math.round(topics.reduce((s, t) => s + topicMastery(t.id), 0) / topics.length);
}

export function tierAverage(skillId, tier) {
  const topics = content.topics.filter((t) => t.skill === skillId && t.level === tier);
  if (!topics.length) return 0;
  return topics.reduce((s, t) => s + topicMastery(t.id), 0) / topics.length;
}

function placementPassed(skillId) {
  const p = store.get('SELECT placement_json FROM profile WHERE id = 1');
  const placement = p?.placement_json ? JSON.parse(p.placement_json) : null;
  return new Set(placement?.passed?.[skillId] || []);
}

export function skillStage(skillId) {
  const skill = content.skillMap[skillId];
  const any = content.topics.some((t) => t.skill === skillId && (snapshot().byTopic[t.id] || []).length);
  if (!any) return 'Not started';
  const passed = placementPassed(skillId);
  for (const tier of skill.levels) if (tierAverage(skillId, tier) < 55 && !passed.has(tier)) return tier;
  return `${skill.levels[skill.levels.length - 1]} (complete)`;
}

export function overallProgress() {
  const w = { excel: 25, sql: 25, pq: 15, pbi: 15, think: 20 };
  let s = 0, d = 0;
  for (const [k, v] of Object.entries(w)) { s += v * skillProgress(k); d += v; }
  return Math.round(s / d);
}

// ------------------------------------------------------------------ levels 1-7
export const LEVELS = [
  { n: 1, name: 'Data Basics', need: 'Where everyone starts.' },
  { n: 2, name: 'Excel Analyst', need: 'Excel Beginner and Intermediate topics at 70%+', check: () => avgTiers([['excel', 'Beginner'], ['excel', 'Intermediate']]) },
  { n: 3, name: 'SQL Analyst', need: 'SQL Beginner and Intermediate topics at 70%+', check: () => avgTiers([['sql', 'Beginner'], ['sql', 'Intermediate']]) },
  { n: 4, name: 'Data Transformation', need: 'Power Query Beginner and Intermediate topics at 70%+', check: () => avgTiers([['pq', 'Beginner'], ['pq', 'Intermediate']]) },
  { n: 5, name: 'BI Analyst', need: 'Power BI Beginner topics at 70%+', check: () => avgTiers([['pbi', 'Beginner']]) },
  { n: 6, name: 'Advanced Analyst', need: 'Excel Advanced and SQL Advanced topics at 70%+', check: () => avgTiers([['excel', 'Advanced'], ['sql', 'Advanced']]) },
  { n: 7, name: 'Real-World Analyst', need: 'Two projects passed (70%+) and Analyst Thinking at 70%+', check: () => Math.min(100, (projectsPassed() / 2) * 100 * 0.5 + Math.min(70, skillProgress('think')) / 70 * 50) },
];
function avgTiers(pairs) {
  return pairs.reduce((s, [sk, t]) => s + tierAverage(sk, t), 0) / pairs.length;
}
export function projectsPassed() {
  let n = 0;
  for (const p of content.projects) {
    const rows = store.all('SELECT score FROM project_progress WHERE project_id = ? AND step_id = ?', [p.id, 'final']);
    if (rows.length && rows[0].score >= 0.7) n++;
  }
  return n;
}
export function currentLevel() {
  let level = LEVELS[0];
  let next = null;
  for (const L of LEVELS.slice(1)) {
    const v = L.check();
    const ok = L.n === 7 ? projectsPassed() >= 2 && skillProgress('think') >= 70 : v >= 70;
    if (ok && level.n === L.n - 1) { level = L; continue; }
    next = { ...L, progress: Math.round(L.n === 7 ? v : Math.min(100, (v / 70) * 100)) };
    break;
  }
  return { level: { n: level.n, name: level.name }, next: next && { n: next.n, name: next.name, need: next.need, progress: next.progress }, all: LEVELS.map((l) => ({ n: l.n, name: l.name, need: l.need })) };
}

// ------------------------------------------------------------------ mistakes, strengths, reviews
export function openMistakes(limit = 20) {
  const rows = store.all(`SELECT concept, topic_id, skill_id, label, COUNT(*) AS n, MAX(ts) AS last
                          FROM mistakes WHERE resolved_at IS NULL GROUP BY concept, topic_id ORDER BY n DESC, last DESC LIMIT ?`, [limit]);
  return rows.map((r) => ({
    concept: r.concept, conceptName: content.concepts[r.concept] || content.topicMap[r.topic_id]?.title || 'General',
    topicId: r.topic_id, topicTitle: content.topicMap[r.topic_id]?.title, skillId: r.skill_id, label: r.label, count: r.n, last: r.last,
  }));
}

export function recentMistakes(limit = 6) {
  return store.all('SELECT ts, item_id, topic_id, concept, label, resolved_at FROM mistakes ORDER BY ts DESC LIMIT ?', [limit])
    .map((m) => ({ ...m, topicTitle: content.topicMap[m.topic_id]?.title, conceptName: content.concepts[m.concept] || null }));
}

/** learnedOnly: only topics the learner has genuinely learned (not just placement-credited). */
export function dueReviews(learnedOnly = false) {
  return content.topics.map((t) => ({ t, s: topicStatus(t) })).filter((x) => x.s.reviewDue && (!learnedOnly || x.s.mastery >= 50))
    .sort((a, b) => (a.s.nextReview < b.s.nextReview ? -1 : 1)).map((x) => x.t);
}

export function strengths() {
  return content.topics.map((t) => ({ t, m: topicMastery(t.id) })).filter((x) => x.m >= 75)
    .sort((a, b) => b.m - a.m).slice(0, 6).map((x) => ({ topicId: x.t.id, title: x.t.title, skill: x.t.skill, mastery: x.m }));
}

export function weaknesses() {
  const fromMistakes = openMistakes(10).filter((m) => m.topicId);
  const seen = new Set();
  const out = [];
  for (const m of fromMistakes) {
    if (seen.has(m.topicId)) continue;
    seen.add(m.topicId);
    out.push({ topicId: m.topicId, title: m.topicTitle, why: `${m.count} open mistake${m.count > 1 ? 's' : ''}: ${m.conceptName}` });
  }
  for (const t of content.topics) {
    const s = topicStatus(t);
    if (!seen.has(t.id) && s.attempts >= 3 && s.mastery < 50) { seen.add(t.id); out.push({ topicId: t.id, title: t.title, why: `Scores are still low (${s.mastery}%)` }); }
  }
  return out.slice(0, 6);
}

// ------------------------------------------------------------------ what next
// ------------------------------------------------------------------ how well the app knows the learner
// new           nothing checked yet
// calibrating   fewer than CALIBRATION_ANSWERS checked answers: "Getting to know your level".
//               Everything stays close to the basics, and advanced work is not suggested yet.
// personalized  enough evidence for the adaptive rules to decide on their own
// Placement answers only say where to start; they are not evidence of how the learner works.
export const CALIBRATION_ANSWERS = 25;
export function learnerPhase() {
  const r = store.get("SELECT COUNT(*) AS n FROM attempts WHERE source NOT IN ('placement', 'card')");
  const answers = r?.n || 0;
  return { phase: answers === 0 ? 'new' : answers < CALIBRATION_ANSWERS ? 'calibrating' : 'personalized', answers, needed: CALIBRATION_ANSWERS };
}

const ACTIVE_ORDER = ['excel', 'sql', 'pq', 'pbi'];

export function nextTopicInSkill(skillId) {
  const list = content.topics.filter((t) => t.skill === skillId);
  const open = (t) => { const s = topicStatus(t); return s.unlocked && s.mastery < 80; };
  // tiers passed in the placement check are confirmed through reviews, not re-taught first
  const passed = placementPassed(skillId);
  return list.find((t) => !passed.has(t.level) && open(t)) || list.find(open) || null;
}

function lastPracticed(skillId) {
  const r = store.get('SELECT MAX(ts) AS ts FROM attempts WHERE skill_id = ?', [skillId]);
  return r && r.ts ? r.ts : '';
}

export function activeSkills() {
  const skills = ['excel', 'sql', 'pq'];
  if (tierAverage('pq', 'Beginner') >= 50 || content.topics.some((t) => t.skill === 'pbi' && (snapshot().byTopic[t.id] || []).length)) skills.push('pbi');
  return skills;
}

/** The single topic the learner should work on now, with a plain-language reason. */
export function focus() {
  // repeated open mistakes in one topic (any concept) come first
  const byTopic = {};
  for (const m of openMistakes(50)) {
    if (!m.topicId) continue;
    byTopic[m.topicId] ||= { count: 0, last: '' };
    byTopic[m.topicId].count += m.count;
    if (m.last > byTopic[m.topicId].last) byTopic[m.topicId].last = m.last;
  }
  const weak = Object.entries(byTopic).filter(([, v]) => v.count >= 2).sort((a, b) => b[1].count - a[1].count || (a[1].last < b[1].last ? 1 : -1));
  if (weak.length) {
    const [topicId, v] = weak[0];
    return { topicId, mode: 'fix', reason: `You've made ${v.count} mistakes with ${content.topicMap[topicId].title}. Let's practise them.` };
  }
  const due = dueReviews(true);
  if (due.length) return { topicId: due[0].id, mode: 'review', reason: `Time to review ${due[0].title}, so it stays fresh.` };
  const profile = store.get('SELECT placement_json FROM profile WHERE id = 1');
  const placement = profile?.placement_json ? JSON.parse(profile.placement_json) : null;
  const skills = activeSkills();
  // first day: start where the placement said
  if (placement?.startSkill && !store.get("SELECT 1 AS x FROM attempts WHERE source NOT IN ('placement') LIMIT 1")) {
    const t = nextTopicInSkill(placement.startSkill);
    if (t) {
      const reason = placement.skipped
        ? `Start here: the first ${content.skillMap[t.skill].name} topic. Everything after it builds on it.`
        : 'Your assessment showed this is the best place to start.';
      return { topicId: t.id, mode: 'learn', reason };
    }
  }
  // while the app is getting to know the learner: stay with the topic in hand until it is done,
  // instead of rotating to another tool after the first answers (a new learner lost the thread)
  if (learnerPhase().phase !== 'personalized') {
    const last = store.get("SELECT topic_id FROM attempts WHERE source NOT IN ('placement', 'card') AND topic_id IS NOT NULL ORDER BY ts DESC, id DESC LIMIT 1")?.topic_id;
    const t = last && content.topicMap[last];
    if (t && isUnlocked(t) && topicMastery(t.id) < 80) return { topicId: t.id, mode: 'continue', reason: `Keep going with ${t.title}: finish its practice and quiz before moving on.` };
  }
  // rotate: the active skill practised least recently, then its next topic
  const ordered = skills.slice().sort((a, b) => (lastPracticed(a) < lastPracticed(b) ? -1 : lastPracticed(a) > lastPracticed(b) ? 1 : ACTIVE_ORDER.indexOf(a) - ACTIVE_ORDER.indexOf(b)));
  for (const sk of ordered) {
    const t = nextTopicInSkill(sk);
    if (t) {
      const s = topicStatus(t);
      return { topicId: t.id, mode: s.attempts ? 'continue' : 'learn', reason: s.attempts ? `Keep going: ${t.title} is at ${s.mastery}%.` : `Next step in ${content.skillMap[sk].name}.` };
    }
  }
  const t = nextTopicInSkill('think') || content.topics[0];
  return { topicId: t.id, mode: 'learn', reason: 'Build your analyst thinking.' };
}

function attemptedCorrectly(itemId) {
  return !!store.get('SELECT 1 AS x FROM attempts WHERE item_id = ? AND correct = 1 LIMIT 1', [itemId]);
}
function lastAttemptTs(itemId) {
  return store.get('SELECT MAX(ts) AS ts FROM attempts WHERE item_id = ?', [itemId])?.ts || '';
}

/** A practice task for the topic, sized to the learner's current mastery. */
export function pickPractice(topic) {
  const list = [...(topic.practice || [])];
  if (!list.length) return null;
  const m = topicMastery(topic.id);
  const adapt = adaptFor(topic.id);
  const target = adapt ? Math.round(adapt.target) : m < 30 ? 2 : m < 60 ? 3 : 4;
  const unsolved = list.filter((i) => !attemptedCorrectly(i.id));
  const pool = unsolved.length ? unsolved : list;
  return pool.slice().sort((a, b) => Math.abs((a.difficulty || 3) - target) - Math.abs((b.difficulty || 3) - target) || (lastAttemptTs(a.id) < lastAttemptTs(b.id) ? -1 : 1))[0];
}

/** Quiz questions for a topic, least-recently-correct first. */
// ------------------------------------------------------------------ quiz selection
// Each quiz is drawn afresh: weighted random choice that prefers what the learner has not seen,
// got wrong, or keeps tripping over, and avoids what was shown in the last day or two.
// A cap on each question style keeps a quiz from being eight true/false questions in a row.

function itemHistory(ids) {
  const out = {};
  if (!ids.length) return out;
  const marks = ids.map(() => '?').join(',');
  for (const r of store.all(`SELECT item_id, COUNT(*) AS n, SUM(correct) AS right,
      MAX(CASE WHEN correct = 1 THEN ts END) AS lastRight, MAX(CASE WHEN correct = 0 THEN ts END) AS lastWrong
      FROM attempts WHERE item_id IN (${marks}) GROUP BY item_id`, ids)) out[r.item_id] = r;
  return out;
}

function servedSince(ids, sinceIso) {
  if (!ids.length) return new Set();
  const marks = ids.map(() => '?').join(',');
  return new Set(store.all(`SELECT DISTINCT item_id FROM quiz_served WHERE ts >= ? AND item_id IN (${marks})`, [sinceIso, ...ids]).map((r) => r.item_id));
}

/** Remember what a quiz showed, so the next one can avoid it. */
export function markServed(items, key = null) {
  const ts = nowIso();
  for (const it of items) store.run('INSERT INTO quiz_served (ts, quiz_key, item_id) VALUES (?,?,?)', [ts, key, it.id]);
  store.run("DELETE FROM quiz_served WHERE ts < ?", [new Date(Date.now() - 60 * DAY).toISOString()]);
}

/**
 * How much a question is wanted right now, and the main reason. Always > 0, so nothing is
 * excluded forever; the random draw only chooses among questions that are wanted for a reason.
 *   missed-before   the last answer to it was wrong                  x4
 *   new             never answered                                   x3
 *   due-for-review  answered right, but not for two weeks            x1.5
 *   known           answered right at least twice recently           x0.35
 *   weak-concept    tests a concept with an open mistake             x2 (on top of the above)
 *   seen-recently   shown in the last 36 hours (x0.06) or week (x0.5)
 *   difficulty far from what fits the learner's mastery               x0.6
 * With `adapt` (adaptive.js), the difficulty target and the kind of question follow the learner's
 * recent history instead: harder after a run of successes, simpler after failures, business
 * situations once the syntax is known.
 */
export function questionWeight(it, h, recent, week, weakConcepts, mastery, now = Date.now(), adapt = null) {
  let w = 1;
  let reason = 'practice';
  if (!h) { w *= 3; reason = 'new'; }
  else if (h.lastWrong && (!h.lastRight || h.lastWrong > h.lastRight)) { w *= 4; reason = 'missed-before'; }
  else if (h.lastRight && now - Date.parse(h.lastRight) > 14 * DAY) { w *= 1.5; reason = 'due-for-review'; }
  else if (h.right >= 2) { w *= 0.35; reason = 'known'; }
  if (it.concept && weakConcepts.has(it.concept)) { w *= 2; if (reason !== 'missed-before') reason = 'weak-concept'; }
  if (recent.has(it.id)) { w *= 0.06; reason = 'seen-recently'; }
  else if (week.has(it.id)) w *= 0.5;
  const target = adapt ? adapt.target : mastery < 35 ? 1.5 : mastery < 70 ? 2.5 : 3.2;     // difficulty that fits the learner
  if (Math.abs((it.difficulty || 2) - target) > 1.2) w *= 0.6;
  const dim = adapt ? dimensionOf(it.source || 'quiz', kindOf(it), !!metaOf(it)?.business_context) : null;
  // getting to know the learner (adaptive.js coldStart): basics first, plain questions before
  // business situations. Harder ones are only drawn when nothing easier is left.
  if (adapt && adapt.coldStart) {
    if ((it.difficulty || 2) > 2) w *= 0.05;
    if (dim === 'application') w *= 0.4;
  }
  if (adapt && adapt.prefer) {
    const m = adapt.prefer[dim] || 1;
    w *= m;
    if (m > 1 && (reason === 'practice' || reason === 'known' || reason === 'due-for-review')) reason = adapt.mode;
  }
  return { w, reason };
}

function weightedDraw(cands, n, maxPerStyle, maxTf) {
  // Efraimidis-Spirakis: key = u^(1/w), take the largest keys
  const keyed = cands.map((c) => ({ ...c, key: Math.pow(Math.random(), 1 / c.w) })).sort((a, b) => b.key - a.key);
  const chosen = [];
  const styles = {};
  let tf = 0;
  for (const c of keyed) {
    if (chosen.length >= n) break;
    if ((styles[c.style] || 0) >= maxPerStyle) continue;
    if (c.item.type === 'tf' && tf >= maxTf) continue;
    chosen.push(c);
    styles[c.style] = (styles[c.style] || 0) + 1;
    if (c.item.type === 'tf') tf++;
  }
  for (const c of keyed) {            // not enough variety available: fill up anyway
    if (chosen.length >= n) break;
    if (!chosen.includes(c)) chosen.push(c);
  }
  return chosen;
}

/**
 * Draw a quiz from one or more topics.
 * topics: [{ topic, boost }] - boost > 1 makes a topic's questions more likely (weak, due for review).
 */
export function drawQuiz(topics, n = 6, { key = null, generated = true, mark = true, exclude = new Set(), reasons = null, avoid = null } = {}) {
  const weakConcepts = new Set(openMistakes(20).map((m) => m.concept).filter(Boolean));
  const pool = [];
  for (const { topic, boost = 1 } of topics) {
    const qs = (topic.quiz || []).filter((it) => !exclude.has(it.id));
    for (const it of qs) pool.push({ it, topic, boost, size: qs.length });
  }
  const ids = pool.map((p) => p.it.id);
  const hist = itemHistory(ids);
  const recent = servedSince(ids, new Date(Date.now() - 1.5 * DAY).toISOString());
  const week = servedSince(ids, new Date(Date.now() - 7 * DAY).toISOString());
  const masteryOf = {};
  const adaptOf = {};
  // across several topics, a topic's chance depends on its boost, not on how big its bank is
  const avgSize = pool.length ? pool.reduce((a, p) => a + p.size, 0) / pool.length : 1;
  const multi = topics.length > 1;
  let cands = pool.map(({ it, topic, boost, size }) => {
    masteryOf[topic.id] ??= topicMastery(topic.id);
    if (!(topic.id in adaptOf)) adaptOf[topic.id] = adaptFor(topic.id);
    const q = questionWeight(it, hist[it.id], recent, week, weakConcepts, masteryOf[topic.id], Date.now(), adaptOf[topic.id]);
    return { item: it, style: questionStyle(it), w: q.w * boost * (multi ? avgSize / size : 1), reason: q.reason };
  });

  // fresh-number questions: one per quiz (two for longer ones), more if the bank runs short
  const gens = [];
  if (generated) {
    for (const { topic } of topics) for (const g of generatorsFor(topic.id)) gens.push({ g, topic });
  }
  let genCount = gens.length ? (n >= 8 ? 2 : 1) : 0;
  genCount = Math.min(gens.length ? n : 0, Math.max(genCount, n - cands.length));
  const bankCount = Math.max(0, n - genCount);

  // the previous attempt's questions: left out when there are enough others, otherwise last in line
  if (avoid && avoid.size) {
    const others = cands.filter((c) => !avoid.has(c.item.id));
    if (others.length >= bankCount) cands = others;
    else for (const c of cands) if (avoid.has(c.item.id)) { c.w *= 0.01; c.reason = 'seen-recently'; }
  }

  const maxPerStyle = Math.max(2, Math.ceil(n / 2));
  const maxTf = Math.max(1, Math.floor(n / 3));
  const drawn = weightedDraw(cands, bankCount, maxPerStyle, maxTf);
  if (reasons) for (const c of drawn) reasons[c.item.id] = c.reason;
  const picked = drawn.map((c) => c.item);

  const shuffledGens = gens.slice().sort(() => Math.random() - 0.5);
  for (let i = 0; i < genCount && shuffledGens.length; i++) {
    const { g, topic } = shuffledGens[i % shuffledGens.length];
    const it = getItem(newGeneratedId(g, topic.id));
    if (it) { picked.push(it); if (reasons) reasons[it.id] = 'fresh-numbers'; }
  }

  const out = warmUpOrder(picked);
  if (mark) markServed(out, key);
  return out;
}

/** Easier first, so a quiz warms up; ties keep the random order. */
function warmUpOrder(items) {
  return items.map((it, i) => ({ it, i })).sort((a, b) => (a.it.difficulty || 2) - (b.it.difficulty || 2) || a.i - b.i).map((x) => x.it);
}

export function pickQuiz(topic, n = 5, opts = {}) {
  return drawQuiz([{ topic }], n, { key: `topic:${topic.id}`, ...opts });
}

/**
 * A mixed review. Up to half the questions come from topics with open mistakes (the more
 * mistakes, the more likely), up to a quarter from topics due for review, and the rest from
 * everything practised, leaning towards weaker topics.
 */
export function pickReviewQuiz(n = 8, { reasons = null, avoid = null } = {}) {
  const mistakeCount = {};
  for (const m of openMistakes(20)) if (m.topicId) mistakeCount[m.topicId] = (mistakeCount[m.topicId] || 0) + (m.count || 1);
  const eligible = content.topics.filter((t) => isUnlocked(t) && (t.quiz || []).length);
  const taken = new Set();
  const out = [];
  const take = (items) => { for (const it of items) if (!taken.has(it.id)) { taken.add(it.id); out.push(it); } };

  const fromMistakes = Object.entries(mistakeCount).map(([id, c]) => ({ topic: content.topicMap[id], boost: c })).filter((x) => x.topic && (x.topic.quiz || []).length);
  if (fromMistakes.length) take(drawQuiz(fromMistakes, Math.ceil(n / 2), { mark: false, generated: false, exclude: taken, reasons, avoid }));

  const fromDue = dueReviews().filter((t) => !mistakeCount[t.id] && (t.quiz || []).length).map((topic) => ({ topic }));
  if (fromDue.length && out.length < n) take(drawQuiz(fromDue, Math.min(n - out.length, Math.ceil(n / 4)), { mark: false, generated: false, exclude: taken, reasons, avoid }));

  if (out.length < n) {
    const practiced = eligible.filter((t) => topicMastery(t.id) > 0);
    const rest = (practiced.length ? practiced : eligible).map((topic) => {
      const m = topicMastery(topic.id);
      return { topic, boost: m < 50 ? 1.6 : m >= 85 ? 0.5 : 1 };
    });
    take(drawQuiz(rest, n - out.length, { mark: false, exclude: taken, reasons, avoid }));
  }

  const final = warmUpOrder(out.slice(0, n));
  markServed(final, 'review');
  return final;
}

export function reviewQuestions(n = 2, exclude = new Set()) {
  const out = [];
  const concepts = openMistakes(10).map((m) => m.concept).filter(Boolean);
  for (const c of concepts) {
    const cand = content.quizItems.filter((i) => i.concept === c && !exclude.has(i.id) && isUnlocked(content.topicMap[i.topicId]));
    if (cand.length) { const pick = cand.sort((a, b) => (lastAttemptTs(a.id) < lastAttemptTs(b.id) ? -1 : 1))[0]; out.push(pick); exclude.add(pick.id); }
    if (out.length >= n) return out;
  }
  for (const t of dueReviews()) {
    const q = pickQuiz(t, 3).find((i) => !exclude.has(i.id));
    if (q) { out.push(q); exclude.add(q.id); }
    if (out.length >= n) return out;
  }
  return out;
}

export function todayPlan(forceNew = false) {
  const day = todayKey();
  const existing = store.get('SELECT plan_json, done_json FROM daily_plan WHERE day = ?', [day]);
  if (existing && !forceNew) return { ...JSON.parse(existing.plan_json), done: JSON.parse(existing.done_json) };
  const f = focus();
  const topic = content.topicMap[f.topicId];
  const st = topicStatus(topic);
  const practice = pickPractice(topic);
  // up to 2 review questions (mistakes, due topics), the rest from today's topic, 5 in total
  const extra = reviewQuestions(2, new Set((topic.quiz || []).map((q) => q.id)));
  const quiz = pickQuiz(topic, 5 - extra.length);
  // The day's challenge is this topic's own, once its basics are in place. There used to be a
  // fallback to an Analyst Thinking challenge picked by the day of the month, which put an
  // unrelated and often demanding data task into a brand-new learner's first plan. Now only a
  // learner the app knows well gets a thinking challenge instead, from their own next thinking topic.
  let challenge = topic.challenge && (st.lessonDone || st.mastery >= 40) ? topic.challenge : null;
  if (!challenge && learnerPhase().phase === 'personalized') {
    const t = nextTopicInSkill('think');
    if (t && t.challenge && isUnlocked(t)) challenge = t.challenge;
  }
  const plan = {
    day, topicId: topic.id, topicTitle: topic.title, skill: topic.skill, skillName: content.skillMap[topic.skill].name, level: topic.level,
    reason: f.reason, mode: f.mode,
    steps: [
      { key: 'learn', title: st.lessonDone ? 'Review the lesson' : 'Lesson', detail: topic.title, minutes: topic.minutes || 10 },
      practice && { key: 'practice', title: 'Practice', detail: practice.title || 'Practice task', itemId: practice.id, minutes: practice.minutes || 20 },
      { key: 'quiz', title: 'Quiz', detail: `${quiz.length + extra.length} questions`, itemIds: [...quiz, ...extra].map((q) => q.id), minutes: 5 },
      challenge && { key: 'challenge', title: 'Challenge', detail: challenge.title || 'Business problem', itemId: challenge.id, minutes: challenge.minutes || 15 },
    ].filter(Boolean),
  };
  store.run('INSERT OR REPLACE INTO daily_plan (day, plan_json, done_json) VALUES (?,?,?)', [day, JSON.stringify(plan), '{}']);
  return { ...plan, done: {} };
}

export function markPlanStep(step) {
  const day = todayKey();
  const row = store.get('SELECT done_json FROM daily_plan WHERE day = ?', [day]);
  if (!row) return;
  const done = JSON.parse(row.done_json);
  done[step] = nowIso();
  store.run('UPDATE daily_plan SET done_json = ? WHERE day = ?', [JSON.stringify(done), day]);
}

/** One useful exercise for a short session. */
export function quickItem() {
  const kinds = new Set(['formula', 'sql', 'mc', 'fill', 'number', 'tf']);
  let pool = content.quizItems.filter((i) => kinds.has(i.type) && isUnlocked(content.topicMap[i.topicId]));
  // while the app is getting to know the learner: only the current topic and topics already
  // practised, and the easier questions (an unlocked topic is not a practised one)
  if (learnerPhase().phase !== 'personalized') {
    const current = focus().topicId;
    const practised = new Set(store.all("SELECT DISTINCT topic_id FROM attempts WHERE source NOT IN ('placement', 'card') AND topic_id IS NOT NULL").map((r) => r.topic_id));
    const known = pool.filter((i) => i.topicId === current || practised.has(i.topicId));
    const easy = known.filter((i) => (i.difficulty || 2) <= 2);
    pool = easy.length ? easy : known.length ? known : pool;
  }
  const weak = openMistakes(10).map((m) => m.concept);
  const fromWeak = pool.filter((i) => weak.includes(i.concept));
  const due = new Set(dueReviews().map((t) => t.id));
  const fromDue = pool.filter((i) => due.has(i.topicId));
  const f = focus();
  const fromFocus = pool.filter((i) => i.topicId === f.topicId);
  const r = Math.random();
  const bucket = (r < 0.45 && fromWeak.length) ? fromWeak : (r < 0.75 && fromDue.length) ? fromDue : (fromFocus.length && r < 0.9) ? fromFocus : pool;
  const sorted = bucket.slice().sort((a, b) => (lastAttemptTs(a.id) < lastAttemptTs(b.id) ? -1 : 1));
  const top = sorted.slice(0, Math.min(6, sorted.length));
  return top[Math.floor(Math.random() * top.length)];
}
