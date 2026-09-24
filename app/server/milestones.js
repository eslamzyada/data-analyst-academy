// Milestones: meaningful titles earned from demonstrated work, never from lessons read.
//
// Each milestone lists its requirements in plain language with how far along the learner is.
// Every requirement counts graded evidence only: abilities at a stage (server/mastery.js), open
// tasks solved on the first check with no hints, success on several different days, Real Analyst
// results and project criteria. Once all are met the milestone is awarded, dated and kept: later
// forgetting shows up in the stages, not by taking a title away.
import * as store from './store.js';
import { content } from './content/index.js';
import * as mastery from './mastery.js';
import { results as analystResults, PASS as ANALYST_PASS } from './analyst.js';
import { criteriaProfile } from './content/criteria.js';

const at = (s) => mastery.stageIndex(s);
const plural = (n, one, many) => (n === 1 ? one : many);

function context() {
  const ev = mastery.evidence();
  const comps = {};
  for (const s of content.skills) comps[s.id] = mastery.skillView(s.id).competencies;
  return { ev, comps, analyst: analystResults() };
}

// ------------------------------------------------------------------ requirement builders

function compsAtLeast(ctx, skill, stage, need, { mustInclude = [] } = {}) {
  const list = ctx.comps[skill] || [];
  const ok = list.filter((c) => at(c.stage) >= at(stage));
  const missing = mustInclude.filter((id) => !ok.some((c) => c.id === id)).map((id) => list.find((c) => c.id === id)?.name).filter(Boolean);
  const label = `${need} ${content.skillMap[skill].name} ${plural(need, 'ability', 'abilities')} at ${mastery.STAGE_LABEL[stage]} or better${mustInclude.length ? `, including ${mustInclude.map((id) => `"${list.find((c) => c.id === id)?.name}"`).join(' and ')}` : ''}`;
  return { label, have: ok.length, need, met: ok.length >= need && !missing.length, detail: missing.length ? `Still needed: ${missing.join(', ')}` : null };
}

function dbOf(id) {
  const it = content.items[id];
  if (it && it.db) return it.db;
  const [owner] = String(id).split(':');
  return content.projectMap[owner]?.db || content.analystMap[owner]?.data?.db || null;
}

function unguided(ctx, skill, need, { distinctDbs = 0 } = {}) {
  const solved = [...(ctx.ev.bySkill[skill]?.independence.solved || [])];
  const dbs = new Set(solved.map(dbOf).filter(Boolean));
  const label = `${need} ${plural(need, 'challenge, project step or Real Analyst task', 'challenges, project steps or Real Analyst tasks')} in ${content.skillMap[skill].name} solved on the first check with no hints${distinctDbs ? `, on at least ${distinctDbs} different databases` : ''}`;
  return { label, have: solved.length, need, met: solved.length >= need && dbs.size >= distinctDbs, detail: distinctDbs && dbs.size < distinctDbs ? `So far on ${dbs.size} database${dbs.size === 1 ? '' : 's'}` : null };
}

function days(ctx, skill, need) {
  const n = ctx.ev.bySkill[skill]?.successDays.size || 0;
  return { label: `Good work in ${content.skillMap[skill].name} on ${need} different days`, have: n, need, met: n >= need };
}

function reasoning(ctx, need, min = 0.7) {
  let n = 0;
  for (const r of ctx.analyst) {
    const c = r.task.parts.find((p) => p.type === 'conclusion');
    const row = c && store.get('SELECT result_json FROM analyst_work WHERE task_id = ? AND part_id = ?', [r.task.id, c.id]);
    const res = row?.result_json ? JSON.parse(row.result_json) : null;
    if (res && res.reasoningScore >= min) n++;
  }
  for (const p of content.projects) {
    const row = store.get("SELECT answer_json FROM project_progress WHERE project_id = ? AND step_id = 'final' AND score IS NOT NULL", [p.id]);
    const saved = row && store.get('SELECT state_json FROM work_state WHERE key = ?', [`project:${p.id}`]);
    const rs = saved ? JSON.parse(saved.state_json)?.summary?.reasoningScore : null;
    if (typeof rs === 'number' && rs >= min) n++;
  }
  return { label: `${need} written ${plural(need, 'conclusion whose reasoning scores', 'conclusions whose reasoning scores')} ${Math.round(min * 100)}% or more (Real Analyst work or project reports)`, have: n, need, met: n >= need };
}

function analystDone(ctx, kind, need, { minLevel = 1 } = {}) {
  const ok = ctx.analyst.filter((r) => r.task.kind === kind && r.score >= ANALYST_PASS);
  const high = ok.filter((r) => r.task.level >= minLevel);
  const noun = kind === 'request' ? plural(need, 'work request', 'work requests') : kind === 'toolchoice' ? plural(need, 'cross-tool challenge', 'cross-tool challenges') : plural(need, 'mixed assessment', 'mixed assessments');
  return {
    label: `${need} ${noun} passed (${Math.round(ANALYST_PASS * 100)}%+)${minLevel > 1 ? `, at least one at Level ${minLevel} or above` : ''}`,
    have: ok.length, need, met: ok.length >= need && (minLevel <= 1 || high.length >= 1),
    detail: minLevel > 1 && ok.length >= need && !high.length ? `None yet at Level ${minLevel}+` : null,
  };
}

/** The ten-criteria profile of one finished project. */
export function projectProfile(p) {
  const got = Object.fromEntries(store.all('SELECT step_id, score FROM project_progress WHERE project_id = ?', [p.id]).map((r) => [r.step_id, r.score]));
  // the final step's stored score is the project average; its own report score lives with the summary
  const saved = store.get('SELECT state_json FROM work_state WHERE key = ?', [`project:${p.id}`]);
  const summary = saved ? JSON.parse(saved.state_json)?.summary : null;
  return criteriaProfile(p.steps.map((s) => ({ criteria: s.criteria || [], score: s.id === 'final' ? summary?.reportScore ?? null : got[s.id] ?? null })));
}

function projectsWithCriteria(ctx, need, shown) {
  let n = 0;
  for (const p of content.projects) {
    const done = store.get("SELECT 1 AS x FROM project_progress WHERE project_id = ? AND step_id = 'final' AND score IS NOT NULL", [p.id]);
    if (!done) continue;
    if (projectProfile(p).filter((c) => c.state === 'shown').length >= shown) n++;
  }
  return { label: `${need} ${plural(need, 'project', 'projects')} finished with at least ${shown} of the 10 criteria shown`, have: n, need, met: n >= need };
}

function milestonesHeld(ids, need) {
  const held = ids.filter((id) => store.get('SELECT 1 AS x FROM milestones WHERE id = ?', [id])).length;
  return { label: `${need} of the other milestones`, have: held, need, met: held >= need };
}

// ------------------------------------------------------------------ the milestones

export const MILESTONES = [
  { id: 'excel-analyst', name: 'Excel Analyst', skill: 'excel',
    blurb: 'Cleans, looks up, summarises and models data in Excel, on business problems, without being told how.',
    reqs: (c) => [compsAtLeast(c, 'excel', 'competent', 4, { mustInclude: ['c-xl-lookup', 'c-xl-summarise'] }), compsAtLeast(c, 'excel', 'independent', 2), unguided(c, 'excel', 3), days(c, 'excel', 3)] },
  { id: 'sql-analyst', name: 'SQL Analyst', skill: 'sql',
    blurb: 'Writes the queries a business question needs, combines tables safely, and does it on databases it has not seen before.',
    reqs: (c) => [compsAtLeast(c, 'sql', 'competent', 4, { mustInclude: ['c-sql-join', 'c-sql-summarise'] }), compsAtLeast(c, 'sql', 'independent', 2), unguided(c, 'sql', 3, { distinctDbs: 2 }), days(c, 'sql', 3)] },
  { id: 'transformation-analyst', name: 'Data Transformation Analyst', skill: 'pq',
    blurb: 'Turns messy exports into clean, refreshable tables, and combines sources without losing or doubling rows.',
    reqs: (c) => [compsAtLeast(c, 'pq', 'competent', 3, { mustInclude: ['c-pq-combine'] }), compsAtLeast(c, 'pq', 'independent', 1), unguided(c, 'pq', 2), days(c, 'pq', 2)] },
  { id: 'bi-beginner', name: 'BI Beginner', skill: 'pbi',
    blurb: 'Builds a sound model with measures that stay right under filters, and a report page someone can use.',
    reqs: (c) => [compsAtLeast(c, 'pbi', 'competent', 3, { mustInclude: ['c-pbi-model', 'c-pbi-measures'] }), unguided(c, 'pbi', 1), days(c, 'pbi', 2)] },
  { id: 'analyst-thinking', name: 'Business Analyst Thinking', skill: 'think',
    blurb: 'Checks the data, picks the right measure, separates cause from coincidence, and writes a conclusion a manager can act on.',
    reqs: (c) => [compsAtLeast(c, 'think', 'competent', 4), compsAtLeast(c, 'think', 'independent', 2), reasoning(c, 2), days(c, 'think', 3)] },
  { id: 'integrated-analyst', name: 'Integrated Data Analyst', skill: null,
    blurb: 'Receives an unfamiliar business problem and works out, alone, what to do: the data, the tool, the analysis and the answer.',
    reqs: (c) => [milestonesHeld(['excel-analyst', 'sql-analyst', 'transformation-analyst', 'bi-beginner', 'analyst-thinking'], 3),
      analystDone(c, 'request', 2, { minLevel: 2 }), analystDone(c, 'assessment', 1), analystDone(c, 'toolchoice', 2), projectsWithCriteria(c, 2, 7)] },
];

/** Every milestone with its requirements; newly met ones are awarded (and returned in `awarded`). */
export function milestones() {
  const ctx = context();
  const awarded = [];
  const list = MILESTONES.map((m) => {
    const reqs = m.reqs(ctx);
    const held = store.get('SELECT achieved_at FROM milestones WHERE id = ?', [m.id]);
    let achievedAt = held?.achieved_at || null;
    if (!achievedAt && reqs.every((r) => r.met)) {
      achievedAt = new Date().toISOString();
      store.run('INSERT INTO milestones (id, achieved_at, evidence_json) VALUES (?,?,?)', [m.id, achievedAt, JSON.stringify(reqs)]);
      awarded.push(m.id);
    }
    const metCount = reqs.filter((r) => r.met).length;
    return { id: m.id, name: m.name, skill: m.skill, blurb: m.blurb, achieved: !!achievedAt, achievedAt, requirements: reqs, met: metCount, total: reqs.length, progress: Math.round((metCount / reqs.length) * 100) };
  });
  // the milestone closest to being earned, for the home page
  const next = list.filter((m) => !m.achieved).sort((a, b) => b.met / b.total - a.met / a.total)[0] || null;
  return { list, next: next ? { ...next, todo: next.requirements.find((r) => !r.met) || null } : null, awarded, achieved: list.filter((m) => m.achieved).length };
}
